import { fail, ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { generateVerifiedPetContent, getTextModelName } from "@/services/ai/text";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return fail("UNAUTHORIZED", "未登录", 401);
  try {
    let product = await prisma.petProduct.findFirst({ where: { status: "ACTIVE" }, orderBy: { createdAt: "asc" } });
    if (!product) {
      product = await prisma.petProduct.create({ data: { brand: "百仕韦", name: "动物专用一次性使用静脉留置针", specifications: "22G / 24G / 26G", packageQuantity: "100支/盒", category: "宠物医疗耗材" } });
    }
    const history = await prisma.petContentGeneration.findMany({ where: { productId: product.id }, select: { topic: true }, orderBy: { createdAt: "desc" }, take: 60 });
    const facts = {
      品牌: product.brand, 产品名称: product.name, 产品类别: product.category,
      产品简介: product.description, 规格: product.specifications, 包装数量: product.packageQuantity,
      厂家: product.manufacturer, 适用对象: product.applicableTo, 产品特点: product.features,
      注意事项: product.precautions, 批发信息: product.wholesaleInfo, 联系方式: product.contactInfo,
    };
    const result = await generateVerifiedPetContent(facts, history.map((item) => item.topic));
    const saved = await prisma.petContentGeneration.create({ data: {
      productId: product.id, createdById: user.id, topic: result.content.topic,
      titlesJson: result.content.titles, content: result.content.content,
      hashtagsJson: result.content.hashtags, imagePlansJson: result.content.imagePlans,
      truthCheckJson: result.truthCheck, model: getTextModelName(),
    } });
    return ok({ id: saved.id });
  } catch (error) {
    console.error("Pet content generation failed", error);
    return fail("AI_GENERATION_FAILED", error instanceof Error ? error.message : "AI 生成失败", 502);
  }
}
