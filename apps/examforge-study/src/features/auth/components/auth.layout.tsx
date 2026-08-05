"use client"

import { GuestGuard } from "@/features/auth/components/guest.guard"

export function AuthLayout({ children }: { children: React.ReactNode }) {
	return (
		<GuestGuard>
			<main className="relative flex min-h-svh flex-1 overflow-hidden bg-muted/35">
				<div className="mx-auto flex w-full items-center justify-center">
					<section className="flex min-h-svh w-full max-w-md flex-col">
						<div className="flex flex-1 items-center justify-center px-5 py-8">
							<div className="w-full">{children}</div>
						</div>
					</section>
				</div>
			</main>
		</GuestGuard>
	)
}
