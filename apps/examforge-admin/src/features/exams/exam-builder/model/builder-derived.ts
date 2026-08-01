import type {
	BuilderDocument,
	BuilderEntityId,
	BuilderQuestion,
} from "./builder.types"
import { builderDocumentToMutationValues } from "./builder-mapper"

export function cloneBuilderDocument(document: BuilderDocument): BuilderDocument {
	return structuredClone(document)
}

export function normalizeBuilderOrder(document: BuilderDocument): BuilderDocument {
	const normalized = cloneBuilderDocument(document)

	normalized.sectionIds.forEach((sectionId, sectionIndex) => {
		const section = normalized.sectionsById[sectionId]
		if (!section) return
		section.displayOrder = sectionIndex
		section.questionIds.forEach((questionId, questionIndex) => {
			normalizeQuestionOrder(normalized, questionId, questionIndex)
		})
	})

	return normalized
}

function normalizeQuestionOrder(
	document: BuilderDocument,
	questionId: BuilderEntityId,
	displayOrder: number
) {
	const question = document.questionsById[questionId]
	if (!question) return
	question.displayOrder = displayOrder

	if (question.type === "group") {
		question.childQuestionIds.forEach((childId, childIndex) => {
			normalizeQuestionOrder(document, childId, childIndex)
		})
		return
	}

	if (question.type === "fill-blank") {
		question.answerKeyIds.forEach((answerId, answerIndex) => {
			const answer = document.answerKeysById[answerId]
			if (answer) answer.displayOrder = answerIndex
		})
		return
	}

	question.optionIds.forEach((optionId, optionIndex) => {
		const option = document.optionsById[optionId]
		if (option) option.displayOrder = optionIndex
	})
}

export function calculateQuestionCount(
	document: BuilderDocument,
	sectionId: BuilderEntityId
) {
	const section = document.sectionsById[sectionId]
	if (!section) return 0
	return section.questionIds.reduce((count, questionId) => {
		const question = document.questionsById[questionId]
		if (!question) return count
		return count + (question.type === "group" ? question.childQuestionIds.length : 1)
	}, 0)
}

export function calculateNestedQuestionEntityCount(
	document: BuilderDocument,
	sectionId: BuilderEntityId
) {
	const section = document.sectionsById[sectionId]
	if (!section) return 0
	return section.questionIds.reduce((count, questionId) => {
		const question = document.questionsById[questionId]
		if (!question) return count
		return count + 1 + (question.type === "group" ? question.childQuestionIds.length : 0)
	}, 0)
}

export function calculateSectionPoints(
	document: BuilderDocument,
	sectionId: BuilderEntityId
) {
	const section = document.sectionsById[sectionId]
	if (!section) return 0
	return roundPoints(
		section.questionIds.reduce((total, questionId) => {
			const question = document.questionsById[questionId]
			if (!question) return total
			return total + calculateQuestionPoints(document, question)
		}, 0)
	)
}

function calculateQuestionPoints(
	document: BuilderDocument,
	question: BuilderQuestion
) {
	if (question.type !== "group") return question.points
	return question.childQuestionIds.reduce(
		(total, childId) => total + (document.questionsById[childId]?.points ?? 0),
		0
	)
}

export function calculateTotalPoints(document: BuilderDocument) {
	return roundPoints(
		document.sectionIds.reduce(
			(total, sectionId) => total + calculateSectionPoints(document, sectionId),
			0
		)
	)
}

export function builderDocumentSemanticFingerprint(document: BuilderDocument) {
	const values = builderDocumentToMutationValues(document)
	const sortRecord = <T>(record: Record<string, T>) =>
		Object.fromEntries(
			Object.entries(record).sort(([left], [right]) => left.localeCompare(right))
		)
	const questionOrder = Object.fromEntries(
		Object.values(document.questionsById)
			.sort((left, right) => left.id.localeCompare(right.id))
			.map((question) => [
				question.id,
				question.type === "group"
					? question.childQuestionIds
					: question.type === "fill-blank"
						? question.answerKeyIds
						: question.optionIds,
			])
	)
	return JSON.stringify({
		values: {
			version: values.version,
			sections: sortRecord(values.sections),
			questions: sortRecord(values.questions),
			options: sortRecord(values.options),
			answerKeys: sortRecord(values.answerKeys),
		},
		sectionIds: document.sectionIds,
		sectionQuestions: Object.fromEntries(
			Object.values(document.sectionsById)
				.sort((left, right) => left.id.localeCompare(right.id))
				.map((section) => [section.id, section.questionIds])
		),
		questionOrder,
	})
}

export function builderDocumentsSemanticallyEqual(
	left: BuilderDocument,
	right: BuilderDocument
) {
	return (
		builderDocumentSemanticFingerprint(left) ===
		builderDocumentSemanticFingerprint(right)
	)
}

function roundPoints(value: number) {
	return Math.round((value + Number.EPSILON) * 100) / 100
}
