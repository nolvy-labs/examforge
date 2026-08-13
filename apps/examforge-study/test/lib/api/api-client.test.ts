import { http, HttpResponse } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { TEST_API_URL } from "../../support/constants"
import { server } from "../../support/msw-server"

async function loadApiClient(apiUrl = TEST_API_URL) {
	vi.stubEnv("NEXT_PUBLIC_API_URL", apiUrl)
	vi.resetModules()

	const clientModule = await import("@/lib/api/api.client")
	const errorModule = await import("@/lib/api/api.error")
	return { ...clientModule, ApiError: errorModule.ApiError }
}

function deferred() {
	let resolve!: () => void
	const promise = new Promise<void>((done) => {
		resolve = done
	})
	return { promise, resolve }
}

describe("apiClient configuration and normal failures", () => {
	beforeEach(() => {
		vi.resetModules()
	})

	it.each([
		`${TEST_API_URL}/`,
		`${TEST_API_URL}/api`,
		`${TEST_API_URL}/api///`,
	])("normalizes the configured API URL %s", async (configuredUrl) => {
		let requestUrl = ""
		server.use(http.get(`${TEST_API_URL}/api/v1/ping`, ({ request }) => {
			requestUrl = request.url
			return HttpResponse.json({ ok: true })
		}))
		const { apiClient } = await loadApiClient(configuredUrl)

		await apiClient.get("/api/v1/ping")

		expect(requestUrl).toBe(`${TEST_API_URL}/api/v1/ping`)
	})

	it("rejects with a configuration ApiError when NEXT_PUBLIC_API_URL is missing", async () => {
		const { apiClient, ApiError } = await loadApiClient("")

		await expect(apiClient.get("/api/v1/ping")).rejects.toEqual(expect.objectContaining({
			name: "ApiError",
			code: "configuration",
			message: "ExamForge is not configured. Set NEXT_PUBLIC_API_URL and restart the app.",
		}))
		await expect(apiClient.get("/api/v1/ping")).rejects.toBeInstanceOf(ApiError)
	})

	it("sends credentials and the expected JSON accept header", async () => {
		let acceptHeader: string | null = null
		let credentials: RequestCredentials | undefined
		server.use(http.get(`${TEST_API_URL}/api/v1/ping`, ({ request }) => {
			acceptHeader = request.headers.get("accept")
			credentials = request.credentials
			return HttpResponse.json({ ok: true })
		}))
		const { apiClient } = await loadApiClient()

		await apiClient.get("/api/v1/ping")

		expect(acceptHeader).toContain("application/json")
		expect(credentials).toBe("include")
	})

	it("normalizes non-401 responses without attempting refresh", async () => {
		let refreshCount = 0
		server.use(
			http.get(`${TEST_API_URL}/api/v1/exams`, () => HttpResponse.json(
				{ detail: "Exam service is unavailable." },
				{ status: 503 }
			)),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => {
				refreshCount += 1
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { apiClient, ApiError } = await loadApiClient()

		const request = apiClient.get("/api/v1/exams")

		await expect(request).rejects.toBeInstanceOf(ApiError)
		await expect(request).rejects.toMatchObject({ code: "server", status: 503 })
		expect(refreshCount).toBe(0)
	})

	it("does not refresh a public auth endpoint after a 401", async () => {
		let refreshCount = 0
		server.use(
			http.post(`${TEST_API_URL}/api/v1/auth/login`, () => HttpResponse.json({}, { status: 401 })),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => {
				refreshCount += 1
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { apiClient } = await loadApiClient()

		await expect(apiClient.post("/api/v1/auth/login", {})).rejects.toMatchObject({
			code: "unauthorized",
			status: 401,
		})
		expect(refreshCount).toBe(0)
	})

	it("does not refresh a request already marked as retried", async () => {
		let refreshCount = 0
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected`, () => HttpResponse.json({}, { status: 401 })),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => {
				refreshCount += 1
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { apiClient } = await loadApiClient()

		await expect(apiClient.request({
			url: "/api/v1/protected",
			method: "GET",
			_authRetry: true,
		} as Parameters<typeof apiClient.request>[0] & { _authRetry: true })).rejects.toMatchObject({
			code: "unauthorized",
		})
		expect(refreshCount).toBe(0)
	})
})

describe("apiClient refresh coordination", () => {
	it("refreshes once, replays a protected request, and returns the replay response", async () => {
		let protectedCount = 0
		let refreshCount = 0
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected`, () => {
				protectedCount += 1
				return protectedCount === 1
					? HttpResponse.json({}, { status: 401 })
					: HttpResponse.json({ value: "replayed" })
			}),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => {
				refreshCount += 1
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { apiClient } = await loadApiClient()

		const response = await apiClient.get<{ value: string }>("/api/v1/protected")

		expect(response.data).toEqual({ value: "replayed" })
		expect(protectedCount).toBe(2)
		expect(refreshCount).toBe(1)
	})

	it("shares one refresh across simultaneous 401 responses and resumes all waiters", async () => {
		const gate = deferred()
		let refreshCount = 0
		const protectedCounts = new Map<string, number>()
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected/:id`, ({ params }) => {
				const id = String(params.id)
				const count = (protectedCounts.get(id) ?? 0) + 1
				protectedCounts.set(id, count)
				return count === 1
					? HttpResponse.json({}, { status: 401 })
					: HttpResponse.json({ id })
			}),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, async () => {
				refreshCount += 1
				await gate.promise
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { apiClient } = await loadApiClient()

		const requests = ["one", "two", "three"].map((id) =>
			apiClient.get<{ id: string }>(`/api/v1/protected/${id}`)
		)
		await vi.waitFor(() => expect(refreshCount).toBe(1))
		gate.resolve()
		const responses = await Promise.all(requests)

		expect(responses.map(({ data }) => data.id)).toEqual(["one", "two", "three"])
		expect(refreshCount).toBe(1)
		expect([...protectedCounts.values()]).toEqual([2, 2, 2])
	})

	it("rejects all waiters and invokes the failure handler once when shared refresh fails", async () => {
		const gate = deferred()
		let refreshCount = 0
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected/:id`, () => HttpResponse.json({}, { status: 401 })),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, async () => {
				refreshCount += 1
				await gate.promise
				return HttpResponse.json({ detail: "Refresh rejected." }, { status: 401 })
			})
		)
		const { apiClient, registerAuthFailureHandler } = await loadApiClient()
		const onAuthFailure = vi.fn()
		registerAuthFailureHandler(onAuthFailure)

		const requests = ["one", "two", "three"].map((id) =>
			apiClient.get(`/api/v1/protected/${id}`)
		)
		await vi.waitFor(() => expect(refreshCount).toBe(1))
		gate.resolve()
		const results = await Promise.allSettled(requests)

		expect(results.every(({ status }) => status === "rejected")).toBe(true)
		expect(results.map((result) => result.status === "rejected" && result.reason.code)).toEqual([
			"unauthorized",
			"unauthorized",
			"unauthorized",
		])
		expect(onAuthFailure).toHaveBeenCalledOnce()
		expect(refreshCount).toBe(1)
	})

	it("clears failed refresh state so a later request can refresh again", async () => {
		let refreshCount = 0
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected`, () => HttpResponse.json({}, { status: 401 })),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => {
				refreshCount += 1
				return HttpResponse.json({}, { status: 401 })
			})
		)
		const { apiClient } = await loadApiClient()

		await expect(apiClient.get("/api/v1/protected")).rejects.toMatchObject({ code: "unauthorized" })
		await expect(apiClient.get("/api/v1/protected")).rejects.toMatchObject({ code: "unauthorized" })

		expect(refreshCount).toBe(2)
	})

	it("stops invoking an unregistered auth-failure handler", async () => {
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected`, () => HttpResponse.json({}, { status: 401 })),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => HttpResponse.json({}, { status: 401 }))
		)
		const { apiClient, registerAuthFailureHandler } = await loadApiClient()
		const onAuthFailure = vi.fn()
		const unregister = registerAuthFailureHandler(onAuthFailure)
		unregister()

		await expect(apiClient.get("/api/v1/protected")).rejects.toMatchObject({ code: "unauthorized" })

		expect(onAuthFailure).not.toHaveBeenCalled()
	})

	it("does not loop when the replayed request is still unauthorized", async () => {
		let protectedCount = 0
		let refreshCount = 0
		server.use(
			http.get(`${TEST_API_URL}/api/v1/protected`, () => {
				protectedCount += 1
				return HttpResponse.json({}, { status: 401 })
			}),
			http.post(`${TEST_API_URL}/api/v1/auth/refresh`, () => {
				refreshCount += 1
				return new HttpResponse(null, { status: 204 })
			})
		)
		const { apiClient } = await loadApiClient()

		await expect(apiClient.get("/api/v1/protected")).rejects.toMatchObject({ code: "unauthorized" })

		expect(protectedCount).toBe(2)
		expect(refreshCount).toBe(1)
	})
})
