import { z } from "zod";

const imagePlanSchema = z.object({
  page: z.number().int().min(1).max(5),
  type: z.enum(["cover", "product", "knowledge", "scene", "cooperation"]),
  headline: z.string().min(1).max(40),
  description: z.string().min(1).max(300),
});

export const petContentSchema = z.object({
  topic: z.string().min(1).max(80),
  titles: z.array(z.string().min(1).max(60)).length(3),
  content: z.string().min(80).max(3000),
  hashtags: z.array(z.string().min(2).max(30)).min(3).max(12),
  imagePlans: z.array(imagePlanSchema).length(5),
});

const truthCheckSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string().min(1)).max(20),
});

export type PetContentResult = z.infer<typeof petContentSchema>;
export type ProductFacts = Record<string, string | null | undefined>;

const contentJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["topic", "titles", "content", "hashtags", "imagePlans"],
  properties: {
    topic: { type: "string" },
    titles: { type: "array", minItems: 3, maxItems: 3, items: { type: "string" } },
    content: { type: "string" },
    hashtags: { type: "array", minItems: 3, maxItems: 12, items: { type: "string" } },
    imagePlans: {
      type: "array", minItems: 5, maxItems: 5,
      items: {
        type: "object", additionalProperties: false,
        required: ["page", "type", "headline", "description"],
        properties: {
          page: { type: "integer", minimum: 1, maximum: 5 },
          type: { type: "string", enum: ["cover", "product", "knowledge", "scene", "cooperation"] },
          headline: { type: "string" }, description: { type: "string" },
        },
      },
    },
  },
};

const truthJsonSchema = {
  type: "object", additionalProperties: false, required: ["passed", "issues"],
  properties: { passed: { type: "boolean" }, issues: { type: "array", items: { type: "string" } } },
};

export async function generateVerifiedPetContent(facts: ProductFacts, historyTopics: string[]) {
  let lastReason = "AI 生成失败";
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const content = await requestStructured(
      "pet_xiaohongshu_content",
      contentJsonSchema,
      buildGenerationPrompt(facts, historyTopics, attempt > 0),
    ).then((value) => petContentSchema.parse(value));

    const truthCheck = await requestStructured(
      "pet_content_truth_check",
      truthJsonSchema,
      buildTruthCheckPrompt(facts, content),
    ).then((value) => truthCheckSchema.parse(value));

    if (truthCheck.passed && truthCheck.issues.length === 0) return { content, truthCheck };
    lastReason = truthCheck.issues.join("；") || "内容包含未经产品资料确认的信息";
  }
  throw new Error(`真实性检查未通过：${lastReason}`);
}

async function requestStructured(name: string, schema: object, input: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/+$/, "");
  const model = process.env.TEXT_MODEL;
  if (!apiKey) throw new Error("服务器未配置 OPENAI_API_KEY");
  if (!model) throw new Error("服务器未配置 TEXT_MODEL");

  const response = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: input }] }],
      text: { format: { type: "json_schema", name, strict: true, schema } },
    }),
    signal: AbortSignal.timeout(90000),
  });
  const raw = await response.text();
  let data: any;
  try { data = JSON.parse(raw); } catch { throw new Error(`OpenAI 返回了非 JSON 响应（HTTP ${response.status}）`); }
  if (!response.ok) throw new Error(data?.error?.message || `OpenAI 请求失败（HTTP ${response.status}）`);
  const outputText = data.output_text || data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI 响应中没有结构化文本结果");
  try { return JSON.parse(outputText); } catch { throw new Error("OpenAI 返回的结构化结果无法解析"); }
}

function buildGenerationPrompt(facts: ProductFacts, historyTopics: string[], retry: boolean) {
  const confirmed = Object.entries(facts).filter(([, value]) => value).map(([key, value]) => `${key}：${value}`).join("\n");
  return `你是宠物医疗耗材 B 端小红书内容策划。请生成一篇专业、真实、实用且便于搜索的内容。\n\n【已确认产品资料——唯一事实来源】\n${confirmed}\n\n【真实性最高规则】\n如果产品资料中没有提供的信息，不要推测，不要补充，不要创造。不得编造适用动物、具体尺寸、针长、流速、治疗效果、厂家宣传功效或任何医疗效果保证。可以提供不涉及具体产品参数的通用采购核对建议，但必须明确以实际产品资料与使用规范为准。\n\n【最近历史选题，今日不得重复】\n${historyTopics.length ? historyTopics.join("\n") : "暂无"}\n\n【输出要求】\n1个今日选题、3个标题、1篇正文、3-12个话题标签、严格5张图片方案。第1页封面，第2页真实产品展示，第3页知识信息，第4页宠物医院相关场景，第5页采购合作信息。标题避免过度营销、绝对化宣传与功效保证。正文自然引导宠物医院、诊所、兽医、采购与经销商咨询。${retry ? "\n上一次结果未通过真实性检查，本次必须更加保守，只引用明确资料。" : ""}`;
}

function buildTruthCheckPrompt(facts: ProductFacts, content: PetContentResult) {
  return `你是严格的医疗耗材内容事实审核员。只根据已确认资料，检查候选内容是否出现任何未经确认的产品事实、参数、适用对象、结构、尺寸、针长、流速、治疗效果或功效。通用采购建议不算产品事实。\n\n已确认资料：\n${JSON.stringify(facts, null, 2)}\n\n候选内容：\n${JSON.stringify(content, null, 2)}\n\n没有问题时 passed=true 且 issues=[]；只要存在一项未经确认的产品事实，passed=false 并逐项说明。`;
}

export function getTextModelName() { return process.env.TEXT_MODEL || ""; }
