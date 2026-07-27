import type { StudentExamTag } from "./exam-browse.types"

export interface StudentExamDetail {
	exam: {
		id: string
		title: string
		slug: string
		description: string
		type: string | number
		tags: StudentExamTag[]
		createdAtUtc: string
		updatedAtUtc: string | null
	}
	publishedVersion: {
		id: string
		versionNumber: number
		title: string
		description: string
		instructions: string
		durationMinutes: number | null
		totalScore: number
		contentRevision: number
		publishedAtUtc: string
	}
	sections: StudentExamSection[]
}

export interface StudentExamSection {
	id: string
	kind: string | number
	title: string
	instructions: string
	stimulusText: string | null
	mediaUrl: string | null
	displayOrder: number
	questionCount: number
	totalPoints: number
	metadata: unknown
}

export type ExamAttemptState = "in-progress" | "completed"
export type ExamAttemptStatus = "in-progress" | "submitted" | "abandoned" | "unknown"

export interface StudentExamAttempt {
	attemptId: string
	examId: string
	examVersionId: string
	examTitle: string
	examSlug: string
	status: string | number
	startedAtUtc: string
	expiresAtUtc: string | null
	submittedAtUtc: string | null
	abandonedAtUtc: string | null
	score?: number | null
	maximumScore?: number | null
	percentage?: number | null
	revision: number
	updatedAtUtc: string
}

export interface StudentExamAttemptPage {
	items: StudentExamAttempt[]
	meta: {
		page: number
		pageSize: number
		totalItems: number
		totalPages: number
		hasPreviousPage: boolean
		hasNextPage: boolean
	}
}

export interface CreatedExamAttempt {
	attemptId: string
	revision: number
	etag?: string
}
