import "server-only"

import { readFile } from "node:fs/promises"
import path from "node:path"
import { cache } from "react"

import { legalDocumentRegistry } from "./legal.registry"
import type { LegalDocument, LegalDocumentType, LegalLocale } from "./legal.types"
import { assertPublishable, assertTranslationPair, isLegalDocument, isLegalLocale, parseLegalMarkdown } from "./legal.validation"

const contentDirectory = path.join(process.cwd(), "src", "content", "legal")

async function readRegisteredDocument(document: LegalDocumentType, locale: LegalLocale): Promise<LegalDocument> {
	const entry = legalDocumentRegistry[document][locale]
	const filePath = path.join(contentDirectory, entry.fileName)
	let source: string

	try {
		source = await readFile(filePath, "utf8")
	} catch (error) {
		throw new Error(`Unable to read registered legal document ${entry.fileName}`, { cause: error })
	}

	const result = parseLegalMarkdown(source, entry.fileName)
	if (result.frontMatter.document !== document || result.frontMatter.locale !== locale || result.frontMatter.version !== entry.currentVersion) {
		throw new Error(`Legal registry/front-matter mismatch in ${entry.fileName}`)
	}
	return result
}

const loadCached = cache(async (document: LegalDocumentType, locale: LegalLocale) => {
	const [selected, counterpart] = await Promise.all([
		readRegisteredDocument(document, locale),
		readRegisteredDocument(document, locale === "vi" ? "en" : "vi"),
	])
	assertTranslationPair(locale === "vi" ? selected : counterpart, locale === "en" ? selected : counterpart)
	assertPublishable(selected)
	return selected
})

export async function loadLegalDocument(document: string, locale: string): Promise<LegalDocument> {
	if (!isLegalDocument(document) || !isLegalLocale(locale)) {
		throw new Error(`Unsupported legal document selection: document=${document}, locale=${locale}`)
	}
	return loadCached(document, locale)
}
