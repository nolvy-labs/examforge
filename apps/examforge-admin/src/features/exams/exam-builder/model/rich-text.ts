import {
	RICH_TEXT_FORMAT,
	RICH_TEXT_PERSISTENCE_MARKER,
} from "./builder.constants"
import type { RichTextValue } from "./builder.types"

const MATH_NODE_PATTERN = /<(?:span|div)\b[^>]*data-type=["'](?:inline-math|block-math)["'][^>]*data-latex=["']([^"']+)["'][^>]*>/i

function escapeHtml(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;")
}

function decodeTextEntities(value: string) {
	return value
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 10))
		)
		.replace(/&#x([\da-f]+);/gi, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16))
		)
		.replaceAll("&nbsp;", " ")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&amp;", "&")
}

export function plainTextToRichText(value: string): RichTextValue {
	const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n")
	if (normalized.trim().length === 0) {
		return { format: RICH_TEXT_FORMAT, html: "" }
	}

	const paragraphs = normalized.split(/\n{2,}/).map((paragraph) =>
		`<p>${escapeHtml(paragraph).replaceAll("\n", "<br>")}</p>`
	)
	return { format: RICH_TEXT_FORMAT, html: paragraphs.join("") }
}

export function persistedStringToRichText(value: string): RichTextValue {
	if (!value.startsWith(RICH_TEXT_PERSISTENCE_MARKER)) {
		return plainTextToRichText(value)
	}

	const richText = {
		format: RICH_TEXT_FORMAT,
		html: value.slice(RICH_TEXT_PERSISTENCE_MARKER.length),
	} satisfies RichTextValue

	return isRichTextEmpty(richText)
		? { format: RICH_TEXT_FORMAT, html: "" }
		: richText
}

export function richTextToPersistedString(value: RichTextValue) {
	return isRichTextEmpty(value)
		? ""
		: `${RICH_TEXT_PERSISTENCE_MARKER}${value.html}`
}

export function richTextToPlainText(value: RichTextValue) {
	return decodeTextEntities(
		value.html
			.replace(/<!--[^]*?-->/g, "")
			.replace(/<(?:br|\/p|\/div|\/li|\/h[1-6])\s*\/?>/gi, "\n")
			.replace(/<[^>]*>/g, "")
	)
		.replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, " ")
		.trim()
}

export function isRichTextEmpty(value: RichTextValue) {
	const math = MATH_NODE_PATTERN.exec(value.html)?.[1]
	if (math && decodeTextEntities(math).trim().length > 0) {
		return false
	}

	return richTextToPlainText(value).length === 0
}

export function cloneRichText(value: RichTextValue): RichTextValue {
	return { format: value.format, html: value.html }
}

export function editorHtmlToRichText(html: string): RichTextValue {
	const value = { format: RICH_TEXT_FORMAT, html } satisfies RichTextValue
	return isRichTextEmpty(value) ? { format: RICH_TEXT_FORMAT, html: "" } : value
}
