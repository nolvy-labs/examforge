import Link from "next/link"
import { BookOpenCheck } from "lucide-react"

import { cn } from "@/lib/utils"

export function Brand({ className }: { className?: string }) {
	return (
		<Link
			href="/"
			className={cn(
				"inline-flex items-center gap-2 rounded-lg text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				className
			)}
		>
			<span className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm">
				<BookOpenCheck className="size-5" />
			</span>
			<span>ExamForge</span>
		</Link>
	)
}