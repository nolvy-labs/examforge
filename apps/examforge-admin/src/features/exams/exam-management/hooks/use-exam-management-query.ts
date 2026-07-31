"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import {
	useAdminExamTags,
	useAdminExams,
	useArchiveAdminExamMutation,
	useCreateAdminExamMutation,
	useRestoreAdminExamMutation,
} from "../../api/exam.query"
import type { CreateExamRequest } from "../../types/exam.types"
import { useExamManagementNavigation } from "./use-exam-management-navigation"

export function getCorrectedExamPage(page: number, totalPages: number) {
	const highestValidPage = Math.max(1, totalPages)
	return page > highestValidPage ? highestValidPage : null
}

function updatePendingIds(
	setter: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>,
	id: string,
	pending: boolean
) {
	setter((current) => {
		const next = new Set(current)
		if (pending) next.add(id)
		else next.delete(id)
		return next
	})
}

export function useExamManagementQuery() {
	const navigation = useExamManagementNavigation()
	const examsQuery = useAdminExams(navigation.state)
	const tagsQuery = useAdminExamTags()
	const createMutation = useCreateAdminExamMutation()
	const archiveMutation = useArchiveAdminExamMutation()
	const restoreMutation = useRestoreAdminExamMutation()
	const [pendingArchiveIds, setPendingArchiveIds] = useState<ReadonlySet<string>>(
		new Set()
	)
	const [pendingRestoreIds, setPendingRestoreIds] = useState<ReadonlySet<string>>(
		new Set()
	)
	const correctionAttempt = useRef<string | null>(null)

	const tags = useMemo(() => {
		const all = tagsQuery.data ?? []
		const byName = (left: (typeof all)[number], right: (typeof all)[number]) =>
			left.name.localeCompare(right.name)

		return {
			all,
			active: all.filter((tag) => !tag.isArchived).sort(byName),
			archived: all.filter((tag) => tag.isArchived).sort(byName),
		}
	}, [tagsQuery.data])

	const activeFilterCount =
		navigation.state.tagIds.length +
		(navigation.state.type === null ? 0 : 1) +
		(navigation.state.archive === "active" ? 0 : 1)

	useEffect(() => {
		if (
			!examsQuery.data ||
			examsQuery.isFetching ||
			examsQuery.isPlaceholderData
		) {
			return
		}

		const correctedPage = getCorrectedExamPage(
			navigation.state.page,
			examsQuery.data.meta.totalPages
		)
		if (correctedPage === null) {
			correctionAttempt.current = null
			return
		}

		const signature = `${navigation.state.page}:${examsQuery.data.meta.totalPages}:${correctedPage}`
		if (correctionAttempt.current === signature) return
		correctionAttempt.current = signature
		navigation.actions.correctPage(correctedPage)
	}, [
		examsQuery.data,
		examsQuery.isFetching,
		examsQuery.isPlaceholderData,
		navigation.actions,
		navigation.state.page,
	])

	const archiveExam = useCallback(
		async (id: string) => {
			updatePendingIds(setPendingArchiveIds, id, true)
			try {
				await archiveMutation.mutateAsync(id)
			} finally {
				updatePendingIds(setPendingArchiveIds, id, false)
			}
		},
		[archiveMutation]
	)

	const restoreExam = useCallback(
		async (id: string) => {
			updatePendingIds(setPendingRestoreIds, id, true)
			try {
				await restoreMutation.mutateAsync(id)
			} finally {
				updatePendingIds(setPendingRestoreIds, id, false)
			}
		},
		[restoreMutation]
	)

	const createExam = useCallback(
		(request: CreateExamRequest) => createMutation.mutateAsync(request),
		[createMutation]
	)

	return {
		query: {
			state: navigation.state,
			search: navigation.search,
			exams: examsQuery,
			tags: tagsQuery,
		},
		filters: {
			activeCount: activeFilterCount,
			tags,
			actions: navigation.actions,
		},
		create: {
			run: createExam,
			isPending: createMutation.isPending,
			error: createMutation.error,
			reset: createMutation.reset,
		},
		archive: {
			run: archiveExam,
			pendingIds: pendingArchiveIds,
			error: archiveMutation.error,
			reset: archiveMutation.reset,
		},
		restore: {
			run: restoreExam,
			pendingIds: pendingRestoreIds,
			error: restoreMutation.error,
			reset: restoreMutation.reset,
		},
	}
}
