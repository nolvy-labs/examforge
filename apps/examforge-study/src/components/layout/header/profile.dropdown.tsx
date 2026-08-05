"use client"

import { ChartLine, Clock, LogOut } from "lucide-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import { LocaleMessage } from "@/components/locale/locale-message"
import { LocaleSwitcher } from "@/components/locale/locale-switcher"
import { Button } from "@/components/shadcn/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { Separator } from "@/components/shadcn/separator"
import { useLogoutMutation } from "@/features/auth/hooks/auth.hook"
import type { AuthUser } from "@/features/auth/types/auth.type"

function getStudentName(displayName: string | null | undefined, email: string) {
	return displayName?.trim() || email.split("@")[0]
}

function getInitials(name: string) {
	return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "S"
}

export default function ProfileDropdown({ user }: { user: AuthUser }) {
	const router = useRouter()
	const logoutMutation = useLogoutMutation()
	const translateAuth = useTranslations("auth")
	const translateAccessibility = useTranslations("accessibility")
	const name = getStudentName(user.displayName, user.email) || translateAuth("studentFallback")

	function handleLogout() {
		if (logoutMutation.isPending) return
		logoutMutation.mutate(undefined, { onSettled: () => router.replace("/") })
	}

	return (
		<Popover>
			<PopoverTrigger render={
				<Button variant="ghost" className="ml-auto h-12 max-w-44 gap-2 p-1.5 sm:max-w-xs sm:p-2" aria-label={translateAccessibility("profileMenu")}>
					<span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{getInitials(name)}</span>
					<span className="min-w-0 text-left"><span className="block truncate text-sm font-medium">{name}</span></span>
				</Button>
			} />
			<PopoverContent className="gap-1 p-3" align="end">
				<div className="flex flex-row items-center justify-start gap-2 px-1">
					<span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{getInitials(name)}</span>
					<div className="min-w-0"><p className="truncate text-sm font-medium">{name}</p><p className="truncate text-xs text-muted-foreground">{user.email}</p></div>
				</div>
				<Separator />
				<Button type="button" variant="ghost" className="w-full justify-start text-xs" onClick={() => router.push("/statistics")}><ChartLine /><LocaleMessage messageId="navigation.statistics" /></Button>
				<Button type="button" variant="ghost" className="w-full justify-start text-xs" onClick={() => router.push("/history")}><Clock /><LocaleMessage messageId="navigation.history" /></Button>
				<LocaleSwitcher compact />
				<Separator />
				<Button type="button" variant="ghost" className="w-full justify-start text-xs hover:bg-destructive/10 hover:text-destructive" disabled={logoutMutation.isPending} onClick={handleLogout}>
					<LogOut /><LocaleMessage messageId={logoutMutation.isPending ? "navigation.signingOut" : "navigation.signOut"} />
				</Button>
			</PopoverContent>
		</Popover>
	)
}
