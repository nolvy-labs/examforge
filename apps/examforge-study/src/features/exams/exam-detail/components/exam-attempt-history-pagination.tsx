"use client"

import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationNext,
	PaginationPrevious,
} from "@/components/shadcn/pagination"
import type { StudentExamAttemptPage } from "@/features/attempt/types/attempt.type"
import { cn } from "@/lib/utils"

interface Props {
	data: StudentExamAttemptPage
	onPageChange: (page: number) => void
}

export function ExamAttemptHistoryPagination({ data, onPageChange }: Props) {
	if (data.meta.totalPages <= 1) return null

	return (
		<Pagination aria-label="Exam attempt history pages">
			<PaginationContent className="w-full justify-between gap-3">
				<PaginationItem>
					<PaginationPrevious
						href="#"
						aria-disabled={!data.meta.hasPreviousPage}
						tabIndex={data.meta.hasPreviousPage ? undefined : -1}
						className={cn(!data.meta.hasPreviousPage && "pointer-events-none opacity-50")}
						onClick={(event) => {
							event.preventDefault()
							if (data.meta.hasPreviousPage) onPageChange(data.meta.page - 1)
						}}
					/>
				</PaginationItem>
				<PaginationItem>
					<span className="text-sm text-muted-foreground">
						Page {data.meta.page} of {data.meta.totalPages}
					</span>
				</PaginationItem>
				<PaginationItem>
					<PaginationNext
						href="#"
						aria-disabled={!data.meta.hasNextPage}
						tabIndex={data.meta.hasNextPage ? undefined : -1}
						className={cn(!data.meta.hasNextPage && "pointer-events-none opacity-50")}
						onClick={(event) => {
							event.preventDefault()
							if (data.meta.hasNextPage) onPageChange(data.meta.page + 1)
						}}
					/>
				</PaginationItem>
			</PaginationContent>
		</Pagination>
	)
}
