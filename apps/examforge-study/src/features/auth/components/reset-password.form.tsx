"use client"

import { useState } from "react"
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
	resetPasswordSchema,
	type ResetPasswordFormValues,
} from "@/features/auth/schemas/auth.schema"

export function ResetPasswordForm({ hasToken }: { hasToken: boolean }) {
	const [isUnavailable, setIsUnavailable] = useState(false)
	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
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
					<AlertTitle>This reset link is invalid</AlertTitle>
					<AlertDescription>
						A reset token is required. Password recovery is not available yet,
						so please return to sign in.
					</AlertDescription>
				</Alert>
				<Link
					href={AUTH_ROUTES.signin}
					className={buttonVariants({
						variant: "outline",
						size: "lg",
						className: "w-full",
					})}
				>
					Back to sign in
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
					<AlertTitle>Password reset is not available yet</AlertTitle>
					<AlertDescription>
						Your password was not changed. Please return when password recovery
						has been enabled.
					</AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-5">
				<Field data-invalid={Boolean(form.formState.errors.password)}>
					<FieldLabel htmlFor="reset-password">New password</FieldLabel>
					<PasswordInput
						id="reset-password"
						autoComplete="new-password"
						visibilityLabel="new password"
						{...form.register("password")}
					/>
					<FieldDescription id="reset-password-description">
						Choose a password you do not use on other sites.
					</FieldDescription>
					<FieldError
						id="reset-password-error"
						errors={[form.formState.errors.password]}
					/>
				</Field>

				<Field data-invalid={Boolean(form.formState.errors.confirmPassword)}>
					<FieldLabel htmlFor="reset-confirm-password">
						Confirm new password
					</FieldLabel>
					<PasswordInput
						id="reset-confirm-password"
						autoComplete="new-password"
						visibilityLabel="new password confirmation"
						{...form.register("confirmPassword")}
					/>
					<FieldError
						id="reset-confirm-password-error"
						errors={[form.formState.errors.confirmPassword]}
					/>
				</Field>
			</FieldGroup>

			<Button type="submit" size="lg" className="w-full">
				Continue
			</Button>

			<p className="text-center text-sm">
				<Link
					href={AUTH_ROUTES.signin}
					className="rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Back to sign in
				</Link>
			</p>
		</form>
	)
}