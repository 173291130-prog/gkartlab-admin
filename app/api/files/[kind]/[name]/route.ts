import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ kind: string; name: string }> }) {
  const { kind, name } = await params;
  if (!["uploads", "generated"].includes(kind)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await readFile(path.join(process.cwd(), "storage", kind, name));
  return new NextResponse(file);
}
