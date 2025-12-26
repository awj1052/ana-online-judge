"use server";

import { eq } from "drizzle-orm";
import JSZip from "jszip";
import { db } from "@/db";
import { problems, submissions, testcases } from "@/db/schema";
import { getRedisClient } from "@/lib/redis";
import { uploadFile } from "@/lib/storage";

const MAX_INPUT_FILE_SIZE = 1 * 1024 * 1024; // 1MB

/**
 * ANIGMA Task 1: input 파일 제출
 * A와 B의 출력이 달라야 정답 (20점)
 */
export async function submitAnigmaTask1(data: {
	problemId: number;
	inputFile: File;
	userId: number;
}): Promise<{ submissionId?: number; error?: string }> {
	try {
		// 1. 파일 크기 검증
		if (data.inputFile.size > MAX_INPUT_FILE_SIZE) {
			return { error: "파일 크기가 1MB를 초과합니다." };
		}

		// 2. 문제 정보 조회 (코드 A, B 경로 확인)
		const [problem] = await db.select().from(problems).where(eq(problems.id, data.problemId));

		if (!problem) {
			return { error: "문제를 찾을 수 없습니다." };
		}

		if (!problem.referenceCodePath) {
			return { error: "문제에 코드 A가 설정되지 않았습니다." };
		}

		if (!problem.solutionCodePath) {
			return { error: "문제에 코드 B가 설정되지 않았습니다." };
		}

		// 3. MinIO에 input 파일 업로드
		const buffer = Buffer.from(await data.inputFile.arrayBuffer());
		const inputPath = `submissions/anigma/task1/${Date.now()}_${data.userId}.bin`;
		await uploadFile(inputPath, buffer, "application/octet-stream");

		// 4. DB에 제출 기록 생성
		const [submission] = await db
			.insert(submissions)
			.values({
				problemId: data.problemId,
				userId: data.userId,
				code: "[ANIGMA TASK1 INPUT]",
				language: "cpp", // placeholder
				verdict: "pending",
				anigmaTaskType: 1,
				anigmaInputPath: inputPath,
			})
			.returning({ id: submissions.id });

		// 5. Judge Job 큐에 추가
		const redis = await getRedisClient();
		await redis.rpush(
			"judge:queue",
			JSON.stringify({
				job_type: "anigma_task1",
				submission_id: submission.id,
				problem_id: data.problemId,
				input_path: inputPath,
				reference_code_path: problem.referenceCodePath,
				solution_code_path: problem.solutionCodePath,
				time_limit: problem.timeLimit,
				memory_limit: problem.memoryLimit,
			})
		);

		return { submissionId: submission.id };
	} catch (error) {
		console.error("Anigma Task 1 submit error:", error);
		return { error: "제출 중 오류가 발생했습니다." };
	}
}

/**
 * ANIGMA Task 2: ZIP 파일 제출
 * 테스트케이스 통과 + 편집거리 (80점)
 */
export async function submitAnigmaCode(data: {
	problemId: number;
	zipFile: File;
	userId: number;
}): Promise<{ submissionId?: number; error?: string }> {
	try {
		// 1. ZIP 파일 검증
		const validation = await validateAnigmaZip(data.zipFile);
		if (!validation.valid) {
			return { error: validation.error };
		}

		// 2. MinIO에 업로드
		const buffer = Buffer.from(await data.zipFile.arrayBuffer());
		const zipPath = `submissions/anigma/task2/${Date.now()}_${data.userId}.zip`;
		await uploadFile(zipPath, buffer, "application/zip");

		// 3. DB에 제출 기록 생성
		const [submission] = await db
			.insert(submissions)
			.values({
				problemId: data.problemId,
				userId: data.userId,
				code: "[ZIP FILE]", // Anigma는 코드를 직접 저장하지 않고 zip 경로만 저장
				language: "cpp", // Anigma는 주로 C++ 대상
				verdict: "pending",
				zipPath: zipPath,
				isMultifile: true,
				anigmaTaskType: 2,
			})
			.returning({ id: submissions.id });

		// 4. 문제 정보 및 테스트케이스 조회
		const [problem] = await db.select().from(problems).where(eq(problems.id, data.problemId));

		if (!problem) {
			return { error: "문제를 찾을 수 없습니다." };
		}

		const problemTestcases = await db
			.select()
			.from(testcases)
			.where(eq(testcases.problemId, data.problemId));

		// 5. Judge Job 큐에 추가
		const redis = await getRedisClient();
		await redis.rpush(
			"judge:queue",
			JSON.stringify({
				job_type: "anigma",
				submission_id: submission.id,
				problem_id: data.problemId,
				zip_path: zipPath,
				reference_code_path: problem.referenceCodePath || "", // 편집 거리 계산용 원본 코드
				time_limit: problem.timeLimit,
				memory_limit: problem.memoryLimit,
				max_score: problem.maxScore,
				testcases: problemTestcases.map((tc) => ({
					id: tc.id,
					input_path: tc.inputPath,
					expected_output_path: tc.outputPath,
				})),
			})
		);

		return { submissionId: submission.id };
	} catch (error) {
		console.error("Anigma Task 2 submit error:", error);
		return { error: "제출 중 오류가 발생했습니다." };
	}
}

async function validateAnigmaZip(zipFile: File): Promise<{ valid: boolean; error?: string }> {
	try {
		const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());

		// Makefile 또는 makefile 존재 확인
		if (!zip.files.Makefile && !zip.files.makefile) {
			return { valid: false, error: "Makefile이 없습니다." };
		}

		const makefileKey = zip.files.Makefile ? "Makefile" : "makefile";

		// Makefile 내용 검증 (build, run 타겟 존재 여부)
		const makefileContent = await zip.files[makefileKey].async("string");
		if (!makefileContent.includes("build:")) {
			return { valid: false, error: "Makefile에 build 타겟이 없습니다." };
		}
		if (!makefileContent.includes("run:")) {
			return { valid: false, error: "Makefile에 run 타겟이 없습니다." };
		}

		return { valid: true };
	} catch (_e) {
		return { valid: false, error: "ZIP 파일 형식이 올바르지 않습니다." };
	}
}




