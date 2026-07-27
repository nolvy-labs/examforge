"use client"

import { useState } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CircleCheck } from "lucide-react"
import { useForm } from "react-hook-form"

import {
	Alert,
	AlertTitle,
} from "@/components/shadcn/alert"
import { Button, buttonVariants } from "@/components/shadcn/button"
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/shadcn/field"
import { Input } from "@/components/shadcn/input"
import { AUTH_ROUTES } from "@/features/auth/auth.constants"
import {
	forgotPasswordSchema,
	type ForgotPasswordFormValues,
} from "@/features/auth/schemas/auth.schema"

export function ForgotPasswordForm() {
	const [isConfirmed, setIsConfirmed] = useState(false)
	const form = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	})

	function handleSubmit() {
		setIsConfirmed(true)
		form.reset()
	}

	if (isConfirmed) {
		return (
			<div className="space-y-6">
				<Alert>
					<CircleCheck />
					<AlertTitle>Password recovery is not available yet</AlertTitle>
				</Alert>
				<Link
					href={AUTH_ROUTES.signin}
					className={buttonVariants({
						variant: "outline",
						size: "lg",
						className: "w-full",
					})}
				>
					<ArrowLeft />
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
			<FieldGroup className="gap-5">
				<Field data-invalid={Boolean(form.formState.errors.email)}>
					<FieldLabel htmlFor="forgot-email">Email</FieldLabel>
					<Input
						id="forgot-email"
						type="email"
						autoComplete="email"
						inputMode="email"
						autoCapitalize="none"
						spellCheck={false}
						maxLength={320}
						{...form.register("email")}
					/>
					<FieldError
						id="forgot-email-error"
						errors={[form.formState.errors.email]}
					/>
				</Field>
			</FieldGroup>

			<Button type="submit" size="lg" className="w-full">
				Continue
			</Button>

			<p className="text-center text-sm">
				<Link
					href={AUTH_ROUTES.signin}
					className="inline-flex items-center gap-2 rounded-sm font-medium underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<ArrowLeft />
					Back to sign in
				</Link>
			</p>
		</form>
	)
}
