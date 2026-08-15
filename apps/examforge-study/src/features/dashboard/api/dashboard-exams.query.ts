"use client"

import { useQuery } from "@tanstack/react-query"

import { getDashboardRecommendedExams } from "./dashboard-exams.api"
import { dashboardExamQueryKeys } from "./dashboard-exams.query-key"

export function useDashboardRecommendedExams() {
	return useQuery({
		queryKey: dashboardExamQueryKeys.recommended(),
		queryFn: ({ signal }) => getDashboardRecommendedExams(signal),
	})
}
