"use client"

import { useEffect } from "react"
import { Mathematics } from "@tiptap/extension-mathematics"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"

import { Button } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

import { RICH_TEXT_FORMAT } from "../../model/builder.constants"
import type { RichTextValue } from "../../model/builder.types"

interface Props {
	id: string
	label: string
	value: RichTextValue
	onChange: (value: RichTextValue) => void
	disabled?: boolean
	invalid?: boolean
}

export function RichTextEditor({ id, label, value, onChange, disabled, invalid }: Props) {
	const editor = useEditor({
		extensions: [
			StarterKit.configure({ link: { openOnClick: false, autolink: true, protocols: ["https", "mailto"] } }),
			Mathematics.configure({
				katexOptions: { throwOnError: false },
			}),
		],
		content: value.html,
		editable: !disabled,
		immediatelyRender: false,
		onUpdate: ({ editor: nextEditor }) =>
			onChange({ format: RICH_TEXT_FORMAT, html: nextEditor.isEmpty ? "" : nextEditor.getHTML() }),
	})

	useEffect(() => {
		if (!editor || editor.getHTML() === value.html) return
		editor.commands.setContent(value.html, { emitUpdate: false })
	}, [editor, value.html])

	useEffect(() => {
		editor?.setEditable(!disabled)
	}, [disabled, editor])

	if (!editor) return <div className="h-28 animate-pulse border bg-muted/30" aria-label={`Loading ${label}`} />

	function setLink() {
		if (!editor) return
		const current = editor.getAttributes("link").href as string | undefined
		const href = window.prompt("Enter an https:// or mailto: link", current ?? "https://")
		if (href === null) return
		if (!href) return void editor.chain().focus().unsetLink().run()
		if (!/^(https:\/\/|mailto:)/i.test(href)) return
		editor.chain().focus().extendMarkRange("link").setLink({ href }).run()
	}

	function insertMath(block: boolean) {
		if (!editor) return
		const latex = window.prompt(block ? "Block LaTeX" : "Inline LaTeX", "")
		if (!latex?.trim()) return
		if (block) editor.chain().focus().insertBlockMath({ latex: latex.trim() }).run()
		else editor.chain().focus().insertInlineMath({ latex: latex.trim() }).run()
	}

	function editSelectedMath() {
		if (!editor) return
		const selection = editor.state.selection
		const node = selection.$from.nodeAfter
		if (node?.type.name !== "inlineMath" && node?.type.name !== "blockMath") {
			window.alert("Select an existing formula first.")
			return
		}
		const latex = window.prompt("Edit LaTeX source", String(node.attrs.latex ?? ""))
		if (latex === null) return
		if (node.type.name === "blockMath") editor.commands.updateBlockMath({ latex: latex.trim(), pos: selection.from })
		else editor.commands.updateInlineMath({ latex: latex.trim(), pos: selection.from })
	}

	return (
		<div className={cn("border bg-background focus-within:ring-2 focus-within:ring-ring/50", invalid && "border-destructive")}>
		<div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-1 border-b p-1">
			<ToolbarButton label="Bold" active={editor.isActive("bold")} disabled={disabled} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
			<ToolbarButton label="Italic" active={editor.isActive("italic")} disabled={disabled} onClick={() => editor.chain().focus().toggleItalic().run()}><i>I</i></ToolbarButton>
			<ToolbarButton label="Heading" active={editor.isActive("heading", { level: 2 })} disabled={disabled} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
			<ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} disabled={disabled} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
			<ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} disabled={disabled} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
			<ToolbarButton label="Inline code" active={editor.isActive("code")} disabled={disabled} onClick={() => editor.chain().focus().toggleCode().run()}>Code</ToolbarButton>
			<ToolbarButton label="Code block" active={editor.isActive("codeBlock")} disabled={disabled} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{`{ }`}</ToolbarButton>
			<ToolbarButton label="Link" active={editor.isActive("link")} disabled={disabled} onClick={setLink}>Link</ToolbarButton>
			<ToolbarButton label="Inline formula" disabled={disabled} onClick={() => insertMath(false)}>ƒx</ToolbarButton>
			<ToolbarButton label="Block formula" disabled={disabled} onClick={() => insertMath(true)}>∑</ToolbarButton>
			<ToolbarButton label="Edit selected formula source" disabled={disabled} onClick={editSelectedMath}>Edit LaTeX</ToolbarButton>
		</div>
		<EditorContent id={id} editor={editor} aria-label={label} aria-invalid={invalid} className="exam-rich-text min-h-28 max-w-full overflow-x-auto p-3" />
	</div>
	)
}

function ToolbarButton({ label, active = false, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
	return <Button type="button" variant={active ? "secondary" : "ghost"} size="sm" aria-label={label} aria-pressed={active} disabled={disabled} onClick={onClick}>{children}</Button>
}
