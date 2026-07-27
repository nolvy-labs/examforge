"use client"

import { Search } from "lucide-react"

import { Input } from "@/components/shadcn/input"

export function ExamBrowseSearch({
	value,
	onChange,
	onSubmit,
}: {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
}) {
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
			<Search
				className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
				aria-hidden="true"
			/>
			<Input
				id="exam-search"
				type="search"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder="Search exam titles…"
				className="h-12 rounded-xl bg-white pl-12 pr-4 text-base"
			/>
		</form>
	)
}
