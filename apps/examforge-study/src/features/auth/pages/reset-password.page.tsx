import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { ResetPasswordForm } from "@/features/auth/components/reset-password.form"

export function ResetPasswordPage({ hasToken }: { hasToken: boolean }) {
	return (
		<Card className="shadow-lg shadow-foreground/5">
			<CardHeader className="gap-2">
				<CardTitle className="text-2xl font-semibold tracking-tight">
					Set a new password
				</CardTitle>
				<CardDescription>
					Choose and confirm the password you would like to use.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<ResetPasswordForm hasToken={hasToken} />
			</CardContent>
		</Card>
	)
}
