import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/shadcn/card";
import { StudentExam } from "../model/exam.schema";
import { Badge } from "@/components/shadcn/badge";
import Metric from "@/components/common/metric";
import { ArrowRight, BookOpen, Clock3, FileQuestion, Trophy } from "lucide-react";
import { Separator } from "@/components/shadcn/separator";
import { Button } from "@/components/shadcn/button";

interface ExamCardProps {
    exam: StudentExam
}

export default function ExamCard({ exam }: ExamCardProps) {
    return (
        <Card>
            <CardHeader className="w-full">
                <CardTitle className="font-bold min-h-fit line-clamp-1" title={exam.title}>
                    {exam.title}
                </CardTitle>
                <CardDescription className="min-h-16 line-clamp-3" title={exam.description}>
                    {exam.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 w-full h-full">
                <div className="flex flex-wrap gap-2">
                    {exam.tags.map((tag) => (
                        <Badge key={tag.id + tag.slug}>{tag.name}</Badge>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-slate-600">
                    <Metric icon={Clock3} label={exam.publishedVersion.durationMinutes == null ? "No time limit" : `${exam.publishedVersion.durationMinutes} min`} />
                    <Metric icon={FileQuestion} label={`${exam.publishedVersion.questionCount} questions`} />
                    <Metric icon={Trophy} label={`${exam.publishedVersion.totalScore} points`} />
                    <Metric icon={BookOpen} label={`${exam.publishedVersion.sectionCount} sections`} />
                </div>
                <Separator className={"mt-auto"} />
                <Button variant={"outline"} className="w-full">
                    View Exam
                    <ArrowRight />
                </Button>
            </CardContent>
        </Card>
    )
}