import Link from "next/link"
import { WarningIcon } from "@phosphor-icons/react/dist/ssr"

import { Button } from "@/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card"
import { ADMIN_ROUTES, getStudyPortalUrl } from "@/features/auth/auth.constants"

export function AccessDeniedPage() {
	return (
		<Card className="border-t-2 border-t-destructive bg-background shadow-xl shadow-foreground/5">
			<CardHeader className="gap-3 px-6 pt-6">
				<span className="grid size-10 place-items-center bg-destructive/10 text-destructive">
					<WarningIcon className="size-5" weight="duotone" aria-hidden="true" />
				</span>
				<CardTitle className="text-xl font-semibold tracking-tight">Admin access required</CardTitle>
				<CardDescription>
					This account does not have permission to access the ExamForge Admin Portal. You have been signed out of this portal.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3 px-6 pb-6 sm:flex-row">
				<Button size="lg" render={<Link href={getStudyPortalUrl()} />} className="h-10 flex-1">
					Go to study portal
				</Button>
				<Button variant="outline" size="lg" render={<Link href={ADMIN_ROUTES.signin} />} className="h-10 flex-1">
					Back to admin sign-in
				</Button>
			</CardContent>
		</Card>
	)
}
