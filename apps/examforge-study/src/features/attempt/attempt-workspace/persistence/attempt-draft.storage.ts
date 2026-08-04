import { z } from "zod"

import type { DraftAnswer, ExamAttemptMode } from "../../types/attempt.type"

export interface AttemptLocalDraft {
	schemaVersion: 1
	attemptId: string
	examVersionId: string
	studentId: string
	mode: ExamAttemptMode
	serverRevision: number
	answers: Record<string, DraftAnswer>
	dirtyAnswers: Record<string, number>
	practiceElapsedMs: number
	updatedAtUtc: string
}

const answerSchema = z.object({
	textAnswer: z.string().nullable(),
	selectedOptionIds: z.array(z.string()),
})

const draftSchema = z.object({
	schemaVersion: z.literal(1),
	attemptId: z.string().min(1),
	examVersionId: z.string().min(1),
	studentId: z.string().min(1),
	mode: z.enum(["practice", "exam"]),
	serverRevision: z.number().int().nonnegative(),
	answers: z.record(z.string(), answerSchema),
	dirtyAnswers: z.record(z.string(), z.number().int().positive()),
	practiceElapsedMs: z.number().finite().nonnegative(),
	updatedAtUtc: z.iso.datetime({ offset: true }),
})

export function attemptDraftKey(studentId: string, attemptId: string) {
	return `examforge:attempt-draft:v1:${studentId}:${attemptId}`
}

export function readAttemptDraft(
	studentId: string,
	attemptId: string,
	examVersionId: string,
	mode: ExamAttemptMode
): AttemptLocalDraft | null {
	if (typeof window === "undefined") return null
	try {
		const raw = window.localStorage.getItem(attemptDraftKey(studentId, attemptId))
		if (!raw) return null
		const parsed = draftSchema.safeParse(JSON.parse(raw))
		if (!parsed.success) return null
		const draft = parsed.data
		if (
			draft.studentId !== studentId ||
			draft.attemptId !== attemptId ||
			draft.examVersionId !== examVersionId ||
			draft.mode !== mode
		) return null
		return draft
	} catch {
		return null
	}
}

export function writeAttemptDraft(draft: AttemptLocalDraft) {
	if (typeof window === "undefined") return false
	try {
		window.localStorage.setItem(
			attemptDraftKey(draft.studentId, draft.attemptId),
			JSON.stringify({ ...draft, updatedAtUtc: new Date().toISOString() })
		)
		return true
	} catch {
		return false
	}
}

export function removeAttemptDraft(studentId: string, attemptId: string) {
	if (typeof window === "undefined") return
	try {
		window.localStorage.removeItem(attemptDraftKey(studentId, attemptId))
	} catch {
		// Storage availability must not affect terminal navigation.
	}
}
