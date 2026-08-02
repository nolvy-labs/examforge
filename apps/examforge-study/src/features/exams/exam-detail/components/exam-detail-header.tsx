import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/shadcn/badge"
import { buttonVariants } from "@/components/shadcn/button"

import type { StudentExamDetail } from "../../types/exam.types"
import { getExamTypeLabel } from "../model/exam-detail"
import { cn } from "@/lib/utils"

interface Props {
	detail: StudentExamDetail
}

export function ExamDetailHeader({ detail }: Props) {
	return (
		<header className="flex flex-col gap-4 items-start">
			<Link href="/exams" className={cn(buttonVariants({ variant: "link" }), "px-0")}>
				<ArrowLeft />
				Back to Browse Exams
			</Link>
			<div className="flex flex-wrap gap-2">
				<Badge>{getExamTypeLabel(detail.exam.type)}</Badge>
				{detail.exam.tags.map((tag) => (
					<Badge key={tag.id} variant="secondary" className="max-w-full">
						<span className="wrap-break-word">{tag.name}</span>
					</Badge>
				))}
			</div>
			<h1 className="wrap-break-word text-3xl font-bold tracking-tight sm:text-4xl">
				{detail.exam.title}
			</h1>
			{detail.exam.description && (
				<p className="max-w-3xl whitespace-pre-line wrap-break-word text-base leading-7 text-muted-foreground sm:text-lg">
					{detail.exam.description}
				</p>
			)}
		</header>
	)
}
