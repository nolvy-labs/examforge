import { apiClient } from "@/lib/api/api.client"
import { parseApiResponse } from "@/lib/api/api.schema"

import { dashboardStatisticsSchema, studentStatisticsSchema } from "../types/statistics.schema"
import type { StatisticsMode, StatisticsPeriod } from "../types/statistics.type"

export async function getDashboardStatistics(signal?: AbortSignal) {
	const response = await apiClient.get<unknown>("/api/v1/statistics/dashboard", { signal })
	return parseApiResponse(dashboardStatisticsSchema, response.data, "dashboard statistics")
}

export async function getStudentStatistics(
	period: StatisticsPeriod,
	mode: StatisticsMode,
	signal?: AbortSignal
) {
	const response = await apiClient.get<unknown>("/api/v1/statistics", {
		params: { period, mode },
		signal,
	})
	return parseApiResponse(studentStatisticsSchema, response.data, "student statistics")
}
