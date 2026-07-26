export enum UserRole {
	Student = 1,
	Admin = 5
}

export interface AuthUser {
	id: string
	email: string
	displayName: string | null
	role: UserRole
}

export interface SigninRequest {
	email: string
	password: string
}

export interface SignupRequest {
	email: string
	password: string
	displayName: string | null
}
