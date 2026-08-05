export const LEGAL_DOCUMENTS = ["terms", "privacy", "cookies"] as const
export const LEGAL_LOCALES = ["vi", "en"] as const

export type LegalDocumentType = (typeof LEGAL_DOCUMENTS)[number]
export type LegalLocale = (typeof LEGAL_LOCALES)[number]

export interface LegalFrontMatter {
	title: string
	document: LegalDocumentType
	locale: LegalLocale
	version: string
	effectiveDate: string
	lastUpdated: string
}

export interface LegalDocument {
	frontMatter: LegalFrontMatter
	content: string
	placeholders: string[]
}
