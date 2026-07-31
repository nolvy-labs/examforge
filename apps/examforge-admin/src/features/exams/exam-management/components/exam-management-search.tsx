"use client"

import { MagnifyingGlassIcon, XIcon } from "@phosphor-icons/react"

import { Button } from "@/components/shadcn/button"
import { Input } from "@/components/shadcn/input"
import { EXAM_SEARCH_MAX_LENGTH } from "../../types/exam.schema"

interface Props {
	value: string
	onChange: (value: string) => void
}

export function ExamManagementSearch({ value, onChange }: Props) {
	return (
		<div className="relative min-w-0 flex-1 sm:min-w-64">
			<label htmlFor="exam-management-search" className="sr-only">
				Search exams by title or slug
			</label>
			<MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				id="exam-management-search"
				type="search"
				value={value}
				maxLength={EXAM_SEARCH_MAX_LENGTH}
				placeholder="Search title or slug"
				className="pr-9 pl-8"
				onChange={(event) => onChange(event.target.value)}
			/>
			{value && (
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					className="absolute top-1/2 right-1.5 -translate-y-1/2"
					aria-label="Clear exam search"
					onClick={() => onChange("")}
				>
					<XIcon />
				</Button>
			)}
		</div>
	)
}
