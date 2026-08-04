"use client"

import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/shadcn/pagination"
import { cn } from "@/lib/utils"

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
		<Pagination aria-label="Exam result pages">
			<PaginationContent className="flex-wrap">
				<PaginationItem>
					<PaginationPrevious
						href="#"
						text=""
						aria-disabled={!hasPreviousPage}
						tabIndex={hasPreviousPage ? undefined : -1}
						className={cn(!hasPreviousPage && "pointer-events-none opacity-50")}
						onClick={(event) => {
							event.preventDefault()
							if (hasPreviousPage) onPageChange(page - 1)
						}}
					/>
				</PaginationItem>
				{getExamPageItems(page, totalPages).map((item, index) =>
					item === "ellipsis" ? (
						<PaginationItem key={`ellipsis-${index}`}>
							<PaginationEllipsis />
						</PaginationItem>
					) : (
						<PaginationItem key={item}>
							<PaginationLink
								href="#"
								isActive={item === page}
								aria-label={`Go to page ${item}`}
								onClick={(event) => {
									event.preventDefault()
									onPageChange(item)
								}}
							>
								{item}
							</PaginationLink>
						</PaginationItem>
					)
				)}
				<PaginationItem>
					<PaginationNext
						href="#"
						text=""
						aria-disabled={!hasNextPage}
						tabIndex={hasNextPage ? undefined : -1}
						className={cn(!hasNextPage && "pointer-events-none opacity-50")}
						onClick={(event) => {
							event.preventDefault()
							if (hasNextPage) onPageChange(page + 1)
						}}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
