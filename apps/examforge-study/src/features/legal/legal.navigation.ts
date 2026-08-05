import type { LegalDocumentType, LegalLocale } from "./legal.types"

export const legalUi = {
	vi: {
		back: "Về trang chủ", navigation: "Tài liệu pháp lý", language: "Chọn ngôn ngữ",
		version: "Phiên bản", effectiveDate: "Ngày hiệu lực", lastUpdated: "Cập nhật lần cuối",
		draftTitle: "Bản dự thảo — chưa được phát hành",
		draftDescription: "Tài liệu còn thông tin pháp lý cần chủ sở hữu xác nhận. Bản production sẽ từ chối phát hành cho đến khi hoàn tất.",
		documents: { terms: "Điều khoản", privacy: "Quyền riêng tư", cookies: "Cookie" },
	},
	en: {
		back: "Back to home", navigation: "Legal documents", language: "Choose language",
		version: "Version", effectiveDate: "Effective date", lastUpdated: "Last updated",
		draftTitle: "Draft — not published",
		draftDescription: "This document contains legal facts that the owner must confirm. Production publication is blocked until they are resolved.",
		documents: { terms: "Terms", privacy: "Privacy", cookies: "Cookies" },
	},
} as const

export function legalHref(document: LegalDocumentType, locale: LegalLocale) {
	return `/legal/${document}?lang=${locale}`
}
