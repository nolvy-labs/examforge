import axios, {
	type AxiosInstance,
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

export interface ApiClients {
	apiClient: AxiosInstance
	refreshClient: AxiosInstance
}

function normalizePath(url?: string) {
	if (!url) return ""

	try {
		return new URL(url, "http://examforge.local").pathname.replace(/\/+$/, "")
	} catch {
		return url.split("?")[0].replace(/\/+$/, "")
	}
}

function isPublicAuthRequest(url?: string) {
	return PUBLIC_AUTH_ROUTES.has(normalizePath(url))
}

function getApiBaseUrl(configuredApiUrl?: string) {
	return configuredApiUrl?.replace(/\/+$/, "").replace(/\/api$/i, "")
}

export function createApiClients(configuredApiUrl?: string): ApiClients {
	const clientOptions = {
		baseURL: getApiBaseUrl(configuredApiUrl),
		timeout: 10_000,
		withCredentials: true,
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
	}
	const apiClient = axios.create(clientOptions)
	const refreshClient = axios.create(clientOptions)
	let refreshPromise: Promise<void> | null = null

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
		async (error: unknown) => {
			if (!axios.isAxiosError(error)) {
				return Promise.reject(toApiError(error))
			}

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

	return { apiClient, refreshClient }
}

const clients = createApiClients(process.env.NEXT_PUBLIC_API_URL)

export const apiClient = clients.apiClient
