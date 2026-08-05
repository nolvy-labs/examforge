import Link from "next/link"
import { cn } from "@/lib/utils"
import Image from "next/image"

export function Brand({ className }: { className?: string }) {
	return (
		<Link
			href="/"
			className={cn(
				"inline-flex items-center gap-2 rounded-lg text-base font-semibold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
				className
			)}
		>
			<span className="grid p-2 place-items-center rounded-lg bg-primary text-white shadow-sm">
				<Image src="/icon.svg" alt="examforge-icon" width={28} height={28}/>
			</span>
			<span>ExamForge</span>
		</Link>
	)
}
