import type { StudentExam } from "@/features/exams/types/exam.types"

export const PLACEHOLDER_EXAMS: readonly StudentExam[] = [
	{
		"id": "exam-b4a1c93f",
		"title": "IELTS Academic Practice Test 1",
		"slug": "ielts-academic-practice-test-1",
		"description": "A complete practice test covering Listening, Reading, Writing, and Speaking for the Academic module.",
		"type": "ielts",
		"tags": [
			{
				"id": "tag-a1b2",
				"name": "IELTS",
				"slug": "ielts",
				"type": "exam-type"
			},
			{
				"id": "tag-c3d4",
				"name": "Advanced",
				"slug": "advanced",
				"type": "level"
			}
		],
		"publishedVersion": {
			"id": "pv-99887766",
			"versionNumber": 1,
			"title": "Standard Release 2026",
			"durationMinutes": 165,
			"totalScore": 9.0,
			"sectionCount": 4,
			"questionCount": 40,
			"publishedAtUtc": "2026-06-15T08:00:00Z"
		},
		"createdAtUtc": "2026-06-10T14:30:00Z",
		"updatedAtUtc": "2026-06-15T08:05:00Z"
	},
	{
		"id": "exam-d8e2f10a",
		"title": "Grade 10 Mathematics Midterm",
		"slug": "grade-10-mathematics-midterm",
		"description": "Midterm examination assessing core algebra and geometry concepts.",
		"type": "simple",
		"tags": [
			{
				"id": "tag-e5f6",
				"name": "Mathematics",
				"slug": "mathematics",
				"type": "subject"
			},
			{
				"id": "tag-g7h8",
				"name": "Grade 10",
				"slug": "grade-10",
				"type": "grade"
			},
			{
				"id": "tag-i9j0",
				"name": "2026",
				"slug": "2026",
				"type": "year"
			}
		],
		"publishedVersion": {
			"id": "pv-55443322",
			"versionNumber": 3,
			"title": "Fall 2026 Revision",
			"durationMinutes": 90,
			"totalScore": 100,
			"sectionCount": 2,
			"questionCount": 35,
			"publishedAtUtc": "2026-07-20T10:00:00Z"
		},
		"createdAtUtc": "2026-07-05T09:15:00Z",
		"updatedAtUtc": null
	},
	{
		"id": "exam-c7b9a32d",
		"title": "English Grammar: Past Tense Quick Quiz",
		"slug": "english-grammar-past-tense-quick-quiz",
		"description": "A short, untimed quiz focusing on regular and irregular past tense verbs.",
		"type": "simple",
		"tags": [
			{
				"id": "tag-k1l2",
				"name": "Grammar",
				"slug": "grammar",
				"type": "skill"
			},
			{
				"id": "tag-m3n4",
				"name": "Past Tense",
				"slug": "past-tense",
				"type": "topic"
			}
		],
		"publishedVersion": {
			"id": "pv-11223344",
			"versionNumber": 1,
			"title": "Initial Release",
			"durationMinutes": null,
			"totalScore": 20,
			"sectionCount": 1,
			"questionCount": 20,
			"publishedAtUtc": "2026-07-27T12:00:00Z"
		},
		"createdAtUtc": "2026-07-27T11:00:00Z",
		"updatedAtUtc": "2026-07-27T12:00:00Z"
	}
] as const