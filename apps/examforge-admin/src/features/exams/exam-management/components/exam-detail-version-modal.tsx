"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CopyIcon, PlusIcon, SpinnerGapIcon } from "@phosphor-icons/react"
import { toast } from "sonner"

import { Alert, AlertDescription } from "@/components/shadcn/alert"
import { Badge } from "@/components/shadcn/badge"
import { Button } from "@/components/shadcn/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/shadcn/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/shadcn/table"

import { useAdminExamDetail, useAdminExamVersions, useCloneExamVersionMutation, useCreateEmptyExamVersionMutation } from "../../exam-builder/api/exam-builder.query"
import type { AdminExamSummary } from "../../types/exam.types"
import type { ExamVersionDetailDto, ExamVersionSummaryDto } from "../../types/exam-version.types"
import type { VersionApiResponse } from "../../exam-builder/api/exam-builder.api"

export type ExamModalTab = "details" | "versions"

interface Props {
	open: boolean
	exam: AdminExamSummary | null
	initialTab: ExamModalTab
	onOpenChange: (open: boolean) => void
}

const statusLabel = ["Draft", "Published", "Retired"] as const
const date = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })

export function ExamDetailVersionModal({ open, exam, initialTab, onOpenChange }: Props) {
	const [tab, setTab] = useState<ExamModalTab>(initialTab)
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex max-h-[calc(100svh-2rem)] min-h-[32rem] flex-col overflow-hidden sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>{exam?.title ?? "Exam"}</DialogTitle>
					<DialogDescription>Review parent exam details or create and open an exam version.</DialogDescription>
				</DialogHeader>
				<div role="tablist" aria-label="Exam information" className="flex gap-1 border-b">
					<Tab active={tab === "details"} id="exam-details-tab" panel="exam-details-panel" onClick={() => setTab("details")}>Details</Tab>
					<Tab active={tab === "versions"} id="exam-versions-tab" panel="exam-versions-panel" onClick={() => setTab("versions")}>Version Control</Tab>
				</div>
				<div className="min-h-0 flex-1 overflow-y-auto">
					{exam && tab === "details" ? <DetailsTab exam={exam} /> : null}
					{exam && tab === "versions" ? <VersionsTab exam={exam} onNavigate={() => onOpenChange(false)} /> : null}
				</div>
			</DialogContent>
		</Dialog>
	)
}

