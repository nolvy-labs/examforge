"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { CircleAlert, Info } from "lucide-react"
import { useForm } from "react-hook-form"

import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/shadcn/field"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import { PasswordInput } from "@/features/auth/components/password.input"
import {
	createAuthSchemas,
	type ResetPasswordFormValues,
} from "@/features/auth/schemas/auth.schema"
import { LocaleMessage } from "@/components/locale/locale-message"

export function ResetPasswordForm({ hasToken }: { hasToken: boolean }) {
	const [isUnavailable, setIsUnavailable] = useState(false)
	const translateAuth = useTranslations("auth")
	const translateValidation = useTranslations("validation")
	const schema = useMemo(() => createAuthSchemas(translateValidation).resetPassword, [translateValidation])
	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
	})

	function handleSubmit() {
		setIsUnavailable(true)
		form.reset()
	}

	if (!hasToken) {
		return (
			<div className="space-y-6">
				<Alert variant="destructive">
					<CircleAlert />
					<AlertTitle><LocaleMessage messageId="auth.invalidResetTitle" /></AlertTitle>
					<AlertDescription><LocaleMessage messageId="auth.invalidResetDescription" /></AlertDescription>
				</Alert>
				<Link
					href={AUTH_ROUTES.signin}
					className={buttonVariants({
						variant: "outline",
						size: "lg",
						className: "w-full",
					})}
				>
					<LocaleMessage messageId="auth.backToSignIn" />
				</Link>
			</div>
		)
	}

	return (
		<form
			noValidate
			className="space-y-6"
			onSubmit={form.handleSubmit(handleSubmit)}
		>
			{isUnavailable && (
				<Alert>
					<Info />
					<AlertTitle><LocaleMessage messageId="auth.resetUnavailable" /></AlertTitle>
					<AlertDescription><LocaleMessage messageId="auth.resetUnavailableDescription" /></AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-5">
				<Field data-invalid={Boolean(form.formState.errors.password)}>
					<FieldLabel htmlFor="reset-password"><LocaleMessage messageId="auth.newPassword" /></FieldLabel>
					<PasswordInput
						id="reset-password"
						autoComplete="new-password"
						visibilityLabel={translateAuth("newPasswordField")}
						{...form.register("password")}
					/>
					<FieldDescription id="reset-password-description">
						<LocaleMessage messageId="auth.passwordHint" />
					</FieldDescription>
					<FieldError
						id="reset-password-error"
						errors={[form.formState.errors.password]}
					/>
				</Field>

				<Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
					<FieldLabel htmlFor="reset-confirm-password">
						<LocaleMessage messageId="auth.confirmNewPassword" />
					</FieldLabel>
					<PasswordInput
						id="reset-confirm-password"
						autoComplete="new-password"
						visibilityLabel={translateAuth("confirmPasswordField")}
						{...form.register("confirmPassword")}
					/>
					<FieldError
						id="reset-confirm-password-error"
						errors={[form.formState.errors.confirmPassword]}
					/>
				</Field>
			</FieldGroup>

			<Button type="submit" size="lg" className="w-full">
				<LocaleMessage messageId="common.continue" />
			</Button>

			<p className="text-center text-sm">
				<Link
					href={AUTH_ROUTES.signin}
					className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<LocaleMessage messageId="auth.backToSignIn" />
				</Link>
			</p>
		</form>
	)
}