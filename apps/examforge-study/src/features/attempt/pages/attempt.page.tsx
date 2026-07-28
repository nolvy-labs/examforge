"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import {
	ChevronLeft,
	ChevronRight,
	Clock3,
	LoaderCircle,
	Menu,
	X,
} from "lucide-react"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import { ApiError } from "@/lib/api/api.error"

import {
	AttemptNavigator,
	AttemptQuestionBlock,
	SaveError,
	SaveStatus,
} from "../components/attempt-question"
import { useAttemptAutosave } from "../hooks/attempt-autosave.hook"
import { useAttempt, useAttemptTransition } from "../hooks/attempt.hook"
import {
	formatRemaining,
	useAttemptTimer,
} from "../hooks/attempt-timer.hook"
import {
	useAttemptActions,
	useAttemptAnswers,
	useAttemptIdentity,
	useAttemptLocked,
	useAttemptNavigation,
} from "../stores/attempt.store"
import {
	flattenAnswerableQuestions,
	getAttemptStatus,
} from "../types/attempt.type"

export function AttemptPage({ attemptId }: { attemptId: string }) {
	const router = useRouter()
	const query = useAttempt(attemptId)
	const submit = useAttemptTransition(attemptId, "submit")
	const abandon = useAttemptTransition(attemptId, "abandon")
	const [dialog, setDialog] = useState<"submit" | "abandon" | null>(null)
	const [actionError, setActionError] = useState("")
	const workspaceAttemptId = useAttemptIdentity()
	const { selectedSectionId, selectedBlockId, displayMode } =
		useAttemptNavigation()
	const { drafts } = useAttemptAnswers()
	const locked = useAttemptLocked()
	const actions = useAttemptActions()

	const goToResult = useCallback(
		() => router.replace(`/attempts/${attemptId}/result`),
		[attemptId, router]
	)
	const { flush } = useAttemptAutosave(attemptId, goToResult)

	const convergeAfterTerminalRace = useCallback(async () => {
		const latest = await query.refetch()
		if (
			latest.data &&
			getAttemptStatus(latest.data.data.status) !== "in-progress"
		) {
			goToResult()
			return true
		}
		return false
	}, [goToResult, query])

	const handleTimeout = useCallback(async () => {
		actions.setLocked(true)
		await flush()
		try {
			await submit.mutateAsync(actions.getConcurrency().etag)
			goToResult()
		} catch {
			await convergeAfterTerminalRace()
		}
	}, [actions, convergeAfterTerminalRace, flush, goToResult, submit])

	const remaining = useAttemptTimer(
		query.data?.data.remainingTimeSeconds,
		() => void handleTimeout()
	)

	useEffect(() => {
		const response = query.data
		if (!response || query.isFetching) return
		if (getAttemptStatus(response.data.status) !== "in-progress") {
			goToResult()
			return
		}
		actions.initialize(response.data, response.etag)
		document.title = `${response.data.exam.title} | Attempt`
	}, [actions, goToResult, query.data, query.isFetching])

	useEffect(
		() => () => {
			if (actions.getAttemptId() === attemptId) {
				actions.reset()
			}
		},
		[actions, attemptId]
	)

	const detail = query.data?.data
	const blocks = useMemo(
		() =>
			detail?.sections.flatMap((section) =>
				section.questions.map((question) => ({
					sectionId: section.id,
					blockId: question.id,
				}))
			) ?? [],
		[detail]
	)
	const currentIndex = blocks.findIndex(
		(block) =>
			block.sectionId === selectedSectionId &&
			block.blockId === selectedBlockId
	)

	if (query.isPending || (detail && workspaceAttemptId !== attemptId)) {
		return <AttemptLoading />
	}
	if (query.isError || !detail) {
		return <AttemptFailure error={query.error} onRetry={() => void query.refetch()} />
	}

	const selectedSection =
		detail.sections.find((section) => section.id === selectedSectionId) ??
		detail.sections[0]
	const selectedBlock =
		selectedSection?.questions.find((question) => question.id === selectedBlockId) ??
		selectedSection?.questions[0]
	const answerable = flattenAnswerableQuestions(detail.sections)
	const answered = answerable.filter((question) => {
		const answer = drafts[question.id]
		return Boolean(answer?.textAnswer?.trim() || answer?.selectedOptionIds.length)
	}).length

	function navigate(sectionId: string, blockId: string) {
		void flush()
		actions.setLocation(sectionId, blockId)
		requestAnimationFrame(() =>
			document.getElementById(`question-${blockId}`)?.focus({ preventScroll: false })
		)
	}

	function move(offset: number) {
		const next = blocks[currentIndex + offset]
		if (next) navigate(next.sectionId, next.blockId)
	}

	async function confirmAction() {
		if (!dialog || submit.isPending || abandon.isPending) return
		setActionError("")
		const saved = await flush()
		if (!saved) {
			setActionError("Your latest answers are not saved yet. Retry before ending the attempt.")
			return
		}
		try {
			const mutation = dialog === "submit" ? submit : abandon
			const response = await mutation.mutateAsync(actions.getConcurrency().etag)
			if (getAttemptStatus(response.data.status) !== "in-progress") goToResult()
		} catch (error) {
			const code = error instanceof ApiError ? error.problemCode ?? "" : ""
			if (
				[
					"attempt_already_submitted",
					"attempt_already_abandoned",
					"invalid_attempt_state",
					"revision_mismatch",
					"concurrency_conflict",
				].includes(code) &&
				(await convergeAfterTerminalRace())
			) {
				return
			}
			setActionError(
				dialog === "submit"
					? "We could not submit this attempt. Your saved answers remain available."
					: "We could not abandon this attempt. It remains in progress."
			)
		}
	}

	return (
		<div className="min-h-svh bg-slate-50">
			<header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
				<div className="mx-auto flex min-h-16 max-w-384 items-center gap-3 px-4 sm:px-6">
					<div className="min-w-0 flex-1">
						<h1 className="truncate text-sm font-semibold text-slate-950 sm:text-base">
							{detail.exam.title}
						</h1>
						<SaveStatus />
					</div>
					{remaining != null && (
						<div
							className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold ${
								remaining <= 60
									? "bg-red-50 text-red-700"
									: remaining <= 300
										? "bg-amber-50 text-amber-800"
										: "bg-slate-100 text-slate-800"
							}`}
							aria-live={remaining <= 60 ? "assertive" : "polite"}
						>
							<Clock3 className="size-4" aria-hidden="true" />
							{formatRemaining(remaining)}
						</div>
					)}
					<Button
						type="button"
						disabled={locked}
						onClick={() => {
							setActionError("")
							setDialog("submit")
						}}
					>
						Submit
					</Button>
				</div>
			</header>

			<div className="mx-auto grid max-w-384 gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
				<aside className="hidden lg:block">
					<div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4">
						<AttemptNavigator sections={detail.sections} onSelect={navigate} />
						<Button
							type="button"
							variant="ghost"
							className="mt-5 w-full text-red-700 hover:bg-red-50 hover:text-red-800"
							onClick={() => setDialog("abandon")}
						>
							Abandon attempt
						</Button>
					</div>
				</aside>

				<main className="min-w-0">
					<details className="mb-4 rounded-xl border bg-white p-3 lg:hidden">
						<summary className="flex cursor-pointer list-none items-center gap-2 font-medium">
							<Menu className="size-4" /> Sections and questions
						</summary>
						<div className="mt-4">
							<AttemptNavigator sections={detail.sections} onSelect={navigate} />
						</div>
					</details>
					<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="font-semibold text-slate-950">{selectedSection?.title}</h2>
							{selectedSection?.instructions && (
								<p className="mt-1 text-sm text-slate-600">
									{selectedSection.instructions}
								</p>
							)}
						</div>
						<div className="flex rounded-lg border bg-white p-1" aria-label="Question display mode">
							{(["one", "section"] as const).map((mode) => (
								<button
									key={mode}
									type="button"
									aria-pressed={displayMode === mode}
									onClick={() => actions.setDisplayMode(mode)}
									className={`rounded-md px-3 py-1.5 text-xs font-medium ${
										displayMode === mode
											? "bg-slate-900 text-white"
											: "text-slate-600 hover:bg-slate-100"
									}`}
								>
									{mode === "one" ? "One question" : "Current section"}
								</button>
							))}
						</div>
					</div>
					<SaveError />
					{locked && (
						<Alert className="mb-4">
							<AlertDescription>
								Time has ended. Answers are locked while we finalize your attempt.
							</AlertDescription>
						</Alert>
					)}
					<div className="space-y-5">
						{displayMode === "section"
							? selectedSection?.questions.map((question, index) => (
									<AttemptQuestionBlock
										key={question.id}
										question={question}
										number={String(index + 1)}
									/>
								))
							: selectedBlock && (
									<AttemptQuestionBlock
										question={selectedBlock}
										number={String(
											(selectedSection?.questions.indexOf(selectedBlock) ?? 0) + 1
										)}
									/>
								)}
					</div>
					<div className="sticky bottom-0 mt-5 flex items-center justify-between gap-3 border-t bg-slate-50/95 py-3 backdrop-blur">
						<Button
							type="button"
							variant="outline"
							disabled={currentIndex <= 0}
							onClick={() => move(-1)}
						>
							<ChevronLeft /> Previous
						</Button>
						<span className="text-xs text-slate-500">
							{answered} of {answerable.length} answered
						</span>
						<Button
							type="button"
							variant="outline"
							disabled={currentIndex < 0 || currentIndex >= blocks.length - 1}
							onClick={() => move(1)}
						>
							Next <ChevronRight />
						</Button>
					</div>
				</main>
			</div>

			<EndAttemptDialog
				mode={dialog}
				answered={answered}
				total={answerable.length}
				remaining={remaining}
				error={actionError}
				pending={submit.isPending || abandon.isPending}
				onClose={() => setDialog(null)}
				onConfirm={() => void confirmAction()}
			/>
		</div>
	)
}

function EndAttemptDialog({
	mode,
	answered,
	total,
	remaining,
	error,
	pending,
	onClose,
	onConfirm,
}: {
	mode: "submit" | "abandon" | null
	answered: number
	total: number
	remaining: number | null
	error: string
	pending: boolean
	onClose: () => void
	onConfirm: () => void
}) {
	return (
		<Dialog.Root open={mode !== null} onOpenChange={(open) => !open && !pending && onClose()}>
			<Dialog.Portal>
				<Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/50" />
				<Dialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(calc(100vw-2rem),32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl outline-none">
					<div className="flex items-start justify-between gap-4">
						<div>
							<Dialog.Title className="text-xl font-semibold">
								{mode === "submit" ? "Submit attempt?" : "Abandon attempt?"}
							</Dialog.Title>
							<Dialog.Description className="mt-2 text-sm leading-6 text-slate-600">
								{mode === "submit"
									? "Submission is final. We will save pending answers first."
									: "Abandonment ends this attempt and cannot be undone."}
							</Dialog.Description>
						</div>
						<Dialog.Close className={buttonVariants({ variant: "ghost", size: "icon" })}>
							<X aria-hidden="true" />
						</Dialog.Close>
					</div>
					<dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
						<div><dt className="text-slate-500">Answered</dt><dd className="font-semibold">{answered}</dd></div>
						<div><dt className="text-slate-500">Unanswered</dt><dd className="font-semibold">{total - answered}</dd></div>
						{remaining != null && <div><dt className="text-slate-500">Time left</dt><dd className="font-semibold">{formatRemaining(remaining)}</dd></div>}
					</dl>
					{error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
					<div className="mt-6 flex justify-end gap-2">
						<Dialog.Close disabled={pending} className={buttonVariants({ variant: "outline" })}>Cancel</Dialog.Close>
						<Button
							type="button"
							disabled={pending}
							variant={mode === "abandon" ? "destructive" : "default"}
							onClick={onConfirm}
						>
							{pending && <LoaderCircle className="animate-spin" />}
							{pending ? "Finishing…" : mode === "submit" ? "Submit now" : "Abandon"}
						</Button>
					</div>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	)
}

function AttemptLoading() {
	return (
		<div className="min-h-svh bg-slate-50 p-4">
			<div className="mx-auto max-w-5xl animate-pulse space-y-5">
				<div className="h-16 rounded-xl bg-slate-200" />
				<div className="h-80 rounded-2xl bg-white" />
			</div>
			<p className="sr-only">Loading attempt…</p>
		</div>
	)
}

function AttemptFailure({ error, onRetry }: { error: unknown; onRetry: () => void }) {
	const missing = error instanceof ApiError && error.status === 404
	return (
		<main className="grid min-h-svh place-items-center bg-slate-50 p-4">
			<div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
				<h1 className="text-xl font-semibold">{missing ? "Attempt unavailable" : "Couldn’t load this attempt"}</h1>
				<p className="mt-2 text-sm text-slate-600">
					{missing ? "It may not exist or you may not have access." : "Check your connection and try again."}
				</p>
				<div className="mt-5 flex justify-center gap-2">
					{!missing && <Button onClick={onRetry}>Retry</Button>}
					<Link href="/exams" className={buttonVariants({ variant: "outline" })}>Browse exams</Link>
				</div>
			</div>
		</main>
	)
}
