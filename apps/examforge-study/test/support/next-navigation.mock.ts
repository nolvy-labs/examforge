import { vi } from "vitest"

export const replace = vi.fn()
export const push = vi.fn()
export const refresh = vi.fn()
export const back = vi.fn()
export const forward = vi.fn()
export const prefetch = vi.fn()
export const pathname = vi.fn(() => "/dashboard")
export const searchParams = vi.fn(() => new URLSearchParams())

export const router = {
	replace,
	push,
	refresh,
	back,
	forward,
	prefetch,
}

export function useRouter() {
	return router
}

export function usePathname() {
	return pathname()
}

export function useSearchParams() {
	return searchParams()
}

export function resetNextNavigationMocks() {
	replace.mockReset()
	push.mockReset()
	refresh.mockReset()
	back.mockReset()
	forward.mockReset()
	prefetch.mockReset()
	pathname.mockReset().mockReturnValue("/dashboard")
	searchParams.mockReset().mockReturnValue(new URLSearchParams())
}
