"use client"

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "@/components/shadcn/sonner"
import { AdminAuthorizationBoundary } from "@/features/auth/components/admin-authorization-boundary"
import { AuthBootstrap } from "@/features/auth/components/auth.bootstrap"

export function Providers({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						refetchOnWindowFocus: false,
						retry: false,
					},
					mutations: {
						retry: false,
					},
				},
			})
	)

	return (
		<QueryClientProvider client={queryClient}>
			<AuthBootstrap />
			<AdminAuthorizationBoundary>{children}</AdminAuthorizationBoundary>
			<Toaster position="top-center" />
		</QueryClientProvider>
	)
}
