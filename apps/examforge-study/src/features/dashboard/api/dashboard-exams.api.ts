import {
	getStudentExams,
	type StudentExamRequest,
} from "@/features/exams/api/exam.api"

// Temporary dashboard policy: newest available exams, not personalized recommendations.
export const DASHBOARD_RECOMMENDED_EXAMS_REQUEST = {
	page: 1,
	pageSize: 4,
	tagIds: [],
	sort: "Newest",
} satisfies StudentExamRequest

export function getDashboardRecommendedExams(signal?: AbortSignal) {
	return getStudentExams(DASHBOARD_RECOMMENDED_EXAMS_REQUEST, signal)
}
