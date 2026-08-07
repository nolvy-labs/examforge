import DOMPurify from "dompurify"
import katex from "katex"

export const SAFE_LINK_PROTOCOLS = ["https", "mailto"] as const

export function normalizeLinkUrl(value: string) {
	const trimmed = value.trim()
	if (!trimmed) return { value: "", error: null }
	try {
		const url = new URL(trimmed)
		if (url.protocol === "https:" || url.protocol === "mailto:") {
			return { value: url.toString(), error: null }
		}
	} catch {
		// The contextual control reports a concise validation message below.
	}
	return { value: trimmed, error: "Use an https:// or mailto: URL." }
}

export function validateLatex(value: string, displayMode: boolean) {
	if (!value.trim()) return "Enter a LaTeX expression."
	try {
		katex.renderToString(value, { displayMode, throwOnError: true, trust: false })
		return null
	} catch (error) {
		return error instanceof Error
			? error.message.replace(/^KaTeX parse error:\s*/i, "").slice(0, 180)
			: "Invalid LaTeX expression."
	}
}

export function sanitizeEditorHtml(value: string) {
	if (typeof window === "undefined" || !value) return value
	return DOMPurify.sanitize(value, {
		ALLOWED_TAGS: [
			"p",
			"br",
			"h2",
			"h3",
			"strong",
			"em",
			"u",
			"s",
			"ul",
			"ol",
			"li",
			"blockquote",
			"code",
			"pre",
			"a",
			"span",
			"div",
			"table",
			"thead",
			"tbody",
			"tr",
			"th",
			"td",
		],
		ALLOWED_ATTR: [
			"href",
			"target",
			"rel",
			"data-type",
			"data-latex",
			"colspan",
			"rowspan",
			"colwidth",
		],
		ALLOWED_URI_REGEXP: /^(?:https:|mailto:)/i,
	})
}
