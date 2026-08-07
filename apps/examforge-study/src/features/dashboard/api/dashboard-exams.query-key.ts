import { DASHBOARD_RECOMMENDED_EXAMS_REQUEST } from "./dashboard-exams.api"

export const dashboardExamQueryKeys = {
	all: ["dashboard-exams"] as const,
	recommended: () => [
		...dashboardExamQueryKeys.all,
		"recommended",
		{
			page: DASHBOARD_RECOMMENDED_EXAMS_REQUEST.page,
			pageSize: DASHBOARD_RECOMMENDED_EXAMS_REQUEST.pageSize,
			tagIds: DASHBOARD_RECOMMENDED_EXAMS_REQUEST.tagIds,
			sort: DASHBOARD_RECOMMENDED_EXAMS_REQUEST.sort,
		},
	] as const,
}
