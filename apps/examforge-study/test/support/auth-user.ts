import {
	type AuthUser,
	UserRole,
} from "@/features/auth/types/auth.type"

export function buildAuthUser(overrides: Partial<AuthUser> = {}): AuthUser {
	return {
		id: "11111111-1111-4111-8111-111111111111",
		email: "student@example.com",
		displayName: "Study Student",
		role: UserRole.Student,
		...overrides,
	}
}
