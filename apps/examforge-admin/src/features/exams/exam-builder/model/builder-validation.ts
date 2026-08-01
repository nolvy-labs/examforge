import { BUILDER_LIMITS } from "./builder.constants"
import {
	calculateNestedQuestionEntityCount,
	calculateQuestionCount,
	calculateTotalPoints,
} from "./builder-derived"
import { isTemporaryEntityId } from "./builder-id"
import { isRichTextEmpty, richTextToPersistedString } from "./rich-text"
import type {
	BuilderDocument,
	BuilderEntityId,
	BuilderQuestion,
	BuilderValidationEntity,
	BuilderValidationError,
	BuilderValidationMode,
} from "./builder.types"

interface ValidationContext {
	document: BuilderDocument
	mode: BuilderValidationMode
	errors: BuilderValidationError[]
}

export function normalizeFillAnswer(value: string, caseSensitive: boolean) {
	const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ")
	return caseSensitive ? normalized : normalized.toUpperCase()
}

export function fillAnswersConflict(
	leftValue: string,
	leftCaseSensitive: boolean,
	rightValue: string,
	rightCaseSensitive: boolean
) {
	if (leftCaseSensitive && rightCaseSensitive) {
		return (
			normalizeFillAnswer(leftValue, true) ===
			normalizeFillAnswer(rightValue, true)
		)
	}
	return (
		normalizeFillAnswer(leftValue, false) ===
		normalizeFillAnswer(rightValue, false)
	)
}

export function validateBuilderDocument(
	document: BuilderDocument,
	mode: BuilderValidationMode
) {
	const context: ValidationContext = { document, mode, errors: [] }

	for (const sourceIssue of document.sourceIssues) {
		addError(
			context,
			sourceIssue.entityKind,
			sourceIssue.entityId,
			sourceIssue.field ?? "document",
			sourceIssue.code,
			sourceIssue.message
		)
	}

	validateDocumentIdentity(context)
	validateVersion(context)
	validateSections(context)
	validateGlobalIds(context)
	validateReachability(context)

	const totalPoints = calculateTotalPoints(document)
	if (mode === "publish") {
		if (totalPoints <= 0) {
			addError(
				context,
				"document",
				undefined,
				"totalPoints",
				"total_score_required",
				"Total score must be greater than zero before publication."
			)
		}
		if (totalPoints !== document.serverTotalScore) {
			addError(
				context,
				"document",
				undefined,
				"totalPoints",
				"total_score_mismatch",
				"Calculated total points do not match the confirmed server total."
			)
		}
	}

	return context.errors
}

function validateDocumentIdentity(context: ValidationContext) {
	const { document } = context
	if (document.version.status !== "draft") {
		addError(
			context,
			"version",
			document.version.id,
			"status",
			"version_read_only",
			"Only Draft versions can be changed or published."
		)
	}
	if (document.examArchived) {
		addError(
			context,
			"document",
			undefined,
			"examArchived",
			"exam_archived",
			"Archived exams cannot be modified."
		)
	}
}

function validateVersion(context: ValidationContext) {
	const { version } = context.document
	if (!version.title.trim()) {
		fieldError(context, "version", version.id, "title", "required")
	} else if (normalizeName(version.title).length > BUILDER_LIMITS.versionTitle) {
		fieldError(context, "version", version.id, "title", "too_long")
	}
	validateRichLength(
		context,
		"version",
		version.id,
		"description",
		version.description,
		BUILDER_LIMITS.versionDescription,
		false
	)
	validateRichLength(
		context,
		"version",
		version.id,
		"instructions",
		version.instructions,
		BUILDER_LIMITS.versionInstructions,
		false
	)
	if (
		version.durationMinutes !== null &&
		(!Number.isInteger(version.durationMinutes) ||
			version.durationMinutes < 1 ||
			version.durationMinutes > BUILDER_LIMITS.durationMinutes)
	) {
		fieldError(context, "version", version.id, "durationMinutes", "invalid")
	}
}

