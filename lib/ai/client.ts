import { readLocalFile } from "@/lib/storage/local";
import { AiGenerateInput, AiStatusResult, AiSubmitResult } from "./types";

const AI_TIMEOUT_MS = Number(process.env.AI_TIMEOUT_MS ?? 60000);

export async function submitGenerate(input: AiGenerateInput): Promise<AiSubmitResult> {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!baseUrl || !apiKey) {
    return {
      status: "PROCESSING",
      externalJobId: `mock-${input.metadata.generationId}`,
      raw: { mock: true, reason: "AI env vars are not configured" },
    };
  }

  const provider = process.env.AI_PROVIDER ?? "ovoai";
  if (provider === "volcengine_ark") return submitVolcengineArk(input, baseUrl, apiKey);
  return submitOvoai(input, baseUrl, apiKey);
}

export async function getGenerationStatus(externalJobId: string): Promise<AiStatusResult> {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!baseUrl || !apiKey || externalJobId.startsWith("mock-")) {
    return { status: "PROCESSING", raw: { mock: true } };
  }

  if ((process.env.AI_PROVIDER ?? "ovoai") === "volcengine_ark") {
    return { status: "PROCESSING", raw: { reason: "volcengine_ark image generation returns synchronously" } };
  }

  const statusEndpoint = process.env.AI_STATUS_ENDPOINT ?? "/v1/media/status?task_id=:id";

  try {
    const response = await fetchWithTimeout(joinUrl(baseUrl, statusEndpoint.replace(":id", externalJobId)), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    const data = await readJsonOrText(response);
    if (!response.ok) {
      return { status: "FAILED", errorMessage: typeof data === "string" ? data : data.message ?? "AI 状态查询失败", raw: data };
    }

    const imageUrl = extractImageUrl(data);

    return {
      status: imageUrl ? "SUCCEEDED" : normalizePollingStatus(data.state ?? data.status),
      imageUrl,
      errorMessage: data.errorMessage ?? data.error?.message ?? data.error,
      raw: data,
    };
  } catch (error) {
    return {
      status: "PROCESSING",
      errorMessage: error instanceof Error ? error.message : "AI 状态查询超时或网络异常",
      raw: { transientError: true, error: String(error) },
    };
  }
}

