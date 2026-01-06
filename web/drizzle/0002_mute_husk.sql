-- Create ENUMs if not exists
DO $$ BEGIN
    CREATE TYPE "public"."contest_visibility" AS ENUM('public', 'private');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."input_method" AS ENUM('stdin', 'args');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."problem_type" AS ENUM('icpc', 'special_judge', 'anigma');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."scoreboard_type" AS ENUM('basic', 'spotboard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add ENUM values if not exists (must be outside transaction)
DO $$ BEGIN
    ALTER TYPE "public"."verdict" ADD VALUE IF NOT EXISTS 'skipped';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."verdict" ADD VALUE IF NOT EXISTS 'presentation_error';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."verdict" ADD VALUE IF NOT EXISTS 'fail';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE "public"."verdict" ADD VALUE IF NOT EXISTS 'partial';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create tables if not exists
CREATE TABLE IF NOT EXISTS "contest_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"contest_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "contest_problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"contest_id" integer NOT NULL,
	"problem_id" integer NOT NULL,
	"label" text NOT NULL,
	"order" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS "contests" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"freeze_minutes" integer DEFAULT 60,
	"is_frozen" boolean DEFAULT false,
	"visibility" "contest_visibility" DEFAULT 'public' NOT NULL,
	"scoreboard_type" "scoreboard_type" DEFAULT 'basic' NOT NULL,
	"penalty_minutes" integer DEFAULT 20 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "playground_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"path" text NOT NULL,
	"minio_path" text NOT NULL,
	"is_directory" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "playground_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" integer NOT NULL,
	"name" text DEFAULT 'Untitled' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_settings_key_unique" UNIQUE("key")
);

-- Rename column if exists
DO $$ BEGIN
    ALTER TABLE "submissions" RENAME COLUMN "compile_error" TO "error_message";
EXCEPTION
    WHEN undefined_column THEN null;
    WHEN others THEN null;
END $$;

-- Alter columns
DO $$ BEGIN
    ALTER TABLE "problems" ALTER COLUMN "memory_limit" SET DEFAULT 512;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_column THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ALTER COLUMN "rating" SET DEFAULT 0;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN undefined_column THEN null;
END $$;

-- Add columns if not exists
DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "max_score" integer DEFAULT 100 NOT NULL;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "problem_type" "problem_type" DEFAULT 'icpc' NOT NULL;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "checker_path" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "validator_path" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "input_method" "input_method" DEFAULT 'stdin';
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "reference_code_path" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "solution_code_path" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "problems" ADD COLUMN IF NOT EXISTS "allowed_languages" text[];
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "zip_path" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "is_multifile" boolean DEFAULT false;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "passed_testcases" integer DEFAULT 0;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "total_testcases" integer DEFAULT 0;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "edit_distance" integer;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "anigma_task_type" integer;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "anigma_input_path" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "submissions" ADD COLUMN IF NOT EXISTS "contest_id" integer;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" text NOT NULL DEFAULT '';
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "playground_access" boolean DEFAULT false;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contest_account_only" boolean DEFAULT false;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "contest_id" integer;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_id" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider" text;
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- Add foreign key constraints if not exists
DO $$ BEGIN
    ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_contest_id_contests_id_fk" 
        FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "contest_participants" ADD CONSTRAINT "contest_participants_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_contest_id_contests_id_fk" 
        FOREIGN KEY ("contest_id") REFERENCES "public"."contests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "contest_problems" ADD CONSTRAINT "contest_problems_problem_id_problems_id_fk" 
        FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "playground_files" ADD CONSTRAINT "playground_files_session_id_playground_sessions_id_fk" 
        FOREIGN KEY ("session_id") REFERENCES "public"."playground_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "playground_sessions" ADD CONSTRAINT "playground_sessions_user_id_users_id_fk" 
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
END $$;

-- Create unique indexes if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "unique_session_path" ON "playground_files" USING btree ("session_id","path");

-- Add unique constraints if not exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_username_unique'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_id_unique'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_auth_id_unique" UNIQUE("auth_id");
    END IF;
END $$;
