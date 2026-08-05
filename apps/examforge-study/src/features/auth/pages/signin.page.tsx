import { Brand } from "@/components/layout/brand"
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/shadcn/card"
import { SigninForm } from "@/features/auth/components/signin.form"
import Link from "next/link"

export function SigninPage({ callbackUrl }: { callbackUrl?: string }) {
	return (
		<div className="flex flex-col gap-4">
			<Brand />
			<Card className="shadow-lg shadow-foreground/5">
				<CardHeader className="gap-2">
					<CardTitle className="text-2xl font-semibold tracking-tight">
						Welcome back
					</CardTitle>
				</CardHeader>
				<CardContent>
					<SigninForm callbackUrl={callbackUrl} />
				</CardContent>
			</Card>
		</div>
	)
}
