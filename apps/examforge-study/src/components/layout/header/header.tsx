"use client"

import { Brand } from "@/components/layout/brand"
import { useAuthSession } from "@/features/auth/stores/auth.store"
import HeaderNavigation from "./header.navigation"
import HeaderAuthNavigation from "./header-auth.navigation"
import ProfileDropdown from "./profile.dropdown"
import { Fragment } from "react"

export function MainHeader() {
	const session = useAuthSession();
	return (
		<header className="relative z-20 border-b border-neutral-200 bg-white/95">
			<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
				<Brand className="shrink-0 [&>span:last-child]:hidden min-[390px]:[&>span:last-child]:inline" />

				{session.status === "authenticated" && (
					<Fragment>
						<HeaderNavigation />
						<ProfileDropdown user={session.user} />
					</Fragment>
				)}

				{session.status === "guest" && <HeaderAuthNavigation />}
			</div>
		</header>
	)
}
