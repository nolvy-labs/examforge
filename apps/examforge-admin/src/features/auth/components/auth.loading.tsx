export function AuthLoading({ label = "Loading the admin portal" }: { label?: string }) {
	return (
		<div className="grid min-h-svh place-items-center bg-muted/25 px-6">
			<div className="flex items-center gap-3 text-xs text-muted-foreground" role="status">
				<span className="size-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground motion-reduce:animate-none" />
				<span>{label}</span>
			</div>
		</div>
	)
}
