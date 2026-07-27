import axios, {
	type AxiosError,
	type InternalAxiosRequestConfig,
} from "axios"

import { ApiError, toApiError } from "@/lib/api/api.error"

const AUTH_ROUTE = "/api/v1/auth"
const REFRESH_ROUTE = `${AUTH_ROUTE}/refresh`
const PUBLIC_AUTH_ROUTES = new Set([
	`${AUTH_ROUTE}/login`,
	`${AUTH_ROUTE}/register`,
	REFRESH_ROUTE,
	`${AUTH_ROUTE}/logout`,
	`${AUTH_ROUTE}/forgot-password`,
	`${AUTH_ROUTE}/reset-password`,
])

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
	_authRetry?: true
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
	},
})

const refreshClient = axios.create({
	baseURL: apiBaseUrl,
	timeout: 10_000,
	withCredentials: true,
	headers: {
		Accept: "application/json",
	},
})

function ensureConfigured<T extends InternalAxiosRequestConfig>(config: T) {
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
}

apiClient.interceptors.request.use(ensureConfigured)
refreshClient.interceptors.request.use(ensureConfigured)

function getRefreshPromise() {
	if (!refreshPromise) {
		refreshPromise = refreshClient
			.post(REFRESH_ROUTE)
			.then(() => undefined)
			.catch((error: unknown) => {
				authFailureHandler?.()
				throw toApiError(error)
			})
			.finally(() => {
				refreshPromise = null
			})
	}

	return refreshPromise
}

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
			await getRefreshPromise()
			return await apiClient.request(request)
		} catch (refreshError) {
			return Promise.reject(toApiError(refreshError))
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
