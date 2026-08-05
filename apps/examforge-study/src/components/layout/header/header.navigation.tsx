"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/shadcn/navigation-menu"
import { LocaleMessage } from "@/components/locale/locale-message"
import type { LocaleMessageId } from "@/i18n/locale.type"

const routes: Array<{ href: string; label: LocaleMessageId }> = [
	{ href: "/dashboard", label: "navigation.dashboard" },
	{ href: "/exams", label: "navigation.exams" },
	{ href: "/history", label: "navigation.history" },
	{ href: "/statistics", label: "navigation.statistics" },
]


export default function HeaderNavigation() {
	const pathname = usePathname()
	return (
		<NavigationMenu>
			<NavigationMenuList className="gap-2">
				{routes.map((route) => (
					<NavigationMenuItem key={route.href}>
						<NavigationMenuLink
							active={pathname === route.href || pathname.startsWith(`${route.href}/`)}
							render={<Link href={route.href}><LocaleMessage messageId={route.label} /></Link>}
						/>
					</NavigationMenuItem>
				))}
			</NavigationMenuList>
		</NavigationMenu>
	)
}
