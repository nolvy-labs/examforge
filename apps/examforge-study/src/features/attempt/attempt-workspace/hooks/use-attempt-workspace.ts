"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { ApiError } from "@/lib/api/api.error"

import { useAttempt, useAttemptTransition } from "../../api/attempt.query"
import { useAttemptAutosave } from "./attempt-autosave.hook"
import { useAttemptTimer } from "./attempt-timer.hook"
import {
	useAttemptActions,
	useAttemptAnswers,
	useAttemptIdentity,
	useAttemptLocked,
	useAttemptNavigation,
} from "../stores/attempt.store"
import { getAttemptStatus } from "../../types/attempt.type"
import {
	getAnswerableQuestionCount,
	getAnsweredQuestionCount,
	getAttemptBlocks,
	type EndAttemptMode,
} from "../model/attempt-workspace"

export function useAttemptWorkspace(attemptId: string) {
	const router = useRouter()
	const query = useAttempt(attemptId)
	const submit = useAttemptTransition(attemptId, "submit")
	const abandon = useAttemptTransition(attemptId, "abandon")
	const [endMode, setEndMode] = useState<EndAttemptMode | null>(null)
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
			if (actions.getAttemptId() === attemptId) actions.reset()
		},
		[actions, attemptId]
	)

	const detail = query.data?.data
	const blocks = useMemo(() => getAttemptBlocks(detail), [detail])
	const currentIndex = blocks.findIndex(
		(block) =>
			block.sectionId === selectedSectionId &&
			block.blockId === selectedBlockId
	)
	const selectedSection =
		detail?.sections.find((section) => section.id === selectedSectionId) ??
		detail?.sections[0]
	const selectedBlock =
		selectedSection?.questions.find(
			(question) => question.id === selectedBlockId
		) ?? selectedSection?.questions[0]
	const answered = detail ? getAnsweredQuestionCount(detail, drafts) : 0
	const total = detail ? getAnswerableQuestionCount(detail) : 0

	function navigate(sectionId: string, blockId: string) {
		void flush()
		actions.setLocation(sectionId, blockId)
		requestAnimationFrame(() =>
			document
				.getElementById(`question-${blockId}`)
				?.focus({ preventScroll: false })
		)
	}

	function move(offset: number) {
		const next = blocks[currentIndex + offset]
		if (next) navigate(next.sectionId, next.blockId)
	}

	function openEndDialog(mode: EndAttemptMode) {
		if (mode === "submit") setActionError("")
		setEndMode(mode)
	}

	async function confirmEndAttempt() {
		if (!endMode || submit.isPending || abandon.isPending) return
		setActionError("")
		const saved = await flush()
		if (!saved) {
			setActionError(
				"Your latest answers are not saved yet. Retry before ending the attempt."
			)
			return
		}
		try {
			const mutation = endMode === "submit" ? submit : abandon
			const response = await mutation.mutateAsync(
				actions.getConcurrency().etag
			)
			if (getAttemptStatus(response.data.status) !== "in-progress") {
				goToResult()
			}
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
				endMode === "submit"
					? "We could not submit this attempt. Your saved answers remain available."
					: "We could not abandon this attempt. It remains in progress."
			)
		}
	}

	const isEnding = submit.isPending || abandon.isPending

	return {
		query: {
			isLoading:
				query.isPending || Boolean(detail && workspaceAttemptId !== attemptId),
			isError: query.isError,
			error: query.error,
			retry: () => void query.refetch(),
		},
		detail,
		remaining,
		locked,
		displayMode,
		selectedSection,
		selectedBlock,
		answered,
		total,
		hasPrevious: currentIndex > 0,
		hasNext: currentIndex >= 0 && currentIndex < blocks.length - 1,
		endDialog: {
			mode: endMode,
			error: actionError,
			isPending: isEnding,
			open: openEndDialog,
			close: () => {
				if (!isEnding) setEndMode(null)
			},
			confirm: () => void confirmEndAttempt(),
		},
		navigate,
		showPrevious: () => move(-1),
		showNext: () => move(1),
		setDisplayMode: actions.setDisplayMode,
	}
}
