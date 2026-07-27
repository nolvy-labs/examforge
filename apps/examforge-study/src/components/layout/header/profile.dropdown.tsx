"use client"

import { useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut } from "lucide-react"

import { Button } from "@/components/shadcn/button"
import { useLogoutMutation } from "@/features/auth/hooks/auth.hook"
import type { AuthUser } from "@/features/auth/types/auth.type"
import { cn } from "@/lib/utils"

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
	const [isOpen, setIsOpen] = useState(false)
	const disclosureId = useId()
	const panelRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const triggerId = `${disclosureId}-trigger`
	const panelId = `${disclosureId}-panel`
	const name = getStudentName(user.displayName, user.email)

	useEffect(() => {
		function handlePointerDown(event: PointerEvent) {
			if (
				event.target instanceof Node &&
				panelRef.current &&
				!panelRef.current.contains(event.target)
			) {
				setIsOpen(false)
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && isOpen) {
				setIsOpen(false)
				triggerRef.current?.focus()
			}
		}

		document.addEventListener("pointerdown", handlePointerDown)
		document.addEventListener("keydown", handleKeyDown)
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown)
			document.removeEventListener("keydown", handleKeyDown)
		}
	}, [isOpen])

	function handleLogout() {
		if (logoutMutation.isPending) return
		setIsOpen(false)
		logoutMutation.mutate(undefined, {
			onSettled: () => router.replace("/"),
		})
	}

	return (
		<div className="ml-auto" ref={panelRef}>
			<Button
				id={triggerId}
				ref={triggerRef}
				type="button"
				variant="ghost"
				className="h-11 max-w-44 gap-2 px-1.5 sm:max-w-xs sm:px-2"
				aria-expanded={isOpen}
				aria-controls={panelId}
				onClick={() => setIsOpen((value) => !value)}
			>
				<span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
					{getInitials(name)}
				</span>
				<span className="min-w-0 text-left">
					<span className="block truncate text-sm font-medium">{name}</span>
					<span className="hidden truncate text-xs font-normal text-muted-foreground sm:block">
						{user.email}
					</span>
				</span>
				<ChevronDown
					className={cn(
						"size-4 shrink-0 text-muted-foreground transition-transform",
						isOpen && "rotate-180"
					)}
					aria-hidden="true"
				/>
			</Button>

			{isOpen && (
				<div
					id={panelId}
					aria-labelledby={triggerId}
					className="absolute right-4 top-14 z-30 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:right-6 lg:right-8"
				>
					<div className="border-b border-slate-100 px-3 py-2">
						<p className="truncate text-sm font-medium">{name}</p>
						<p className="truncate text-xs text-muted-foreground">{user.email}</p>
					</div>
					<Button
						type="button"
						variant="ghost"
						className="mt-1 w-full justify-start text-slate-700"
						disabled={logoutMutation.isPending}
						onClick={handleLogout}
					>
						<LogOut aria-hidden="true" />
						{logoutMutation.isPending ? "Signing out…" : "Sign out"}
					</Button>
				</div>
			)}
		</div>
	)
}
