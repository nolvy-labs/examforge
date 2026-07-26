import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { SignupForm } from "@/features/auth/components/signup.form"

export function SignupPage({ callbackUrl }: { callbackUrl?: string }) {
	return (
		<Card className="shadow-lg shadow-foreground/5">
			<CardHeader className="gap-2">
				<CardTitle className="text-2xl font-semibold tracking-tight">
					Create your account
				</CardTitle>
				<CardDescription>
					Start building a study routine that keeps your progress in one place.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<SignupForm callbackUrl={callbackUrl} />
			</CardContent>
		</Card>
	)
}