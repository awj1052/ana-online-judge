"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { togglePlaygroundAccess } from "@/actions/admin";
import { Switch } from "@/components/ui/switch";

interface PlaygroundToggleProps {
	userId: number;
	initialAccess: boolean;
}

export function PlaygroundToggle({ userId, initialAccess }: PlaygroundToggleProps) {
	const [hasAccess, setHasAccess] = useState(initialAccess);
	const [isPending, startTransition] = useTransition();

	const handleToggle = (checked: boolean) => {
		startTransition(async () => {
			try {
				await togglePlaygroundAccess(userId, checked);
				setHasAccess(checked);
				toast.success(
					checked ? "Playground 권한이 부여되었습니다." : "Playground 권한이 제거되었습니다."
				);
			} catch (error) {
				console.error("Playground toggle error:", error);
				toast.error("권한 변경에 실패했습니다.");
			}
		});
	};

	return <Switch checked={hasAccess} onCheckedChange={handleToggle} disabled={isPending} />;
}
