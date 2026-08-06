import { z } from "zod";

import {
  apiDateTimeSchema,
  apiNonnegativeIntegerSchema,
  apiNonnegativeNumberSchema,
  apiPositiveIntegerSchema,
  apiUuidSchema,
  collectionResponseSchema,
} from "@/features/exams/types/exam-contract.schema";

export const ADMIN_PAGE_SIZE = 20;
export const userRoleSchema = z.union([z.literal(1), z.literal(5)]);
export const attemptStatusSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
]);
export const attemptModeSchema = z.enum(["practice", "exam"]);
export const gradingStatusSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const userSummarySchema = z.strictObject({
  userId: apiUuidSchema,
  email: z.email(),
  displayName: z.string().nullable(),
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAtUtc: apiDateTimeSchema,
  updatedAtUtc: apiDateTimeSchema.nullable(),
});

export const userListResponseSchema =
  collectionResponseSchema(userSummarySchema);
export const userStatisticsSchema = z.strictObject({
  totalAttempts: apiNonnegativeIntegerSchema,
  attemptsByStatus: z.strictObject({
    inProgress: apiNonnegativeIntegerSchema,
    submitted: apiNonnegativeIntegerSchema,
    abandoned: apiNonnegativeIntegerSchema,
  }),
  attemptsByMode: z.strictObject({
    practice: apiNonnegativeIntegerSchema,
    exam: apiNonnegativeIntegerSchema,
  }),
  averageSubmittedPercentage: apiNonnegativeNumberSchema.nullable(),
  bestSubmittedPercentage: apiNonnegativeNumberSchema.nullable(),
  totalAnsweredQuestions: apiNonnegativeIntegerSchema,
  lastAttemptAtUtc: apiDateTimeSchema.nullable(),
});
export const userDetailSchema = userSummarySchema.extend({
  statistics: userStatisticsSchema,
});

const attemptUserSchema = z.strictObject({
  userId: apiUuidSchema,
  displayName: z.string().nullable(),
  email: z.email(),
});
const attemptExamSchema = z.strictObject({
  examId: apiUuidSchema,
  title: z.string(),
  slug: z.string(),
});
const attemptVersionSchema = z.strictObject({
  examVersionId: apiUuidSchema,
  versionNumber: apiPositiveIntegerSchema,
  title: z.string(),
});
const scoreSchema = z.strictObject({
  score: apiNonnegativeNumberSchema.nullable(),
  maximumScore: apiNonnegativeNumberSchema.nullable(),
  percentage: apiNonnegativeNumberSchema.nullable(),
});

export const attemptSummarySchema = z.strictObject({
  attemptId: apiUuidSchema,
  status: attemptStatusSchema,
  mode: attemptModeSchema,
  revision: apiNonnegativeIntegerSchema,
  startedAtUtc: apiDateTimeSchema,
  expiresAtUtc: apiDateTimeSchema.nullable(),
  submittedAtUtc: apiDateTimeSchema.nullable(),
  abandonedAtUtc: apiDateTimeSchema.nullable(),
  createdAtUtc: apiDateTimeSchema,
  updatedAtUtc: apiDateTimeSchema,
  user: attemptUserSchema,
  exam: attemptExamSchema,
  examVersion: attemptVersionSchema,
  score: scoreSchema,
});
export const attemptListResponseSchema =
  collectionResponseSchema(attemptSummarySchema);

const optionSchema = z.strictObject({
  id: apiUuidSchema,
  label: z.string().nullable(),
  text: z.string(),
  displayOrder: apiNonnegativeIntegerSchema,
});
const answerSchema = z.strictObject({
  textAnswer: z.string().nullable(),
  selectedOptionIds: z.array(apiUuidSchema),
  awardedScore: apiNonnegativeNumberSchema.nullable().optional(),
  maximumScore: apiNonnegativeNumberSchema.nullable().optional(),
  gradingStatus: gradingStatusSchema.nullable().optional(),
});
const solutionSchema = z.strictObject({
  explanation: z.string().nullable(),
  options: z.array(
    z.strictObject({
      optionId: apiUuidSchema,
      isCorrect: z.boolean(),
      explanation: z.string().nullable(),
    }),
  ),
  acceptedAnswers: z.array(
    z.strictObject({
      blankKey: z.string(),
      acceptedAnswer: z.string(),
      isCaseSensitive: z.boolean(),
      displayOrder: apiNonnegativeIntegerSchema,
    }),
  ),
});
export const attemptQuestionSchema: z.ZodType<AttemptQuestion> = z.lazy(() =>
  z.strictObject({
    id: apiUuidSchema,
    parentQuestionId: apiUuidSchema.nullable(),
    type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    prompt: z.string(),
    points: apiNonnegativeNumberSchema,
    displayOrder: apiNonnegativeIntegerSchema,
    metadata: z.unknown().nullable(),
    options: z.array(optionSchema),
    childQuestions: z.array(attemptQuestionSchema),
    answer: answerSchema.nullable().optional(),
    solution: solutionSchema.nullable().optional(),
  }),
);
export interface AttemptQuestion {
  id: string;
  parentQuestionId: string | null;
  type: 0 | 1 | 2 | 3;
  prompt: string;
  points: number;
  displayOrder: number;
  metadata: unknown | null;
  options: z.infer<typeof optionSchema>[];
  childQuestions: AttemptQuestion[];
  answer?: z.infer<typeof answerSchema> | null;
  solution?: z.infer<typeof solutionSchema> | null;
}
const sectionSchema = z.strictObject({
  id: apiUuidSchema,
  kind: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  title: z.string(),
  instructions: z.string(),
  stimulusText: z.string().nullable(),
  mediaUrl: z.string().nullable(),
  displayOrder: apiNonnegativeIntegerSchema,
  metadata: z.unknown().nullable(),
  questions: z.array(attemptQuestionSchema),
});
export const attemptDetailSchema = attemptSummarySchema.extend({
  exam: attemptExamSchema.extend({
    description: z.string(),
    type: z.union([z.literal(0), z.literal(1)]),
  }),
  examVersion: attemptVersionSchema.extend({
    description: z.string(),
    instructions: z.string(),
    durationMinutes: apiPositiveIntegerSchema.nullable(),
  }),
  sections: z.array(sectionSchema),
});

export type UserSummary = z.infer<typeof userSummarySchema>;
export type UserDetail = z.infer<typeof userDetailSchema>;
export type AttemptSummary = z.infer<typeof attemptSummarySchema>;
export type AttemptDetail = z.infer<typeof attemptDetailSchema>;
