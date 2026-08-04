import { StatisticsMode, StatisticsPeriod } from "../types/statistics.type"

export interface StatisticsFilterState {
	period: StatisticsPeriod
	mode: StatisticsMode
}

const periods = new Set<StatisticsPeriod>(["30d", "90d", "all"])
const modes = new Set<StatisticsMode>(["all", "practice", "exam"])

export function parseStatisticsFilters(params: URLSearchParams): StatisticsFilterState {
	const period = params.get("period") as StatisticsPeriod | null
	const mode = params.get("mode") as StatisticsMode | null
	return {
		period: period && periods.has(period) ? period : "30d",
		mode: mode && modes.has(mode) ? mode : "all",
	}
}

export function serializeStatisticsFilters(
	state: StatisticsFilterState,
	params = new URLSearchParams()
) {
	const next = new URLSearchParams(params)
	next.set("period", state.period)
	next.set("mode", state.mode)
	return next
}

export function getNormalizedStatisticsQuery(params: URLSearchParams) {
	return serializeStatisticsFilters(parseStatisticsFilters(params), params).toString()
}
