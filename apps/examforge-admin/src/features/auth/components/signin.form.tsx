"use client"

import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { WarningCircleIcon } from "@phosphor-icons/react"
import { useForm } from "react-hook-form"

import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert"
import { Button } from "@/components/shadcn/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import { getSafeAdminReturnUrl } from "@/features/auth/auth.constants"
import { isAdminUser } from "@/features/auth/authorization"
import { PasswordInput } from "@/features/auth/components/password.input"
import { useSigninMutation } from "@/features/auth/hooks/auth.hook"
import { signinSchema, type SigninFormValues } from "@/features/auth/schemas/auth.schema"
import { ApiError } from "@/lib/api/api.error"

function getSigninErrorMessage(error: unknown) {
	if (!(error instanceof ApiError)) return "We could not sign you in. Please try again."

	switch (error.code) {
		case "unauthorized":
			return "Email or password is incorrect."
		case "network":
		case "timeout":
			return "We could not reach ExamForge. Check your connection and try again."
		case "server":
			return "The service is temporarily unavailable. Please try again later."
		case "configuration":
			return "The admin portal is not configured for sign-in."
		default:
			return "We could not verify admin access. Please try again."
	}
}

export function SigninForm({ returnUrl }: { returnUrl?: string }) {
	const router = useRouter()
	const signinMutation = useSigninMutation()
	const form = useForm<SigninFormValues>({
		resolver: zodResolver(signinSchema),
		defaultValues: { email: "", password: "" },
	})

	function handleSubmit(values: SigninFormValues) {
		if (signinMutation.isPending) return

		signinMutation.mutate(values, {
			onSuccess: ({ accepted, user }) => {
				form.reset({ email: values.email, password: "" })
				if (accepted && isAdminUser(user)) {
					router.replace(getSafeAdminReturnUrl(returnUrl))
				}
			},
		})
	}

	return (
		<form noValidate className="space-y-6" onSubmit={form.handleSubmit(handleSubmit)}>
			{signinMutation.error && (
				<Alert variant="destructive">
					<WarningCircleIcon aria-hidden="true" />
					<AlertTitle>Sign-in unsuccessful</AlertTitle>
					<AlertDescription>{getSigninErrorMessage(signinMutation.error)}</AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-6">
				<Field data-invalid={Boolean(form.formState.errors.email)} className="gap-1.5">
					<FieldLabel htmlFor="admin-signin-email">Email</FieldLabel>
					<Input
						id="admin-signin-email"
						type="email"
						className="h-10"
						autoComplete="email"
						inputMode="email"
						autoCapitalize="none"
						spellCheck={false}
						aria-invalid={Boolean(form.formState.errors.email)}
						aria-describedby={form.formState.errors.email ? "admin-signin-email-error" : undefined}
						{...form.register("email")}
					/>
					<FieldError id="admin-signin-email-error" errors={[form.formState.errors.email]} />
				</Field>

				<Field data-invalid={Boolean(form.formState.errors.password)} className="gap-1.5">
					<FieldLabel htmlFor="admin-signin-password">Password</FieldLabel>
					<PasswordInput
						id="admin-signin-password"
						autoComplete="current-password"
						visibilityLabel="password"
						aria-invalid={Boolean(form.formState.errors.password)}
						aria-describedby={form.formState.errors.password ? "admin-signin-password-error" : undefined}
						{...form.register("password")}
					/>
					<FieldError id="admin-signin-password-error" errors={[form.formState.errors.password]} />
				</Field>
			</FieldGroup>

			<Button type="submit" size="lg" className="h-10 w-full" disabled={signinMutation.isPending}>
				{signinMutation.isPending && (
					<span className="size-3.5 animate-spin rounded-full border-2 border-primary-foreground/35 border-t-primary-foreground motion-reduce:animate-none" aria-hidden="true" />
				)}
				{signinMutation.isPending ? "Signing in…" : "Sign in to Admin Portal"}
			</Button>
		</form>
	)
}
