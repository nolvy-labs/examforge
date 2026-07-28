"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/shadcn/input"

interface Props {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
}

export function ExamBrowseSearch({
	value,
	onChange,
	onSubmit,
}: Props) {
	return (
		<form
			role="search"
			className="relative mt-7 max-w-3xl"
			onSubmit={(event) => {
				event.preventDefault()
				onSubmit()
			}}
		>
			<label htmlFor="exam-search" className="sr-only">
				Search exam titles
			</label>
			<Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
			<Input
				id="exam-search"
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Search exam titles…"
				className="h-12 pr-4 pl-12 text-base"
			/>
		</form>
	)
}
