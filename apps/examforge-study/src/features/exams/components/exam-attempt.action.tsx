"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { ArrowRight, LoaderCircle, RotateCcw, X } from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { ApiError } from "@/lib/api/api.error"
import { cn } from "@/lib/utils"

import { useCreateExamAttempt } from "../hooks/exam-detail.hook"
import {
	formatNumber,
	getAttemptStatus,
	getExamCounts,
	getLatestAttempt,
	isGuid,
} from "../model/exam-detail.model"
import type {
	StudentExamAttemptPage,
	StudentExamDetail,
} from "../model/exam-detail.types"

interface ExamAttemptActionProps {
	detail: StudentExamDetail
	isAuthInitialized: boolean
	isAuthenticated: boolean
	activeData?: StudentExamAttemptPage
	latestData?: StudentExamAttemptPage
	isActivePending: boolean
	isLatestPending: boolean
	isActiveError: boolean
	isLatestError: boolean
	onRetryActive: () => void
	onRetryLatest: () => void
	onRefreshAttemptState: () => void
	onRefreshDetail: () => void
}

export function ExamAttemptAction({
	detail,
	isAuthInitialized,
	isAuthenticated,
	activeData,
	latestData,
	isActivePending,
	isLatestPending,
	isActiveError,
	isLatestError,
	onRetryActive,
	onRetryLatest,
	onRefreshAttemptState,
	onRefreshDetail,
}: ExamAttemptActionProps) {
	const router = useRouter()
	const mutation = useCreateExamAttempt(detail.exam.id)
	const [dialogMode, setDialogMode] = useState<"start" | "retake" | null>(null)
	const [actionUnavailable, setActionUnavailable] = useState(false)
	const [customError, setCustomError] = useState("")
	const activeAttempt = activeData?.items[0]
	const latestAttempt = getLatestAttempt(latestData?.items ?? [])
	const returnUrl = `/exams/${encodeURIComponent(detail.exam.slug)}`
	const signinHref = `${AUTH_ROUTES.signin}?callbackUrl=${encodeURIComponent(returnUrl)}`

	function openDialog(mode: "start" | "retake") {
		mutation.reset()
		setCustomError("")
		setDialogMode(mode)
	}

	function handleCreate() {
		if (mutation.isPending) return
		setCustomError("")
		mutation.mutate(undefined, {
			onSuccess: (attempt) => {
				router.push(`/exam-attempts/${attempt.attemptId}`)
			},
			onError: (error) => {
				if (!(error instanceof ApiError)) return
				const code =
					typeof error.problem?.code === "string"
						? error.problem.code
						: undefined

				if (error.status === 401) {
					setDialogMode(null)
					router.replace(signinHref)
					return
				}

				if (code === "active_attempt_exists") {
					const existingAttemptId = error.problem?.existingAttemptId
					setDialogMode(null)
					onRefreshAttemptState()
					if (isGuid(existingAttemptId)) {
						router.replace(`/exam-attempts/${existingAttemptId}`)
					}
					return
				}

				if (code === "published_version_not_found") {
					setDialogMode(null)
					setActionUnavailable(true)
					onRefreshDetail()
					return
				}

				if (code === "concurrency_conflict") {
					setCustomError(
						"Your attempt status changed. Refreshing it now; please try again."
					)
					onRefreshAttemptState()
				}
			},
		})
	}

	if (!isAuthInitialized) return <ActionSkeleton />

	if (!isAuthenticated) {
		return (
			<Link
				href={signinHref}
				className={cn(
					buttonVariants({ size: "lg" }),
					"w-full bg-indigo-600 text-white hover:bg-indigo-700"
				)}
			>
				Sign in to start
				<ArrowRight aria-hidden="true" />
			</Link>
		)
	}

	if (isActivePending) return <ActionSkeleton />

	if (isActiveError) {
		return (
			<ActionError
				message="We couldn’t check for an active attempt. Starting is disabled until your status is known."
				onRetry={onRetryActive}
			/>
		)
	}

	if (activeAttempt) {
		return (
			<Link
				href={`/exam-attempts/${activeAttempt.attemptId}`}
				className={cn(
					buttonVariants({ size: "lg" }),
					"w-full bg-indigo-600 text-white hover:bg-indigo-700"
				)}
			>
				Continue Exam
				<ArrowRight aria-hidden="true" />
			</Link>
		)
	}

	if (isLatestPending) return <ActionSkeleton />

	if (isLatestError) {
		return (
			<ActionError
				message="We couldn’t determine your latest attempt. Try again before starting."
				onRetry={onRetryLatest}
			/>
		)
	}

	if (actionUnavailable) {
		return (
			<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
				This exam is not currently available for a new attempt.
			</p>
		)
	}

	const latestStatus = latestAttempt
		? getAttemptStatus(latestAttempt.status)
		: null

	return (
		<>
			<div className="space-y-2">
				{!latestAttempt && (
					<Button
						type="button"
						size="lg"
						className="w-full bg-indigo-600 hover:bg-indigo-700"
						onClick={() => openDialog("start")}
					>
						Start Exam
					</Button>
				)}
				{latestAttempt && latestStatus === "submitted" && (
					<>
						<Link
							href={`/exam-attempts/${latestAttempt.attemptId}/review`}
							className={cn(
								buttonVariants({ size: "lg" }),
								"w-full bg-indigo-600 text-white hover:bg-indigo-700"
							)}
						>
							View Result
						</Link>
						<Button
							type="button"
							variant="outline"
							size="lg"
							className="w-full"
							onClick={() => openDialog("retake")}
						>
							<RotateCcw aria-hidden="true" />
							Retake
						</Button>
					</>
				)}
				{latestAttempt && latestStatus === "abandoned" && (
					<Button
						type="button"
						size="lg"
						className="w-full bg-indigo-600 hover:bg-indigo-700"
						onClick={() => openDialog("retake")}
					>
						<RotateCcw aria-hidden="true" />
						Retake
					</Button>
				)}
				{latestAttempt && latestStatus === "unknown" && (
					<ActionError
						message="Your latest attempt has an unfamiliar status."
						onRetry={onRetryLatest}
					/>
				)}
			</div>

			<StartAttemptDialog
				detail={detail}
				mode={dialogMode}
				isPending={mutation.isPending}
				error={customError || getMutationMessage(mutation.error)}
				onOpenChange={(open) => {
					if (!open && !mutation.isPending) setDialogMode(null)
				}}
				onConfirm={handleCreate}
			/>
		</>
	)
}

