"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { buttonVariants } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

const routes = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/exams", label: "Exams" },
]

export function isNavigationRouteActive(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`)
}

export default function HeaderNavigation() {
	const pathname = usePathname()

	return (
		<nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Main navigation">
			{routes.map((route) => {
				const isActive = isNavigationRouteActive(pathname, route.href)
				return (
					<Link
						key={route.href}
						href={route.href}
						aria-current={isActive ? "page" : undefined}
						className={cn(
							buttonVariants({ variant: "ghost" }),
							isActive && "bg-muted"
						)}
					>
						{route.label}
					</Link>
				)
			})}
		</nav>
	)
}
