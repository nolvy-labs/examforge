import "server-only"

import { cache } from "react"

import { parseApiResponse } from "@/lib/api/api.schema"

import { studentExamDetailSchema } from "../types/exam.schema"

const PUBLIC_EXAM_REVALIDATE_SECONDS = 300

export class PublicExamNotFoundError extends Error {
	constructor() {
		super("Published exam was not found.")
		this.name = "PublicExamNotFoundError"
	}
}

function getApiBaseUrl() {
	const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL
	if (!configuredApiUrl) {
		throw new Error(
			"ExamForge is not configured. Set NEXT_PUBLIC_API_URL and restart the app."
		)
	}

	return configuredApiUrl.replace(/\/+$/, "").replace(/\/api$/i, "")
}

export const getPublicExamDetail = cache(async (slug: string) => {
	const response = await fetch(
		`${getApiBaseUrl()}/api/v1/exams/${encodeURIComponent(slug)}`,
		{
			headers: { Accept: "application/json" },
			next: { revalidate: PUBLIC_EXAM_REVALIDATE_SECONDS },
		}
	)

	if (response.status === 404) {
		throw new PublicExamNotFoundError()
	}
	if (!response.ok) {
		throw new Error(`Public exam request failed with status ${response.status}.`)
	}

	const data: unknown = await response.json()
	return parseApiResponse(
		studentExamDetailSchema,
		data,
		"public student exam detail"
	)
})
