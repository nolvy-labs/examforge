import Link from "next/link"

import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/shadcn/navigation-menu"

const routes = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/exams", label: "Exams" },
	{ href: "/history", label: "History", disable: true },
	{ href: "/statistics", label: "Statistics", disable: true },
]


export default function HeaderNavigation() {
	return (
		<NavigationMenu>
			<NavigationMenuList className="gap-2">
				{routes.map((route) => (
					<NavigationMenuItem key={route.href}>
						<NavigationMenuLink render={<Link href={route.href}>{route.label}</Link>} />
					</NavigationMenuItem>
				))}
			</NavigationMenuList>
		</NavigationMenu>
	)
}
