import { AppSidebar } from "@/components/layout/sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/shadcn/sidebar"
import { AdminGuard } from "@/features/auth/components/admin.guard"

interface Props {
    children: React.ReactNode
}

export default function Layout({ children }: Props) {
    return (
		<AdminGuard>
			<SidebarProvider>
				<AppSidebar />
				<div className="w-full flex flex-row px-2 gap-2">
					<SidebarTrigger className="mt-2 px-2" />
					{children}
				</div>
			</SidebarProvider>
		</AdminGuard>
    )
}
