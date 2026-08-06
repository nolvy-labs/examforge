"use client";
import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaretDownIcon, CaretRightIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/shadcn/badge";
import { Button } from "@/components/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/shadcn/card";
import { Skeleton } from "@/components/shadcn/skeleton";
import { RichTextRenderer } from "@/features/exams/exam-builder/components/rich-text/rich-text-renderer";
import { ApiError } from "@/lib/api/api.error";
import { useAttempt } from "../api/admin.query";
import {
  formatDate,
  formatNumber,
  formatPercent,
  ModeBadge,
  StatusBadge,
} from "../components/presentation";
import type { AttemptQuestion } from "../types/admin.schema";
const rich = (html: string) => ({
  format: "examforge-rich-html-v1" as const,
  html,
});
export function AttemptDetailPage({ attemptId }: { attemptId: string }) {
  const q = useAttempt(attemptId);
  if (q.error instanceof ApiError && q.error.status === 404) notFound();
  if (q.isPending)
    return (
      <Main>
        <Skeleton className="h-[36rem] w-full" />
      </Main>
    );
  if (q.isError || !q.data)
    return (
      <Main>
        <div role="alert" className="border p-6">
          <p>{q.error.message}</p>
          <Button className="mt-3" onClick={() => void q.refetch()}>
            Retry
          </Button>
        </div>
      </Main>
    );
  const a = q.data,
    graded = a.status === 1 && a.score.score !== null,
    numbers = questionNumbers(
      a.sections.flatMap((section) => section.questions),
    );
  return (
    <Main>
      <div className="flex flex-wrap gap-4">
        <Link className="underline" href={`/users/${a.user.userId}`}>
          ← User attempts
        </Link>
        <Link className="underline" href={`/exams/${a.exam.examId}/attempts`}>
          Exam attempts
        </Link>
      </div>
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={a.status} />
          <ModeBadge mode={a.mode} />
        </div>
        <h1 className="text-2xl font-semibold">Attempt result</h1>
        <p className="text-muted-foreground">
          Read-only administrative review of the exact saved exam version.
        </p>
      </header>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>User</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              className="font-medium underline"
              href={`/users/${a.user.userId}`}
            >
              {a.user.displayName || "Unnamed user"}
            </Link>
            <p>{a.user.email}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Exam version</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              className="font-medium underline"
              href={`/exams/${a.exam.examId}/attempts`}
            >
              {a.exam.title}
            </Link>
            <p>/{a.exam.slug}</p>
            <p>
              Version {a.examVersion.versionNumber}: {a.examVersion.title}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Score</CardTitle>
          </CardHeader>
          <CardContent>
            {graded ? (
              <p className="text-lg font-semibold">
                {formatNumber(a.score.score)} /{" "}
                {formatNumber(a.score.maximumScore)} ·{" "}
                {formatPercent(a.score.percentage)}
              </p>
            ) : (
              <p className="text-muted-foreground">Not graded</p>
            )}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Administrative metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Meta label="Attempt ID" value={a.attemptId} />
          <Meta label="Revision" value={String(a.revision)} />
          <Meta label="Started" value={formatDate(a.startedAtUtc)} />
          <Meta label="Expires" value={formatDate(a.expiresAtUtc)} />
          <Meta label="Submitted" value={formatDate(a.submittedAtUtc)} />
          <Meta label="Abandoned" value={formatDate(a.abandonedAtUtc)} />
          <Meta label="Created" value={formatDate(a.createdAtUtc)} />
          <Meta label="Updated" value={formatDate(a.updatedAtUtc)} />
        </CardContent>
      </Card>
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Question review</h2>
          <p className="text-muted-foreground">
            Saved answers and solutions are shown; correctness appears only when
            persisted by the server.
          </p>
        </div>
        {[...a.sections]
          .sort((x, y) => x.displayOrder - y.displayOrder)
          .map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {section.instructions && (
                  <RichTextRenderer
                    value={rich(section.instructions)}
                    label={`${section.title} instructions`}
                  />
                )}{" "}
                {section.stimulusText && (
                  <RichTextRenderer
                    value={rich(section.stimulusText)}
                    label={`${section.title} stimulus`}
                  />
                )}{" "}
                {[...section.questions]
                  .sort((x, y) => x.displayOrder - y.displayOrder)
                  .map((question) => (
                    <Question
                      key={question.id}
                      question={question}
                      numbers={numbers}
                    />
                  ))}
              </CardContent>
            </Card>
          ))}
      </section>
    </Main>
  );
}
function questionNumbers(questions: AttemptQuestion[]) {
  let next = 0;
  const output = new Map<string, number>();
  const visit = (question: AttemptQuestion) => {
    if (question.type !== 3) output.set(question.id, ++next);
    [...question.childQuestions]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(visit);
  };
  questions.forEach(visit);
  return output;
}
function Question({
  question,
  numbers,
}: {
  question: AttemptQuestion;
  numbers: ReadonlyMap<string, number>;
}) {
  const [open, setOpen] = useState(true),
    isGroup = question.type === 3,
    n = numbers.get(question.id),
    panel = `question-${question.id}`;
  return (
    <article className="border">
      <button
        type="button"
        className="flex w-full items-center gap-2 p-3 text-left font-medium"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CaretDownIcon /> : <CaretRightIcon />}
        <span>
          {isGroup ? "Question group" : `Question ${n}`} ·{" "}
          {typeLabel(question.type)} · {question.points} points
        </span>
      </button>
      {open && (
        <div id={panel} className="space-y-4 border-t p-4">
          <RichTextRenderer
            value={rich(question.prompt)}
            label={isGroup ? "Group prompt" : `Question ${n} prompt`}
          />
          {!isGroup && <Answer question={question} />}{" "}
          {[...question.childQuestions]
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((child) => (
              <Question key={child.id} question={child} numbers={numbers} />
            ))}
        </div>
      )}
    </article>
  );
}
function Answer({ question }: { question: AttemptQuestion }) {
  const a = question.answer,
    s = question.solution,
    selected = new Set(a?.selectedOptionIds ?? []);
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium">Saved answer</h3>
        {question.type === 1 || question.type === 2 ? (
          <ul className="mt-2 space-y-2">
            {[...question.options]
              .sort((x, y) => x.displayOrder - y.displayOrder)
              .map((o) => {
                const solution = s?.options.find((x) => x.optionId === o.id),
                  correct = solution?.isCorrect === true,
                  chosen = selected.has(o.id);
                return (
                  <li key={o.id} className="border p-3">
                    <div className="flex flex-wrap gap-2">
                      {o.label && <span>{o.label}.</span>}
                      <RichTextRenderer
                        value={rich(o.text)}
                        label={`Option ${o.label ?? ""}`}
                      />
                      {chosen && <Badge>Selected</Badge>}
                      {correct && (
                        <Badge variant="secondary">Correct option</Badge>
                      )}
                    </div>
                    {solution?.explanation && (
                      <RichTextRenderer
                        value={rich(solution.explanation)}
                        label={`Explanation for option ${o.label ?? ""}`}
                      />
                    )}
                  </li>
                );
              })}
          </ul>
        ) : (
          <pre className="mt-2 whitespace-pre-wrap border bg-muted/30 p-3 font-sans">
            {a?.textAnswer?.trim() ? a.textAnswer : "Unanswered"}
          </pre>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {a?.gradingStatus == null ? (
          <Badge variant="outline">Not graded</Badge>
        ) : (
          <Badge variant="outline">{gradeLabel(a.gradingStatus)}</Badge>
        )}
        {a?.awardedScore != null && (
          <span>
            {a.awardedScore} / {a.maximumScore ?? question.points} points
          </span>
        )}
      </div>
      {s && (
        <div className="border bg-muted/20 p-3">
          <h3 className="font-medium">Solution</h3>
          {s.acceptedAnswers.length > 0 && (
            <ul className="mt-2 list-inside list-disc">
              {[...s.acceptedAnswers]
                .sort((x, y) => x.displayOrder - y.displayOrder)
                .map((x, i) => (
                  <li key={`${x.blankKey}-${i}`}>
                    <span className="whitespace-pre-wrap">
                      {x.acceptedAnswer}
                    </span>
                    {x.isCaseSensitive ? " (case-sensitive)" : ""}
                  </li>
                ))}
            </ul>
          )}
          {s.explanation && (
            <RichTextRenderer
              value={rich(s.explanation)}
              label="Solution explanation"
            />
          )}
        </div>
      )}
    </div>
  );
}
const Main = ({ children }: { children: React.ReactNode }) => (
  <main className="min-w-0 flex-1 px-3 py-5 sm:px-5 lg:px-8">
    <div className="mx-auto max-w-6xl space-y-5">{children}</div>
  </main>
);
const Meta = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-muted-foreground">{label}</div>
    <div className="break-all font-medium">{value}</div>
  </div>
);
const typeLabel = (v: 0 | 1 | 2 | 3) =>
  ["Fill blank", "Single choice", "Multiple choice", "Group"][v];
const gradeLabel = (v: 0 | 1 | 2 | 3) =>
  ["Unanswered", "Incorrect", "Partially correct", "Correct"][v];
