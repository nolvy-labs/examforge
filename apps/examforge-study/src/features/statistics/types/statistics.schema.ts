import { z } from "zod"

const percentageSchema = z.number().finite().nullable()
const overviewSchema = z.object({
	completedAttempts: z.number().int().nonnegative(),
	averageScorePercentage: percentageSchema,
	questionsAnswered: z.number().int().nonnegative(),
})

export const dashboardStatisticsSchema = overviewSchema

export const studentStatisticsSchema = z.object({
	filters: z.object({
		period: z.enum(["30d", "90d", "all"]),
		mode: z.enum(["all", "practice", "exam"]),
		fromUtc: z.iso.datetime({ offset: true }).nullable(),
		toUtc: z.iso.datetime({ offset: true }),
	}),
	overview: overviewSchema,
	scoreTrend: z.array(z.object({
		attemptId: z.uuid(),
		examId: z.uuid(),
		examSlug: z.string(),
		examTitle: z.string(),
		versionNumber: z.number().int().positive(),
		mode: z.enum(["practice", "exam"]),
		submittedAtUtc: z.iso.datetime({ offset: true }),
		scorePercentage: z.number().finite(),
	})),
	performanceByExam: z.array(z.object({
		examId: z.uuid(),
		examSlug: z.string(),
		examTitle: z.string(),
		attemptCount: z.number().int().nonnegative(),
		latestScorePercentage: percentageSchema,
		averageScorePercentage: percentageSchema,
		bestScorePercentage: percentageSchema,
	})),
	performanceByQuestionType: z.array(z.object({
		questionType: z.number().int(),
		pointsEarned: z.number().finite().nonnegative(),
		maximumPoints: z.number().finite().nonnegative(),
		pointsPercentage: percentageSchema,
		correctCount: z.number().int().nonnegative(),
		partiallyCorrectCount: z.number().int().nonnegative(),
		incorrectCount: z.number().int().nonnegative(),
		unansweredCount: z.number().int().nonnegative(),
	})),
})
