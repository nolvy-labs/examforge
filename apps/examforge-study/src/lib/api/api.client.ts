import axios, {
	type AxiosError,
	type InternalAxiosRequestConfig,
} from "axios"

import { ApiError, toApiError } from "@/lib/api/api.error"

const AUTH_ROUTE = "/api/v1/auth"
const REFRESH_ROUTE = `${AUTH_ROUTE}/refresh`
const PUBLIC_AUTH_ROUTES = new Set([
	`${AUTH_ROUTE}/signin`,
	`${AUTH_ROUTE}/register`,
	REFRESH_ROUTE,
])

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
	_authRetry?: boolean
}

type AuthFailureHandler = () => void

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL
const apiBaseUrl = configuredApiUrl
	?.replace(/\/+$/, "")
	.replace(/\/api$/i, "")

let refreshPromise: Promise<void> | null = null
let authFailureHandler: AuthFailureHandler | undefined

function normalizePath(url?: string) {
	if (!url) {
		return ""
	}

	try {
		return new URL(url, "http://examforge.local").pathname.replace(/\/+$/, "")
	} catch {
		return url.split("?")[0].replace(/\/+$/, "")
	}
}

function isPublicAuthRequest(url?: string) {
	return PUBLIC_AUTH_ROUTES.has(normalizePath(url))
}

export const apiClient = axios.create({
	baseURL: apiBaseUrl,
	timeout: 10_000,
	withCredentials: true,
	headers: {
		Accept: "application/json",
		"Content-Type": "application/json",
	},
})

apiClient.interceptors.request.use((config) => {
	if (!configuredApiUrl) {
		return Promise.reject(
			new ApiError({
				code: "configuration",
				message:
					"ExamForge is not configured. Set NEXT_PUBLIC_API_URL and restart the app.",
			})
		)
	}

	return config
})

apiClient.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const request = error.config as RetryableRequestConfig | undefined
		const shouldRefresh =
			error.response?.status === 401 &&
			request &&
			!request._authRetry &&
			!isPublicAuthRequest(request.url)

		if (!shouldRefresh) {
			return Promise.reject(toApiError(error))
		}

		request._authRetry = true

		try {
			refreshPromise ??= apiClient.post(REFRESH_ROUTE).then(() => undefined)
			await refreshPromise
			return await apiClient.request(request)
		} catch (refreshError) {
			authFailureHandler?.()
			return Promise.reject(toApiError(refreshError))
		} finally {
			refreshPromise = null
		}
	}
)

export function registerAuthFailureHandler(handler: AuthFailureHandler) {
	authFailureHandler = handler

	return () => {
		if (authFailureHandler === handler) {
			authFailureHandler = undefined
		}
	}
}
