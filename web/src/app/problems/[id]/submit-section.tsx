"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { submitAnigmaCode } from "@/actions/anigma-submissions";
import { submitCode } from "@/actions/submissions";
import { AnigmaSubmit } from "@/components/problems/anigma-submit";
import { CodeSubmit } from "@/components/problems/code-submit";
import { Button } from "@/components/ui/button";
import type { Language, ProblemType } from "@/db/schema";

interface ProblemSubmitSectionProps {
	problemId: number;
	problemType: ProblemType;
	allowedLanguages?: string[] | null;
}

export function ProblemSubmitSection({
	problemId,
	problemType,
	allowedLanguages,
}: ProblemSubmitSectionProps) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async (code: string, language: Language) => {
		if (!session?.user) {
			router.push("/login");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const result = await submitCode({
				problemId,
				code,
				language,
				userId: parseInt(session.user.id, 10),
			});

			if (result.error) {
				setError(result.error);
			} else if (result.submissionId) {
				router.push(`/submissions/${result.submissionId}`);
			}
		} catch {
			setError("제출 중 오류가 발생했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleAnigmaSubmit = async (file: File) => {
		if (!session?.user) {
			router.push("/login");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		try {
			const result = await submitAnigmaCode({
				problemId,
				zipFile: file,
				userId: parseInt(session.user.id, 10),
			});

			if (result.error) {
				setError(result.error);
			} else if (result.submissionId) {
				router.push(`/submissions/${result.submissionId}`);
			}
		} catch {
			setError("제출 중 오류가 발생했습니다.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (status === "loading") {
		return (
			<div className="flex items-center justify-center py-12 text-muted-foreground">로딩 중...</div>
		);
	}

	if (!session?.user) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground mb-4">코드를 제출하려면 로그인이 필요합니다.</p>
				<Button asChild>
					<Link href="/login">로그인</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{error && (
				<div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">{error}</div>
			)}

			{problemType === "anigma" ? (
				<AnigmaSubmit onSubmit={handleAnigmaSubmit} isSubmitting={isSubmitting} />
			) : (
				<CodeSubmit
					onSubmit={handleSubmit}
					isSubmitting={isSubmitting}
					allowedLanguages={allowedLanguages}
				/>
			)}
		</div>
	);
}