function validateSections(context: ValidationContext) {
	const { document, mode } = context
	validateOrder(
		context,
		"document",
		undefined,
		"sectionIds",
		document.sectionIds,
		(id) => document.sectionsById[id]?.displayOrder
	)

	if (document.sectionIds.length > BUILDER_LIMITS.sectionsPerVersion) {
		fieldError(context, "document", undefined, "sectionIds", "too_many")
	}
	if (mode === "publish" && document.sectionIds.length === 0) {
		fieldError(context, "document", undefined, "sectionIds", "required")
	}

	for (const sectionId of document.sectionIds) {
		const section = document.sectionsById[sectionId]
		if (!section) {
			fieldError(context, "document", undefined, "sectionIds", "missing_reference")
			continue
		}
		if (!section.title.trim()) {
			fieldError(context, "section", section.id, "title", "required")
		} else if (normalizeName(section.title).length > BUILDER_LIMITS.sectionTitle) {
			fieldError(context, "section", section.id, "title", "too_long")
		}
		if (![0, 1, 2, 3, 4, 5].includes(section.kind)) {
			fieldError(context, "section", section.id, "kind", "unsupported")
		}
		validateRichLength(
			context,
			"section",
			section.id,
			"instructions",
			section.instructions,
			BUILDER_LIMITS.sectionInstructions,
			false
		)
		if (section.stimulusText) {
			validateRichLength(
				context,
				"section",
				section.id,
				"stimulusText",
				section.stimulusText,
				BUILDER_LIMITS.sectionStimulus,
				true
			)
		}
		if (section.mediaUrl !== null && !isValidMediaUrl(section.mediaUrl)) {
			fieldError(context, "section", section.id, "mediaUrl", "invalid")
		}

		validateOrder(
			context,
			"section",
			section.id,
			"questionIds",
			section.questionIds,
			(id) => document.questionsById[id]?.displayOrder
		)
		if (section.questionIds.length > BUILDER_LIMITS.questionsPerSection) {
			fieldError(context, "section", section.id, "questionIds", "too_many")
		}
		if (
			isTemporaryEntityId(section.id) &&
			calculateNestedQuestionEntityCount(document, section.id) >
				BUILDER_LIMITS.questionsPerNestedRequest
		) {
			fieldError(context, "section", section.id, "questions", "nested_request_limit")
		}

		let answerableCount = 0
		for (const questionId of section.questionIds) {
			const question = document.questionsById[questionId]
			if (!question) continue
			if (question.sectionId !== section.id || question.parentGroupId !== null) {
				fieldError(context, "question", question.id, "sectionId", "invalid_reference")
			}
			answerableCount += validateQuestion(context, question)
		}
		if (mode === "publish" && answerableCount === 0) {
			fieldError(context, "section", section.id, "questionIds", "answerable_required")
		}
	}

}

function validateQuestion(context: ValidationContext, question: BuilderQuestion): number {
	validateRichLength(
		context,
		"question",
		question.id,
		"prompt",
		question.prompt,
		BUILDER_LIMITS.questionPrompt,
		true
	)
	if (question.explanation) {
		validateRichLength(
			context,
			"question",
			question.id,
			"explanation",
			question.explanation,
			BUILDER_LIMITS.questionExplanation,
			true
		)
	}

	if (question.type === "group") {
		validateOrder(
			context,
			"question",
			question.id,
			"childQuestionIds",
			question.childQuestionIds,
			(id) => context.document.questionsById[id]?.displayOrder
		)
		if (question.childQuestionIds.length > BUILDER_LIMITS.childrenPerGroup) {
			fieldError(context, "question", question.id, "childQuestionIds", "too_many")
		}
		if (context.mode === "publish" && question.childQuestionIds.length === 0) {
			fieldError(context, "question", question.id, "childQuestionIds", "required")
		}
		let answerableCount = 0
		for (const childId of question.childQuestionIds) {
			const child = context.document.questionsById[childId]
			if (!child) {
				fieldError(context, "question", question.id, "childQuestionIds", "missing_reference")
				continue
			}
			if (child.type === "group") {
				fieldError(context, "question", child.id, "type", "nested_group")
				continue
			}
			if (child.parentGroupId !== question.id || child.sectionId !== question.sectionId) {
				fieldError(context, "question", child.id, "parentGroupId", "invalid_reference")
			}
			answerableCount += validateQuestion(context, child)
		}
		return answerableCount
	}

	validatePoints(context, question)
	if (question.type === "fill-blank") {
		validateAnswerKeys(context, question)
	} else {
		validateChoiceQuestion(context, question)
	}
	return 1
}

function validatePoints(context: ValidationContext, question: BuilderQuestion) {
	const scaled = Math.round(question.points * 100) / 100
	if (
		!Number.isFinite(question.points) ||
		question.points < BUILDER_LIMITS.minimumPoints ||
		question.points > BUILDER_LIMITS.maximumPoints ||
		scaled !== question.points
	) {
		fieldError(context, "question", question.id, "points", "invalid")
	}
}

