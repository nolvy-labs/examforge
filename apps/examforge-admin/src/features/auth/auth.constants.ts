export const AUTH_API_ROUTES = {
	signin: "/api/v1/auth/login",
	refresh: "/api/v1/auth/refresh",
	logout: "/api/v1/auth/logout",
	me: "/api/v1/auth/me",
} as const

export const ADMIN_ROUTES = {
	signin: "/signin",
	accessDenied: "/access-denied",
	defaultProtected: "/",
} as const

const PROTECTED_ROUTE_ROOTS = [
	ADMIN_ROUTES.defaultProtected,
	"/users",
	"/exams",
	"/attempt-results",
] as const

const ADMIN_URL_ORIGIN = "http://examforge-admin.local"

function isProtectedPath(pathname: string) {
	return PROTECTED_ROUTE_ROOTS.some((root) =>
		root === "/" ? pathname === root : pathname === root || pathname.startsWith(`${root}/`)
	)
}

function hasUnsafeDecodedForm(value: string) {
	let decoded = value

	for (let index = 0; index < 4; index += 1) {
		if (!decoded.startsWith("/") || decoded.startsWith("//") || decoded.includes("\\")) {
			return true
		}

		let next: string
		try {
			next = decodeURIComponent(decoded)
		} catch {
			return true
		}

		if (next === decoded) return false
		decoded = next
	}

	return true
}

export function getSafeAdminReturnUrl(value?: string) {
	if (!value || /[\u0000-\u001f\u007f]/.test(value) || hasUnsafeDecodedForm(value)) {
		return ADMIN_ROUTES.defaultProtected
	}

	try {
		const target = new URL(value, ADMIN_URL_ORIGIN)

		if (target.origin !== ADMIN_URL_ORIGIN || !isProtectedPath(target.pathname)) {
			return ADMIN_ROUTES.defaultProtected
		}

		return `${target.pathname}${target.search}${target.hash}`
	} catch {
		return ADMIN_ROUTES.defaultProtected
	}
}

export function getStudyPortalUrl() {
	return process.env.NEXT_PUBLIC_STUDY_URL ?? "http://localhost:3000"
}
