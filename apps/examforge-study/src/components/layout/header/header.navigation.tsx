import Link from "next/link"

import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from "@/components/shadcn/navigation-menu"

const routes = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/exams", label: "Exams" },
]


export default function HeaderNavigation() {
	return (
		<NavigationMenu>
			<NavigationMenuList>
				{routes.map((route) => (
					<NavigationMenuItem key={route.href}>
						<NavigationMenuLink render={<Link href={route.href}>{route.label}</Link>} />
					</NavigationMenuItem>
				))}
			</NavigationMenuList>
		</NavigationMenu>
	)
}
