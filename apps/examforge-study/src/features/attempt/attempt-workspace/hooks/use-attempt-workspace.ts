"use client"

import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react"
import { useRouter } from "next/navigation"

import { ApiError } from "@/lib/api/api.error"
import { useAuthSession } from "@/features/auth/stores/auth.store"

import { useAttempt, useAttemptTransition } from "../../api/attempt.query"
import { useAttemptAutosave } from "./attempt-autosave.hook"
import { readAttemptDraft, removeAttemptDraft } from "../persistence/attempt-draft.storage"
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
	const session = useAuthSession()
	const studentId = session.user?.id ?? ""
	const query = useAttempt(attemptId)
	const submit = useAttemptTransition(attemptId, "submit")
	const abandon = useAttemptTransition(attemptId, "abandon")
	const [endMode, setEndMode] = useState<EndAttemptMode | null>(null)
	const [actionError, setActionError] = useState("")
	const [hasExpired, setHasExpired] = useState(false)
	const [isTimeoutFinalizing, setIsTimeoutFinalizing] =
		useState(false)
	const expirationReachedRef = useRef(false)
	const expirationFinalizationRef = useRef<Promise<void> | null>(
		null
	)
	const workspaceAttemptId = useAttemptIdentity()
	const { selectedSectionId, selectedBlockId, displayMode } =
		useAttemptNavigation()
	const { drafts } = useAttemptAnswers()
	const locked = useAttemptLocked()
	const actions = useAttemptActions()
	const detail = query.data?.data
	const active = detail ? getAttemptStatus(detail.status) === "in-progress" : false

	const goToResult = useCallback(
		() => router.replace(`/attempts/${attemptId}/result`),
		[attemptId, router]
	)

	const { flush } = useAttemptAutosave(attemptId, {
		mode: detail?.mode ?? "practice",
		active,
		initialRemainingTimeSeconds: detail?.remainingTimeSeconds,
		onTerminal: goToResult,
	})
	const refetchAttempt = query.refetch
	const submitAttempt = submit.mutateAsync
	const checkpointPracticeTimer = useCallback(() => {
		if (typeof window !== "undefined" && detail?.mode === "practice") {
			window.dispatchEvent(new Event("examforge:attempt-timer-checkpoint"))
		}
	}, [detail?.mode])

	const convergeAfterTerminalRace = useCallback(async () => {
		try {
			const latest = await refetchAttempt()

			if (
				latest.data &&
				getAttemptStatus(latest.data.data.status) !==
					"in-progress"
			) {
				goToResult()
				return true
			}
		} catch {
			// Keep the local attempt available for a later retry.
		}

		return false
	}, [goToResult, refetchAttempt])

	const finalizeExpiredAttempt = useCallback(() => {
		if (expirationFinalizationRef.current) {
			return expirationFinalizationRef.current
		}

		const operation = (async () => {
			setIsTimeoutFinalizing(true)
			setActionError("")
			checkpointPracticeTimer()
			actions.setLocked(true)

			try {
				const saved = await flush()

				if (!saved) {
					if (await convergeAfterTerminalRace()) return

					setEndMode("submit")
					setActionError(
						"Time has expired, but your latest answers could not be saved. Reconnect and retry submission."
					)
					return
				}

				try {
					await submitAttempt(
						actions.getConcurrency().etag
					)
					removeAttemptDraft(studentId, attemptId)
					goToResult()
				} catch {
					if (await convergeAfterTerminalRace()) return

					setEndMode("submit")
					setActionError(
						"Time has expired, but we could not finish submitting the attempt. It will retry when the connection is restored."
					)
				}
			} catch {
				if (!(await convergeAfterTerminalRace())) {
					setEndMode("submit")
					setActionError(
						"Time has expired, but we could not finish submitting the attempt. Reconnect and try again."
					)
				}
			} finally {
				setIsTimeoutFinalizing(false)
			}
		})()

		expirationFinalizationRef.current = operation

		void operation.finally(() => {
			if (expirationFinalizationRef.current === operation) {
				expirationFinalizationRef.current = null
			}
		})

		return operation
	}, [
		actions,
		checkpointPracticeTimer,
		convergeAfterTerminalRace,
		flush,
		goToResult,
		attemptId,
		studentId,
		submitAttempt,
	])

	const handleTimeout = useCallback(() => {
		if (expirationReachedRef.current) return

		expirationReachedRef.current = true
		setHasExpired(true)
		void finalizeExpiredAttempt()
	}, [finalizeExpiredAttempt])

	useEffect(() => {
		const retryExpiredFinalization = () => {
			if (expirationReachedRef.current) {
				void finalizeExpiredAttempt()
			}
		}

		const retryWhenVisible = () => {
			if (document.visibilityState === "visible") {
				retryExpiredFinalization()
			}
		}

		window.addEventListener("online", retryExpiredFinalization)
		window.addEventListener("focus", retryExpiredFinalization)
		document.addEventListener(
			"visibilitychange",
			retryWhenVisible
		)

		return () => {
			window.removeEventListener(
				"online",
				retryExpiredFinalization
			)
			window.removeEventListener(
				"focus",
				retryExpiredFinalization
			)
			document.removeEventListener(
				"visibilitychange",
				retryWhenVisible
			)
		}
	}, [finalizeExpiredAttempt])

	useEffect(() => {
		const response = query.data

		if (!response || query.isFetching) return

		if (
			getAttemptStatus(response.data.status) !== "in-progress"
		) {
			removeAttemptDraft(studentId, attemptId)
			goToResult()
			return
		}

		const localDraft = readAttemptDraft(
			studentId,
			attemptId,
			response.data.examVersionId,
			response.data.mode
		)
		actions.initialize(response.data, response.etag, studentId, localDraft)
		document.title = `${response.data.exam.title} | Attempt`
	}, [actions, attemptId, goToResult, query.data, query.isFetching, studentId])

	useEffect(
		() => () => {
			if (actions.getAttemptId() === attemptId) {
				actions.reset()
			}
		},
		[actions, attemptId]
	)

	const blocks = useMemo(() => getAttemptBlocks(detail), [detail])
	const currentIndex = blocks.findIndex(
		(block) =>
			block.sectionId === selectedSectionId &&
			block.blockId === selectedBlockId
	)
	const selectedSection =
		detail?.sections.find(
			(section) => section.id === selectedSectionId
		) ?? detail?.sections[0]
	const selectedBlock =
		selectedSection?.questions.find(
			(question) => question.id === selectedBlockId
		) ?? selectedSection?.questions[0]
	const answered = detail
		? getAnsweredQuestionCount(detail, drafts)
		: 0
	const total = detail ? getAnswerableQuestionCount(detail) : 0

	function scrollQuestionIntoView(blockId: string) {
		if (!blockId) return

		window.requestAnimationFrame(() => {
			document
				.getElementById(`question-${blockId}`)
				?.scrollIntoView({
					behavior: window.matchMedia(
						"(prefers-reduced-motion: reduce)"
					).matches
						? "auto"
						: "smooth",
					block: "start",
				})
		})
	}

	function navigate(sectionId: string, blockId: string) {
		actions.persist()
		actions.setLocation(sectionId, blockId)
		scrollQuestionIntoView(blockId)
	}

	function setDisplayMode(mode: "one" | "section") {
		const shouldRevealQuestion =
			displayMode === "one" && mode === "section"

		actions.setDisplayMode(mode)

		if (shouldRevealQuestion && selectedBlockId) {
			scrollQuestionIntoView(selectedBlockId)
		}
	}

	function move(offset: number) {
		const next = blocks[currentIndex + offset]

		if (next) {
			navigate(next.sectionId, next.blockId)
		}
	}

	function openEndDialog(mode: EndAttemptMode) {
		if (hasExpired) {
			setEndMode("submit")
			return
		}

		if (mode === "submit") {
			setActionError("")
		}

		setEndMode(mode)
	}

	async function confirmEndAttempt() {
		if (
			!endMode ||
			submit.isPending ||
			abandon.isPending ||
			isTimeoutFinalizing
		) {
			return
		}

		if (expirationReachedRef.current) {
			await finalizeExpiredAttempt()
			return
		}

		setActionError("")
		checkpointPracticeTimer()
		actions.setLocked(true)
		actions.persist()
		if (endMode === "submit") {
			const saved = await flush()
			if (!saved) {
				actions.setLocked(false)
				setActionError("Submission is blocked because answers could not synchronize. They remain saved locally; retry when connected.")
				return
			}
		}

		try {
			const mutation =
				endMode === "submit" ? submit : abandon
			const response = await mutation.mutateAsync(
				actions.getConcurrency().etag
			)

			if (
				getAttemptStatus(response.data.status) !==
					"in-progress"
			) {
				removeAttemptDraft(studentId, attemptId)
				goToResult()
			}
		} catch (error) {
			const code =
				error instanceof ApiError
					? error.problemCode ?? ""
					: ""

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
			actions.setLocked(false)
		}
	}

	const isEnding =
		submit.isPending ||
		abandon.isPending ||
		isTimeoutFinalizing

	return {
		query: {
			isLoading:
				query.isPending ||
				Boolean(
					detail && workspaceAttemptId !== attemptId
				),
			isError: query.isError,
			error: query.error,
			retry: () => void query.refetch(),
		},
		detail,
		active,
		timer: {
			key: `${attemptId}:${detail?.mode ?? "unknown"}:${detail?.expiresAtUtc ?? "untimed"}`,
			initialRemainingTimeSeconds:
				detail?.remainingTimeSeconds,
			onExpired: handleTimeout,
		},
		locked,
		synchronization: {
			retry: () => void flush(),
		},
		displayMode,
		selectedSection,
		selectedBlock,
		answered,
		total,
		hasPrevious: currentIndex > 0,
		hasNext:
			currentIndex >= 0 &&
			currentIndex < blocks.length - 1,
		endDialog: {
			mode: endMode,
			expired: hasExpired,
			error: actionError,
			isPending: isEnding,
			open: openEndDialog,
			close: () => {
				if (
					!isEnding &&
					!expirationReachedRef.current
				) {
					setEndMode(null)
				}
			},
			confirm: () => void confirmEndAttempt(),
		},
		navigate,
		showPrevious: () => move(-1),
		showNext: () => move(1),
		setDisplayMode,
	}
}