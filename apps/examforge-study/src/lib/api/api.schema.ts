import { z } from "zod"

import { ApiError } from "@/lib/api/api.error"

export function parseApiResponse<T>(
	schema: z.ZodType<T>,
	data: unknown,
	context: string
): T {
	const result = schema.safeParse(data)
	if (result.success) return result.data

	if (process.env.NODE_ENV !== "production") {
		console.error(`Invalid API response for ${context}`, result.error)
	}

	throw new ApiError({
		code: "invalid-response",
		message: "The service returned an unexpected response. Please try again.",
	})
}
