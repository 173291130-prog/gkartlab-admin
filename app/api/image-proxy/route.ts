import crypto from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const IMAGE_CONTENT_TYPES = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  const src = new URL(request.url).searchParams.get("src");
  if (!src) return new NextResponse("Missing image url", { status: 400 });

  let remoteUrl: URL;
  try {
    remoteUrl = new URL(src);
  } catch {
    return new NextResponse("Invalid image url", { status: 400 });
  }

  if (!["http:", "https:"].includes(remoteUrl.protocol)) {
    return new NextResponse("Unsupported image url", { status: 400 });
  }

  const cacheDir = path.join(process.cwd(), "storage", "generated-proxy");
  const cacheKey = crypto.createHash("sha256").update(remoteUrl.toString()).digest("hex");
  const cachePath = path.join(cacheDir, `${cacheKey}.img`);

  try {
    const cached = await readFile(cachePath);
    return imageResponse(cached);
  } catch {
    // Continue on cache miss.
  }

  const response = await fetch(remoteUrl, { cache: "no-store" });
  if (!response.ok) {
    return new NextResponse("Remote image unavailable", { status: 502 });
  }

  const contentType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (!contentType || !IMAGE_CONTENT_TYPES.has(contentType)) {
    return new NextResponse("Remote content is not an image", { status: 415 });
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  await mkdir(cacheDir, { recursive: true });
  await writeFile(cachePath, bytes);

  return imageResponse(bytes, contentType);
}

function imageResponse(bytes: Buffer, contentType = "image/png") {
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.length),
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
