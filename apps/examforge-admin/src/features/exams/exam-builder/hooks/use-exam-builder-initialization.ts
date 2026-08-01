"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"

import type { FullExamVersionDto } from "../../types/exam-version.types"
import {
	getCompleteAdminExamVersion,
	type VersionApiResponse,
} from "../api/exam-builder.api"
import { examBuilderQueryKeys } from "../api/exam-builder.query-key"
import { mapFullVersionToBuilderDocument } from "../model/builder-mapper"
import { useBuilderActions } from "../store/exam-builder.store"

export function useInitializeExamBuilder(
	response: VersionApiResponse<FullExamVersionDto> | undefined,
	examArchived: boolean,
	now: () => number = Date.now
) {
	const actions = useBuilderActions()
	const examId = response?.data.examId ?? null
	const versionId = response?.data.id ?? null

	useEffect(() => {
		if (!response) return
		actions.initialize(
			mapFullVersionToBuilderDocument(response.data, {
				etag: response.etag,
				examArchived,
			}),
			now()
		)
	}, [actions, examArchived, now, response])

	useEffect(
		() => () => {
			actions.reset()
		},
		[actions, examId, versionId]
	)
}

export function useReloadLatestExamBuilder(now: () => number = Date.now) {
	const actions = useBuilderActions()
	const queryClient = useQueryClient()
	return async (examId: string, versionId: string, examArchived: boolean) => {
		const response = await queryClient.fetchQuery({
			queryKey: examBuilderQueryKeys.version(examId, versionId),
			queryFn: ({ signal }) =>
				getCompleteAdminExamVersion({ examId, versionId }, signal),
			staleTime: 0,
		})
		actions.forceReload(
			mapFullVersionToBuilderDocument(response.data, {
				etag: response.etag,
				examArchived,
			}),
			now()
		)
		return response
	}
}
