"use server";

import {
	generateFilePath,
	generateImagePath,
	getFileUrl,
	uploadFile,
	uploadImage,
} from "@/lib/storage";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Upload an image file for a problem
 */
export async function uploadProblemImage(formData: FormData, problemId?: number) {
	try {
		const file = formData.get("file") as File | null;

		if (!file) {
			return { success: false, error: "파일이 없습니다." };
		}

		// Validate file type
		if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
			return {
				success: false,
				error: "지원하지 않는 이미지 형식입니다. (JPEG, PNG, GIF, WebP만 지원)",
			};
		}

		// Validate file size
		if (file.size > MAX_IMAGE_SIZE) {
			return { success: false, error: "파일 크기가 5MB를 초과합니다." };
		}

		// Generate unique filename
		const ext = file.name.substring(file.name.lastIndexOf("."));
		const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
		const key = generateImagePath(problemId ?? null, uniqueName);

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to MinIO
		const result = await uploadImage(key, buffer, file.type);

		return { success: true, url: result.url };
	} catch (error) {
		console.error("Failed to upload image:", error);
		return { success: false, error: "이미지 업로드에 실패했습니다." };
	}
}

/**
 * Upload a general file for a problem
 */
export async function uploadProblemFile(formData: FormData, problemId?: number) {
	try {
		const file = formData.get("file") as File | null;

		if (!file) {
			return { success: false, error: "파일이 없습니다." };
		}

		// Validate file size
		if (file.size > MAX_FILE_SIZE) {
			return { success: false, error: "파일 크기가 50MB를 초과합니다." };
		}

		// Generate unique filename
		const ext = file.name.substring(file.name.lastIndexOf("."));
		const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
		const key = generateFilePath(problemId ?? null, uniqueName);

		// Convert file to buffer
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);

		// Upload to MinIO
		await uploadFile(key, buffer, file.type || "application/octet-stream");
		const url = getFileUrl(key);

		return { success: true, url };
	} catch (error) {
		console.error("Failed to upload file:", error);
		return { success: false, error: "파일 업로드에 실패했습니다." };
	}
}

export type UploadProblemImageReturn = Awaited<ReturnType<typeof uploadProblemImage>>;
export type UploadProblemFileReturn = Awaited<ReturnType<typeof uploadProblemFile>>;