async function submitVolcengineArk(input: AiGenerateInput, baseUrl: string, apiKey: string): Promise<AiSubmitResult> {
  const endpoint = process.env.AI_IMAGE_ENDPOINT ?? "/api/v3/images/generations";
  const model = process.env.AI_IMAGE_MODEL ?? "doubao-seedream-5-0-lite-260128";
  const prompt = buildPrompt(input);
  const image = await buildVolcengineImageInput(input.imageUrl);
  if (!image) {
    return {
      status: "FAILED",
      errorMessage: "没有读取到参考图，已停止提交，避免生成无关图片。请重新上传图片后再生成。",
      raw: { reason: "REFERENCE_IMAGE_NOT_READABLE", imageUrl: input.imageUrl },
    };
  }

  const requestPayload: Record<string, unknown> = {
    model,
    prompt,
    size: process.env.AI_IMAGE_SIZE ?? "2K",
    response_format: process.env.AI_RESPONSE_FORMAT ?? "url",
    output_format: process.env.AI_OUTPUT_FORMAT ?? "png",
    watermark: (process.env.AI_WATERMARK ?? "false") === "true",
  };

  requestPayload.image = [image];

  const guidanceScale = process.env.AI_GUIDANCE_SCALE ?? "3.5";
  if (guidanceScale) requestPayload.guidance_scale = Number(guidanceScale);

  const stream = process.env.AI_STREAM;
  if (stream) requestPayload.stream = stream === "true";

  const sequentialImageGeneration = process.env.AI_SEQUENTIAL_IMAGE_GENERATION;
  if (sequentialImageGeneration) requestPayload.sequential_image_generation = sequentialImageGeneration;

  try {
    const response = await fetchWithTimeout(joinUrl(baseUrl, endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await readJsonOrText(response);
    if (!response.ok) {
      return {
        status: "FAILED",
        errorMessage: extractErrorMessage(data) ?? "火山方舟图片生成请求失败",
        raw: data,
        requestPayload,
      };
    }

    const imageUrl = extractImageUrl(data);
    return {
      status: imageUrl ? "SUCCEEDED" : normalizeStatus(data.status ?? data.state ?? "PROCESSING"),
      externalJobId: extractJobId(data),
      imageUrl,
      raw: data,
      requestPayload,
    };
  } catch (error) {
    return {
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "火山方舟请求超时或网络异常",
      raw: { error: String(error) },
      requestPayload,
    };
  }
}

async function submitOvoai(input: AiGenerateInput, baseUrl: string, apiKey: string): Promise<AiSubmitResult> {
  const endpoint = process.env.AI_IMAGE_ENDPOINT ?? "/v1/media/generate";
  const model = process.env.AI_IMAGE_MODEL ?? "gpt-image-2";
  const prompt = buildPrompt(input);
  const params: Record<string, unknown> = {
    n: 1,
    quality: process.env.AI_IMAGE_QUALITY ?? "auto",
    resolution: process.env.AI_IMAGE_RESOLUTION ?? "1K",
    response_format: "url",
    size: process.env.AI_IMAGE_SIZE ?? "auto",
  };

  const aspectRatio = getAspectRatio(input);
  if (aspectRatio) params.aspect_ratio = aspectRatio;

  const image = await readLocalFile(input.imageUrl);
  if (image) {
    const imageInput = formatLocalImageInput(image, input.imageUrl);
    if (!imageInput) {
      return {
        status: "FAILED",
        errorMessage: "本地图片还没有公网访问地址。请先配置 AI_PUBLIC_BASE_URL，或改用支持 base64 输入的 AI_PROVIDER。",
        raw: { reason: "PUBLIC_IMAGE_URL_REQUIRED" },
      };
    }

    const publicImage = await validatePublicImageUrl(imageInput);
    if (!publicImage.ok) {
      return {
        status: "FAILED",
        errorMessage: `AI 平台无法读取参考图公网地址：${publicImage.reason}`,
        raw: { reason: "PUBLIC_IMAGE_URL_UNREACHABLE", imageUrl: imageInput, detail: publicImage.reason },
      };
    }

    setImageParam(params, imageInput);
  } else {
    setImageParam(params, input.imageUrl);
  }

  const requestPayload = { model, prompt, params };

  try {
    const response = await fetchWithTimeout(joinUrl(baseUrl, endpoint), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const data = await readJsonOrText(response);

    if (!response.ok) {
      return {
        status: "FAILED",
        errorMessage: typeof data === "string" ? data : data.message ?? "AI 平台请求失败",
        raw: data,
        requestPayload,
      };
    }

    if (typeof data?.code === "number" && data.code !== 0 && data.code !== 200) {
      return {
        status: "FAILED",
        errorMessage: data.msg ?? data.message ?? "AI 平台返回失败",
        raw: data,
        requestPayload,
      };
    }

    const imageUrl = extractImageUrl(data);
    const externalJobId = extractJobId(data);

    return {
      status: imageUrl ? "SUCCEEDED" : normalizeStatus(data.status ?? data.state ?? (externalJobId ? "PROCESSING" : "SUBMITTED")),
      externalJobId,
      imageUrl,
      raw: data,
      requestPayload,
    };
  } catch (error) {
    return {
      status: "FAILED",
      errorMessage: error instanceof Error ? error.message : "AI 请求超时或网络异常",
      raw: { error: String(error) },
      requestPayload,
    };
  }
}

function buildPrompt(input: AiGenerateInput) {
  const aspectRatio = getAspectRatio(input);
  const sizeText = buildSizeText(input);
  const ratioText = aspectRatio ? `输出画幅比例必须保持 ${aspectRatio}，不要裁切，不要改变横竖构图。` : "";
  const requestedSizeText =
    input.requestedSize?.width && input.requestedSize?.height
      ? `调整为适应${input.requestedSize.width}*${input.requestedSize.height}的尺寸。`
      : "";
  const revisionText = input.revisionPrompt ? `顾客修改意见：${input.revisionPrompt}` : "";
  const referenceText = [
    "这是图像改绘任务，不是文生图，不要重新创作一张新图片。",
    "必须以参考图片作为唯一内容来源和构图来源，只允许改变绘画材质、笔触、肌理和艺术风格。",
    "严格保留参考图里的主体类别、主体数量、主体外形、姿态、位置、构图边界、背景关系、主要颜色和整体内容。",
    "如果参考图是商品，生成图必须仍然是同一件商品；如果是人物，必须保留同一个人物和动作；如果是宠物、风景或插画，也必须保留原图内容。",
    "禁止把参考图替换成无关风景、无关人物、无关商品或自由想象画面。",
  ].join("");

  return [referenceText, input.prompt, requestedSizeText, revisionText, ratioText, input.negativePrompt ? `避免: ${input.negativePrompt}` : "", sizeText]
    .filter(Boolean)
    .join("\n");
}

function buildSizeText(input: AiGenerateInput) {
  if (input.requestedSize?.width && input.requestedSize?.height) {
    return `顾客要的尺寸: ${input.requestedSize.width}x${input.requestedSize.height}`;
  }
  if (input.size.preset === "auto") return "尺寸: 按上传原图尺寸比例输出。";
  if (input.size.preset) return `尺寸: ${input.size.preset}`;
  if (input.size.width && input.size.height) return `尺寸: ${input.size.width}x${input.size.height}`;
  return "";
}

function getAspectRatio(input: AiGenerateInput) {
  let width: number | null | undefined;
  let height: number | null | undefined;

  if (input.requestedSize?.width && input.requestedSize?.height) {
    width = input.requestedSize.width;
    height = input.requestedSize.height;
  } else if (input.size.preset === "auto") {
    width = input.sourceImage?.width;
    height = input.sourceImage?.height;
  } else if (input.size.preset) {
    const presetSize = parsePresetSize(input.size.preset);
    width = presetSize?.width;
    height = presetSize?.height;
  } else {
    width = input.size.width;
    height = input.size.height;
  }

  if (!width || !height || width <= 0 || height <= 0) return null;

  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function parsePresetSize(preset?: string | null): { width: number; height: number } | null {
  if (!preset || preset === "auto") return null;
  const match = preset.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
  if (!match) return null;
  return { width: Number(match[1]), height: Number(match[2]) };
}

function gcd(a: number, b: number): number {
  return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

async function buildVolcengineImageInput(publicPath: string) {
  const image = await readLocalFile(publicPath);
  if (image) return `data:${detectImageMimeType(image)};base64,${image.toString("base64")}`;
  if (publicPath.startsWith("/api/files/")) return null;
  return publicPath;
}

function detectImageMimeType(buffer: Buffer) {
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "image/jpeg";
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return "image/png";
}

function formatLocalImageInput(image: Buffer, localPublicPath: string) {
  const format = process.env.AI_IMAGE_INPUT_FORMAT ?? "url";
  if (format === "base64") return image.toString("base64");
  if (format === "data_url") return `data:image/png;base64,${image.toString("base64")}`;

  const publicBaseUrl = process.env.AI_PUBLIC_BASE_URL;
  if (!publicBaseUrl) return null;
  return `${publicBaseUrl.replace(/\/+$/, "")}${localPublicPath}`;
}

async function validatePublicImageUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return { ok: true };

  try {
    const response = await fetchWithTimeout(url, { method: "GET" });
    if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("image/")) return { ok: false, reason: `返回内容不是图片：${contentType || "未知类型"}` };
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

function setImageParam(params: Record<string, unknown>, value: string) {
  const imageField = process.env.AI_IMAGE_INPUT_FIELD ?? "images";
  const asArray = (process.env.AI_IMAGE_INPUT_ARRAY ?? "true") === "true";
  params[imageField] = asArray ? [value] : value;
}

async function readJsonOrText(response: Response): Promise<any> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractImageUrl(data: any): string | undefined {
  const direct = data.imageUrl ?? data.image_url ?? data.url ?? data.output_url ?? data.result_url;
  if (typeof direct === "string" && direct) return direct;

  const result = data.result ?? data.data ?? data.output;
  if (typeof result === "string" && result) return result;

  const first = Array.isArray(result) ? result[0] : undefined;
  if (typeof first === "string" && first) return first;
  if (typeof first?.url === "string") return first.url;
  if (typeof first?.image_url === "string") return first.image_url;
  if (typeof first?.result_url === "string") return first.result_url;
  if (typeof first?.b64_json === "string") return `data:image/png;base64,${first.b64_json}`;

  if (typeof data.b64_json === "string") return `data:image/png;base64,${data.b64_json}`;
  return undefined;
}

function extractJobId(data: any): string | undefined {
  const nested = data.data ?? data.result ?? data.output;
  const first = Array.isArray(nested) ? nested[0] : nested;
  const jobId =
    data.task_id ??
    data.taskId ??
    data.id ??
    data.job_id ??
    data.jobId ??
    data.request_id ??
    first?.task_id ??
    first?.taskId ??
    first?.id ??
    first?.job_id ??
    first?.jobId ??
    first?.request_id ??
    first?.task_ids?.[0];
  return jobId == null ? undefined : String(jobId);
}

function extractErrorMessage(data: any) {
  if (typeof data === "string") return data;
  return data?.error?.message ?? data?.message ?? data?.msg ?? data?.error;
}

function normalizeStatus(status: string): AiSubmitResult["status"] {
  const value = String(status ?? "").toLowerCase();
  if (["succeeded", "success", "completed", "done"].includes(value)) return "SUCCEEDED";
  if (["failed", "error"].includes(value)) return "FAILED";
  if (["submitted", "queued", "pending"].includes(value)) return "SUBMITTED";
  return "PROCESSING";
}

function normalizePollingStatus(status: string): AiStatusResult["status"] {
  const value = String(status ?? "").toLowerCase();
  if (["succeeded", "success", "completed", "done"].includes(value)) return "SUCCEEDED";
  if (["failed", "error"].includes(value)) return "FAILED";
  return "PROCESSING";
}

async function fetchWithTimeout(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
