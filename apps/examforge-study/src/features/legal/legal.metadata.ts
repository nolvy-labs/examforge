import type { Metadata } from "next"

import { loadLegalDocument } from "./legal-document.loader"
import type { LegalDocumentType, LegalLocale } from "./legal.types"

const descriptions = {
	vi: {
		terms: "Điều khoản điều chỉnh việc truy cập và sử dụng ExamForge Study.",
		privacy: "Cách ExamForge Study thu thập, sử dụng và bảo vệ dữ liệu cá nhân.",
		cookies: "Cách ExamForge Study sử dụng cookie và lưu trữ phía trình duyệt.",
	},
	en: {
		terms: "Terms governing access to and use of ExamForge Study.",
		privacy: "How ExamForge Study collects, uses, and protects personal data.",
		cookies: "How ExamForge Study uses cookies and browser-side storage.",
	},
} as const

export async function createLegalMetadata(document: LegalDocumentType, locale: LegalLocale): Promise<Metadata> {
	const policy = await loadLegalDocument(document, locale)
	const path = `/legal/${document}`
	return {
		title: policy.frontMatter.title,
		description: descriptions[locale][document],
		robots: { index: true, follow: true },
		alternates: {
			canonical: path,
		},
	}
}
