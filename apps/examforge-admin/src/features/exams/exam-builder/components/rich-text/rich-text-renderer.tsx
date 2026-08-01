"use client"

import { useEffect } from "react"
import DOMPurify from "dompurify"
import { Mathematics } from "@tiptap/extension-mathematics"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import type { RichTextValue } from "../../model/builder.types"

interface Props { value: RichTextValue | null; label?: string }

export function RichTextRenderer({ value, label = "Rich text content" }: Props) {
	const sanitized = typeof window === "undefined" || !value?.html
		? ""
		: DOMPurify.sanitize(value.html, {
			ADD_ATTR: ["data-type", "data-latex"],
			ALLOWED_URI_REGEXP: /^(?:https:|mailto:)/i,
		})
	const editor = useEditor({
		extensions: [StarterKit.configure({ link: { openOnClick: true, protocols: ["https", "mailto"] } }), Mathematics.configure({ katexOptions: { throwOnError: false } })],
		content: sanitized,
		editable: false,
		immediatelyRender: false,
	})
	useEffect(() => {
		if (editor && editor.getHTML() !== sanitized) editor.commands.setContent(sanitized, { emitUpdate: false })
	}, [editor, sanitized])
	if (!sanitized) return <p className="text-sm italic text-muted-foreground">No content.</p>
	return <EditorContent editor={editor} aria-label={label} className="exam-rich-text max-w-full overflow-x-auto" />
}
