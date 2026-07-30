import { AppSidebar } from "@/components/layout/sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/shadcn/sidebar"

interface Props {
    children: React.ReactNode
}

export default function Layout({ children }: Props) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <div className="w-full flex flex-row px-2 gap-2">
                <SidebarTrigger className="mt-2 px-2" />
                {children}
            </div>
        </SidebarProvider>
    )
}