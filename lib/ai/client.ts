import { readLocalFile } from "@/lib/storage/local";
import { AiGenerateInput, AiStatusResult, AiSubmitResult } from "./types";

const AI_TIMEOUT_MS = 30000;

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
        errorMessage: "本地图片还没有公网访问地址。请先接入 OSS/COS，或临时启用公网隧道。",
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

export async function getGenerationStatus(externalJobId: string): Promise<AiStatusResult> {
  const baseUrl = process.env.AI_API_BASE_URL;
  const apiKey = process.env.AI_API_KEY;

  if (!baseUrl || !apiKey || externalJobId.startsWith("mock-")) {
    return { status: "PROCESSING", raw: { mock: true } };
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

function buildPrompt(input: AiGenerateInput) {
  const aspectRatio = getAspectRatio(input);
  const sizeText = buildSizeText(input);
  const ratioText = aspectRatio ? `输出画幅比例必须保持 ${aspectRatio}，不要裁切，不要改变横竖构图。` : "";
  const referenceText = [
    "必须以参考图片为唯一内容来源进行改图。",
    "保留参考图里的主体类别、数量、姿态、位置、构图边界、颜色关系和整体内容。",
    "只把参考图转换成所选艺术效果，不要自由创作，不要替换主体，不要新增人物、动物或无关物体。",
    "如果参考图是宠物、商品、风景、插画或人物，就保持原来的内容类型和主体身份。",
  ].join("");

  return [referenceText, input.prompt, ratioText, input.negativePrompt ? `避免: ${input.negativePrompt}` : "", sizeText]
    .filter(Boolean)
    .join("\n");
}

function buildSizeText(input: AiGenerateInput) {
  if (input.size.preset === "auto") return "尺寸: 按上传原图尺寸比例输出。";
  if (input.size.preset) return `尺寸: ${input.size.preset}`;
  if (input.size.width && input.size.height) return `尺寸: ${input.size.width}x${input.size.height}`;
  return "";
}

function getAspectRatio(input: AiGenerateInput) {
  let width: number | null | undefined;
  let height: number | null | undefined;

  if (input.size.preset === "auto") {
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
