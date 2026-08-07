import { Mathematics } from "@tiptap/extension-mathematics"
import { TableKit } from "@tiptap/extension-table"
import { Placeholder } from "@tiptap/extensions"
import StarterKit from "@tiptap/starter-kit"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"

export interface MathNodeTarget {
	kind: "inline" | "block"
	latex: string
	pos: number
}

interface Options {
	placeholder?: string
	onMathClick?: (target: MathNodeTarget) => void
	openLinks?: boolean
}

export function createRichTextExtensions({
	placeholder = "Write exam content…",
	onMathClick,
	openLinks = false,
}: Options = {}) {
	const target = (kind: MathNodeTarget["kind"]) => (node: ProseMirrorNode, pos: number) =>
		onMathClick?.({ kind, pos, latex: String(node.attrs.latex ?? "") })

	return [
		StarterKit.configure({
			heading: { levels: [2, 3] },
			link: {
				autolink: true,
				openOnClick: openLinks,
				protocols: ["https", "mailto"],
				HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" },
			},
		}),
		Mathematics.configure({
			inlineOptions: { onClick: target("inline") },
			blockOptions: { onClick: target("block") },
			katexOptions: { throwOnError: false, trust: false },
		}),
		TableKit.configure({ table: { resizable: false, allowTableNodeSelection: true } }),
		Placeholder.configure({ placeholder }),
	]
}
