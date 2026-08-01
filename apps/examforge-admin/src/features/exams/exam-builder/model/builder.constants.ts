export const RICH_TEXT_FORMAT = "examforge-rich-html-v1" as const
export const RICH_TEXT_PERSISTENCE_MARKER = "<!--examforge-rich:v1-->"

export const BUILDER_ENTITY_KINDS = [
	"section",
	"question",
	"option",
	"answer-key",
] as const

export const BUILDER_LIMITS = {
	versionTitle: 200,
	versionDescription: 2_000,
	versionInstructions: 10_000,
	durationMinutes: 1_440,
	sectionTitle: 200,
	sectionInstructions: 10_000,
	sectionStimulus: 50_000,
	sectionMediaUrl: 1_024,
	questionPrompt: 20_000,
	questionExplanation: 20_000,
	minimumPoints: 0.01,
	maximumPoints: 999_999.99,
	pointsScale: 2,
	optionLabel: 50,
	optionText: 10_000,
	optionExplanation: 10_000,
	acceptedAnswer: 2_000,
	sectionsPerVersion: 100,
	questionsPerSection: 500,
	questionsPerNestedRequest: 2_000,
	childrenPerGroup: 200,
	optionsPerQuestion: 20,
	answersPerQuestion: 20,
	batchTargets: 1_000,
	batchOperations: 5_000,
	patchOperationsPerTarget: 20,
} as const
