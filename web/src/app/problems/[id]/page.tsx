import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProblemById } from "@/actions/problems";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Clock, HardDrive } from "lucide-react";
import { ProblemSubmitSection } from "./submit-section";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const problem = await getProblemById(parseInt(id, 10));
  
  if (!problem) {
    return { title: "문제를 찾을 수 없음" };
  }
  
  return {
    title: problem.title,
    description: `문제 ${problem.id}: ${problem.title}`,
  };
}

function getDifficultyBadge(difficulty: number | null) {
  if (difficulty === null) return <Badge variant="outline">미분류</Badge>;
  
  if (difficulty <= 3) {
    return <Badge className="bg-emerald-500 hover:bg-emerald-600">쉬움</Badge>;
  } else if (difficulty <= 6) {
    return <Badge className="bg-amber-500 hover:bg-amber-600">보통</Badge>;
  } else {
    return <Badge className="bg-rose-500 hover:bg-rose-600">어려움</Badge>;
  }
}

export default async function ProblemDetailPage({ params }: Props) {
  const { id } = await params;
  const problem = await getProblemById(parseInt(id, 10));

  if (!problem) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Problem Content */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <span className="font-mono">#{problem.id}</span>
                    {getDifficultyBadge(problem.difficulty)}
                  </div>
                  <CardTitle className="text-2xl">{problem.title}</CardTitle>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mt-4">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>{problem.timeLimit}ms</span>
                </div>
                <div className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4" />
                  <span>{problem.memoryLimit}MB</span>
                </div>
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-6">
              <div className="prose prose-neutral dark:prose-invert max-w-none">
                <div dangerouslySetInnerHTML={{ __html: formatMarkdown(problem.content) }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Code Editor */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>코드 제출</CardTitle>
            </CardHeader>
            <CardContent>
              <ProblemSubmitSection problemId={problem.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Simple markdown to HTML conversion (for basic formatting)
function formatMarkdown(content: string): string {
  return content
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre class="bg-muted p-4 rounded-md overflow-x-auto my-4"><code>$2</code></pre>')
    .replace(/`([^`]+)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n\n/gim, '</p><p class="my-4">')
    .replace(/\n/gim, '<br />');
}
