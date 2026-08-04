export type StatisticsPeriod = "30d" | "90d" | "all"
export type StatisticsMode = "all" | "practice" | "exam"

export interface StatisticsFilters {
	period: StatisticsPeriod
	mode: StatisticsMode
	fromUtc: string | null
	toUtc: string
}

export interface StatisticsOverview {
	completedAttempts: number
	averageScorePercentage: number | null
	questionsAnswered: number
}

export interface ScoreTrendPoint {
	attemptId: string
	examId: string
	examSlug: string
	examTitle: string
	versionNumber: number
	mode: "practice" | "exam"
	submittedAtUtc: string
	scorePercentage: number
}

export interface ExamPerformance {
	examId: string
	examSlug: string
	examTitle: string
	attemptCount: number
	latestScorePercentage: number | null
	averageScorePercentage: number | null
	bestScorePercentage: number | null
}

export interface QuestionTypePerformance {
	questionType: number
	pointsEarned: number
	maximumPoints: number
	pointsPercentage: number | null
	correctCount: number
	partiallyCorrectCount: number
	incorrectCount: number
	unansweredCount: number
}

export interface StudentStatistics {
	filters: StatisticsFilters
	overview: StatisticsOverview
	scoreTrend: ScoreTrendPoint[]
	performanceByExam: ExamPerformance[]
	performanceByQuestionType: QuestionTypePerformance[]
}
