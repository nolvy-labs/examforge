"use client"

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react"

import { Button } from "@/components/shadcn/button"

export function getExamPageItems(
	current: number,
	total: number
): Array<number | "ellipsis"> {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

	const pages = new Set([1, total, current - 1, current, current + 1])
	const validPages = [...pages]
		.filter((page) => page > 0 && page <= total)
		.sort((left, right) => left - right)
	const output: Array<number | "ellipsis"> = []

	for (const page of validPages) {
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
		<nav
			className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-3"
			aria-label="Exam result pages"
		>
			<p className="text-xs text-muted-foreground">
				Page {page} of {totalPages}
			</p>
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					disabled={!hasPreviousPage}
					aria-label="Go to previous exam page"
					onClick={() => onPageChange(page - 1)}
				>
					<CaretLeftIcon />
				</Button>
				{getExamPageItems(page, totalPages).map((item, index) =>
					item === "ellipsis" ? (
						<span key={`ellipsis-${index}`} className="grid size-7 place-items-center" aria-hidden="true">
							…
						</span>
					) : (
						<Button
							key={item}
							type="button"
							variant={item === page ? "default" : "outline"}
							size="icon-sm"
							aria-label={`Go to exam page ${item}`}
							aria-current={item === page ? "page" : undefined}
							onClick={() => onPageChange(item)}
						>
							{item}
						</Button>
					)
				)}
				<Button
					type="button"
					variant="outline"
					size="icon-sm"
					disabled={!hasNextPage}
					aria-label="Go to next exam page"
					onClick={() => onPageChange(page + 1)}
				>
					<CaretRightIcon />
				</Button>
			</div>
		</nav>
	)
}
