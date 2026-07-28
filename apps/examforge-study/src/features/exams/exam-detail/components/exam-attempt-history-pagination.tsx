"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import type { StudentExamAttemptPage } from "@/features/attempt/types/attempt.type"

interface Props {
	data: StudentExamAttemptPage
	onPageChange: (page: number) => void
}

export function ExamAttemptHistoryPagination({ data, onPageChange }: Props) {
	if (data.meta.totalPages <= 1) return null

	return (
		<nav className="flex items-center justify-between gap-3">
			<Button
				type="button"
				variant="outline"
				disabled={!data.meta.hasPreviousPage}
				onClick={() => onPageChange(data.meta.page - 1)}
			>
				<ChevronLeft />
				Previous
			</Button>
			<span className="text-sm text-muted-foreground">
				Page {data.meta.page} of {data.meta.totalPages}
			</span>
			<Button
				type="button"
				variant="outline"
				disabled={!data.meta.hasNextPage}
				onClick={() => onPageChange(data.meta.page + 1)}
			>
				Next
				<ChevronRight />
			</Button>
		</nav>
	)
}
