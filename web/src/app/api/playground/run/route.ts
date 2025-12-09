import { type NextRequest, NextResponse } from "next/server";
import { getPlaygroundSession, requirePlaygroundAccess } from "@/actions/playground";
import { auth } from "@/auth";
import { getRedisClient } from "@/lib/redis";

export async function POST(request: NextRequest) {
	const session = await auth();
	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const userId = parseInt(session.user.id, 10);

	// 권한 체크
	try {
		await requirePlaygroundAccess(userId);
	} catch {
		return NextResponse.json({ error: "No playground access" }, { status: 403 });
	}

	const {
		sessionId,
		targetPath, // 실행할 파일 경로 (Makefile 또는 소스 파일)
		input, // stdin (단일 파일) 또는 file_input (Makefile)
	} = await request.json();

	// 세션 파일 조회
	const playgroundSession = await getPlaygroundSession(sessionId, userId);
	if (!playgroundSession) {
		return NextResponse.json({ error: "Session not found" }, { status: 404 });
	}

	const redis = await getRedisClient();

	// 실행 타입 판별 (Makefile인지 소스 파일인지)
	const filename = targetPath.split("/").pop() || "";
	const isMakefile = filename === "Makefile" || filename === "makefile";

	// 결과 키 생성
	const resultKey = `playground:result:${sessionId}:${Date.now()}`;

	// Job 생성
	const job = {
		job_type: "playground",
		session_id: sessionId,
		target_path: targetPath,
		files: playgroundSession.files.map((f: { path: string; content: string }) => ({
			path: f.path,
			content: f.content,
		})),
		stdin_input: isMakefile ? null : input, // 단일 파일 실행 시
		file_input: isMakefile ? input : null, // Makefile 실행 시
		time_limit: 5000, // 5초
		memory_limit: 512, // 512MB
		result_key: resultKey,
	};

	// Job 큐에 추가
	await redis.rpush("judge:queue", JSON.stringify(job));

	// 결과 대기 (최대 30초)
	// BLPOP returns [key, value]
	const result = await redis.blpop(resultKey, 30);

	if (!result) {
		return NextResponse.json({ error: "Execution timeout" }, { status: 408 });
	}

	return NextResponse.json(JSON.parse(result[1]));
}
