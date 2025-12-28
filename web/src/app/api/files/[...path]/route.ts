import { type NextRequest, NextResponse } from "next/server";
import { downloadFile } from "@/lib/storage";

// Common file types
const CONTENT_TYPES: Record<string, string> = {
	".pdf": "application/pdf",
	".zip": "application/zip",
	".json": "application/json",
	".txt": "text/plain",
	".csv": "text/csv",
	".html": "text/html",
	".css": "text/css",
	".js": "text/javascript",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".gif": "image/gif",
	".webp": "image/webp",
	".svg": "image/svg+xml",
};

export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ path: string[] }> }
) {
	try {
		const { path } = await params;
		const key = path.join("/");

		// Get file extension for content type
		const ext = key.substring(key.lastIndexOf(".")).toLowerCase();
		const contentType = CONTENT_TYPES[ext] || "application/octet-stream";

		// Download file from MinIO
		const buffer = await downloadFile(key);

		return new NextResponse(new Uint8Array(buffer), {
			headers: {
				"Content-Type": contentType,
				"Cache-Control": "public, max-age=31536000, immutable",
			},
		});
	} catch (error) {
		console.error("Failed to fetch file:", error);
		return new NextResponse("File not found", { status: 404 });
	}
}
