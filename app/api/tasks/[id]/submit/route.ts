import { submitGenerate } from "@/lib/ai/client";
import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { saveGeneratedImageFromDataUrl, saveGeneratedImageFromRemoteUrl } from "@/lib/storage/local";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const revisionPrompt = typeof body?.revisionPrompt === "string" ? body.revisionPrompt.trim() : "";
  const task = await prisma.task.findFirst({
    where: { id },
    include: {
      template: true,
      images: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!task) return fail("NOT_FOUND", "任务不存在", 404);
  if (!task.template) return fail("MISSING_TEMPLATE", "请先选择模板");

  const original = task.images.find((image) => image.type === "ORIGINAL");
  if (!original) return fail("MISSING_IMAGE", "请先上传原图");

  const latestGenerated = task.images.find((image) => image.type === "GENERATED");
  const referenceImage = revisionPrompt ? latestGenerated : original;
  if (!referenceImage) return fail("MISSING_GENERATED_IMAGE", "请先生成图片后，再填写修改意见继续修改");

  const requestedSize = { width: task.requestedWidth, height: task.requestedHeight };
  const baseRequestPayload = {
    imageUrl: referenceImage.filePath,
    referenceType: revisionPrompt ? "GENERATED" : "ORIGINAL",
    prompt: task.template.prompt,
    revisionPrompt: revisionPrompt || undefined,
    negativePrompt: task.template.negativePrompt,
    requestedSize,
    size: { preset: task.sizePreset, width: task.customWidth, height: task.customHeight },
    sourceImage: { width: referenceImage.width, height: referenceImage.height },
  };

  const generation = await prisma.aiGeneration.create({
    data: {
      taskId: task.id,
      templateId: task.templateId,
      status: "SUBMITTED",
      startedAt: new Date(),
      requestPayload: baseRequestPayload,
    },
  });

  const result = await submitGenerate({
    imageUrl: referenceImage.filePath,
    prompt: task.template.prompt,
    revisionPrompt: revisionPrompt || undefined,
    negativePrompt: task.template.negativePrompt,
    requestedSize,
    size: { preset: task.sizePreset, width: task.customWidth, height: task.customHeight },
    sourceImage: { width: referenceImage.width, height: referenceImage.height },
    metadata: { taskId: task.id, generationId: generation.id },
  });

  const generatedImage = result.imageUrl ? await persistGeneratedImage(task.id, result.imageUrl) : null;

  await prisma.aiGeneration.update({
    where: { id: generation.id },
    data: {
      status: result.status,
      externalJobId: result.externalJobId,
      requestPayload: result.requestPayload ?? baseRequestPayload,
      responsePayload: result.raw ?? undefined,
      errorMessage: result.errorMessage,
      completedAt: result.status === "SUCCEEDED" || result.status === "FAILED" ? new Date() : null,
    },
  });
  await prisma.task.update({ where: { id: task.id }, data: { status: result.status } });

  return ok({ generationId: generation.id, status: result.status, generatedImage });
}

async function persistGeneratedImage(taskId: string, imageUrl: string) {
  const existing = await prisma.taskImage.findFirst({
    where: { taskId, type: "GENERATED", filePath: imageUrl },
  });
  if (existing) return existing;

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
