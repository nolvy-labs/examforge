import { UserRole, type AuthUser } from "@/features/auth/types/auth.type"

export function isAdminUser(user: AuthUser) {
	return user.role === UserRole.Admin
}
