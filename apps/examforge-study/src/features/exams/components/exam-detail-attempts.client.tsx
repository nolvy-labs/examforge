"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { useAuthStore } from "@/features/auth/stores/auth.store"

import { ExamAttemptAction } from "./exam-attempt.action"
import { AttemptHistory } from "./exam-detail.content"
import {
	useActiveExamAttempt,
	useExamAttemptHistory,
} from "../hooks/exam-detail.hook"
import type { StudentExamDetail } from "../model/exam-detail.types"

export function ExamAttemptHistoryClient({ examId }: { examId: string }) {
	const [pagination, setPagination] = useState({ examId, page: 1 })
	const historyPage = pagination.examId === examId ? pagination.page : 1
	const isAuthInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const enabled = isAuthInitialized && isAuthenticated
	const historyQuery = useExamAttemptHistory(examId, historyPage, enabled)

	useEffect(() => {
		const data = historyQuery.data
		if (!data || historyQuery.isPlaceholderData) return
		const finalPage = data.meta.totalPages === 0 ? 1 : data.meta.totalPages
		if (historyPage > finalPage) {
			const timeout = window.setTimeout(() => {
				setPagination({ examId, page: finalPage })
			}, 0)
			return () => window.clearTimeout(timeout)
		}
	}, [
		examId,
		historyPage,
		historyQuery.data,
		historyQuery.isPlaceholderData,
	])

	if (!enabled) return null

	return (
		<AttemptHistory
			data={historyQuery.data}
			isPending={historyQuery.isPending}
			isError={historyQuery.isError}
			isFetching={historyQuery.isFetching}
			isPlaceholderData={historyQuery.isPlaceholderData}
			onRetry={() => void historyQuery.refetch()}
			onPageChange={(page) => setPagination({ examId, page })}
		/>
	)
}

export function ExamAttemptActionClient({
	detail,
}: {
	detail: StudentExamDetail
}) {
	const router = useRouter()
	const isAuthInitialized = useAuthStore((state) => state.isInitialized)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const enabled = Boolean(isAuthInitialized && isAuthenticated)
	const activeQuery = useActiveExamAttempt(detail.exam.id, enabled)
	const latestHistoryQuery = useExamAttemptHistory(detail.exam.id, 1, enabled)

	function refreshAttemptState() {
		void activeQuery.refetch()
		void latestHistoryQuery.refetch()
	}

	return (
		<ExamAttemptAction
			detail={detail}
			isAuthInitialized={isAuthInitialized}
			isAuthenticated={isAuthenticated}
			activeData={activeQuery.data}
			latestData={latestHistoryQuery.data}
			isActivePending={activeQuery.isPending}
			isLatestPending={latestHistoryQuery.isPending}
			isActiveError={activeQuery.isError}
			isLatestError={latestHistoryQuery.isError}
			onRetryActive={() => void activeQuery.refetch()}
			onRetryLatest={() => void latestHistoryQuery.refetch()}
			onRefreshAttemptState={refreshAttemptState}
			onRefreshDetail={() => router.refresh()}
		/>
	)
}
