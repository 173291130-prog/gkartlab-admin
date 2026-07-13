import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const ROOT = process.cwd();

export async function saveUpload(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const dir = path.join(ROOT, "storage", "uploads");
  await mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, fileName);
  await writeFile(absolutePath, bytes);

  const imageSize = readImageSize(bytes);

  return {
    fileName,
    filePath: `/api/files/uploads/${fileName}`,
    fileSize: bytes.length,
    mimeType: file.type,
    width: imageSize?.width,
    height: imageSize?.height,
  };
}

export function getLocalFilePath(publicPath: string) {
  const prefix = "/api/files/";
  if (!publicPath.startsWith(prefix)) return null;

  const [kind, fileName] = publicPath.slice(prefix.length).split("/");
  if (!["uploads", "generated"].includes(kind) || !fileName) return null;

  return path.join(ROOT, "storage", kind, fileName);
}

export async function readLocalFile(publicPath: string) {
  const localPath = getLocalFilePath(publicPath);
  if (!localPath) return null;
  return readFile(localPath);
}

export async function saveGeneratedImage(input: { data: Buffer; mimeType?: string }) {
  const ext = mimeTypeToExt(input.mimeType);
  const fileName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const dir = path.join(ROOT, "storage", "generated");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), input.data);

  const imageSize = readImageSize(input.data);

  return {
    fileName,
    filePath: `/api/files/generated/${fileName}`,
    fileSize: input.data.length,
    mimeType: input.mimeType ?? "image/png",
    width: imageSize?.width,
    height: imageSize?.height,
  };
}

export async function saveGeneratedImageFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return saveGeneratedImage({
    data: Buffer.from(match[2], "base64"),
    mimeType: match[1],
  });
}

export async function saveGeneratedImageFromRemoteUrl(url: string) {
  const response = await fetch(url).catch(() => null);
  if (!response?.ok) return null;

  return saveGeneratedImage({
    data: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") ?? "image/png",
  });
}

function mimeTypeToExt(mimeType?: string) {
  if (mimeType === "image/jpeg") return ".jpg";
  if (mimeType === "image/webp") return ".webp";
  if (mimeType === "image/png") return ".png";
  return ".png";
}

function readImageSize(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length < 24) return null;

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return readJpegSize(buffer);
  }

  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return readWebpSize(buffer);
  }

  return null;
}

function readJpegSize(buffer: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) return null;
    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
    if (isStartOfFrame) {
      return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  return null;
}

function readWebpSize(buffer: Buffer): { width: number; height: number } | null {
  const chunk = buffer.toString("ascii", 12, 16);

  if (chunk === "VP8X" && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height };
  }

  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  if (chunk === "VP8 " && buffer.length >= 30) {
    return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
  }

  return null;
}
