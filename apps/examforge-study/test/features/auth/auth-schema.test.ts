import { describe, expect, it } from "vitest"

import {
	STUDENT_LANDING_ROUTE,
	getSafeAuthRedirect,
} from "@/features/auth/auth.constants"
import { createAuthSchemas } from "@/features/auth/schemas/auth.schema"

const translate = (key: Parameters<typeof createAuthSchemas>[0] extends (key: infer Key) => string ? Key : never) => key
const schemas = createAuthSchemas(translate)

function validationMessage(result: ReturnType<typeof schemas.signin.safeParse>) {
	if (result.success) throw new Error("Expected schema validation to fail")
	return result.error.issues[0]?.message
}

describe("getSafeAuthRedirect", () => {
	it.each([
		["/dashboard", "/dashboard"],
		["/exams?category=science#available", "/exams?category=science#available"],
	])("allows a safe internal callback %s", (callback, expected) => {
		expect(getSafeAuthRedirect(callback)).toBe(expected)
	})

	it.each([
		[undefined, "missing"],
		["", "empty"],
		["https://evil.example/steal", "absolute external URL"],
		["http://evil.example/steal", "external HTTP URL"],
		["//evil.example/steal", "protocol-relative URL"],
		["%2F%2Fevil.example/steal", "encoded protocol-relative URL"],
		["/%2f%2fevil.example/steal", "encoded double slash in a path"],
		["\\evil.example\\steal", "backslash path"],
		["/\\evil.example/steal", "slash-backslash path"],
		["/%5Cevil.example/steal", "encoded backslash"],
		["/%5cevil.example/%5Csteal", "multiple encoded backslashes"],
		["/%E0%A4%A", "malformed encoding"],
		["javascript:alert(1)", "non-HTTP scheme"],
	] as const)("falls back for a %s", (...[callback]) => {
		expect(getSafeAuthRedirect(callback)).toBe(STUDENT_LANDING_ROUTE)
	})
})

describe("createAuthSchemas", () => {
	it("accepts a valid sign-in and rejects an invalid email with the translated key", () => {
		expect(schemas.signin.safeParse({
			email: "student@example.com",
			password: "secret",
		}).success).toBe(true)
		expect(validationMessage(schemas.signin.safeParse({
			email: "invalid",
			password: "secret",
		}))).toBe("email")
	})

	it("requires a sign-in password with the translated key", () => {
		expect(validationMessage(schemas.signin.safeParse({
			email: "student@example.com",
			password: "",
		}))).toBe("passwordRequired")
	})

	it("trims a signup display name", () => {
		const result = schemas.signup.safeParse({
			displayName: "  Study Student  ",
			email: "student@example.com",
			password: "secret",
			confirmPassword: "secret",
		})

		expect(result.success && result.data.displayName).toBe("Study Student")
	})

	it.each([
		["   ", "displayNameRequired"],
		["a".repeat(101), "displayNameMax"],
	])("rejects display name %j with %s", (displayName, expectedMessage) => {
		const result = schemas.signup.safeParse({
			displayName,
			email: "student@example.com",
			password: "secret",
			confirmPassword: "secret",
		})

		expect(result.success).toBe(false)
		if (!result.success) expect(result.error.issues[0]?.message).toBe(expectedMessage)
	})

	it("reports password confirmation mismatch with the translated key", () => {
		const result = schemas.signup.safeParse({
			displayName: "Student",
			email: "student@example.com",
			password: "secret",
			confirmPassword: "different",
		})

		expect(result.success).toBe(false)
		if (!result.success) {
			expect(result.error.issues).toContainEqual(expect.objectContaining({
				path: ["confirmPassword"],
				message: "passwordsMismatch",
			}))
		}
	})

	it("validates forgot-password email using the translated key", () => {
		const result = schemas.forgotPassword.safeParse({ email: "invalid" })
		expect(result.success).toBe(false)
		if (!result.success) expect(result.error.issues[0]?.message).toBe("email")
	})

	it("validates reset-password required values and mismatch", () => {
		const required = schemas.resetPassword.safeParse({ password: "", confirmPassword: "" })
		expect(required.success).toBe(false)
		if (!required.success) {
			expect(required.error.issues.map(({ message }) => message)).toEqual([
				"passwordRequired",
				"confirmPasswordRequired",
			])
		}

		const mismatch = schemas.resetPassword.safeParse({
			password: "secret",
			confirmPassword: "different",
		})
		expect(mismatch.success).toBe(false)
		if (!mismatch.success) expect(mismatch.error.issues[0]?.message).toBe("passwordsMismatch")
	})
})
