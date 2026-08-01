import type {
	CreateExamSectionRequest,
	CreateFillAnswerKeyRequest,
	CreateQuestionOptionRequest,
	CreateQuestionRequest,
	ExamSectionDetailDto,
	FullExamVersionDto,
	QuestionDetailDto,
	QuestionTypeDto,
	ReorderExamSectionsRequest,
	ReorderQuestionOptionsRequest,
	ReorderQuestionsRequest,
} from "../../types/exam-version.types"
import {
	getServerId,
	isPersistedEntityId,
	isTemporaryEntityId,
	toPersistedEntityId,
} from "./builder-id"
import type {
	BuilderAnswerKey,
	BuilderDocument,
	BuilderEntityId,
	BuilderMutationValues,
	BuilderOption,
	BuilderQuestion,
	BuilderSection,
	BuilderSourceIssue,
	BuilderVersionStatus,
	PersistedEntityId,
	RichTextValue,
} from "./builder.types"
import {
	isRichTextEmpty,
	persistedStringToRichText,
	richTextToPersistedString,
} from "./rich-text"

export interface BuilderMappingOptions {
	etag?: string | null
	examArchived?: boolean
}

const statusByDto: Record<0 | 1 | 2, BuilderVersionStatus> = {
	0: "draft",
	1: "published",
	2: "retired",
}

const questionTypeByDto: Record<
	QuestionTypeDto,
	BuilderQuestion["type"]
> = {
	0: "fill-blank",
	1: "single-choice",
	2: "multiple-choice",
	3: "group",
}

const questionTypeToDto: Record<BuilderQuestion["type"], QuestionTypeDto> = {
	"fill-blank": 0,
	"single-choice": 1,
	"multiple-choice": 2,
	group: 3,
}

function sortedByOrder<T extends { displayOrder: number; id: string }>(values: T[]) {
	return [...values].sort(
		(left, right) =>
			left.displayOrder - right.displayOrder || left.id.localeCompare(right.id)
	)
}

function nullableRichText(value: string | null): RichTextValue | null {
	return value === null ? null : persistedStringToRichText(value)
}

function persistedNullableRichText(value: RichTextValue | null) {
	return value === null || isRichTextEmpty(value)
		? null
		: richTextToPersistedString(value)
}

export function mapFullVersionToBuilderDocument(
	response: FullExamVersionDto,
	options: BuilderMappingOptions = {}
): BuilderDocument {
	const document: BuilderDocument = {
		version: {
			id: toPersistedEntityId(response.id),
			examId: response.examId,
			versionNumber: response.versionNumber,
			status: statusByDto[response.status],
			title: response.title,
			description: persistedStringToRichText(response.description),
			instructions: persistedStringToRichText(response.instructions),
			durationMinutes: response.durationMinutes,
			createdByUserId: response.createdByUserId,
			publishedAtUtc: response.publishedAtUtc,
			retiredAtUtc: response.retiredAtUtc,
			createdAtUtc: response.createdAtUtc,
			updatedAtUtc: response.updatedAtUtc,
		},
		sectionIds: [],
		sectionsById: {},
		questionsById: {},
		optionsById: {},
		answerKeysById: {},
		contentRevision: response.contentRevision,
		etag: options.etag ?? null,
		serverTotalScore: response.totalScore,
		examArchived: options.examArchived ?? false,
		sourceIssues: [],
	}

	for (const sectionResponse of sortedByOrder(response.sections)) {
		const sectionId = toPersistedEntityId(sectionResponse.id)
		registerId(document, sectionId, "section")
		const section: BuilderSection = {
			id: sectionId,
			kind: sectionResponse.kind,
			title: sectionResponse.title,
			instructions: persistedStringToRichText(sectionResponse.instructions),
			stimulusText: nullableRichText(sectionResponse.stimulusText),
			mediaUrl: sectionResponse.mediaUrl,
			displayOrder: sectionResponse.displayOrder,
			questionIds: [],
			createdAtUtc: sectionResponse.createdAtUtc,
			updatedAtUtc: sectionResponse.updatedAtUtc,
		}
		document.sectionsById[sectionId] = section
		document.sectionIds.push(sectionId)

		if (sectionResponse.questions === null) {
			document.sourceIssues.push({
				code: "section_content_missing",
				message: "The server did not include this Section's questions.",
				entityKind: "section",
				entityId: sectionId,
				field: "questions",
			})
			continue
		}

		for (const questionResponse of sortedByOrder(sectionResponse.questions)) {
			const questionId = mapQuestion(
				document,
				questionResponse,
				sectionId,
				null
			)
			section.questionIds.push(questionId)
		}
	}

	return document
}

