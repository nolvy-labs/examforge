export const AUTH_API_ROUTES = {
	signin: "/api/v1/auth/login",
	signup: "/api/v1/auth/register",
	me: "/api/v1/auth/me",
} as const

export const AUTH_ROUTES = {
	signin: "/signin",
	signup: "/signup",
	forgotPassword: "/forgot-password",
	resetPassword: "/reset-password",
} as const

export const STUDENT_LANDING_ROUTE = "/"

export function getSafeAuthRedirect(value?: string) {
	if (
		!value ||
		!value.startsWith("/") ||
		value.startsWith("//") ||
		value.includes("\\")
	) {
		return STUDENT_LANDING_ROUTE
	}

	try {
		const target = new URL(value, "http://examforge.local")

		if (target.origin !== "http://examforge.local") {
			return STUDENT_LANDING_ROUTE
		}

		return `${target.pathname}${target.search}${target.hash}`
	} catch {
		return STUDENT_LANDING_ROUTE
	}
}