import type {
	ExamSectionKindDto,
	PatchOperation,
} from "../../types/exam-version.types"
import type { BUILDER_ENTITY_KINDS, RICH_TEXT_FORMAT } from "./builder.constants"

export type BuilderEntityKind = (typeof BUILDER_ENTITY_KINDS)[number]
export type PersistedEntityId = `server:${string}`
export type TemporaryEntityId = `tmp:${BuilderEntityKind}:${string}`
export type BuilderEntityId = PersistedEntityId | TemporaryEntityId

export interface RichTextValue {
	format: typeof RICH_TEXT_FORMAT
	html: string
}

export type BuilderVersionStatus = "draft" | "published" | "retired"

export interface BuilderAuditFields {
	createdAtUtc: string | null
	updatedAtUtc: string | null
}

export interface BuilderVersionMetadata extends BuilderAuditFields {
	id: PersistedEntityId
	examId: string
	versionNumber: number
	status: BuilderVersionStatus
	title: string
	description: RichTextValue
	instructions: RichTextValue
	durationMinutes: number | null
	createdByUserId: string | null
	publishedAtUtc: string | null
	retiredAtUtc: string | null
}

export interface BuilderSection extends BuilderAuditFields {
	id: BuilderEntityId
	kind: ExamSectionKindDto
	title: string
	instructions: RichTextValue
	stimulusText: RichTextValue | null
	mediaUrl: string | null
	displayOrder: number
	questionIds: BuilderEntityId[]
}

interface BuilderQuestionBase extends BuilderAuditFields {
	id: BuilderEntityId
	sectionId: BuilderEntityId
	parentGroupId: BuilderEntityId | null
	prompt: RichTextValue
	explanation: RichTextValue | null
	points: number
	displayOrder: number
}

export interface BuilderFillBlankQuestion extends BuilderQuestionBase {
	type: "fill-blank"
	answerKeyIds: BuilderEntityId[]
}

interface BuilderChoiceQuestionBase extends BuilderQuestionBase {
	optionIds: BuilderEntityId[]
	correctOptionIds: BuilderEntityId[]
}

export interface BuilderSingleChoiceQuestion
	extends BuilderChoiceQuestionBase {
	type: "single-choice"
}

export interface BuilderMultipleChoiceQuestion
	extends BuilderChoiceQuestionBase {
	type: "multiple-choice"
}

export interface BuilderGroupQuestion extends BuilderQuestionBase {
	type: "group"
	parentGroupId: null
	points: 0
	childQuestionIds: BuilderEntityId[]
}

export type BuilderAnswerableQuestion =
	| BuilderFillBlankQuestion
	| BuilderSingleChoiceQuestion
	| BuilderMultipleChoiceQuestion

export type BuilderQuestion = BuilderAnswerableQuestion | BuilderGroupQuestion

export interface BuilderOption extends BuilderAuditFields {
	id: BuilderEntityId
	questionId: BuilderEntityId
	label: string | null
	content: RichTextValue
	explanation: RichTextValue | null
	displayOrder: number
}

export interface BuilderAnswerKey extends BuilderAuditFields {
	id: BuilderEntityId
	questionId: BuilderEntityId
	blankKey: string
	acceptedAnswer: string
	isCaseSensitive: boolean
	displayOrder: number
	serverOrderKnown: boolean
}

export interface BuilderSourceIssue {
	code: string
	message: string
	entityKind: "document" | BuilderEntityKind
	entityId?: BuilderEntityId
	field?: string
}

export interface BuilderDocument {
	version: BuilderVersionMetadata
	sectionIds: BuilderEntityId[]
	sectionsById: Record<string, BuilderSection>
	questionsById: Record<string, BuilderQuestion>
	optionsById: Record<string, BuilderOption>
	answerKeysById: Record<string, BuilderAnswerKey>
	contentRevision: number
	etag: string | null
	serverTotalScore: number
	examArchived: boolean
	sourceIssues: BuilderSourceIssue[]
}