function mapQuestion(
	document: BuilderDocument,
	response: QuestionDetailDto,
	sectionId: BuilderEntityId,
	parentGroupId: BuilderEntityId | null
): BuilderEntityId {
	const questionId = toPersistedEntityId(response.id)
	registerId(document, questionId, "question")

	if (response.examSectionId !== getServerId(sectionId)) {
		issue(document, "invalid_section_reference", questionId, "examSectionId")
	}
	const expectedParentId = parentGroupId ? getServerId(parentGroupId) : null
	if (response.parentQuestionId !== expectedParentId) {
		if (response.parentQuestionId !== null || parentGroupId !== null) {
			issue(document, "invalid_parent_reference", questionId, "parentQuestionId")
		}
	}

	const common = {
		id: questionId,
		sectionId,
		parentGroupId,
		prompt: persistedStringToRichText(response.prompt),
		explanation: nullableRichText(response.explanation),
		points: response.points,
		displayOrder: response.displayOrder,
		createdAtUtc: response.createdAtUtc,
		updatedAtUtc: response.updatedAtUtc,
	}

	const optionIds = mapOptions(document, response, questionId)
	const answerKeyIds = mapAnswerKeys(document, response, questionId)
	const type = questionTypeByDto[response.type]
	let question: BuilderQuestion

	if (type === "group") {
		const childQuestionIds: BuilderEntityId[] = []
		question = {
			...common,
			type,
			parentGroupId: null,
			points: 0,
			childQuestionIds,
		}
		document.questionsById[questionId] = question

		if (parentGroupId !== null) {
			issue(document, "nested_group", questionId, "type")
		}
		if (optionIds.length > 0 || answerKeyIds.length > 0) {
			issue(document, "group_has_grading_content", questionId, "type")
		}

		for (const child of sortedByOrder(response.childQuestions ?? [])) {
			childQuestionIds.push(mapQuestion(document, child, sectionId, questionId))
		}
	} else if (type === "fill-blank") {
		question = { ...common, type, answerKeyIds }
		document.questionsById[questionId] = question
		if (optionIds.length > 0) {
			issue(document, "fill_blank_has_options", questionId, "options")
		}
	} else {
		const correctOptionIds = optionIds.filter((optionId) => {
			const serverId = getServerId(optionId)
			return response.options.some(
				(option) => option.id === serverId && option.isCorrect
			)
		})
		question = { ...common, type, optionIds, correctOptionIds }
		document.questionsById[questionId] = question
		if (answerKeyIds.length > 0) {
			issue(document, "choice_has_answer_keys", questionId, "answerKeys")
		}
	}

	if (type !== "group" && (response.childQuestions?.length ?? 0) > 0) {
		issue(document, "non_group_has_children", questionId, "childQuestions")
		for (const child of sortedByOrder(response.childQuestions ?? [])) {
			mapQuestion(document, child, sectionId, questionId)
		}
	}

	return questionId
}

