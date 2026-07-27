import {
	BookOpen,
	CalendarDays,
	Clock3,
	FileQuestion,
	Layers3,
	Trophy,
} from "lucide-react"

import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"

import {
	formatNumber,
	formatDate,
	getExamCounts,
	getExamTypeLabel,
	getOrderedSections,
	getSectionFacts,
	getSectionKindLabel,
} from "../model/exam-detail.model"
import type { StudentExamDetail } from "../model/exam-detail.types"

export function ExamOverview({ detail }: { detail: StudentExamDetail }) {
	return (
		<section aria-labelledby="exam-overview-heading">
			<div className="flex flex-wrap gap-2">
				<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
					{getExamTypeLabel(detail.exam.type)}
				</span>
				{detail.exam.tags.map((tag) => (
					<span
						key={tag.id}
						className="max-w-full break-words rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
					>
						{tag.name}
					</span>
				))}
			</div>
			<h1
				id="exam-overview-heading"
				className="mt-5 break-words text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl"
			>
				{detail.exam.title}
			</h1>
			{detail.exam.description && (
				<p className="mt-4 max-w-3xl whitespace-pre-line break-words text-base leading-7 text-slate-600 sm:text-lg">
					{detail.exam.description}
				</p>
			)}
		</section>
	)
}

export function ExamBody({ detail }: { detail: StudentExamDetail }) {
	const sections = getOrderedSections(detail)
	return (
		<div className="space-y-8">
			<ExamInstructions instructions={detail.publishedVersion.instructions} />
			<ExamSections sections={sections} />
		</div>
	)
}

function ExamInstructions({ instructions }: { instructions: string }) {
	if (!instructions.trim()) return null
	return (
		<section
			aria-labelledby="exam-instructions-heading"
			className="rounded-2xl border border-slate-200 bg-white p-6"
		>
			<h2 id="exam-instructions-heading" className="text-xl font-semibold text-slate-950">
				Instructions
			</h2>
			<p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-slate-700">
				{instructions}
			</p>
		</section>
	)
}

function ExamSections({
	sections,
}: {
	sections: StudentExamDetail["sections"]
}) {
	return (
		<section aria-labelledby="exam-sections-heading">
			<div>
				<h2 id="exam-sections-heading" className="text-xl font-semibold text-slate-950">
					Exam sections
				</h2>
				<p className="mt-1 text-sm text-slate-600">
					Review the structure before beginning your attempt.
				</p>
			</div>
			<div className="mt-4 space-y-3">
				{sections.map((section, index) => (
					<Card key={section.id} className="gap-3 py-5">
						<CardHeader className="grid grid-cols-[auto_minmax(0,1fr)] gap-4 px-5">
							<span
								aria-hidden="true"
								className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-sm font-semibold text-indigo-700"
							>
								{index + 1}
							</span>
							<div className="min-w-0">
								<div className="flex flex-wrap items-center gap-2">
									<CardTitle className="break-words font-semibold">
										{section.title}
									</CardTitle>
									<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
										{getSectionKindLabel(section.kind)}
									</span>
								</div>
								<p className="mt-1 text-xs text-slate-500">
									{getSectionFacts(section)}
								</p>
							</div>
						</CardHeader>
						{section.instructions.trim() && (
							<CardContent className="px-5 pl-[4.75rem]">
								<p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">
									{section.instructions}
								</p>
							</CardContent>
						)}
					</Card>
				))}
			</div>
		</section>
	)
}

export function ExamFacts({ detail }: { detail: StudentExamDetail }) {
	const counts = getExamCounts(detail)
	const version = detail.publishedVersion
	return (
		<div>
			<h2 className="text-lg font-semibold text-slate-950">Exam details</h2>
			<dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
				<Fact
					icon={Clock3}
					label="Duration"
					value={
						version.durationMinutes == null
							? "No time limit"
							: `${version.durationMinutes} min`
					}
				/>
				<Fact icon={FileQuestion} label="Questions" value={String(counts.questionCount)} />
				<Fact icon={Layers3} label="Sections" value={String(counts.sectionCount)} />
				<Fact icon={Trophy} label="Total points" value={formatNumber(version.totalScore)} />
				<Fact icon={BookOpen} label="Version" value={String(version.versionNumber)} />
				<Fact icon={CalendarDays} label="Published" value={formatDate(version.publishedAtUtc, false)} />
			</dl>
		</div>
	)
}

function Fact({
	icon: Icon,
	label,
	value,
}: {
	icon: typeof Clock3
	label: string
	value: string
}) {
	return (
		<div className="min-w-0 rounded-lg bg-slate-50 p-3">
			<dt className="flex items-center gap-1.5 text-xs text-slate-500">
				<Icon className="size-3.5" aria-hidden="true" />
				{label}
			</dt>
			<dd className="mt-1 truncate font-medium text-slate-900">{value}</dd>
		</div>
	)
}
