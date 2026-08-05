"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"
import { useMemo } from "react"
import { useTranslations } from "next-intl"

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import {
	AUTH_ROUTES,
	getSafeAuthRedirect,
} from "@/features/auth/auth.constants"
import { PasswordInput } from "@/features/auth/components/password.input"
import { useSignupMutation } from "@/features/auth/hooks/auth.hook"
import {
	createAuthSchemas,
	type SignupFormValues,
} from "@/features/auth/schemas/auth.schema"
import { ApiError } from "@/lib/api/api.error"
import { LocaleMessage } from "@/components/locale/locale-message"
import { localizeError } from "@/features/shared/errors/localized-error"

export function SignupForm({ callbackUrl }: { callbackUrl?: string }) {
	const router = useRouter()
	const signupMutation = useSignupMutation()
	const translateAuth = useTranslations("auth")
	const translateValidation = useTranslations("validation")
	const translateErrors = useTranslations("errors")
	const schema = useMemo(() => createAuthSchemas(translateValidation).signup, [translateValidation])
	const form = useForm<SignupFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			displayName: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	})
	const apiError =
		signupMutation.error instanceof ApiError ? signupMutation.error : null

	function handleSubmit(values: SignupFormValues) {
		if (signupMutation.isPending) {
			return
		}

		signupMutation.mutate(
			{
				displayName: values.displayName,
				email: values.email,
				password: values.password,
			},
			{
				onSuccess: () => {
					form.reset()
					router.replace(getSafeAuthRedirect(callbackUrl))
				},
				onError: (error) => {
					if (!(error instanceof ApiError)) {
						return
					}

					const fields = ["displayName", "email", "password"] as const

					fields.forEach((field) => {
						const message = error.getFieldMessages(field)?.[0] && translateValidation("fieldInvalid")

						if (message) {
							form.setError(field, { type: "server", message })
						}
					})
				},
			}
		)
	}

	return (
		<form
			noValidate
			className="space-y-6"
			onSubmit={form.handleSubmit(handleSubmit)}
		>
			{apiError && (
				<Alert variant="destructive">
					<TriangleAlert />
					<AlertTitle><LocaleMessage messageId="auth.signUpErrorTitle" /></AlertTitle>
					<AlertDescription>{localizeError(apiError, translateErrors)}</AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-6">
				<Field 
					data-invalid={Boolean(form.formState.errors.displayName)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signup-name">
						<LocaleMessage messageId="auth.displayName" />
					</FieldLabel>
					<Input
						id="signup-name"
						type="text"
						autoComplete="name"
						maxLength={100}
						{...form.register("displayName")}
					/>
					<FieldError
						id="signup-name-error"
						className="absolute -bottom-5 text-xs"
						errors={[form.formState.errors.displayName]}
					/>
				</Field>

				<Field 
					data-invalid={Boolean(form.formState.errors.email)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signup-email"><LocaleMessage messageId="auth.email" /></FieldLabel>
					<Input
						id="signup-email"
						type="email"
						autoComplete="email"
						inputMode="email"
						autoCapitalize="none"
						spellCheck={false}
						maxLength={320}
						{...form.register("email")}
					/>
					<FieldError
						id="signup-email-error"
						className="absolute -bottom-5 text-xs"
						errors={[form.formState.errors.email]}
					/>
				</Field>

				<Field 
					data-invalid={Boolean(form.formState.errors.password)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signup-password"><LocaleMessage messageId="auth.password" /></FieldLabel>
					<PasswordInput
						id="signup-password"
						autoComplete="new-password"
						visibilityLabel={translateAuth("passwordField")}
						{...form.register("password")}
					/>
					<FieldError
						id="signup-password-error"
						className="absolute -bottom-5 text-xs"
						errors={[form.formState.errors.password]}
					/>
				</Field>

				<Field 
					data-invalid={Boolean(form.formState.errors.confirmPassword)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signup-confirm-password">
						<LocaleMessage messageId="auth.confirmPassword" />
					</FieldLabel>
					<PasswordInput
						id="signup-confirm-password"
						autoComplete="new-password"
						visibilityLabel={translateAuth("confirmPasswordField")}
						{...form.register("confirmPassword")}
					/>
					<FieldError
						id="signup-confirm-password-error"
						className="absolute -bottom-5 text-xs"
						errors={[form.formState.errors.confirmPassword]}
					/>
				</Field>
			</FieldGroup>

			<Button
				type="submit"
				size="lg"
				className="w-full mt-4"
				disabled={signupMutation.isPending}
			>
				{signupMutation.isPending && (
					<LoaderCircle className="animate-spin" />
				)}
				<LocaleMessage messageId={signupMutation.isPending ? "auth.creatingAccount" : "auth.signUp"} />
			</Button>

			<p className="text-center text-sm text-muted-foreground">
				<LocaleMessage messageId="auth.alreadyHaveAccount" />
				<Link
					href={AUTH_ROUTES.signin}
					className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<LocaleMessage messageId="auth.signIn" />
				</Link>
			</p>
		</form>
	)
}