function validateChoiceQuestion(
	context: ValidationContext,
	question: Extract<BuilderQuestion, { type: "single-choice" | "multiple-choice" }>
) {
	validateOrder(
		context,
		"question",
		question.id,
		"optionIds",
		question.optionIds,
		(id) => context.document.optionsById[id]?.displayOrder
	)
	if (question.optionIds.length > BUILDER_LIMITS.optionsPerQuestion) {
		fieldError(context, "question", question.id, "optionIds", "too_many")
	}
	if (context.mode === "publish" && question.optionIds.length < 2) {
		fieldError(context, "question", question.id, "optionIds", "minimum_two")
	}

	for (const optionId of question.optionIds) {
		const option = context.document.optionsById[optionId]
		if (!option) {
			fieldError(context, "question", question.id, "optionIds", "missing_reference")
			continue
		}
		if (option.questionId !== question.id) {
			fieldError(context, "option", option.id, "questionId", "invalid_reference")
		}
		validateRichLength(
			context,
			"option",
			option.id,
			"content",
			option.content,
			BUILDER_LIMITS.optionText,
			true
		)
		if (
			option.label !== null &&
			(!option.label.trim() || option.label.trim().length > BUILDER_LIMITS.optionLabel)
		) {
			fieldError(context, "option", option.id, "label", "invalid")
		}
		if (option.explanation) {
			validateRichLength(
				context,
				"option",
				option.id,
				"explanation",
				option.explanation,
				BUILDER_LIMITS.optionExplanation,
				true
			)
		}
	}

	const uniqueCorrect = new Set(question.correctOptionIds)
	if (uniqueCorrect.size !== question.correctOptionIds.length) {
		fieldError(context, "question", question.id, "correctOptionIds", "duplicate")
	}
	for (const correctId of uniqueCorrect) {
		if (!question.optionIds.includes(correctId) || !context.document.optionsById[correctId]) {
			fieldError(context, "question", question.id, "correctOptionIds", "invalid_reference")
		}
	}
	if (question.type === "single-choice" && uniqueCorrect.size > 1) {
		fieldError(context, "question", question.id, "correctOptionIds", "exactly_one")
	}
	if (context.mode === "publish") {
		if (question.type === "single-choice" && uniqueCorrect.size !== 1) {
			fieldError(context, "question", question.id, "correctOptionIds", "exactly_one")
		}
		if (question.type === "multiple-choice" && uniqueCorrect.size < 1) {
			fieldError(context, "question", question.id, "correctOptionIds", "at_least_one")
		}
	}
}

function validateAnswerKeys(
	context: ValidationContext,
	question: Extract<BuilderQuestion, { type: "fill-blank" }>
) {
	validateOrder(
		context,
		"question",
		question.id,
		"answerKeyIds",
		question.answerKeyIds,
		(id) => context.document.answerKeysById[id]?.displayOrder
	)
	if (question.answerKeyIds.length > BUILDER_LIMITS.answersPerQuestion) {
		fieldError(context, "question", question.id, "answerKeyIds", "too_many")
	}
	if (context.mode === "publish" && question.answerKeyIds.length === 0) {
		fieldError(context, "question", question.id, "answerKeyIds", "required")
	}

	const answers = question.answerKeyIds
		.map((answerId) => context.document.answerKeysById[answerId])
		.filter((answer) => answer !== undefined)
	for (const answerId of question.answerKeyIds) {
		const answer = context.document.answerKeysById[answerId]
		if (!answer) {
			fieldError(context, "question", question.id, "answerKeyIds", "missing_reference")
			continue
		}
		if (answer.questionId !== question.id) {
			fieldError(context, "answer-key", answer.id, "questionId", "invalid_reference")
		}
		if (
			!answer.acceptedAnswer.trim() ||
			normalizeFillAnswer(answer.acceptedAnswer, true).length >
				BUILDER_LIMITS.acceptedAnswer
		) {
			fieldError(context, "answer-key", answer.id, "acceptedAnswer", "invalid")
		}
	}

	for (let left = 0; left < answers.length; left += 1) {
		for (let right = left + 1; right < answers.length; right += 1) {
			if (
				fillAnswersConflict(
					answers[left].acceptedAnswer,
					answers[left].isCaseSensitive,
					answers[right].acceptedAnswer,
					answers[right].isCaseSensitive
				)
			) {
				fieldError(
					context,
					"answer-key",
					answers[right].id,
					"acceptedAnswer",
					"duplicate_normalized_answer"
				)
			}
		}
	}
}

