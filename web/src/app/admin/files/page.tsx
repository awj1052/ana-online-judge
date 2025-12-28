import type { Metadata } from "next";
import { FileManager } from "./file-manager";

export const metadata: Metadata = {
	title: "파일 관리",
};

export default function AdminFilesPage() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">파일 관리</h1>
				<p className="text-muted-foreground mt-2">업로드된 이미지와 파일을 관리합니다.</p>
			</div>

			<FileManager />
		</div>
	);
}
