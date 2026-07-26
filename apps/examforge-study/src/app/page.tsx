"use client"

import { useAuthStore } from "@/features/auth/stores/auth.store";
import { useEffect } from "react";

export default function Home() {
	const auth = useAuthStore();
	
	useEffect(() => {
		console.log(auth.user);
	}, [])

	return (
		<div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
			<main className="flex flex-1 w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
				<p>
					Exam Forge
				</p>
			</main>
		</div>
	);
}