function validateGlobalIds(context: ValidationContext) {
	const records = [
		context.document.sectionsById,
		context.document.questionsById,
		context.document.optionsById,
		context.document.answerKeysById,
	]
	const ids = records.flatMap(Object.keys)
	if (new Set(ids).size !== ids.length) {
		fieldError(context, "document", undefined, "ids", "duplicate")
	}
	for (const record of records) {
		for (const [key, entity] of Object.entries(record)) {
			if (key !== entity.id) {
				fieldError(context, "document", undefined, "ids", "key_mismatch")
			}
		}
	}
}

function validateReachability(context: ValidationContext) {
	const { document } = context
	const sectionReferences = countReferences(document.sectionIds)
	const questionReferences = countReferences([
		...Object.values(document.sectionsById).flatMap((section) => section.questionIds),
		...Object.values(document.questionsById).flatMap((question) =>
			question.type === "group" ? question.childQuestionIds : []
		),
	])
	const optionReferences = countReferences(
		Object.values(document.questionsById).flatMap((question) =>
			question.type === "single-choice" || question.type === "multiple-choice"
				? question.optionIds
				: []
		)
	)
	const answerReferences = countReferences(
		Object.values(document.questionsById).flatMap((question) =>
			question.type === "fill-blank" ? question.answerKeyIds : []
		)
	)

	validateRecordReferences(context, "section", document.sectionsById, sectionReferences)
	validateRecordReferences(context, "question", document.questionsById, questionReferences)
	validateRecordReferences(context, "option", document.optionsById, optionReferences)
	validateRecordReferences(context, "answer-key", document.answerKeysById, answerReferences)
}

function countReferences(ids: BuilderEntityId[]) {
	const counts = new Map<BuilderEntityId, number>()
	for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1)
	return counts
}

function validateRecordReferences<T extends { id: BuilderEntityId }>(
	context: ValidationContext,
	entity: Exclude<BuilderValidationEntity, "document" | "version">,
	record: Record<string, T>,
	references: ReadonlyMap<BuilderEntityId, number>
) {
	for (const value of Object.values(record)) {
		const count = references.get(value.id) ?? 0
		if (count === 0) {
			fieldError(context, entity, value.id, "id", "orphan")
		} else if (count > 1) {
			fieldError(context, entity, value.id, "id", "duplicate_reference")
		}
	}
}

function validateOrder(
	context: ValidationContext,
	entity: BuilderValidationEntity,
	entityId: BuilderEntityId | undefined,
	field: string,
	ids: BuilderEntityId[],
	getDisplayOrder: (id: BuilderEntityId) => number | undefined
) {
	if (new Set(ids).size !== ids.length) {
		fieldError(context, entity, entityId, field, "duplicate")
	}
	ids.forEach((id, index) => {
		if (getDisplayOrder(id) !== index) {
			fieldError(context, entity, entityId, field, "non_contiguous_order")
		}
	})
}

function validateRichLength(
	context: ValidationContext,
	entity: BuilderValidationEntity,
	entityId: BuilderEntityId | undefined,
	field: string,
	value: Parameters<typeof isRichTextEmpty>[0],
	maximum: number,
	required: boolean
) {
	if (required && isRichTextEmpty(value)) {
		fieldError(context, entity, entityId, field, "visually_empty")
		return
	}
	if (richTextToPersistedString(value).length > maximum) {
		fieldError(context, entity, entityId, field, "too_long")
	}
}

function isValidMediaUrl(value: string) {
	if (!value.trim() || value.trim().length > BUILDER_LIMITS.sectionMediaUrl) {
		return false
	}
	try {
		const url = new URL(value)
		return url.protocol === "http:" || url.protocol === "https:"
	} catch {
		return false
	}
}

function normalizeName(value: string) {
	return value.trim().normalize("NFC").replace(/\s+/g, " ")
}

function fieldError(
	context: ValidationContext,
	entity: BuilderValidationEntity,
	entityId: BuilderEntityId | undefined,
	field: string,
	code: string
) {
	addError(
		context,
		entity,
		entityId,
		field,
		code,
		`${field} is invalid (${code.replaceAll("_", " ")}).`
	)
}

function addError(
	context: ValidationContext,
	entity: BuilderValidationEntity,
	entityId: BuilderEntityId | undefined,
	field: string,
	code: string,
	message: string
) {
	context.errors.push({
		mode: context.mode,
		entity,
		entityId,
		field,
		code,
		message,
	})
}
