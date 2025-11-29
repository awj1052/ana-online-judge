"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { createProblem, updateProblem } from "@/actions/admin";

interface ProblemFormProps {
  problem?: {
    id: number;
    title: string;
    content: string;
    timeLimit: number;
    memoryLimit: number;
    difficulty: number | null;
    isPublic: boolean;
  };
}

export function ProblemForm({ problem }: ProblemFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!problem;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const data = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      timeLimit: parseInt(formData.get("timeLimit") as string, 10),
      memoryLimit: parseInt(formData.get("memoryLimit") as string, 10),
      difficulty: parseInt(formData.get("difficulty") as string, 10) || 0,
      isPublic: formData.get("isPublic") === "on",
    };

    try {
      if (isEditing) {
        await updateProblem(problem.id, data);
        router.push("/admin/problems");
      } else {
        const newProblem = await createProblem(data);
        router.push(`/admin/problems/${newProblem.id}/testcases`);
      }
    } catch {
      setError("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "문제 수정" : "문제 정보"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              name="title"
              defaultValue={problem?.title || ""}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeLimit">시간 제한 (ms)</Label>
              <Input
                id="timeLimit"
                name="timeLimit"
                type="number"
                defaultValue={problem?.timeLimit || 1000}
                min={100}
                max={10000}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memoryLimit">메모리 제한 (MB)</Label>
              <Input
                id="memoryLimit"
                name="memoryLimit"
                type="number"
                defaultValue={problem?.memoryLimit || 256}
                min={16}
                max={1024}
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="difficulty">난이도 (1-10)</Label>
              <Input
                id="difficulty"
                name="difficulty"
                type="number"
                defaultValue={problem?.difficulty || 5}
                min={1}
                max={10}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">문제 내용 (Markdown)</Label>
            <Textarea
              id="content"
              name="content"
              defaultValue={problem?.content || "## 문제\n\n## 입력\n\n## 출력\n\n## 예제 입력 1\n\n```\n\n```\n\n## 예제 출력 1\n\n```\n\n```"}
              rows={20}
              className="font-mono text-sm"
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isPublic"
              name="isPublic"
              defaultChecked={problem?.isPublic || false}
              disabled={isSubmitting}
            />
            <Label htmlFor="isPublic">공개</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "수정" : "다음 (테스트케이스 추가)"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

