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
import { useSigninMutation } from "@/features/auth/hooks/auth.hook"
import {
	createAuthSchemas,
	type SigninFormValues,
} from "@/features/auth/schemas/auth.schema"
import { ApiError } from "@/lib/api/api.error"
import { PasswordInput } from "@/features/auth/components/password.input"
import { LocaleMessage } from "@/components/locale/locale-message"
import { localizeError } from "@/features/shared/errors/localized-error"

export function SigninForm({ callbackUrl }: { callbackUrl?: string }) {
	const router = useRouter()
	const signinMutation = useSigninMutation()
	const translateAuth = useTranslations("auth")
	const translateValidation = useTranslations("validation")
	const translateErrors = useTranslations("errors")
	const schema = useMemo(() => createAuthSchemas(translateValidation).signin, [translateValidation])
	const form = useForm<SigninFormValues>({
		resolver: zodResolver(schema),
		defaultValues: {
			email: "",
			password: "",
		},
	})
	const apiError =
		signinMutation.error instanceof ApiError ? signinMutation.error : null

	function handleSubmit(values: SigninFormValues) {
		if (signinMutation.isPending) {
			return
		}

		signinMutation.mutate(values, {
			onSuccess: () => {
				form.reset({ email: values.email, password: "" })
				router.replace(getSafeAuthRedirect(callbackUrl))
			},
			onError: (error) => {
				if (!(error instanceof ApiError)) {
					return
				}

				const emailError = error.getFieldMessages("email")?.[0] && translateValidation("fieldInvalid")
				const passwordError = error.getFieldMessages("password")?.[0] && translateValidation("fieldInvalid")

				if (emailError) {
					form.setError("email", { type: "server", message: emailError })
				}

				if (passwordError) {
					form.setError("password", { type: "server", message: passwordError })
				}
			},
		})
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
					<AlertTitle><LocaleMessage messageId="auth.signInErrorTitle" /></AlertTitle>
					<AlertDescription>{localizeError(apiError, translateErrors)}</AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-8">
				<Field
					data-invalid={Boolean(form.formState.errors.email)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signin-email"><LocaleMessage messageId="auth.email" /></FieldLabel>
					<Input
						id="signin-email"
						type="email"
						autoComplete="email"
						inputMode="email"
						autoCapitalize="none"
						spellCheck={false}
						{...form.register("email")}
					/>
					<FieldError
						id="signin-email-error"
						className="absolute text-xs -bottom-5"
						errors={[form.formState.errors.email]}
					/>
				</Field>

				<Field
					data-invalid={Boolean(form.formState.errors.password)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signin-password"><LocaleMessage messageId="auth.password" /></FieldLabel>
					<PasswordInput
						id="signin-password"
						autoComplete="current-password"
						visibilityLabel={translateAuth("passwordField")}
						{...form.register("password")}
					/>
					<FieldError
						id="signin-password-error"
						className="absolute text-xs -bottom-5"
						errors={[form.formState.errors.password]}
					/>
				</Field>
				<div className="flex justify-end -mt-6">
					<Button
						disabled
						variant={"link"}
						className="rounded-sm text-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					>
						<LocaleMessage messageId="auth.forgotPassword" />
					</Button>
				</div>
			</FieldGroup>

			<Button
				type="submit"
				size="lg"
				className="w-full"
				disabled={signinMutation.isPending}
			>
				{signinMutation.isPending && (
					<LoaderCircle className="animate-spin" />
				)}
				<LocaleMessage messageId={signinMutation.isPending ? "auth.signingIn" : "auth.signIn"} />
			</Button>

			<p className="text-center text-sm text-muted-foreground">
				<LocaleMessage messageId="auth.newToExamForge" />
				<Link
					href={AUTH_ROUTES.signup}
					className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<LocaleMessage messageId="auth.signUp" />
				</Link>
			</p>
		</form>
	)
}