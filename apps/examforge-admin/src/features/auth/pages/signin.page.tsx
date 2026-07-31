import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { getStudyPortalUrl } from "@/features/auth/auth.constants"
import { SigninForm } from "@/features/auth/components/signin.form"

export function SigninPage({ returnUrl }: { returnUrl?: string }) {
	return (
		<Card className="border-t-2 border-t-foreground bg-background shadow-xl shadow-foreground/5">
			<CardHeader className="gap-2 px-6 pt-6">
				<p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Restricted access</p>
				<CardTitle className="text-xl font-semibold tracking-tight">Admin Portal</CardTitle>
				<CardDescription>Sign in with an authorized ExamForge administrator account.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6 px-6 pb-6">
				<SigninForm returnUrl={returnUrl} />
				<p className="border-t pt-5 text-center text-xs text-muted-foreground">
					Not an administrator?{" "}
					<Link href={getStudyPortalUrl()} className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
						Go to the study portal
					</Link>
				</p>
			</CardContent>
		</Card>
	)
}
