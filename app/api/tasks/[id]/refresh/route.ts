import { getGenerationStatus } from "@/lib/ai/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { saveGeneratedImageFromDataUrl, saveGeneratedImageFromRemoteUrl } from "@/lib/storage/local";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);

  const { id } = await params;
  const generation = await prisma.aiGeneration.findFirst({
    where: { taskId: id, externalJobId: { not: null } },
    orderBy: { createdAt: "desc" },
  });

  if (!generation?.externalJobId) return fail("NOT_FOUND", "暂无可刷新的生成任务", 404);

  const result = await getGenerationStatus(generation.externalJobId);
  const generatedImage = result.imageUrl ? await persistGeneratedImage(id, result.imageUrl) : null;

  await prisma.aiGeneration.update({
    where: { id: generation.id },
    data: {
      status: result.status,
      responsePayload: result.raw ?? undefined,
      errorMessage: result.errorMessage,
      completedAt: result.status === "SUCCEEDED" || result.status === "FAILED" ? new Date() : null,
    },
  });
  await prisma.task.update({ where: { id }, data: { status: result.status } });

  return ok({ status: result.status, generatedImage });
}

async function persistGeneratedImage(taskId: string, imageUrl: string) {
  const saved = imageUrl.startsWith("data:")
    ? await saveGeneratedImageFromDataUrl(imageUrl)
    : await saveGeneratedImageFromRemoteUrl(imageUrl);

  if (!saved) {
    return prisma.taskImage.create({
      data: {
        taskId,
        type: "GENERATED",
        fileName: imageUrl.split("/").pop() || "remote-generated-image",
        filePath: imageUrl,
        mimeType: "image/remote",
        fileSize: 0,
      },
    });
  }

  return prisma.taskImage.create({
    data: {
      taskId,
      type: "GENERATED",
      ...saved,
    },
  });
}
