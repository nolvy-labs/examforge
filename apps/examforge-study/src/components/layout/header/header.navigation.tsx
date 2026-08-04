"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/shadcn/navigation-menu"

const routes = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/exams", label: "Exams" },
	{ href: "/history", label: "History" },
	{ href: "/statistics", label: "Statistics" },
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
							render={<Link href={route.href}>{route.label}</Link>}
						/>
					</NavigationMenuItem>
				))}
			</NavigationMenuList>
		</NavigationMenu>
	)
}
