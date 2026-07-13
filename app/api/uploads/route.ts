import { TaskImageType } from "@prisma/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { saveUpload } from "@/lib/storage/local";

const allowed = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);

  const form = await request.formData();
  const file = form.get("file");
  const imageUrl = String(form.get("imageUrl") ?? "").trim();
  const taskId = String(form.get("taskId") ?? "");
  const width = Number(form.get("width") ?? 0);
  const height = Number(form.get("height") ?? 0);

  if (!taskId) return fail("BAD_REQUEST", "缺少任务 ID");

  if (imageUrl) {
    const image = await prisma.taskImage.create({
      data: {
        taskId,
        type: TaskImageType.ORIGINAL,
        fileName: imageUrl.split("/").pop() || "remote-image",
        filePath: imageUrl,
        mimeType: "image/remote",
        fileSize: 0,
        width: width > 0 ? width : null,
        height: height > 0 ? height : null,
      },
    });

    return ok({ ...image, previewUrl: image.filePath });
  }

  if (!(file instanceof File)) return fail("BAD_REQUEST", "请选择图片");
  if (!allowed.includes(file.type)) return fail("BAD_FILE_TYPE", "仅支持 jpg、png、webp");

  const saved = await saveUpload(file);
  const image = await prisma.taskImage.create({
    data: {
      taskId,
      type: TaskImageType.ORIGINAL,
      ...saved,
      width: saved.width ?? (width > 0 ? width : null),
      height: saved.height ?? (height > 0 ? height : null),
    },
  });

  return ok({ ...image, previewUrl: image.filePath });
}
