import matter from "gray-matter"
import { z } from "zod"

import { LEGAL_DOCUMENTS, LEGAL_LOCALES, type LegalDocument, type LegalDocumentType, type LegalLocale } from "./legal.types"

const isoDate = /^\d{4}-\d{2}-\d{2}$/

const frontMatterSchema = z.object({
	title: z.string().min(1),
	document: z.enum(LEGAL_DOCUMENTS),
	locale: z.enum(LEGAL_LOCALES),
	version: z.string().regex(/^\d+\.\d+$/),
	effectiveDate: z.string().regex(isoDate),
	lastUpdated: z.string().regex(isoDate),
}).strict()

const placeholderPattern = /\[[^\]\n]*(?:TÊN|ĐỊA CHỈ|EMAIL|XÁC NHẬN|CONFIRM|ADDRESS|OPERATOR|PROVIDER|COOKIE_NAME|COOKIE,|_KEY|_KEYS|TTL|LIFETIME|HOST\/LOAD)[^\]\n]*\]/giu
const draftNoticePattern = /^>\s*\*\*(?:Cần hoàn thiện trước khi phát hành|Complete before publication):\*\*.*(?:\r?\n|$)/gimu

export function resolveLegalLocale(value: string | string[] | undefined): LegalLocale {
	return value === "en" || value === "vi" ? value : "vi"
}

export function isLegalDocument(value: string): value is LegalDocumentType {
	return LEGAL_DOCUMENTS.includes(value as LegalDocumentType)
}

export function isLegalLocale(value: string): value is LegalLocale {
	return LEGAL_LOCALES.includes(value as LegalLocale)
}

export function findLegalPlaceholders(markdown: string): string[] {
	return [...new Set(markdown.match(placeholderPattern) ?? [])]
}

export function parseLegalMarkdown(source: string, sourceName: string): LegalDocument {
	let parsed: matter.GrayMatterFile<string>
	try {
		parsed = matter(source)
	} catch (error) {
		throw new Error(`Invalid legal front matter in ${sourceName}`, { cause: error })
	}

	const result = frontMatterSchema.safeParse(parsed.data)
	if (!result.success) {
		throw new Error(`Invalid legal front matter in ${sourceName}: ${z.prettifyError(result.error)}`)
	}

	return {
		frontMatter: result.data,
		content: parsed.content.replace(draftNoticePattern, "").trim(),
		placeholders: findLegalPlaceholders(parsed.content),
	}
}

export function assertTranslationPair(vi: LegalDocument, en: LegalDocument): void {
	for (const field of ["document", "version", "effectiveDate"] as const) {
		if (vi.frontMatter[field] !== en.frontMatter[field]) {
			throw new Error(`Legal translation mismatch for ${vi.frontMatter.document}: ${field}`)
		}
	}
}

export function assertPublishable(document: LegalDocument, environment = process.env.NODE_ENV): void {
	if (environment === "production" && document.placeholders.length > 0) {
		throw new Error(`Cannot publish ${document.frontMatter.document} ${document.frontMatter.locale} v${document.frontMatter.version}: unresolved legal placeholders: ${document.placeholders.join(", ")}`)
	}
}
