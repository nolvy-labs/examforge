"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, LogOut } from "lucide-react"

import { Brand } from "@/components/layout/brand"
import { Button } from "@/components/shadcn/button"
import { useLogoutMutation } from "@/features/auth/hooks/auth.hook"
import { useAuthStore } from "@/features/auth/stores/auth.store"

function getStudentName(displayName: string | null | undefined, email: string) {
	return displayName?.trim() || email.split("@")[0] || "Student"
}

function getInitials(name: string) {
	const initials = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0])
		.join("")
		.toUpperCase()

	return initials || "S"
}

export function StudentHeader() {
	const router = useRouter()
	const user = useAuthStore((state) => state.user)
	const logoutMutation = useLogoutMutation()
	const [isOpen, setIsOpen] = useState(false)
	const menuRef = useRef<HTMLDivElement>(null)
	const triggerRef = useRef<HTMLButtonElement>(null)
	const name = getStudentName(user?.displayName, user?.email ?? "")

	useEffect(() => {
		function handlePointerDown(event: PointerEvent) {
			if (
				menuRef.current &&
				!menuRef.current.contains(event.target as Node)
			) {
				setIsOpen(false)
			}
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
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
	}, [])

	function handleLogout() {
		if (logoutMutation.isPending) {
			return
		}

		setIsOpen(false)
		logoutMutation.mutate(undefined, {
			onSettled: () => router.replace("/"),
		})
	}

	return (
		<header className="relative z-20 border-b border-slate-200 bg-white">
			<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
				<Brand className="shrink-0 [&>span:last-child]:hidden min-[390px]:[&>span:last-child]:inline" />
				<nav className="ml-2 hidden sm:block">
					<Link
						href="/dashboard"
						className="inline-flex h-9 items-center rounded-lg bg-indigo-50 px-3 text-sm font-medium text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
					>
						Dashboard
					</Link>
				</nav>

				<div className="ml-auto" ref={menuRef}>
					<Button
						ref={triggerRef}
						type="button"
						variant="ghost"
						className="h-11 max-w-44 gap-2 px-1.5 sm:max-w-xs sm:px-2"
						onClick={() => setIsOpen((value) => !value)}
					>
						<span className="grid size-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
							{getInitials(name)}
						</span>
						<span className="min-w-0 text-left">
							<span className="block truncate text-sm font-medium">{name}</span>
							<span className="hidden truncate text-xs font-normal text-muted-foreground sm:block">
								{user?.email}
							</span>
						</span>
						<ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
					</Button>

					{isOpen && (
						<div
							id="student-account-menu"
							role="menu"
							className="absolute right-4 top-14 z-30 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl sm:right-6 lg:right-8"
						>
							<div className="border-b border-slate-100 px-3 py-2">
								<p className="truncate text-sm font-medium">{name}</p>
								<p className="truncate text-xs text-muted-foreground">{user?.email}</p>
							</div>
							<Button
								type="button"
								role="menuitem"
								variant="ghost"
								className="mt-1 w-full justify-start text-slate-700"
								disabled={logoutMutation.isPending}
								onClick={handleLogout}
							>
								<LogOut />
								{logoutMutation.isPending ? "Signing out…" : "Sign out"}
							</Button>
						</div>
					)}
				</div>
			</div>
		</header>
	)
}
