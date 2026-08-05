import { buttonVariants } from "@/components/shadcn/button";
import { AUTH_ROUTES } from "@/features/auth/auth.constants";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LocaleMessage } from "@/components/locale/locale-message";


export default function HeaderAuthNavigation() {
    return (
        <nav className="flex items-center gap-2 sm:gap-3">
            <Link
                href={AUTH_ROUTES.signin}
                className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "px-3 text-neutral-700"
                )}
            >
                <LocaleMessage messageId="navigation.signIn" />
            </Link>
            <Link
                href={AUTH_ROUTES.signup}
                className={cn(
                    buttonVariants(),
                    "bg-primary px-3 text-white hover:primary sm:px-4"
                )}
            >
                <LocaleMessage messageId="navigation.createAccount" />
            </Link>
        </nav>
    )
}