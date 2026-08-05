import type { LegalDocumentType, LegalLocale } from "./legal.types"

export const legalDocumentRegistry = {
	terms: {
		vi: { currentVersion: "1.0", fileName: "terms-v1.0.vi.md" },
		en: { currentVersion: "1.0", fileName: "terms-v1.0.en.md" },
	},
	privacy: {
		vi: { currentVersion: "1.0", fileName: "privacy-v1.0.vi.md" },
		en: { currentVersion: "1.0", fileName: "privacy-v1.0.en.md" },
	},
	cookies: {
		vi: { currentVersion: "1.0", fileName: "cookies-v1.0.vi.md" },
		en: { currentVersion: "1.0", fileName: "cookies-v1.0.en.md" },
	},
} as const satisfies Record<LegalDocumentType, Record<LegalLocale, {
	currentVersion: string
	fileName: string
}>>
