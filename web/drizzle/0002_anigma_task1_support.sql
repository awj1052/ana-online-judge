-- Add solutionCodePath to problems table for Anigma Task 1
ALTER TABLE "problems" ADD COLUMN "solution_code_path" TEXT;

-- Add anigma task type and input path to submissions table
ALTER TABLE "submissions" ADD COLUMN "anigma_task_type" INTEGER;
ALTER TABLE "submissions" ADD COLUMN "anigma_input_path" TEXT;



