import { keepPreviousData, useQuery } from "@tanstack/react-query"

import {
	getStudentExamCategories,
	getStudentExamFilters,
	getStudentExams,
} from "../api/exam-browse.api"
import { EXAM_PAGE_SIZE } from "../model/exam-browse.params"
import type { ExamBrowseState } from "../model/exam-browse.types"

const METADATA_STALE_TIME = 15 * 60 * 1000

export function useStudentExams(state: ExamBrowseState) {
	return useQuery({
		queryKey: [
			"student-exams",
			state.search,
			state.category,
			state.tagIds,
			state.sort,
			state.page,
			EXAM_PAGE_SIZE,
		],
		queryFn: ({ signal }) => getStudentExams(state, signal),
		placeholderData: keepPreviousData,
	})
}

export function useStudentExamFilters() {
	return useQuery({
		queryKey: ["student-exam-filters"],
		queryFn: ({ signal }) => getStudentExamFilters(signal),
		staleTime: METADATA_STALE_TIME,
	})
}

export function useStudentExamCategories() {
	return useQuery({
		queryKey: ["student-exam-categories", { featuredOnly: false }],
		queryFn: ({ signal }) => getStudentExamCategories(signal),
		staleTime: METADATA_STALE_TIME,
	})
}
