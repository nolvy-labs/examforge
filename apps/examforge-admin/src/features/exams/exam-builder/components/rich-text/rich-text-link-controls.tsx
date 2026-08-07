"use client"

import { useEffect, useId, useState } from "react"
import type { Editor } from "@tiptap/core"

import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { Label } from "@/components/shadcn/label"

import { normalizeLinkUrl } from "./rich-text-editor.utils"

export interface LinkEditTarget {
	from: number
	to: number
	href: string
}

export function RichTextLinkControls({
	editor,
	target,
	onClose,
}: {
	editor: Editor
	target: LinkEditTarget | null
	onClose: () => void
}) {
	const id = useId()
	const [draft, setDraft] = useState(target?.href ?? "https://")
	const [error, setError] = useState<string | null>(null)
	useEffect(() => {
		if (target) {
			setDraft(target.href || "https://")
			setError(null)
		}
	}, [target])
	if (!target) return null

	function apply() {
		const normalized = normalizeLinkUrl(draft)
		if (normalized.error) return setError(normalized.error)
		const chain = editor.chain().focus().setTextSelection({ from: target!.from, to: target!.to })
		if (normalized.value) chain.extendMarkRange("link").setLink({ href: normalized.value }).run()
		else chain.extendMarkRange("link").unsetLink().run()
		onClose()
	}

	function remove() {
		editor
			.chain()
			.focus()
			.setTextSelection({ from: target!.from, to: target!.to })
			.extendMarkRange("link")
			.unsetLink()
			.run()
		onClose()
	}

	return (
		<div role="dialog" aria-label="Edit link" className="grid gap-2 border-b bg-muted/20 p-3">
			<Label htmlFor={id}>Link URL</Label>
			<Input
				id={id}
				value={draft}
				aria-invalid={Boolean(error)}
				aria-describedby={error ? `${id}-error` : undefined}
				onChange={(event) => setDraft(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Escape") onClose()
					if (event.key === "Enter") {
						event.preventDefault()
						apply()
					}
				}}
				autoFocus
			/>
			{error && (
				<p id={`${id}-error`} role="alert" className="text-xs text-destructive">
					{error}
				</p>
			)}
			<div className="flex flex-wrap gap-2">
				<Button size="sm" onClick={apply}>
					Apply link
				</Button>
				{target.href && (
					<Button size="sm" variant="outline" onClick={remove}>
						Remove link
					</Button>
				)}
				<Button size="sm" variant="ghost" onClick={onClose}>
					Cancel
				</Button>
			</div>
		</div>
	)
}
