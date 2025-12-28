"use server";

import { requireAdmin } from "@/lib/auth-utils";
import type { StorageObject } from "@/lib/storage";
import { deleteFile, getFileUrl, getImageUrl, listObjectsWithDetails } from "@/lib/storage";

export interface FileInfo extends StorageObject {
	url: string;
	name: string;
	type: "image" | "file";
	problemId: number | null;
}

/**
 * Get all uploaded files and images
 */
export async function getAllUploadedFiles() {
	await requireAdmin();

	try {
		const [images, files] = await Promise.all([
			listObjectsWithDetails("images/"),
			listObjectsWithDetails("files/"),
		]);

		const imageInfos: FileInfo[] = images.map((obj) => {
			const name = obj.key.split("/").pop() || obj.key;
			const problemIdMatch = obj.key.match(/images\/problems\/(\d+)\//);
			const problemId = problemIdMatch ? parseInt(problemIdMatch[1], 10) : null;

			return {
				...obj,
				url: getImageUrl(obj.key),
				name,
				type: "image" as const,
				problemId,
			};
		});

		const fileInfos: FileInfo[] = files.map((obj) => {
			const name = obj.key.split("/").pop() || obj.key;
			const problemIdMatch = obj.key.match(/files\/problems\/(\d+)\//);
			const problemId = problemIdMatch ? parseInt(problemIdMatch[1], 10) : null;

			return {
				...obj,
				url: getFileUrl(obj.key),
				name,
				type: "file" as const,
				problemId,
			};
		});

		const allFiles = [...imageInfos, ...fileInfos].sort(
			(a, b) => b.lastModified.getTime() - a.lastModified.getTime()
		);

		return { success: true, files: allFiles };
	} catch (error) {
		console.error("Failed to list files:", error);
		return { success: false, error: "파일 목록을 가져오는데 실패했습니다." };
	}
}

/**
 * Delete a file or image
 */
export async function deleteUploadedFile(key: string) {
	await requireAdmin();

	try {
		await deleteFile(key);
		return { success: true };
	} catch (error) {
		console.error("Failed to delete file:", error);
		return { success: false, error: "파일 삭제에 실패했습니다." };
	}
}

export type GetAllUploadedFilesReturn = Awaited<ReturnType<typeof getAllUploadedFiles>>;
export type DeleteUploadedFileReturn = Awaited<ReturnType<typeof deleteUploadedFile>>;
