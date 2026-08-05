"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, TriangleAlert } from "lucide-react"
import { useForm } from "react-hook-form"

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
	signinSchema,
	type SigninFormValues,
} from "@/features/auth/schemas/auth.schema"
import { ApiError } from "@/lib/api/api.error"
import { PasswordInput } from "@/features/auth/components/password.input"

export function SigninForm({ callbackUrl }: { callbackUrl?: string }) {
	const router = useRouter()
	const signinMutation = useSigninMutation()
	const form = useForm<SigninFormValues>({
		resolver: zodResolver(signinSchema),
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

				const emailError = error.getFieldMessages("email")?.[0]
				const passwordError = error.getFieldMessages("password")?.[0]

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
					<AlertTitle>We could not sign you in</AlertTitle>
					<AlertDescription>{apiError.message}</AlertDescription>
				</Alert>
			)}

			<FieldGroup className="gap-8">
				<Field
					data-invalid={Boolean(form.formState.errors.email)}
					className="relative gap-1"
				>
					<FieldLabel htmlFor="signin-email">Email</FieldLabel>
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
					<FieldLabel htmlFor="signin-password">Password</FieldLabel>
					<PasswordInput
						id="signin-password"
						autoComplete="current-password"
						visibilityLabel="password"
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
						Forgot password?
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
				{signinMutation.isPending ? "Signing in…" : "Sign in"}
			</Button>

			<p className="text-center text-sm text-muted-foreground">
				{"New to ExamForge? "}
				<Link
					href={AUTH_ROUTES.signup}
					className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Create an account
				</Link>
			</p>
		</form>
	)
}