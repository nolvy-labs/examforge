import { z } from "zod"

const emailSchema = z.email()

const displayNameSchema = z.string().trim().max(100, "Name must be 100 characters or fewer.").min(1, "Display name is required.")

const passwordSchema = z.string().min(1, "Password is required.")

const newPasswordFields = {
	password: passwordSchema,
	confirmPassword: z.string().min(1, "Confirm your password."),
}

function passwordsMatch(
	values: { password: string; confirmPassword: string },
	context: z.RefinementCtx
) {
	if (values.password !== values.confirmPassword) {
		context.addIssue({
			code: "custom",
			path: ["confirmPassword"],
			message: "Passwords do not match.",
		})
	}
}

export const signinSchema = z.object({
	email: emailSchema,
	password: passwordSchema,
})

export const signupSchema = z
	.object({
		displayName: displayNameSchema,
		email: emailSchema,
		...newPasswordFields,
	})
	.superRefine(passwordsMatch)

export const forgotPasswordSchema = z.object({
	email: emailSchema,
})

export const resetPasswordSchema = z
	.object(newPasswordFields)
	.superRefine(passwordsMatch)

export type SigninFormValues = z.infer<typeof signinSchema>
export type SignupFormValues = z.infer<typeof signupSchema>
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
