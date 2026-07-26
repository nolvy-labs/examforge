import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password.form"

export function ForgotPasswordPage() {
	return (
		<Card className="shadow-lg shadow-foreground/5">
			<CardHeader className="gap-2">
				<CardTitle className="text-2xl font-semibold tracking-tight">
					Forgot your password?
				</CardTitle>
				<CardDescription>
					Enter your email to check the availability of account recovery.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ForgotPasswordForm />
			</CardContent>
		</Card>
	)
}
