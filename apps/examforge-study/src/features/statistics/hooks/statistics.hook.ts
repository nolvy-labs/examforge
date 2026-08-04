"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"

import { getDashboardStatistics, getStudentStatistics } from "../api/statistics.api"
import type { StatisticsMode, StatisticsPeriod } from "../types/statistics.type"
import { statisticsQueryKeys } from "../api/statistics.key"

const STATISTICS_STALE_TIME = 5 * 60 * 1000

export function useDashboardStatistics() {
	return useQuery({
		queryKey: statisticsQueryKeys.dashboard(),
		queryFn: ({ signal }) => getDashboardStatistics(signal),
		staleTime: STATISTICS_STALE_TIME,
	})
}

export function useStudentStatistics(period: StatisticsPeriod, mode: StatisticsMode) {
	return useQuery({
		queryKey: statisticsQueryKeys.detail(period, mode),
		queryFn: ({ signal }) => getStudentStatistics(period, mode, signal),
		staleTime: STATISTICS_STALE_TIME,
		placeholderData: keepPreviousData,
	})
}
