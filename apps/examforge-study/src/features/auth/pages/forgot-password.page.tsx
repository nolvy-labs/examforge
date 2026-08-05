import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password.form"
import { LocaleMessage } from "@/components/locale/locale-message"

export function ForgotPasswordPage() {
	return (
		<Card className="shadow-lg shadow-foreground/5">
			<CardHeader className="gap-2">
				<CardTitle className="text-2xl font-semibold tracking-tight">
					<LocaleMessage messageId="auth.forgotTitle" />
				</CardTitle>
				<CardDescription>
					<LocaleMessage messageId="auth.forgotDescription" />
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ForgotPasswordForm />
			</CardContent>
		</Card>
	)
}