function Tab({ active, id, panel, onClick, children }: { active: boolean; id: string; panel: string; onClick: () => void; children: React.ReactNode }) {
	return <button type="button" role="tab" id={id} aria-controls={panel} aria-selected={active} tabIndex={active ? 0 : -1} onClick={onClick} className={`border-b-2 px-4 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}>{children}</button>
}

function DetailsTab({ exam }: { exam: AdminExamSummary }) {
	const query = useAdminExamDetail(exam.id)
	return <section id="exam-details-panel" role="tabpanel" aria-labelledby="exam-details-tab" className="p-1 py-5">
		{query.isPending ? <p role="status">Loading exam details…</p> : query.isError ? <Alert variant="destructive"><AlertDescription>Exam details could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : query.data ? (
			<dl className="grid gap-5 sm:grid-cols-2">
				<Detail label="Title" value={query.data.title} />
				<Detail label="Slug" value={`/${query.data.slug}`} />
				<Detail label="Type" value={query.data.type === 0 ? "Simple" : "IELTS"} />
				<Detail label="Status" value={query.data.isArchived ? "Archived" : "Active"} />
				<div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Description</dt><dd className="mt-1 whitespace-pre-wrap">{query.data.description || "None"}</dd></div>
				<div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Tags and classification</dt><dd className="mt-2 flex flex-wrap gap-1">{query.data.tags.length ? query.data.tags.map((tag) => <Badge key={tag.id} variant="secondary">{tag.name}{tag.isArchived ? " (archived)" : ""}</Badge>) : "None"}</dd></div>
				<Detail label="Created" value={date.format(new Date(query.data.createdAtUtc))} />
				<Detail label="Last updated" value={query.data.updatedAtUtc ? date.format(new Date(query.data.updatedAtUtc)) : "Never"} />
			</dl>
		) : null}
	</section>
}

function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div> }

function VersionsTab({ exam, onNavigate }: { exam: AdminExamSummary; onNavigate: () => void }) {
	const router = useRouter()
	const [page, setPage] = useState(1)
	const query = useAdminExamVersions(exam.id, { page, pageSize: 20, sort: "newest" })
	const create = useCreateEmptyExamVersionMutation(exam.id)
	const clone = useCloneExamVersionMutation(exam.id)
	const pending = create.isPending || clone.isPending
	async function openCreated(run: () => Promise<VersionApiResponse<ExamVersionDetailDto>>, message: string) {
		try {
			const created = await run()
			toast.success(message)
			onNavigate()
			router.push(`/exams/${exam.id}/version/${created.data.id}/edit`)
		} catch (error) { toast.error(error instanceof Error ? error.message : "The version could not be created.") }
	}
	return <section id="exam-versions-panel" role="tabpanel" aria-labelledby="exam-versions-tab" className="space-y-4 p-1 py-5">
		<div className="flex justify-end"><Button disabled={pending || exam.isArchived} onClick={() => void openCreated(() => create.mutateAsync(), "Empty Draft created.")}><PlusIcon />Create Empty Version</Button></div>
		{exam.isArchived ? <Alert><AlertDescription>Restore this Exam before creating versions. Existing versions remain viewable.</AlertDescription></Alert> : null}
		{query.isPending ? <p role="status">Loading versions…</p> : query.isError ? <Alert variant="destructive"><AlertDescription>Versions could not be loaded. <Button variant="link" onClick={() => void query.refetch()}>Retry</Button></AlertDescription></Alert> : !query.data?.items.length ? <p className="py-12 text-center text-muted-foreground">No versions yet.</p> : <>
			<div className="hidden overflow-x-auto border md:block"><VersionTable versions={query.data.items} pending={pending} examId={exam.id} onOpen={(id) => { onNavigate(); router.push(`/exams/${exam.id}/version/${id}/edit`) }} onClone={(id) => void openCreated(() => clone.mutateAsync(id), "Draft cloned.")} /></div>
			<div className="space-y-3 md:hidden">{query.data.items.map((version) => <VersionCard key={version.id} version={version} pending={pending} onOpen={() => { onNavigate(); router.push(`/exams/${exam.id}/version/${version.id}/edit`) }} onClone={() => void openCreated(() => clone.mutateAsync(version.id), "Draft cloned.")} />)}</div>
			{query.data.meta.totalPages > 1 ? <div className="flex items-center justify-end gap-2"><Button variant="outline" disabled={!query.data.meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>Previous</Button><span className="text-sm">Page {page} of {query.data.meta.totalPages}</span><Button variant="outline" disabled={!query.data.meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Next</Button></div> : null}
		</>}
	</section>
}

function VersionTable({ versions, pending, onOpen, onClone }: { versions: ExamVersionSummaryDto[]; pending: boolean; examId: string; onOpen: (id: string) => void; onClone: (id: string) => void }) {
	return <Table><TableHeader><TableRow><TableHead>Version</TableHead><TableHead>Title</TableHead><TableHead>Status</TableHead><TableHead>Total points</TableHead><TableHead>Updated</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{versions.map((v) => <TableRow key={v.id}><TableCell>v{v.versionNumber}</TableCell><TableCell>{v.title || "Untitled"}</TableCell><TableCell><Badge variant={v.status === 0 ? "secondary" : "outline"}>{statusLabel[v.status]}</Badge></TableCell><TableCell>{v.totalScore}</TableCell><TableCell>{date.format(new Date(v.updatedAtUtc ?? v.createdAtUtc))}</TableCell><TableCell><VersionActions version={v} pending={pending} onOpen={() => onOpen(v.id)} onClone={() => onClone(v.id)} /></TableCell></TableRow>)}</TableBody></Table>
}
function VersionCard({ version, pending, onOpen, onClone }: { version: ExamVersionSummaryDto; pending: boolean; onOpen: () => void; onClone: () => void }) { return <article className="space-y-3 border p-4"><div className="flex justify-between"><div><h3 className="font-medium">v{version.versionNumber}: {version.title || "Untitled"}</h3><p className="text-sm text-muted-foreground">{version.totalScore} points</p></div><Badge variant="outline">{statusLabel[version.status]}</Badge></div><VersionActions version={version} pending={pending} onOpen={onOpen} onClone={onClone} /></article> }
function VersionActions({ version, pending, onOpen, onClone }: { version: ExamVersionSummaryDto; pending: boolean; onOpen: () => void; onClone: () => void }) { return <div className="flex flex-wrap justify-end gap-2"><Button size="sm" variant="outline" onClick={onOpen}>{version.status === 0 ? "Edit Version" : "View Version"}</Button><Button size="sm" variant="ghost" disabled={pending} onClick={onClone}>{pending ? <SpinnerGapIcon className="animate-spin" /> : <CopyIcon />}Clone New Version</Button></div> }