function mapOptions(
	document: BuilderDocument,
	response: QuestionDetailDto,
	questionId: BuilderEntityId
) {
	return sortedByOrder(response.options).map((optionResponse) => {
		const optionId = toPersistedEntityId(optionResponse.id)
		registerId(document, optionId, "option")
		const option: BuilderOption = {
			id: optionId,
			questionId,
			label: optionResponse.label,
			content: persistedStringToRichText(optionResponse.text),
			explanation: nullableRichText(optionResponse.explanation),
			displayOrder: optionResponse.displayOrder,
			createdAtUtc: optionResponse.createdAtUtc,
			updatedAtUtc: optionResponse.updatedAtUtc,
		}
		document.optionsById[optionId] = option
		if (optionResponse.questionId !== getServerId(questionId)) {
			issue(document, "invalid_option_question", optionId, "questionId", "option")
		}
		return optionId
	})
}

function mapAnswerKeys(
	document: BuilderDocument,
	response: QuestionDetailDto,
	questionId: BuilderEntityId
) {
	return response.answerKeys.map((answerResponse, displayOrder) => {
		const answerId = toPersistedEntityId(answerResponse.id)
		registerId(document, answerId, "answer-key")
		const answer: BuilderAnswerKey = {
			id: answerId,
			questionId,
			blankKey: answerResponse.blankKey,
			acceptedAnswer: answerResponse.acceptedAnswer,
			isCaseSensitive: answerResponse.isCaseSensitive,
			displayOrder,
			serverOrderKnown: false,
			createdAtUtc: answerResponse.createdAtUtc,
			updatedAtUtc: answerResponse.updatedAtUtc,
		}
		document.answerKeysById[answerId] = answer
		if (answerResponse.questionId !== getServerId(questionId)) {
			issue(
				document,
				"invalid_answer_question",
				answerId,
				"questionId",
				"answer-key"
			)
		}
		return answerId
	})
}

function registerId(
	document: BuilderDocument,
	id: BuilderEntityId,
	entityKind: BuilderSourceIssue["entityKind"]
) {
	const alreadyExists =
		document.sectionsById[id] !== undefined ||
		document.questionsById[id] !== undefined ||
		document.optionsById[id] !== undefined ||
		document.answerKeysById[id] !== undefined
	if (alreadyExists) {
		document.sourceIssues.push({
			code: "duplicate_server_id",
			message: "The server returned the same entity ID more than once.",
			entityKind,
			entityId: id,
			field: "id",
		})
	}
}

function issue(
	document: BuilderDocument,
	code: string,
	entityId: BuilderEntityId,
	field: string,
	entityKind: BuilderSourceIssue["entityKind"] = "question"
) {
	document.sourceIssues.push({
		code,
		message: `The server returned inconsistent ${field} data.`,
		entityKind,
		entityId,
		field,
	})
}

export function builderDocumentToMutationValues(
	document: BuilderDocument
): BuilderMutationValues {
	const values: BuilderMutationValues = {
		version: {
			title: document.version.title,
			description: richTextToPersistedString(document.version.description),
			instructions: richTextToPersistedString(document.version.instructions),
			durationMinutes: document.version.durationMinutes,
		},
		sections: {},
		questions: {},
		options: {},
		answerKeys: {},
	}

	for (const section of Object.values(document.sectionsById)) {
		values.sections[section.id] = {
			kind: section.kind,
			title: section.title,
			instructions: richTextToPersistedString(section.instructions),
			stimulusText: persistedNullableRichText(section.stimulusText),
			mediaUrl: section.mediaUrl,
		}
	}

	for (const question of Object.values(document.questionsById)) {
		values.questions[question.id] = {
			type: questionTypeToDto[question.type],
			prompt: richTextToPersistedString(question.prompt),
			explanation: persistedNullableRichText(question.explanation),
			points: question.points,
		}
	}

	for (const option of Object.values(document.optionsById)) {
		const question = document.questionsById[option.questionId]
		values.options[option.id] = {
			text: richTextToPersistedString(option.content),
			label: option.label,
			isCorrect:
				question?.type === "single-choice" ||
				question?.type === "multiple-choice"
					? question.correctOptionIds.includes(option.id)
					: false,
			explanation: persistedNullableRichText(option.explanation),
		}
	}

	for (const answer of Object.values(document.answerKeysById)) {
		values.answerKeys[answer.id] = {
			acceptedAnswer: answer.acceptedAnswer,
			isCaseSensitive: answer.isCaseSensitive,
		}
	}

	return values
}

