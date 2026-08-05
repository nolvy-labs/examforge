import type { SUPPORTED_LOCALES } from "@/i18n/locale.constants"

export type Locale = (typeof SUPPORTED_LOCALES)[number]

type LeafPaths<T, Prefix extends string = ""> = {
	[K in keyof T & string]: T[K] extends string
		? `${Prefix}${K}`
		: T[K] extends Record<string, unknown>
			? LeafPaths<T[K], `${Prefix}${K}.`>
			: never
}[keyof T & string]

export type LocaleMessageId = LeafPaths<typeof import("../../messages/en.json")>

