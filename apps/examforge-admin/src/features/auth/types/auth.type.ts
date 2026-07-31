export enum UserRole {
	Student = 1,
	Admin = 5,
}

export interface AuthUser {
	id: string
	email: string
	displayName: string | null
	role: number
}

export interface SigninRequest {
	email: string
	password: string
}