export function builderSectionToCreateRequest(
	document: BuilderDocument,
	sectionId: BuilderEntityId
): CreateExamSectionRequest | null {
	const section = document.sectionsById[sectionId]
	if (!section) return null
	return {
		detail: {
			title: section.title,
			kind: section.kind,
			instructions: richTextToPersistedString(section.instructions),
			stimulusText: persistedNullableRichText(section.stimulusText),
			mediaUrl: section.mediaUrl,
		},
		questions: section.questionIds
			.map((id) => builderQuestionToCreateInput(document, id))
			.filter((value) => value !== null),
	}
}

export function builderQuestionToCreateRequest(
	document: BuilderDocument,
	questionId: BuilderEntityId
): CreateQuestionRequest | null {
	const input = builderQuestionToCreateInput(document, questionId)
	if (!input) return null
	const question = document.questionsById[questionId]
	return {
		...input,
		parentQuestionId:
			question?.parentGroupId && isPersistedEntityId(question.parentGroupId)
				? getServerId(question.parentGroupId)
				: null,
	}
}

function builderQuestionToCreateInput(
	document: BuilderDocument,
	questionId: BuilderEntityId
): Omit<CreateQuestionRequest, "parentQuestionId"> | null {
	const question = document.questionsById[questionId]
	if (!question) return null
	const detail = {
		type: questionTypeToDto[question.type],
		prompt: richTextToPersistedString(question.prompt),
		explanation: persistedNullableRichText(question.explanation),
		points: question.points,
	}

	if (question.type === "group") {
		return {
			detail,
			childQuestions: question.childQuestionIds
				.map((childId) => {
					const child = builderQuestionToCreateInput(document, childId)
					return child
						? {
								detail: child.detail,
								options: child.options,
								answerKeys: child.answerKeys,
							}
						: null
				})
				.filter((value) => value !== null),
			options: [],
			answerKeys: [],
		}
	}

	if (question.type === "fill-blank") {
		return {
			detail,
			childQuestions: [],
			options: [],
			answerKeys: question.answerKeyIds
				.map((answerId) => document.answerKeysById[answerId])
				.filter((answer) => answer !== undefined)
				.map((answer) => ({
					acceptedAnswer: answer.acceptedAnswer,
					isCaseSensitive: answer.isCaseSensitive,
				})),
		}
	}

	return {
		detail,
		childQuestions: [],
		options: question.optionIds
			.map((optionId) => document.optionsById[optionId])
			.filter((option) => option !== undefined)
			.map((option) => ({
				text: richTextToPersistedString(option.content),
				label: option.label,
				isCorrect: question.correctOptionIds.includes(option.id),
				explanation: persistedNullableRichText(option.explanation),
			})),
		answerKeys: [],
	}
}

export function builderOptionToCreateRequest(
	document: BuilderDocument,
	optionId: BuilderEntityId
): CreateQuestionOptionRequest | null {
	const option = document.optionsById[optionId]
	const question = option && document.questionsById[option.questionId]
	if (
		!option ||
		!question ||
		(question.type !== "single-choice" && question.type !== "multiple-choice")
	) {
		return null
	}
	return {
		detail: {
			text: richTextToPersistedString(option.content),
			label: option.label,
			isCorrect: question.correctOptionIds.includes(option.id),
			explanation: persistedNullableRichText(option.explanation),
		},
	}
}

