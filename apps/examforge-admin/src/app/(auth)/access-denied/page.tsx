import type { Metadata } from "next"

import { AccessDeniedPage } from "@/features/auth/pages/access-denied.page"

export const metadata: Metadata = { title: "Admin access required" }

export default function Page() {
	return <AccessDeniedPage />
}
