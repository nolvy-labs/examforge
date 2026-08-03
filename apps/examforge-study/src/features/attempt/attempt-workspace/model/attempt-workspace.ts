import type { DraftAnswer, AttemptDetail } from "../../types/attempt.type"
import { flattenAnswerableQuestions } from "../../types/attempt.type"

export type EndAttemptMode = "submit" | "abandon"

export interface AttemptBlockLocation {
	sectionId: string
	blockId: string
}

export function getAttemptBlocks(detail?: AttemptDetail): AttemptBlockLocation[] {
	return (
		detail?.sections.flatMap((section) =>
			section.questions.map((question) => ({
				sectionId: section.id,
				blockId: question.id,
			}))
		) ?? []
	)
}

export function getAnsweredQuestionCount(
	detail: AttemptDetail,
	drafts: Record<string, DraftAnswer>
) {
	return flattenAnswerableQuestions(detail.sections).filter((question) => {
		const answer = drafts[question.id]
		return Boolean(answer?.textAnswer?.trim() || answer?.selectedOptionIds.length)
	}).length
}

export function getAnswerableQuestionCount(detail: AttemptDetail) {
	return flattenAnswerableQuestions(detail.sections).length
}