export type BuilderSelection =
	| { type: "version" }
	| { type: "section"; sectionId: BuilderEntityId }
	| { type: "question"; questionId: BuilderEntityId }
	| { type: "option"; optionId: BuilderEntityId }
	| { type: "answer-key"; answerKeyId: BuilderEntityId }

export type BuilderValidationMode = "save" | "publish"
export type BuilderValidationEntity =
	| "document"
	| "version"
	| BuilderEntityKind

export interface BuilderValidationError {
	mode: BuilderValidationMode
	entity: BuilderValidationEntity
	entityId?: BuilderEntityId
	field: string
	code: string
	message: string
}

export type BuilderSaveState =
	| { status: "idle"; lastSuccessfulAt: number | null }
	| { status: "validating"; savingGeneration: number }
	| { status: "saving"; savingGeneration: number; completedOperations: number }
	| { status: "failed"; error: string; completedOperations: 0 }
	| {
			status: "conflict"
			expectedEtag: string
			serverEtag: string | null
			message: string
	  }
	| {
			status: "reconciliation-required"
			completedOperations: number
			message: string
	  }
	| { status: "read-only"; reason: "published" | "retired" | "archived" }

export interface BuilderConflictState {
	kind: "stale-revision"
	expectedEtag: string
	serverEtag: string | null
	localDocumentPreserved: true
}

export interface BuilderReconciliationState {
	kind: "partial-save" | "unknown-outcome"
	completedOperationIds: string[]
	localDocumentPreserved: true
}

export interface BuilderMutationValues {
	version: {
		title: string
		description: string
		instructions: string
		durationMinutes: number | null
	}
	sections: Record<
		string,
		{
			kind: ExamSectionKindDto
			title: string
			instructions: string
			stimulusText: string | null
			mediaUrl: string | null
		}
	>
	questions: Record<
		string,
		{
			type: 0 | 1 | 2 | 3
			prompt: string
			explanation: string | null
			points: number
		}
	>
	options: Record<
		string,
		{
			text: string
			label: string | null
			isCorrect: boolean
			explanation: string | null
		}
	>
	answerKeys: Record<
		string,
		{ acceptedAnswer: string; isCaseSensitive: boolean }
	>
}

export type BuilderDiffEntityKind = "version" | BuilderEntityKind

interface BuilderDiffOperationBase {
	id: string
	entity: BuilderDiffEntityKind
	entityId: BuilderEntityId | "version"
	dependsOn: string[]
}

export interface BuilderCreateOperation extends BuilderDiffOperationBase {
	kind: "create"
	entityId: BuilderEntityId
	parentId: BuilderEntityId | null
	values: unknown
}

export interface BuilderUpdateOperation extends BuilderDiffOperationBase {
	kind: "update"
	entityId: PersistedEntityId | "version"
	patch: PatchOperation[]
}

export interface BuilderDeleteOperation extends BuilderDiffOperationBase {
	kind: "delete"
	entityId: PersistedEntityId
	cascades: BuilderEntityId[]
}

export interface BuilderReorderOperation extends BuilderDiffOperationBase {
	kind: "reorder"
	parentId: BuilderEntityId | null
	orderedIds: BuilderEntityId[]
}

export interface BuilderRelationshipOperation extends BuilderDiffOperationBase {
	kind: "relationship"
	entity: "question"
	relation: "correct-options"
	optionIds: BuilderEntityId[]
}

export type BuilderDiffOperation =
	| BuilderCreateOperation
	| BuilderUpdateOperation
	| BuilderDeleteOperation
	| BuilderReorderOperation
	| BuilderRelationshipOperation

export interface BuilderDiffIssue {
	code: string
	message: string
	entity?: BuilderDiffEntityKind
	entityId?: BuilderEntityId
}

export interface BuilderDiffPlan {
	operations: BuilderDiffOperation[]
	issues: BuilderDiffIssue[]
}
