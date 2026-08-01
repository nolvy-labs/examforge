"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    ChartBarIcon,
    ExamIcon,
    GearIcon,
    HouseIcon,
    TagIcon,
    UsersIcon,
} from "@phosphor-icons/react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/shadcn/sidebar"

const navigation = [
    {
        label: "Overview",
        items: [
            {
                title: "Dashboard",
                href: "/",
                icon: HouseIcon,
            },
        ],
    },
    {
        label: "Management",
        items: [
            {
                title: "Users",
                href: "/users",
                icon: UsersIcon,
            },
            {
                title: "Exams",
                href: "/exams",
                icon: ExamIcon,
            },
            {
                title: "Classifications",
                href: "/classifications",
                icon: TagIcon,
            },
            {
                title: "Attempt results",
                href: "/attempt-results",
                icon: ChartBarIcon,
            },
        ],
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    const isActive = (href: string) => href === "/" ? pathname === href : pathname.startsWith(href)

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b border-sidebar-border p-2">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            tooltip="ExamForge"
                            render={<Link href="/" aria-label="ExamForge dashboard" />}
                            className="h-12"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center bg-primary">
                                <Image
                                    src="/icon.svg"
                                    alt=""
                                    width={24}
                                    height={24}
                                    priority
                                    className="size-6 object-contain"
                                />
                            </span>
                            <span className="flex min-w-0 flex-col leading-tight">
                                <span className="truncate text-sm font-semibold">
                                    ExamForge
                                </span>
                                <span className="truncate text-[11px] text-sidebar-foreground/60">
                                    Administration
                                </span>
                            </span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                {navigation.map((group) => (
                    <SidebarGroup key={group.label}>
                        <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => (
                                    <SidebarMenuItem key={item.href}>
                                        <SidebarMenuButton
                                            tooltip={item.title}
                                            isActive={isActive(item.href)}
                                            render={<Link href={item.href} />}
                                        >
                                            <item.icon weight="duotone" />
                                            <span>{item.title}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>
            <SidebarFooter className="border-t border-sidebar-border">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            tooltip="Settings"
                            isActive={isActive("/settings")}
                            render={<Link href="/settings" />}
                        >
                            <GearIcon weight="duotone" />
                            <span>Settings</span>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
