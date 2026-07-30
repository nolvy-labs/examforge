import type { Metadata } from "next"

export const metadata: Metadata = { title: "Exam Attempt" }

export default async function Page({
    params,
}: {
    params: Promise<{ attemptId: string }>
}) {
    const { attemptId } = await params
    return (
        <main>
            <h1>Attempt: {attemptId}</h1>
        </main>
    )
}
