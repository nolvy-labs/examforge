import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
	useActiveExamAttempt,
	useAttempt,
	useAttemptTransition,
	useCreateExamAttempt,
	useExamAttemptHistory,
	useInfiniteAttempts,
} from "@/features/attempt/api/attempt.query"
import { attemptQueryKeys } from "@/features/attempt/api/attempt.query-key"
import { statisticsQueryKeys } from "@/features/statistics/api/statistics.key"
import {
	ATTEMPT_IDS,
	buildAttemptDetail,
	buildAttemptResponse,
	buildStudentAttempt,
} from "../../../support/attempt"
import {
	createTestQueryClient,
	createTestWrapper,
} from "../../../support/render"

const api = vi.hoisted(() => ({
	getAttempt: vi.fn(),
	getStudentExamAttempts: vi.fn(),
	submitAttempt: vi.fn(),
	abandonAttempt: vi.fn(),
	createStudentExamAttempt: vi.fn(),
}))

vi.mock("@/features/attempt/api/attempt.api", () => api)

function page(pageNumber = 1, hasNextPage = false) {
	return {
		items: [buildStudentAttempt()],
		meta: {
			page: pageNumber,
			pageSize: 20,
			totalItems: hasNextPage ? 21 : 1,
			totalPages: hasNextPage ? 2 : 1,
			hasPreviousPage: pageNumber > 1,
			hasNextPage,
		},
	}
}

describe("attempt query hooks", () => {
	beforeEach(() => {
		Object.values(api).forEach((mock) => mock.mockReset())
	})

	it("uses the detail query key, requests the attempt, and propagates AbortSignal", async () => {
		api.getAttempt.mockResolvedValue(buildAttemptResponse())
		const queryClient = createTestQueryClient()
		const result = renderHook(() => useAttempt(ATTEMPT_IDS.attempt), {
			wrapper: createTestWrapper({ queryClient }),
		})

		await waitFor(() => expect(result.result.current.isSuccess).toBe(true))
		expect(api.getAttempt).toHaveBeenCalledWith(ATTEMPT_IDS.attempt, expect.any(AbortSignal))
		expect(queryClient.getQueryData(attemptQueryKeys.detail(ATTEMPT_IDS.attempt))).toEqual(buildAttemptResponse())
	})

	it("submit writes terminal detail and invalidates lists plus statistics", async () => {
		const response = buildAttemptResponse({
			data: buildAttemptDetail({ status: "submitted", revision: 4 }),
			etag: '"4"',
		})
		api.submitAttempt.mockResolvedValue(response)
		const queryClient = createTestQueryClient()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const hook = renderHook(() => useAttemptTransition(ATTEMPT_IDS.attempt, "submit"), {
			wrapper: createTestWrapper({ queryClient }),
		})

		await act(() => hook.result.current.mutateAsync('"3"'))

		expect(api.submitAttempt).toHaveBeenCalledWith(ATTEMPT_IDS.attempt, '"3"')
		expect(queryClient.getQueryData(attemptQueryKeys.detail(ATTEMPT_IDS.attempt))).toEqual(response)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: attemptQueryKeys.lists() })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: statisticsQueryKeys.dashboard() })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: statisticsQueryKeys.full() })
	})

	it("abandon invalidates lists without submission statistics invalidation", async () => {
		api.abandonAttempt.mockResolvedValue(buildAttemptResponse({
			data: buildAttemptDetail({ status: "abandoned" }),
		}))
		const queryClient = createTestQueryClient()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const hook = renderHook(() => useAttemptTransition(ATTEMPT_IDS.attempt, "abandon"), {
			wrapper: createTestWrapper({ queryClient }),
		})

		await act(() => hook.result.current.mutateAsync('"3"'))

		expect(api.abandonAttempt).toHaveBeenCalledWith(ATTEMPT_IDS.attempt, '"3"')
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(invalidate).toHaveBeenCalledWith({ queryKey: attemptQueryKeys.lists() })
	})

	it("create invalidates attempt lists", async () => {
		api.createStudentExamAttempt.mockResolvedValue({ attemptId: ATTEMPT_IDS.attempt, mode: "practice", revision: 0 })
		const queryClient = createTestQueryClient()
		const invalidate = vi.spyOn(queryClient, "invalidateQueries")
		const hook = renderHook(() => useCreateExamAttempt(ATTEMPT_IDS.exam), {
			wrapper: createTestWrapper({ queryClient }),
		})

		await act(() => hook.result.current.mutateAsync({ mode: "practice" }))

		expect(api.createStudentExamAttempt).toHaveBeenCalledWith(ATTEMPT_IDS.exam, { mode: "practice" })
		expect(invalidate).toHaveBeenCalledWith({ queryKey: attemptQueryKeys.lists() })
	})

	it("does not request disabled active or history queries", async () => {
		const queryClient = createTestQueryClient()
		renderHook(() => ({
			active: useActiveExamAttempt(ATTEMPT_IDS.exam, false),
			history: useExamAttemptHistory(ATTEMPT_IDS.exam, 1, false),
		}), { wrapper: createTestWrapper({ queryClient }) })

		await Promise.resolve()
		expect(api.getStudentExamAttempts).not.toHaveBeenCalled()
	})

	it("calculates infinite next pages and stops when hasNextPage is false", async () => {
		api.getStudentExamAttempts
			.mockResolvedValueOnce(page(1, true))
			.mockResolvedValueOnce(page(2, false))
		const hook = renderHook(() => useInfiniteAttempts({ pageSize: 20 }), {
			wrapper: createTestWrapper(),
		})

		await waitFor(() => expect(hook.result.current.isSuccess).toBe(true))
		expect(hook.result.current.hasNextPage).toBe(true)
		await act(() => hook.result.current.fetchNextPage())
		expect(api.getStudentExamAttempts).toHaveBeenNthCalledWith(
			2,
			{ pageSize: 20, page: 2 },
			expect.any(AbortSignal)
		)
		await waitFor(() => expect(hook.result.current.hasNextPage).toBe(false))
	})

	it("does not leak cached query state between QueryClient instances", () => {
		const first = createTestQueryClient()
		const second = createTestQueryClient()
		first.setQueryData(attemptQueryKeys.detail(ATTEMPT_IDS.attempt), buildAttemptResponse())

		expect(second.getQueryData(attemptQueryKeys.detail(ATTEMPT_IDS.attempt))).toBeUndefined()
	})
})
