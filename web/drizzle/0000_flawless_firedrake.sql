-- Create ENUMs if not exists
DO $$ BEGIN
    CREATE TYPE "public"."language" AS ENUM('c', 'cpp', 'python', 'java');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."verdict" AS ENUM('pending', 'judging', 'accepted', 'wrong_answer', 'time_limit_exceeded', 'memory_limit_exceeded', 'runtime_error', 'compile_error', 'system_error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tables if not exists
CREATE TABLE IF NOT EXISTS "problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"time_limit" integer DEFAULT 1000 NOT NULL,
	"memory_limit" integer DEFAULT 256 NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"author_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "submission_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"submission_id" integer NOT NULL,
	"testcase_id" integer NOT NULL,
	"verdict" "verdict" NOT NULL,
	"execution_time" integer,
	"memory_used" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"code" text NOT NULL,
	"language" "language" NOT NULL,
	"verdict" "verdict" DEFAULT 'pending' NOT NULL,
	"execution_time" integer,
	"memory_used" integer,
	"compile_error" text,
	"score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "testcases" (
	"id" serial PRIMARY KEY NOT NULL,
	"problem_id" integer NOT NULL,
	"input_path" text NOT NULL,
	"output_path" text NOT NULL,
	"subtask_group" integer DEFAULT 0,
	"is_hidden" boolean DEFAULT true NOT NULL,
	"score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"rating" integer DEFAULT 1500,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints if not exists
DO $$ BEGIN
    ALTER TABLE "problems" ADD CONSTRAINT "problems_author_id_users_id_fk" 
        FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_submission_id_submissions_id_fk" 
        FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submission_results" ADD CONSTRAINT "submission_results_testcase_id_testcases_id_fk" 
        FOREIGN KEY ("testcase_id") REFERENCES "public"."testcases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD CONSTRAINT "submissions_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD CONSTRAINT "submissions_problem_id_problems_id_fk" 
        FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "testcases" ADD CONSTRAINT "testcases_problem_id_problems_id_fk" 
        FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

-- Add unique constraint if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
    END IF;
END $$;
