import { MainHeader } from "@/components/layout/header/header"
import { PublicFooter } from "@/components/layout/public-footer"

export default function LegalLayout({ children }: { children: React.ReactNode }) {
	return <div className="flex min-h-svh flex-col"><MainHeader />{children}<PublicFooter /></div>
}
