import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { serverEnv } from "@/lib/env";

// For query purposes
const queryClient = postgres(serverEnv.DATABASE_URL);
export const db = drizzle(queryClient, { schema });

// Export schema for convenience
export * from "./schema";

