"use client"

import { useEffect, useMemo, useState } from "react"
import { EditorContent, useEditor } from "@tiptap/react"

import type { RichTextValue } from "../../model/builder.types"
import { createRichTextExtensions } from "./rich-text-editor.extensions"
import { sanitizeEditorHtml } from "./rich-text-editor.utils"

interface Props {
	value: RichTextValue | null
	label?: string
}

export function RichTextRenderer({ value, label = "Rich text content" }: Props) {
	const [sanitized, setSanitized] = useState("")
	const extensions = useMemo(() => createRichTextExtensions({ openLinks: true }), [])
	const editor = useEditor({
		extensions,
		content: sanitized,
		editable: false,
		immediatelyRender: false,
	})
	useEffect(() => setSanitized(sanitizeEditorHtml(value?.html ?? "")), [value?.html])
	useEffect(() => {
		if (editor && editor.getHTML() !== sanitized)
			editor.commands.setContent(sanitized, { emitUpdate: false })
	}, [editor, sanitized])
	if (!sanitized) return <p className="text-sm italic text-muted-foreground">No content.</p>
	return (
		<EditorContent
			editor={editor}
			aria-label={label}
			className="exam-rich-text max-w-full overflow-x-auto"
		/>
	)
}
