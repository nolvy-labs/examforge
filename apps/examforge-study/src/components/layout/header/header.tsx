"use client"

import { Brand } from "@/components/layout/brand"
import { useAuthStore } from "@/features/auth/stores/auth.store"
import HeaderNavigation from "./header.navigation"
import HeaderAuthNavigation from "./header-auth.navigation"
import ProfileDropdown from "./profile.dropdown"

export function MainHeader() {
	const user = useAuthStore((state) => state.user)
	const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
	const isInitialized = useAuthStore((state) => state.isInitialized)	

	return (
		<header className="relative z-20 border-b border-slate-200 bg-white/95">
			<div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
				<Brand className="shrink-0 [&>span:last-child]:hidden min-[390px]:[&>span:last-child]:inline" />

				{isInitialized && isAuthenticated && (
					<HeaderNavigation />
				)}

				{isInitialized && !isAuthenticated && (
					<HeaderAuthNavigation />
				)}

				{isInitialized && isAuthenticated && user && (
					<ProfileDropdown user={user} />
				)}
			</div>
		</header>
	)
}
