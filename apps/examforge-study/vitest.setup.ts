import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest"

import { TEST_API_URL } from "./test/support/constants"
import { server } from "./test/support/msw-server"

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" })
})

beforeEach(() => {
	vi.stubEnv("NEXT_PUBLIC_API_URL", TEST_API_URL)
})

afterEach(() => {
	cleanup()
	server.resetHandlers()
	localStorage.clear()
	sessionStorage.clear()
	vi.clearAllMocks()
	vi.restoreAllMocks()
	vi.useRealTimers()
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()
})

afterAll(() => {
	server.close()
})
