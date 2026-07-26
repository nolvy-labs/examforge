import { AUTH_API_ROUTES } from "@/features/auth/auth.constants"
import type {
	AuthUser,
	SigninRequest,
	SignupRequest,
} from "@/features/auth/types/auth.type"
import { apiClient } from "@/lib/api/api.client"

export const authApi = {
	async signin(request: SigninRequest) {
		const response = await apiClient.post<AuthUser>(
			AUTH_API_ROUTES.signin,
			request
		)
		return response.data
	},

	async signup(request: SignupRequest) {
		const response = await apiClient.post<AuthUser>(
			AUTH_API_ROUTES.signup,
			request
		)
		return response.data
	},

	async getCurrentUser() {
		const response = await apiClient.get<AuthUser>(AUTH_API_ROUTES.me)
		return response.data
	},

	async logout() {
		await apiClient.post(AUTH_API_ROUTES.logout)
	},
}
