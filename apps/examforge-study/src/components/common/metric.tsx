import { Check } from "lucide-react"

interface Props {
    icon: typeof Check
    label: string
}

export default function Metric({ icon: Icon, label }: Props) {
	return (
		<div className="flex min-w-0 items-center gap-1.5">
			<Icon className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
			<span className="truncate">{label}</span>
		</div>
	)
}