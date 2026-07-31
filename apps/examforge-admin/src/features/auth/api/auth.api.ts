import { AUTH_API_ROUTES } from "@/features/auth/auth.constants"
import { authUserSchema } from "@/features/auth/schemas/auth.schema"
import type { SigninRequest } from "@/features/auth/types/auth.type"
import { apiClient } from "@/lib/api/api.client"
import { parseApiResponse } from "@/lib/api/api.schema"

function parseUser(data: unknown, context: string) {
	return parseApiResponse(authUserSchema, data, context)
}

export const authApi = {
	async signin(request: SigninRequest) {
		const response = await apiClient.post<unknown>(AUTH_API_ROUTES.signin, request)
		return parseUser(response.data, "admin sign-in")
	},

	async getCurrentUser() {
		const response = await apiClient.get<unknown>(AUTH_API_ROUTES.me)
		return parseUser(response.data, "admin session")
	},

	async logout() {
		await apiClient.post(AUTH_API_ROUTES.logout)
	},
}
