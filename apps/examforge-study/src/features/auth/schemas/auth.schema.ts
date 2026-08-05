import { z } from "zod"

type ValidationKey = "email" | "displayNameRequired" | "displayNameMax" | "passwordRequired" | "confirmPasswordRequired" | "passwordsMismatch"
type ValidationTranslator = (key: ValidationKey) => string

function passwordsMatch(values: { password: string; confirmPassword: string }, context: z.RefinementCtx, translate: ValidationTranslator) {
	if (values.password !== values.confirmPassword) {
		context.addIssue({ code: "custom", path: ["confirmPassword"], message: translate("passwordsMismatch") })
	}
}

export function createAuthSchemas(translate: ValidationTranslator) {
	const emailSchema = z.email(translate("email"))
	const passwordSchema = z.string().min(1, translate("passwordRequired"))
	const newPasswordFields = {
		password: passwordSchema,
		confirmPassword: z.string().min(1, translate("confirmPasswordRequired")),
	}

	return {
		signin: z.object({ email: emailSchema, password: passwordSchema }),
		signup: z.object({
			displayName: z.string().trim().max(100, translate("displayNameMax")).min(1, translate("displayNameRequired")),
			email: emailSchema,
			...newPasswordFields,
		}).superRefine((values, context) => passwordsMatch(values, context, translate)),
		forgotPassword: z.object({ email: emailSchema }),
		resetPassword: z.object(newPasswordFields).superRefine((values, context) => passwordsMatch(values, context, translate)),
	}
}

type AuthSchemas = ReturnType<typeof createAuthSchemas>
export type SigninFormValues = z.infer<AuthSchemas["signin"]>
export type SignupFormValues = z.infer<AuthSchemas["signup"]>
export type ForgotPasswordFormValues = z.infer<AuthSchemas["forgotPassword"]>
export type ResetPasswordFormValues = z.infer<AuthSchemas["resetPassword"]>
