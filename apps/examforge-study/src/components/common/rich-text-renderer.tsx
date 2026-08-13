import katex from "katex"
import sanitizeHtml from "sanitize-html"

import { cn } from "@/lib/utils"

import {
	BLOCK_MATH_TYPE,
	INLINE_MATH_TYPE,
	RICH_TEXT_ATTRIBUTES,
	RICH_TEXT_PERSISTENCE_MARKER,
	RICH_TEXT_TAGS,
} from "./rich-text.contract"

export interface RichTextRendererProps {
	content?: string | null
	className?: string
}

const renderedContentCache = new Map<string, string | null>()
const MAX_CACHE_ENTRIES = 100

function escapeAttribute(value: string) {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll('"', "&quot;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
}

function decodeHtmlEntities(value: string) {
	return value
		.replace(/&#(\d+);/g, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 10))
		)
		.replace(/&#x([\da-f]+);/gi, (_, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16))
		)
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&amp;", "&")
}

function safeLinkAttributes(attribs: Record<string, string>): Record<string, string> {
	const href = attribs.href?.trim()
	if (!href) return {}

	try {
		const url = new URL(href)
		if (url.protocol === "https:" && url.hostname) {
			return { href: url.toString(), target: "_blank", rel: "noopener noreferrer" }
		}
		if (url.protocol === "mailto:") return { href: url.toString() }
	} catch {
		// Malformed and relative URLs are outside the canonical Admin contract.
	}
	return {}
}

function safeMathAttributes(
	attribs: Record<string, string>,
	expectedType: typeof INLINE_MATH_TYPE | typeof BLOCK_MATH_TYPE
): Record<string, string> {
	return attribs["data-type"] === expectedType && attribs["data-latex"] != null
		? { "data-type": expectedType, "data-latex": attribs["data-latex"] }
		: {}
}

function sanitizeAdminHtml(content: string) {
	const withoutMarker = content.startsWith(RICH_TEXT_PERSISTENCE_MARKER)
		? content.slice(RICH_TEXT_PERSISTENCE_MARKER.length)
		: content

	return sanitizeHtml(withoutMarker, {
		allowedTags: [...RICH_TEXT_TAGS],
		allowedAttributes: RICH_TEXT_ATTRIBUTES,
		allowedSchemes: ["https", "mailto"],
		allowProtocolRelative: false,
		disallowedTagsMode: "discard",
		parseStyleAttributes: false,
		transformTags: {
			a: (_tagName, attribs) => ({ tagName: "a", attribs: safeLinkAttributes(attribs) }),
			span: (_tagName, attribs) => ({
				tagName: "span",
				attribs: safeMathAttributes(attribs, INLINE_MATH_TYPE),
			}),
			div: (_tagName, attribs) => ({
				tagName: "div",
				attribs: safeMathAttributes(attribs, BLOCK_MATH_TYPE),
			}),
		},
	})
}

function renderMathNode(latexAttribute: string, displayMode: boolean) {
	const latex = decodeHtmlEntities(latexAttribute)
	const type = displayMode ? BLOCK_MATH_TYPE : INLINE_MATH_TYPE
	const tag = displayMode ? "div" : "span"
	const className = displayMode
		? "tiptap-mathematics-render rich-text-block-math"
		: "tiptap-mathematics-render rich-text-inline-math"
	let rendered: string
	try {
		rendered = katex.renderToString(latex, {
			displayMode,
			throwOnError: false,
			trust: false,
			strict: "warn",
			output: "htmlAndMathml",
		})
	} catch {
		rendered = `<span class="rich-text-math-error">${escapeAttribute(latex)}</span>`
	}

	return `<${tag} class="${className}" data-type="${type}" data-latex="${escapeAttribute(latex)}">${rendered}</${tag}>`
}

function renderMathNodes(html: string) {
	return html
		.replace(
			/<span data-type="inline-math" data-latex="([^"]*)"><\/span>/gi,
			(_node, latex: string) => renderMathNode(latex, false)
		)
		.replace(
			/<div data-type="block-math" data-latex="([^"]*)"><\/div>/gi,
			(_node, latex: string) => renderMathNode(latex, true)
		)
}

function isSemanticallyEmpty(html: string) {
	if (/<(?:table|hr|pre)\b|data-type="(?:inline-math|block-math)"/i.test(html)) {
		return false
	}

	const text = decodeHtmlEntities(
		html.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "")
	).replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, "")

	return text.length === 0
}

export function richTextToPlainText(content?: string | null) {
	if (!content) return ""
	return decodeHtmlEntities(
		sanitizeAdminHtml(content.trim())
			.replace(/<(?:span|div) data-type="(?:inline-math|block-math)" data-latex="([^"]*)"><\/(?:span|div)>/gi, " $1 ")
			.replace(/<(?:br|\/p|\/div|\/li|\/h[23]|\/blockquote|\/pre|\/th|\/td|\/tr)\s*\/?>/gi, " ")
			.replace(/<[^>]*>/g, "")
	)
		.replace(/[\s\u200B\u200C\u200D\uFEFF]+/g, " ")
		.trim()
}

/** Exported for focused security/contract tests; consumers should use the component. */
export function renderRichTextHtml(content?: string | null) {
	if (content == null) return null
	const cached = renderedContentCache.get(content)
	if (cached !== undefined || renderedContentCache.has(content)) return cached ?? null

	const sanitized = sanitizeAdminHtml(content.trim())
	const rendered = !sanitized || isSemanticallyEmpty(sanitized)
		? null
		: renderMathNodes(sanitized)

	if (renderedContentCache.size >= MAX_CACHE_ENTRIES) {
		const oldest = renderedContentCache.keys().next().value
		if (oldest !== undefined) renderedContentCache.delete(oldest)
	}
	renderedContentCache.set(content, rendered)
	return rendered
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
	const html = renderRichTextHtml(content)
	if (!html) return null

	return (
		<div
			className={cn("rich-text-renderer", className)}
			dangerouslySetInnerHTML={{ __html: html }}
		/>
	)
}
