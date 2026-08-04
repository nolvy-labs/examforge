"use client"

import { useRouter } from "next/navigation"
import { ChartLine, Clock, LogOut } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { useLogoutMutation } from "@/features/auth/hooks/auth.hook"
import type { AuthUser } from "@/features/auth/types/auth.type"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/shadcn/popover"
import { Separator } from "@/components/shadcn/separator"

function getStudentName(displayName: string | null | undefined, email: string) {
	return displayName?.trim() || email.split("@")[0] || "Student"
}

function getInitials(name: string) {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join("")
			.toUpperCase() || "S"
	)
}

export default function ProfileDropdown({ user }: { user: AuthUser }) {
	const router = useRouter()
	const logoutMutation = useLogoutMutation()
	const name = getStudentName(user.displayName, user.email)

	function handleLogout() {
		if (logoutMutation.isPending) return
		logoutMutation.mutate(undefined, {
			onSettled: () => router.replace("/"),
		})
	}

	return (
		<Popover>
			<PopoverTrigger render={
				<Button variant="ghost" className="ml-auto max-w-44 gap-2 p-1.5 h-12 sm:max-w-xs sm:p-2">
					<span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
						{getInitials(name)}
					</span>
					<span className="min-w-0 text-left">
						<span className="block truncate text-sm font-medium">{name}</span>
					</span>
				</Button>
			} />
			<PopoverContent className="gap-1 p-3" align="start">
				<div className="flex flex-row items-center justify-start gap-2 px-1">
					<span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
						{getInitials(name)}
					</span>
					<div>
						<p className="truncate text-sm font-medium">{name}</p>
						<p className="truncate text-xs text-muted-foreground">{user.email}</p>
					</div>
				</div>
				<Separator />
				<Button
						type="button"
						variant="ghost"
						className="w-full justify-start text-xs"
						onClick={() => router.push("/statistics")}
					>
						<ChartLine />
						{"Statistics"}
					</Button>
					<Button
						type="button"
						variant="ghost"
						className="w-full justify-start text-xs"
						onClick={() => router.push("/history")}
					>
						<Clock />
						{"History"}
					</Button>
					<Separator />
					<Button
						type="button"
						variant="ghost"
						className="w-full justify-start text-xs hover:text-destructive hover:bg-destructive/10"
						disabled={logoutMutation.isPending}
						onClick={handleLogout}
					>
						<LogOut />
						{logoutMutation.isPending ? "Signing out…" : "Sign out"}
					</Button>
			</PopoverContent>
		</Popover>
	)
}
