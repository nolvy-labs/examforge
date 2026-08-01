import type { BuilderQuestion } from "../model/builder.types"

export const QUESTION_TYPE_LABELS: Record<BuilderQuestion["type"], string> = {
	"single-choice": "Single Choice",
	"multiple-choice": "Multiple Choice",
	"fill-blank": "Fill Blank",
	group: "Group",
}

export const SECTION_KIND_LABELS = ["General", "Reading", "Listening", "Writing", "Speaking", "Custom"] as const