export function builderAnswerKeyToCreateRequest(
	document: BuilderDocument,
	answerId: BuilderEntityId
): CreateFillAnswerKeyRequest | null {
	const answer = document.answerKeysById[answerId]
	return answer
		? {
				acceptedAnswer: answer.acceptedAnswer,
				isCaseSensitive: answer.isCaseSensitive,
			}
		: null
}

export function builderSectionOrderRequest(
	document: BuilderDocument
): ReorderExamSectionsRequest | null {
	const ids = persistedServerIds(document.sectionIds)
	return ids ? { orderedSectionIds: ids } : null
}

export function builderQuestionOrderRequest(
	document: BuilderDocument,
	sectionId: BuilderEntityId,
	parentGroupId: BuilderEntityId | null
): ReorderQuestionsRequest | null {
	const section = document.sectionsById[sectionId]
	const group = parentGroupId ? document.questionsById[parentGroupId] : null
	const orderedIds =
		group?.type === "group" ? group.childQuestionIds : section?.questionIds
	const ids = orderedIds ? persistedServerIds(orderedIds) : null
	if (!ids) return null
	return {
		parentQuestionId: parentGroupId ? getServerId(parentGroupId) : null,
		orderedQuestionIds: ids,
	}
}

export function builderOptionOrderRequest(
	document: BuilderDocument,
	questionId: BuilderEntityId
): ReorderQuestionOptionsRequest | null {
	const question = document.questionsById[questionId]
	const ids =
		question?.type === "single-choice" || question?.type === "multiple-choice"
			? persistedServerIds(question.optionIds)
			: null
	return ids ? { orderedOptionIds: ids } : null
}

function persistedServerIds(ids: BuilderEntityId[]) {
	if (!ids.every(isPersistedEntityId)) return null
	return ids.map((id) => getServerId(id)).filter((id) => id !== null)
}

export function replaceTemporaryIds(
	document: BuilderDocument,
	replacements: ReadonlyMap<BuilderEntityId, PersistedEntityId>
): BuilderDocument {
	const clone = structuredClone(document)
	const replace = (id: BuilderEntityId) => replacements.get(id) ?? id

	clone.sectionIds = clone.sectionIds.map(replace)
	clone.sectionsById = replaceRecordKeys(clone.sectionsById, replacements, (section) => ({
		...section,
		id: replace(section.id),
		questionIds: section.questionIds.map(replace),
	}))
	clone.questionsById = replaceRecordKeys(
		clone.questionsById,
		replacements,
		(question) => {
			const common = {
				...question,
				id: replace(question.id),
				sectionId: replace(question.sectionId),
				parentGroupId: question.parentGroupId
					? replace(question.parentGroupId)
					: null,
			}
			if (question.type === "group") {
				return {
					...common,
					type: "group" as const,
					parentGroupId: null,
					points: 0 as const,
					childQuestionIds: question.childQuestionIds.map(replace),
				}
			}
			if (question.type === "fill-blank") {
				return {
					...common,
					type: "fill-blank" as const,
					answerKeyIds: question.answerKeyIds.map(replace),
				}
			}
			return {
				...common,
				type: question.type,
				optionIds: question.optionIds.map(replace),
				correctOptionIds: question.correctOptionIds.map(replace),
			}
		}
	)
	clone.optionsById = replaceRecordKeys(clone.optionsById, replacements, (option) => ({
		...option,
		id: replace(option.id),
		questionId: replace(option.questionId),
	}))
	clone.answerKeysById = replaceRecordKeys(
		clone.answerKeysById,
		replacements,
		(answer) => ({
			...answer,
			id: replace(answer.id),
			questionId: replace(answer.questionId),
		})
	)
	clone.sourceIssues = clone.sourceIssues.map((sourceIssue) => ({
		...sourceIssue,
		entityId: sourceIssue.entityId ? replace(sourceIssue.entityId) : undefined,
	}))
	return clone
}

