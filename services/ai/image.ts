export function getPetImageModelConfig() {
  return {
    baseUrl: process.env.AI_API_BASE_URL || "",
    apiKeyConfigured: Boolean(process.env.AI_API_KEY),
    model: process.env.IMAGE_MODEL || "",
  };
}

// Phase 2 will generate backgrounds only. Real product subjects must come from uploaded assets.
export async function generatePetContentBackground() {
  throw new Error("宠物耗材图片生成尚未启用：第一阶段仅生成图片方案");
}
