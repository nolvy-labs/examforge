"use client"

import { usePathname } from 'next/navigation';
import Link from "next/link"

import { buttonVariants } from "@/components/shadcn/button"
import { cn } from "@/lib/utils"

const routes = [
    {
        href: "/dashboard",
        label: "Dashboard",
    },
    {
        href: "/exams",
        label: "Exams",
    },
]

export default function HeaderNavigation() {
    const pathname = usePathname()

    return (
        <nav className="ml-2 hidden items-center gap-1 sm:flex" aria-label="Main navigation">
            {routes.map((route) => {
                const isActive = route.href === pathname
                return (
                    <Link
                        key={route.href}
                        href={route.href}
                        prefetch={false}
                        className={cn(buttonVariants({ variant: "ghost" }), `${isActive ? "bg-muted" : ""}`)}
                    >
                        {route.label}
                    </Link>
                )
            })}
        </nav>
    )
}