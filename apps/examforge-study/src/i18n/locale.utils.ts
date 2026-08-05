import {
	DEFAULT_LOCALE,
	SUPPORTED_LOCALES,
} from "@/i18n/locale.constants"
import type { Locale } from "@/i18n/locale.type"

export function isLocale(value: unknown): value is Locale {
	return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale)
}

interface LanguagePreference {
	language: string
	quality: number
	position: number
}

function parseAcceptLanguage(value: string): LanguagePreference[] {
	return value
		.split(",")
		.map((entry, position) => {
			const [rawLanguage, ...parameters] = entry.trim().split(";")
			let quality = 1

			for (const parameter of parameters) {
				const match = /^q\s*=\s*(0(?:\.\d{0,3})?|1(?:\.0{0,3})?)$/i.exec(parameter.trim())
				if (match) quality = Number(match[1])
				else if (/^q\s*=/i.test(parameter.trim())) quality = 0
			}

			return {
				language: rawLanguage.toLowerCase(),
				quality,
				position,
			}
		})
		.filter(({ language, quality }) => Boolean(language) && quality > 0)
		.sort((left, right) => right.quality - left.quality || left.position - right.position)
}

export function resolveLocale(
	cookieLocale: string | null | undefined,
	acceptLanguage: string | null | undefined
): Locale {
	if (isLocale(cookieLocale)) return cookieLocale

	for (const preference of parseAcceptLanguage(acceptLanguage ?? "")) {
		const baseLanguage = preference.language.split("-")[0]
		if (baseLanguage === "vi") return "vi"
		if (baseLanguage === "en" || preference.language === "*") return "en"
	}

	return DEFAULT_LOCALE
}
