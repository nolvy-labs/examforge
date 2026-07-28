"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
	getStudentExamCategories,
	getStudentExamFilters,
	getStudentExams,
} from "./exam.api"
import {
	EXAM_PAGE_SIZE,
	examQueryKeys,
	type ExamQueryState,
} from "./exam.query-key"

const METADATA_STALE_TIME = 15 * 60 * 1000

export function useStudentExams(state: ExamQueryState) {
	return useQuery({
		queryKey: examQueryKeys.browse(state),
		queryFn: ({ signal }) =>
			getStudentExams(
				{
					page: state.page,
					pageSize: EXAM_PAGE_SIZE,
					search: state.search || undefined,
					categorySlug: state.category || undefined,
					tagIds: state.tagIds,
					sort: state.sort === "oldest" ? "Oldest" : "Newest",
				},
				signal
			),
		placeholderData: keepPreviousData,
	})
}

export function useStudentExamFilters() {
	return useQuery({
		queryKey: examQueryKeys.filters(),
		queryFn: ({ signal }) => getStudentExamFilters(signal),
		staleTime: METADATA_STALE_TIME,
	})
}

export function useStudentExamCategories() {
	return useQuery({
		queryKey: examQueryKeys.categories(),
		queryFn: ({ signal }) => getStudentExamCategories(signal),
		staleTime: METADATA_STALE_TIME,
	})
}
