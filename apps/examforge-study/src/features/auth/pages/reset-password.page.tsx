import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { ResetPasswordForm } from "@/features/auth/components/reset-password.form"
import { LocaleMessage } from "@/components/locale/locale-message"

export function ResetPasswordPage({ hasToken }: { hasToken: boolean }) {
	return (
		<Card className="shadow-lg shadow-foreground/5">
			<CardHeader className="gap-2">
				<CardTitle className="text-2xl font-semibold tracking-tight">
					<LocaleMessage messageId="auth.resetTitle" />
				</CardTitle>
				<CardDescription>
					<LocaleMessage messageId="auth.resetDescription" />
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ResetPasswordForm hasToken={hasToken} />
			</CardContent>
		</Card>
	)
}
