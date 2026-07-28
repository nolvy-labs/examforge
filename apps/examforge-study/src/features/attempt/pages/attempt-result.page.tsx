"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
	ArrowLeft,
	CheckCircle2,
	ChevronDown,
	Clock3,
	RotateCcw,
	Trophy,
} from "lucide-react"

import { MainHeader } from "@/components/layout/header/header"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { ApiError } from "@/lib/api/api.error"
import { cn } from "@/lib/utils"

import {
	useAttempt,
	useCreateExamAttempt,
} from "../api/attempt.query"
import type { AttemptQuestion } from "../types/attempt.type"
import {
	getAttemptStatus,
	getGradingStatus,
	getQuestionType,
} from "../types/attempt.type"

export function AttemptResultPage({ attemptId }: { attemptId: string }) {
	const router = useRouter()
	const query = useAttempt(attemptId)
	const detail = query.data?.data
	const retake = useCreateExamAttempt(detail?.examId ?? "")

	useEffect(() => {
		if (!detail || query.isFetching) return
		if (getAttemptStatus(detail.status) === "in-progress") {
			router.replace(`/attempts/${attemptId}`)
			return
		}
		document.title = `${detail.exam.title} | Attempt Result`
	}, [attemptId, detail, query.isFetching, router])

	if (query.isPending) return <ResultLoading />
	if (query.isError || !detail) {
		return (
			<div className="min-h-svh bg-slate-50">
				<MainHeader />
				<main className="mx-auto max-w-lg px-4 py-16 text-center">
					<h1 className="text-2xl font-semibold">Result unavailable</h1>
					<p className="mt-2 text-sm text-slate-600">
						{query.error instanceof ApiError && query.error.status === 404
							? "This attempt does not exist or is inaccessible."
							: "We couldn't load the result. Try again."}
					</p>
					<Button className="mt-5" onClick={() => void query.refetch()}>Retry</Button>
				</main>
			</div>
		)
	}

	const status = getAttemptStatus(detail.status)
	if (status === "in-progress" && query.isFetching) return <ResultLoading />
	const submitted = status === "submitted"
	const finishedAt = submitted ? detail.submittedAtUtc : detail.abandonedAtUtc
	const elapsed =
		finishedAt != null
			? Math.max(
					0,
					Math.round(
						(new Date(finishedAt).getTime() -
							new Date(detail.startedAtUtc).getTime()) /
							60000
					)
				)
			: null

	function createRetake() {
		if (retake.isPending) return
		retake.mutate(undefined, {
			onSuccess: (attempt) => router.push(`/attempts/${attempt.attemptId}`),
			onError: (error) => {
				if (
					error instanceof ApiError &&
					error.problemCode === "active_attempt_exists" &&
					error.existingAttemptId
				) {
					router.push(`/attempts/${error.existingAttemptId}`)
				}
			},
		})
	}

	return (
		<div className="min-h-svh bg-slate-50">
			<MainHeader />
			<main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
				<Link
					href={`/exams/${encodeURIComponent(detail.exam.slug)}`}
					className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-950"
				>
					<ArrowLeft className="size-4" /> Return to exam
				</Link>
				<section className="mt-5 overflow-hidden rounded-2xl border bg-white shadow-sm">
					<div className={cn("p-6 sm:p-8", submitted ? "bg-indigo-950 text-white" : "bg-amber-50")}>
						<p className="text-sm font-medium opacity-80">
							{submitted ? "Attempt submitted" : "Attempt abandoned"}
						</p>
						<h1 className="mt-2 text-2xl font-bold sm:text-3xl">
							{detail.examVersion.title || detail.exam.title}
						</h1>
						{submitted && detail.score != null && detail.maximumScore != null && (
							<div className="mt-6 flex flex-wrap items-end gap-4">
								<div className="flex items-center gap-2">
									<Trophy className="size-6" />
									<span className="text-3xl font-bold">
										{formatNumber(detail.score)} / {formatNumber(detail.maximumScore)}
									</span>
								</div>
								{detail.percentage != null && (
									<span className="rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
										{formatNumber(detail.percentage)}%
									</span>
								)}
							</div>
						)}
					</div>
					<div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
						<Fact label="Started" value={formatDate(detail.startedAtUtc)} />
						<Fact
							label={submitted ? "Submitted" : "Abandoned"}
							value={finishedAt ? formatDate(finishedAt) : "Unavailable"}
						/>
						<Fact
							label="Time spent"
							value={elapsed == null ? "Unavailable" : `${elapsed} min`}
							icon={Clock3}
						/>
					</div>
					<div className="flex flex-wrap gap-2 border-t px-6 py-4 sm:px-8">
						<Link
							href={`/exams/${encodeURIComponent(detail.exam.slug)}`}
							className={buttonVariants({ variant: "outline" })}
						>
							Return to exam
						</Link>
						<Button disabled={retake.isPending} onClick={createRetake}>
							<RotateCcw />
							{retake.isPending ? "Starting…" : "Retake"}
						</Button>
					</div>
				</section>

				<section className="mt-8">
					<h2 id="review-heading" className="text-xl font-semibold">Question review</h2>
					<p className="mt-1 text-sm text-slate-600">
						{submitted
							? "Expand a question to review your answer and the authoritative solution."
							: "This abandoned attempt shows persisted answers only; grading and solutions are unavailable."}
					</p>
					<div className="mt-4 space-y-3">
						{detail.sections.flatMap((section) =>
							section.questions.map((question, index) => (
								<ResultBlock
									key={question.id}
									question={question}
									label={`${section.title} · Question ${index + 1}`}
									showGrading={submitted}
								/>
							))
						)}
					</div>
				</section>
			</main>
		</div>
	)
}

