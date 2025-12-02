"use client";

import { Loader2, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/languages";
import type { Language } from "@/db/schema";
import { CodeEditor } from "./code-editor";

interface CodeSubmitProps {
	onSubmit: (code: string, language: Language) => Promise<void>;
	isSubmitting?: boolean;
}

export function CodeSubmit({ onSubmit, isSubmitting = false }: CodeSubmitProps) {
	const [language, setLanguage] = useState<Language>("cpp");
	const [code, setCode] = useState(LANGUAGES[0].defaultCode);

	const handleLanguageChange = (value: string) => {
		const newLanguage = value as Language;
		setLanguage(newLanguage);
		const langConfig = LANGUAGES.find((l) => l.value === newLanguage);
		if (langConfig) {
			setCode(langConfig.defaultCode);
		}
	};

	const handleSubmit = async () => {
		await onSubmit(code, language);
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<Select value={language} onValueChange={handleLanguageChange}>
					<SelectTrigger className="w-[150px]">
						<SelectValue placeholder="언어 선택" />
					</SelectTrigger>
					<SelectContent>
						{LANGUAGES.map((lang) => (
							<SelectItem key={lang.value} value={lang.value}>
								{lang.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				<Button onClick={handleSubmit} disabled={isSubmitting || !code.trim()}>
					{isSubmitting ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							제출 중...
						</>
					) : (
						<>
							<Play className="mr-2 h-4 w-4" />
							제출
						</>
					)}
				</Button>
			</div>
			<CodeEditor code={code} language={language} onChange={setCode} />
		</div>
	);
}
