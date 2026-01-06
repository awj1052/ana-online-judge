"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { siteSettings } from "@/db/schema";
import {
	GOOGLE_REGISTRATION_OPEN_KEY,
	REGISTRATION_OPEN_KEY,
	requireAdmin,
} from "@/lib/auth-utils";

// 설정 조회
export async function getSiteSetting(key: string): Promise<string | null> {
	const setting = await db.select().from(siteSettings).where(eq(siteSettings.key, key)).limit(1);

	return setting.length > 0 ? setting[0].value : null;
}

// 설정 저장
export async function setSiteSetting(key: string, value: string) {
	await requireAdmin();

	await db
		.insert(siteSettings)
		.values({ key, value })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value, updatedAt: new Date() },
		});

	revalidatePath("/admin/settings");

	return { success: true };
}

// 일반 회원가입 on/off 토글
export async function toggleRegistration(enabled: boolean) {
	await requireAdmin();

	await db
		.insert(siteSettings)
		.values({ key: REGISTRATION_OPEN_KEY, value: enabled ? "true" : "false" })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value: enabled ? "true" : "false", updatedAt: new Date() },
		});

	revalidatePath("/admin/settings");
	revalidatePath("/login");
	revalidatePath("/register");

	return { success: true, enabled };
}

// 일반 회원가입 상태 조회
export async function getRegistrationStatus(): Promise<boolean> {
	const setting = await getSiteSetting(REGISTRATION_OPEN_KEY);
	// 설정이 없으면 기본적으로 열려있음
	return setting === null || setting === "true";
}

// 구글 회원가입 on/off 토글
export async function toggleGoogleRegistration(enabled: boolean) {
	await requireAdmin();

	await db
		.insert(siteSettings)
		.values({ key: GOOGLE_REGISTRATION_OPEN_KEY, value: enabled ? "true" : "false" })
		.onConflictDoUpdate({
			target: siteSettings.key,
			set: { value: enabled ? "true" : "false", updatedAt: new Date() },
		});

	revalidatePath("/admin/settings");
	revalidatePath("/login");
	revalidatePath("/register");

	return { success: true, enabled };
}

// 구글 회원가입 상태 조회
export async function getGoogleRegistrationStatus(): Promise<boolean> {
	const setting = await getSiteSetting(GOOGLE_REGISTRATION_OPEN_KEY);
	// 설정이 없으면 기본적으로 열려있음
	return setting === null || setting === "true";
}

export type GetRegistrationStatusReturn = Awaited<ReturnType<typeof getRegistrationStatus>>;
export type ToggleRegistrationReturn = Awaited<ReturnType<typeof toggleRegistration>>;