function ResultBlock({
	question,
	label,
	showGrading,
}: {
	question: AttemptQuestion
	label: string
	showGrading: boolean
}) {
	const group = getQuestionType(question.type) === "group"
	return (
		<details className="group rounded-2xl border bg-white shadow-sm">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5">
				<div className="min-w-0">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
					<p className="mt-1 truncate font-medium text-slate-900">{question.prompt}</p>
				</div>
				<ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" />
			</summary>
			<div className="border-t p-5">
				<p className="whitespace-pre-line text-sm leading-7 text-slate-800">{question.prompt}</p>
				{group ? (
					<div className="mt-5 space-y-5">
						{question.childQuestions.map((child, index) => (
							<div key={child.id} className="rounded-xl border p-4">
								<p className="text-xs font-semibold text-slate-500">Part {index + 1}</p>
								<p className="mt-2 text-sm font-medium">{child.prompt}</p>
								<AnswerReview question={child} showGrading={showGrading} />
							</div>
						))}
					</div>
				) : (
					<AnswerReview question={question} showGrading={showGrading} />
				)}
			</div>
		</details>
	)
}

function AnswerReview({
	question,
	showGrading,
}: {
	question: AttemptQuestion
	showGrading: boolean
}) {
	const type = getQuestionType(question.type)
	const answer = question.answer
	const selected = new Set(answer?.selectedOptionIds ?? [])
	const status = getGradingStatus(answer?.gradingStatus)
	const answerText =
		type === "fill-blank"
			? answer?.textAnswer?.trim() || "Unanswered"
			: question.options
					.filter((option) => selected.has(option.id))
					.map((option) => `${option.label ? `${option.label}. ` : ""}${option.text}`)
					.join(", ") || "Unanswered"
	return (
		<div className="mt-4 space-y-4 text-sm">
			<div className="rounded-xl bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your answer</p>
				<p className="mt-2 whitespace-pre-line text-slate-900">{answerText}</p>
			</div>
			{showGrading && (
				<>
					<div className="flex flex-wrap items-center gap-2">
						{status && (
							<span className={cn(
								"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
								status === "correct"
									? "bg-emerald-50 text-emerald-700"
									: status === "partially-correct"
										? "bg-amber-50 text-amber-800"
										: "bg-red-50 text-red-700"
							)}>
								{status === "correct" && <CheckCircle2 className="size-3.5" />}
								{status.replace("-", " ")}
							</span>
						)}
						{answer?.awardedScore != null && answer.maximumScore != null && (
							<span className="text-xs font-medium text-slate-600">
								{formatNumber(answer.awardedScore)} / {formatNumber(answer.maximumScore)} points
							</span>
						)}
					</div>
					{question.solution && (
						<div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
							<p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Correct solution</p>
							{type === "fill-blank" ? (
								<ul className="mt-2 list-inside list-disc text-slate-800">
									{question.solution.acceptedAnswers.map((item, index) => (
										<li key={`${item.blankKey}-${index}`}>{item.acceptedAnswer}</li>
									))}
								</ul>
							) : (
								<ul className="mt-2 space-y-2">
									{question.options.map((option) => {
										const solution = question.solution?.options.find((item) => item.optionId === option.id)
										return (
											<li key={option.id} className={solution?.isCorrect ? "font-medium text-emerald-800" : "text-slate-600"}>
												{option.label && `${option.label}. `}{option.text}
												{solution?.explanation && <p className="mt-0.5 text-xs font-normal text-slate-600">{solution.explanation}</p>}
											</li>
										)
									})}
								</ul>
							)}
							{question.solution.explanation && (
								<div className="mt-3 border-t border-emerald-200 pt-3">
									<p className="font-medium text-slate-800">Explanation</p>
									<p className="mt-1 whitespace-pre-line leading-6 text-slate-700">{question.solution.explanation}</p>
								</div>
							)}
						</div>
					)}
				</>
			)}
		</div>
	)
}

function Fact({
	label,
	value,
	icon: Icon,
}: {
	label: string
	value: string
	icon?: typeof Clock3
}) {
	return (
		<div>
			<dt className="flex items-center gap-1 text-xs text-slate-500">
				{Icon && <Icon className="size-3.5" />}{label}
			</dt>
			<dd className="mt-1 text-sm font-medium text-slate-900">{value}</dd>
		</div>
	)
}

function ResultLoading() {
	return (
		<div className="min-h-svh bg-slate-50">
			<MainHeader />
			<div className="mx-auto max-w-5xl animate-pulse space-y-5 px-4 py-10">
				<div className="h-64 rounded-2xl bg-slate-200" />
				<div className="h-20 rounded-2xl bg-white" />
			</div>
		</div>
	)
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value))
}

function formatNumber(value: number) {
	return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value)
}
