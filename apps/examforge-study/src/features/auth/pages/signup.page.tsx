import { Brand } from "@/components/layout/brand"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { SignupForm } from "@/features/auth/components/signup.form"

export function SignupPage({ callbackUrl }: { callbackUrl?: string }) {
	return (
		<div className="flex flex-col gap-4">
			<Brand />
			<Card className="shadow-lg shadow-foreground/5">
				<CardHeader className="gap-2">
					<CardTitle className="text-2xl font-semibold tracking-tight">
						Create your account
					</CardTitle>
				</CardHeader>
				<CardContent>
					<SignupForm callbackUrl={callbackUrl} />
				</CardContent>
			</Card>
		</div>
	)
}