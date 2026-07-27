import Link from "next/link"
import {
	ArrowRight,
	BookOpen,
	ChevronLeft,
	ChevronRight,
	Clock3,
	FileQuestion,
	Trophy,
} from "lucide-react"

import { Button, buttonVariants } from "@/components/shadcn/button"
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { cn } from "@/lib/utils"

import type { StudentExam } from "../model/exam-browse.types"

export function ExamCard({ exam }: { exam: StudentExam }) {
	const version = exam.publishedVersion
	const visibleTags = exam.tags.slice(0, 3)

	return (
		<Card className="h-full gap-4 border-slate-200 py-5 transition-shadow hover:shadow-md">
			<CardHeader className="gap-3 px-5">
				<div className="flex min-h-6 flex-wrap gap-1.5">
					{visibleTags.map((tag) => (
						<span
							key={tag.id}
							className="max-w-full truncate rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
						>
							{tag.name}
						</span>
					))}
					{exam.tags.length > visibleTags.length && (
						<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
							+{exam.tags.length - visibleTags.length}
						</span>
					)}
				</div>
				<CardTitle className="line-clamp-2 min-h-12 text-lg font-semibold leading-6 text-slate-950">
					{exam.title}
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-4 px-5">
				{exam.description && (
					<p className="line-clamp-3 min-h-15 wrap-break-word text-sm leading-5 text-slate-600">
						{exam.description}
					</p>
				)}
				<div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
					{version.durationMinutes !== null && (
						<Metric icon={Clock3} label={`${version.durationMinutes} min`} />
					)}
					<Metric icon={FileQuestion} label={`${version.questionCount} questions`} />
					<Metric icon={Trophy} label={`${version.totalScore} points`} />
					<Metric icon={BookOpen} label={`${version.sectionCount} sections`} />
				</div>
			</CardContent>
			<CardFooter className="px-5">
				<Link
					href={`/exams/${encodeURIComponent(exam.slug)}`}
					className={cn(
						buttonVariants({ variant: "outline" }),
						"w-full border-indigo-200 text-indigo-700 hover:bg-indigo-50"
					)}
				>
					View exam
					<ArrowRight aria-hidden="true" />
				</Link>
			</CardFooter>
		</Card>
	)
}

function Metric({
	icon: Icon,
	label,
}: {
	icon: typeof Clock3
	label: string
}) {
	return (
		<div className="flex min-w-0 items-center gap-1.5">
			<Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
			<span className="truncate">{label}</span>
		</div>
	)
}

export function ExamGridSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
		>
			{Array.from({ length: 6 }, (_, index) => (
				<div
					key={index}
					className="h-72 animate-pulse rounded-xl border bg-white p-5 motion-reduce:animate-none"
				>
					<div className="h-5 w-24 rounded bg-slate-200" />
					<div className="mt-5 h-6 w-4/5 rounded bg-slate-200" />
					<div className="mt-2 h-6 w-2/3 rounded bg-slate-200" />
					<div className="mt-6 h-4 w-full rounded bg-slate-100" />
					<div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
				</div>
			))}
		</div>
	)
}

function getPageItems(current: number, total: number): Array<number | "ellipsis"> {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)
	const pages = new Set([1, total, current - 1, current, current + 1])
	const valid = [...pages].filter((page) => page > 0 && page <= total).sort((a, b) => a - b)
	const output: Array<number | "ellipsis"> = []
	for (const page of valid) {
		const previous = output.at(-1)
		if (typeof previous === "number" && page - previous > 1) output.push("ellipsis")
		output.push(page)
	}
	return output
}

export function ExamPagination({
	page,
	totalPages,
	hasPreviousPage,
	hasNextPage,
	onPageChange,
}: {
	page: number
	totalPages: number
	hasPreviousPage: boolean
	hasNextPage: boolean
	onPageChange: (page: number) => void
}) {
	if (totalPages <= 1) return null
	const items = getPageItems(page, totalPages)

	return (
		<nav aria-label="Exam results pages" className="flex flex-wrap items-center justify-center gap-1">
			<Button
				type="button"
				variant="outline"
				size="icon"
				disabled={!hasPreviousPage}
				aria-label="Previous page"
				onClick={() => onPageChange(page - 1)}
			>
				<ChevronLeft aria-hidden="true" />
			</Button>
			{items.map((item, index) =>
				item === "ellipsis" ? (
					<span key={`ellipsis-${index}`} className="grid size-9 place-items-center" aria-hidden="true">
						…
					</span>
				) : (
					<Button
						key={item}
						type="button"
						variant={item === page ? "default" : "outline"}
						size="icon"
						aria-label={`Page ${item}`}
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
				size="icon"
				disabled={!hasNextPage}
				aria-label="Next page"
				onClick={() => onPageChange(page + 1)}
			>
				<ChevronRight aria-hidden="true" />
			</Button>
		</nav>
	)
}