function ActionSkeleton() {
	return (
		<div aria-hidden="true" className="space-y-2">
			<div className="h-10 animate-pulse rounded-md bg-slate-200 motion-reduce:animate-none" />
			<div className="h-4 w-4/5 animate-pulse rounded bg-slate-100 motion-reduce:animate-none" />
		</div>
	)
}

function ActionError({ message, onRetry }: { message: string; onRetry: () => void }) {
	return (
		<div className="space-y-3">
			<p className="text-sm leading-6 text-slate-600">{message}</p>
			<Button type="button" variant="outline" className="w-full" onClick={onRetry}>
				Retry attempt status
			</Button>
		</div>
	)
}

function getMutationMessage(error: unknown) {
	if (!(error instanceof ApiError)) return ""
	const code = typeof error.problem?.code === "string" ? error.problem.code : ""
	if (
		code === "active_attempt_exists" ||
		code === "published_version_not_found"
	) {
		return ""
	}
	return error.message
}

function StartAttemptDialog({
	detail,
	mode,
	isPending,
	error,
	onOpenChange,
	onConfirm,
}: {
	detail: StudentExamDetail
	mode: "start" | "retake" | null
	isPending: boolean
	error: string
	onOpenChange: (open: boolean) => void
	onConfirm: () => void
}) {
	const counts = getExamCounts(detail)
	return (
		<Dialog.Root open={mode !== null} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/45" />
				<Dialog.Popup className="fixed left-1/2 top-1/2 z-50 max-h-[calc(100svh-2rem)] w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl outline-none">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Dialog.Title className="text-xl font-semibold text-slate-950">
								{mode === "retake" ? "Retake exam?" : "Start exam?"}
							</Dialog.Title>
							<Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
								A new attempt will be created for {detail.exam.title}.
							</Dialog.Description>
						</div>
						<Dialog.Close
							aria-label="Close confirmation"
							disabled={isPending}
							className={buttonVariants({ variant: "ghost", size: "icon" })}
						>
							<X aria-hidden="true" />
						</Dialog.Close>
					</div>

					<dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
						<Fact label="Questions" value={String(counts.questionCount)} />
						<Fact label="Sections" value={String(counts.sectionCount)} />
						<Fact
							label="Duration"
							value={
								detail.publishedVersion.durationMinutes == null
									? "No time limit"
									: `${detail.publishedVersion.durationMinutes} min`
							}
						/>
						<Fact
							label="Total points"
							value={formatNumber(detail.publishedVersion.totalScore)}
						/>
					</dl>

					{detail.publishedVersion.durationMinutes != null && (
						<p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-900">
							The timed attempt begins immediately after it is created.
						</p>
					)}
					{error && (
						<Alert variant="destructive" className="mt-4">
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
						<Dialog.Close
							disabled={isPending}
							className={buttonVariants({ variant: "outline" })}
						>
							Cancel
						</Dialog.Close>
						<Button
							type="button"
							disabled={isPending}
							onClick={onConfirm}
							className="bg-indigo-600 hover:bg-indigo-700"
						>
							{isPending && (
								<LoaderCircle
									className="animate-spin motion-reduce:animate-none"
									aria-hidden="true"
								/>
							)}
							{isPending
								? "Creating attempt…"
								: mode === "retake"
									? "Create retake"
									: "Start now"}
						</Button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function Fact({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<dt className="text-xs text-slate-500">{label}</dt>
			<dd className="mt-1 font-medium text-slate-900">{value}</dd>
		</div>
	)
}
