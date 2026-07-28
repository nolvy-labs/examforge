import { buttonVariants } from "@/components/shadcn/button";
import { AUTH_ROUTES } from "@/features/auth/auth.constants";
import { cn } from "@/lib/utils";
import Link from "next/link";


export default function HeaderAuthNavigation() {
    return (
        <nav className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
                href={AUTH_ROUTES.signin}
                className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "px-3 text-slate-700"
                )}
            >
                Sign in
            </Link>
            <Link
                href={AUTH_ROUTES.signup}
                className={cn(
                    buttonVariants(),
                    "bg-indigo-600 px-3 text-white hover:bg-indigo-700 sm:px-4"
                )}
            >
                Create account
            </Link>
        </nav>
    )
}