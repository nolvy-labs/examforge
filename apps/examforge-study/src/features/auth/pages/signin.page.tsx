import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { SigninForm } from "@/features/auth/components/signin.form"

export function SigninPage({ callbackUrl }: { callbackUrl?: string }) {
	return (
		<Card className="shadow-lg shadow-foreground/5">
			<CardHeader className="gap-2">
				<CardTitle className="text-2xl font-semibold tracking-tight">
					Welcome back
				</CardTitle>
				<CardDescription>
					Sign in to continue your ExamForge study journey.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SigninForm callbackUrl={callbackUrl} />
			</CardContent>
		</Card>
	)
}
