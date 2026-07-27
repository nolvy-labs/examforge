import type {
	AttemptPatchOperation,
	DraftAnswer,
} from "../types/attempt.type"

export type DirtyFields = Record<
	string,
	{ textAnswer?: true; selectedOptionIds?: true }
>

export interface SaveSnapshot {
	answers: Record<string, DraftAnswer>
	fields: DirtyFields
}

export function buildPatchOperations(snapshot: SaveSnapshot) {
	const operations: AttemptPatchOperation[] = []
	for (const [questionId, fields] of Object.entries(snapshot.fields)) {
		const answer = snapshot.answers[questionId]
		if (!answer) continue
		if (fields.textAnswer) {
			operations.push({
				op: "replace",
				path: `/answers/${questionId}/textAnswer`,
				value: answer.textAnswer,
			})
		}
		if (fields.selectedOptionIds) {
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
	for (let index = 0; index < operations.length; index += size) {
		chunks.push(operations.slice(index, index + size))
	}
	return chunks
}

export function answersEqual(a?: DraftAnswer, b?: DraftAnswer) {
	return (
		a?.textAnswer === b?.textAnswer &&
		JSON.stringify(a?.selectedOptionIds ?? []) ===
			JSON.stringify(b?.selectedOptionIds ?? [])
	)
}
