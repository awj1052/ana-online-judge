import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { submissionResults, submissions } from "@/db/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const submissionId = parseInt(id, 10);

	if (Number.isNaN(submissionId)) {
		return NextResponse.json({ error: "Invalid submission ID" }, { status: 400 });
	}

	const [submission] = await db
		.select({
			id: submissions.id,
			verdict: submissions.verdict,
			executionTime: submissions.executionTime,
			memoryUsed: submissions.memoryUsed,
			score: submissions.score,
			editDistance: submissions.editDistance,
		})
		.from(submissions)
		.where(eq(submissions.id, submissionId))
		.limit(1);

	if (!submission) {
		return NextResponse.json({ error: "Submission not found" }, { status: 404 });
	}

	// Check if judging is complete
	const isComplete = submission.verdict !== "pending" && submission.verdict !== "judging";

	// Get testcase results if judging is complete
	const testcaseResults = isComplete
		? await db
				.select({
					verdict: submissionResults.verdict,
					executionTime: submissionResults.executionTime,
					memoryUsed: submissionResults.memoryUsed,
				})
				.from(submissionResults)
				.where(eq(submissionResults.submissionId, submissionId))
				.orderBy(submissionResults.testcaseId)
		: [];

	return NextResponse.json({
		...submission,
		testcaseResults,
		isComplete,
	});
}
