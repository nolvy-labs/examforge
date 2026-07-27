export interface PlaceholderExam {
	subject: string
	title: string
	description: string
	details: string
}

export const PLACEHOLDER_EXAMS: readonly PlaceholderExam[] = [
	{
		subject: "Mathematics",
		title: "Algebra foundations",
		description: "Practise equations, expressions, and core problem-solving skills.",
		details: "Sample · 30 questions · 45 min",
	},
	{
		subject: "Science",
		title: "General science review",
		description: "Review introductory concepts across biology, chemistry, and physics.",
		details: "Sample · 25 questions · 35 min",
	},
	{
		subject: "English",
		title: "Reading comprehension",
		description: "Work through passages designed to strengthen close reading and analysis.",
		details: "Sample · 20 questions · 30 min",
	},
] as const