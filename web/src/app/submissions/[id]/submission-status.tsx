"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";

interface SubmissionStatusProps {
	submissionId: number;
	initialVerdict: string;
	score?: number;
	maxScore?: number;
}

const VERDICT_LABELS: Record<string, { label: string; color: string }> = {
	pending: { label: "대기 중", color: "bg-gray-500" },
	judging: { label: "채점 중", color: "bg-blue-500" },
	accepted: { label: "정답", color: "bg-emerald-500" },
	wrong_answer: { label: "오답", color: "bg-rose-500" },
	time_limit_exceeded: { label: "시간 초과", color: "bg-amber-500" },
	memory_limit_exceeded: { label: "메모리 초과", color: "bg-orange-500" },
	runtime_error: { label: "런타임 에러", color: "bg-purple-500" },
	compile_error: { label: "컴파일 에러", color: "bg-pink-500" },
	system_error: { label: "시스템 에러", color: "bg-red-500" },
	partial: { label: "부분 점수", color: "bg-yellow-500" },
	skipped: { label: "건너뜀", color: "bg-gray-400" },
	presentation_error: { label: "출력 형식 에러", color: "bg-orange-400" },
	fail: { label: "실패", color: "bg-red-600" },
};

export function SubmissionStatus({ submissionId, initialVerdict, score, maxScore }: SubmissionStatusProps) {
	const router = useRouter();
	const [verdict, setVerdict] = useState(initialVerdict);
	const [currentScore, setScore] = useState(score);
	const [isJudging, setIsJudging] = useState(
		initialVerdict === "pending" || initialVerdict === "judging"
	);

	useEffect(() => {
		if (!isJudging) return;

		let isCancelled = false;
		let isCompleted = false;
		let eventSource: EventSource | null = null;

		const checkStatusAndConnect = () => {
			if (isCancelled) return;

			// Connect to SSE stream (add timestamp to prevent caching)
			const timestamp = Date.now();
			eventSource = new EventSource(`/api/submissions/${submissionId}/stream?t=${timestamp}`);

			eventSource.addEventListener("complete", async () => {
				isCompleted = true;
				
				// Fetch updated status from API
				try {
					const response = await fetch(`/api/submissions/${submissionId}/status`);
					const data = await response.json();

					if (!isCancelled) {
						setVerdict(data.verdict);
						if (data.score !== undefined) {
							setScore(data.score);
						}
						setIsJudging(false);
						router.refresh();
					}
				} catch (error) {
					console.error("Error fetching status update:", error);
				} finally {
					if (eventSource) {
						eventSource.close();
					}
				}
			});

			eventSource.onerror = () => {
				if (eventSource) {
					eventSource.close();
				}
				if (!isCompleted && !isCancelled) {
					setIsJudging(false);
				}
			};
		};

		checkStatusAndConnect();

		// Cleanup on unmount
		return () => {
			isCancelled = true;
			if (eventSource) {
				eventSource.close();
			}
		};
	}, [submissionId, isJudging, router]);

	const verdictInfo = VERDICT_LABELS[verdict] || { label: verdict, color: "bg-gray-500" };

	let label = verdictInfo.label;
	if (verdict === "partial" && currentScore !== undefined) {
		label = `${verdictInfo.label} (${currentScore}점)`;
	} else if (verdict === "accepted" && currentScore !== undefined) {
		// max_score가 100이 아니거나, 받은 점수가 max_score가 아니면 점수 표시
		if (maxScore !== undefined && (maxScore !== 100 || currentScore !== maxScore)) {
			label = `${verdictInfo.label} (${currentScore}점)`;
		}
	}

	return (
		<Badge className={`${verdictInfo.color} hover:${verdictInfo.color}`}>
			{isJudging && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
			{label}
		</Badge>
	);
}
