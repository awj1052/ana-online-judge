"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteUser } from "@/actions/admin";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface DeleteUserButtonProps {
	userId: number;
	username: string;
}

export function DeleteUserButton({ userId, username }: DeleteUserButtonProps) {
	const [isPending, startTransition] = useTransition();

	const handleDelete = () => {
		startTransition(async () => {
			try {
				await deleteUser(userId);
				toast.success(`사용자 "${username}"가 삭제되었습니다.`);
			} catch (error) {
				console.error("User delete error:", error);
				const errorMessage = error instanceof Error ? error.message : "사용자 삭제에 실패했습니다.";
				toast.error(errorMessage);
			}
		});
	};

	return (
		<AlertDialog>
			<AlertDialogTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					disabled={isPending}
					className="text-destructive hover:text-destructive"
				>
					<Trash2 className="h-4 w-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>사용자 삭제 확인</AlertDialogTitle>
					<AlertDialogDescription>
						정말로 사용자 <span className="font-semibold text-foreground">{username}</span>을(를)
						삭제하시겠습니까?
						<br />
						<br />이 작업은 되돌릴 수 없으며, 해당 사용자의 모든 데이터(제출 기록, 스코어보드 기록
						등)가 함께 삭제됩니다.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>취소</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						className="bg-destructive hover:bg-destructive/90"
					>
						삭제
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
