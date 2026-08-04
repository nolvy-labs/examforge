import type { StatisticsMode, StatisticsPeriod } from "../types/statistics.type"
import type { QueryClient } from "@tanstack/react-query"

export const statisticsQueryKeys = {
	all: ["statistics"] as const,
	dashboard: () => ["statistics", "dashboard"] as const,
	full: () => ["statistics", "full"] as const,
	detail: (period: StatisticsPeriod, mode: StatisticsMode) =>
		["statistics", "full", period, mode] as const,
}

export async function invalidateStatisticsAfterSubmission(queryClient: QueryClient) {
	await queryClient.invalidateQueries({ queryKey: statisticsQueryKeys.dashboard() })
	await queryClient.invalidateQueries({ queryKey: statisticsQueryKeys.full() })
}