function replaceRecordKeys<T>(
	record: Record<string, T>,
	replacements: ReadonlyMap<BuilderEntityId, PersistedEntityId>,
	mapValue: (value: T) => T
) {
	const replaced: Record<string, T> = {}
	for (const [key, value] of Object.entries(record)) {
		const replacement =
			isPersistedEntityId(key) || isTemporaryEntityId(key)
				? replacements.get(key)
				: undefined
		replaced[replacement ?? key] = mapValue(value)
	}
	return replaced
}

export interface CreatedIdMappingResult {
	mappings: Map<BuilderEntityId, PersistedEntityId>
	issues: string[]
}

export function mapCreatedSectionIds(
	document: BuilderDocument,
	temporarySectionId: BuilderEntityId,
	response: ExamSectionDetailDto
): CreatedIdMappingResult {
	const mappings = new Map<BuilderEntityId, PersistedEntityId>()
	const issues: string[] = []
	const section = document.sectionsById[temporarySectionId]
	if (!section || isPersistedEntityId(temporarySectionId)) {
		return { mappings, issues: ["The created Section no longer exists locally."] }
	}
	mappings.set(temporarySectionId, toPersistedEntityId(response.id))
	mapCreatedQuestionLists(
		document,
		section.questionIds,
		response.questions ?? [],
		mappings,
		issues
	)
	return { mappings, issues }
}

export function mapCreatedQuestionIds(
	document: BuilderDocument,
	temporaryQuestionId: BuilderEntityId,
	response: QuestionDetailDto
): CreatedIdMappingResult {
	const mappings = new Map<BuilderEntityId, PersistedEntityId>()
	const issues: string[] = []
	mapCreatedQuestion(document, temporaryQuestionId, response, mappings, issues)
	return { mappings, issues }
}

function mapCreatedQuestionLists(
	document: BuilderDocument,
	localIds: BuilderEntityId[],
	responses: QuestionDetailDto[],
	mappings: Map<BuilderEntityId, PersistedEntityId>,
	issues: string[]
) {
	if (localIds.length !== responses.length) {
		issues.push("The server returned a different number of created Questions.")
		return
	}
	localIds.forEach((id, index) => {
		const response = responses[index]
		if (response) mapCreatedQuestion(document, id, response, mappings, issues)
	})
}

function mapCreatedQuestion(
	document: BuilderDocument,
	localId: BuilderEntityId,
	response: QuestionDetailDto,
	mappings: Map<BuilderEntityId, PersistedEntityId>,
	issues: string[]
) {
	const question = document.questionsById[localId]
	if (!question || isPersistedEntityId(localId)) {
		issues.push("A created Question no longer exists locally.")
		return
	}
	if (questionTypeToDto[question.type] !== response.type) {
		issues.push("The server returned a different created Question type.")
		return
	}
	mappings.set(localId, toPersistedEntityId(response.id))
	if (question.type === "group") {
		mapCreatedQuestionLists(
			document,
			question.childQuestionIds,
			response.childQuestions ?? [],
			mappings,
			issues
		)
		return
	}
	if (question.type === "fill-blank") {
		mapCreatedLeafIds(
			question.answerKeyIds,
			response.answerKeys.map((answer) => answer.id),
			mappings,
			issues,
			"answer keys"
		)
		return
	}
	mapCreatedLeafIds(
		question.optionIds,
		response.options.map((option) => option.id),
		mappings,
		issues,
		"options"
	)
}

function mapCreatedLeafIds(
	localIds: BuilderEntityId[],
	serverIds: string[],
	mappings: Map<BuilderEntityId, PersistedEntityId>,
	issues: string[],
	label: string
) {
	if (localIds.length !== serverIds.length) {
		issues.push(`The server returned a different number of created ${label}.`)
		return
	}
	localIds.forEach((id, index) => {
		const serverId = serverIds[index]
		if (serverId) mappings.set(id, toPersistedEntityId(serverId))
	})
}
