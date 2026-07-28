"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/shadcn/button"

export function getExamPageItems(current: number, total: number): Array<number | "ellipsis"> {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
	const pages = new Set([1, total, current - 1, current, current + 1])
	const valid = [...pages]
		.filter((page) => page > 0 && page <= total)
		.sort((left, right) => left - right)
	const output: Array<number | "ellipsis"> = []
	for (const page of valid) {
		const previous = output.at(-1)
		if (typeof previous === "number" && page - previous > 1) {
			output.push("ellipsis")
		}
		output.push(page)
	}
	return output
}

interface Props {
	page: number
	totalPages: number
	hasPreviousPage: boolean
	hasNextPage: boolean
	onPageChange: (page: number) => void
}

export function ExamPagination({
	page,
	totalPages,
	hasPreviousPage,
	hasNextPage,
	onPageChange,
}: Props) {
	if (totalPages <= 1) return null

	return (
		<nav className="flex flex-wrap items-center justify-center gap-1">
			<Button
				type="button"
				variant="outline"
				size="icon"
				disabled={!hasPreviousPage}
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft />
			</Button>
			{getExamPageItems(page, totalPages).map((item, index) =>
				item === "ellipsis" ? (
					<span
						key={`ellipsis-${index}`}
						className="grid size-9 place-items-center"
					>
						…
					</span>
				) : (
					<Button
						key={item}
						type="button"
						variant={item === page ? "default" : "outline"}
						size="icon"
						onClick={() => onPageChange(item)}
					>
						{item}
					</Button>
				)
			)}
			<Button
				type="button"
				variant="outline"
				size="icon"
				disabled={!hasNextPage}
				onClick={() => onPageChange(page + 1)}
			>
				<ChevronRight />
			</Button>
		</nav>
	)
}
