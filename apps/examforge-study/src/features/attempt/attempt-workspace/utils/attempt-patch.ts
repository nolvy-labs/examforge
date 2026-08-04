import type { AttemptPatchOperation, DraftAnswer } from "../../types/attempt.type"

export type DirtyAnswers = Record<string, number>
export type AnswerFieldKind = "text" | "options"

export interface SaveSnapshot {
	answers: Record<string, DraftAnswer>
	generations: DirtyAnswers
	fields: Record<string, AnswerFieldKind>
}

export function buildPatchOperations(snapshot: SaveSnapshot) {
	const operations: AttemptPatchOperation[] = []
	for (const questionId of Object.keys(snapshot.generations)) {
		const answer = snapshot.answers[questionId]
		if (!answer) continue
		if (snapshot.fields[questionId] === "text") {
			operations.push({
				op: "replace",
				path: `/answers/${questionId}/textAnswer`,
				value: answer.textAnswer,
			})
		}
		if (snapshot.fields[questionId] === "options") {
			operations.push({
				op: "replace",
				path: `/answers/${questionId}/selectedOptionIds`,
				value: [...new Set(answer.selectedOptionIds)],
			})
		}
	}
	return operations
}

export function chunkOperations(operations: AttemptPatchOperation[], size = 100) {
	const chunks: AttemptPatchOperation[][] = []
	for (let index = 0; index < operations.length; index += size) chunks.push(operations.slice(index, index + size))
	return chunks
}
