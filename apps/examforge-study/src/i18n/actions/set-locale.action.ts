"use server"

import { cookies } from "next/headers"

import {
	LOCALE_COOKIE_MAX_AGE,
	LOCALE_COOKIE_NAME,
} from "@/i18n/locale.constants"
import type { Locale } from "@/i18n/locale.type"
import { isLocale } from "@/i18n/locale.utils"

export async function setLocale(locale: Locale) {
	if (!isLocale(locale)) {
		throw new Error("Invalid locale")
	}

	const cookieStore = await cookies()
	cookieStore.set(LOCALE_COOKIE_NAME, locale, {
		path: "/",
		sameSite: "lax",
		maxAge: LOCALE_COOKIE_MAX_AGE,
		secure: process.env.NODE_ENV === "production",
		httpOnly: false,
	})
}

