/**
 * Study-side compatibility contract for Admin's canonical Tiptap schema.
 *
 * Canonical source:
 * apps/examforge-admin/src/features/exams/exam-builder/components/rich-text/
 * rich-text-editor.extensions.ts and rich-text-editor.utils.ts
 *
 * Admin uses Tiptap 3.29.2 with StarterKit (h2/h3), Mathematics, TableKit,
 * and the editor-only Placeholder extension. Persisted HTML is prefixed with
 * this marker; math is represented by the two data-type/data-latex nodes.
 */
export const RICH_TEXT_PERSISTENCE_MARKER = "<!--examforge-rich:v1-->"

export const RICH_TEXT_TAGS = [
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
	"hr",
	"code",
	"pre",
	"a",
	"span",
	"div",
	"table",
	"colgroup",
	"col",
	"thead",
	"tbody",
	"tr",
	"th",
	"td",
] as const

export const RICH_TEXT_ATTRIBUTES: Record<string, string[]> = {
	a: ["href", "target", "rel"],
	span: ["data-type", "data-latex"],
	div: ["data-type", "data-latex"],
	th: ["colspan", "rowspan", "colwidth"],
	td: ["colspan", "rowspan", "colwidth"],
}

export const INLINE_MATH_TYPE = "inline-math"
export const BLOCK_MATH_TYPE = "block-math"
