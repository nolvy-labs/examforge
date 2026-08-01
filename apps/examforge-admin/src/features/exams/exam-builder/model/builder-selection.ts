import { getBuilderEntity } from "./builder-id"
import type { BuilderDocument, BuilderSelection } from "./builder.types"

export function repairBuilderSelection(
	previous: BuilderDocument,
	current: BuilderDocument,
	selection: BuilderSelection
): BuilderSelection {
	if (selection.type === "version") return selection

	const selectedId =
		selection.type === "section"
			? selection.sectionId
			: selection.type === "question"
				? selection.questionId
				: selection.type === "option"
					? selection.optionId
					: selection.answerKeyId

	if (getBuilderEntity(current, selectedId)) return selection

	if (selection.type === "option" || selection.type === "answer-key") {
		const oldEntity =
			selection.type === "option"
				? previous.optionsById[selection.optionId]
				: previous.answerKeysById[selection.answerKeyId]
		if (oldEntity) {
			const question = current.questionsById[oldEntity.questionId]
			if (question) return { type: "question", questionId: question.id }
		}
	}

	if (selection.type === "question") {
		const oldQuestion = previous.questionsById[selection.questionId]
		if (oldQuestion?.parentGroupId) {
			const group = current.questionsById[oldQuestion.parentGroupId]
			if (group) return { type: "question", questionId: group.id }
		}
		if (oldQuestion) {
			const section = current.sectionsById[oldQuestion.sectionId]
			if (section) return { type: "section", sectionId: section.id }
		}
	}

	return { type: "version" }
}
