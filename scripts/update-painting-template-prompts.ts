import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const paintingTemplates = [
  {
    id: "default-template-1",
    description: "生成真实厚涂油画质感效果图，用于3D UV肌理画打印，保持主体和颜色关系不变。",
    prompt:
      "基于用户上传的参考图片进行图像改绘，把原图转换为真实手工厚涂油画/3D UV肌理画打印效果。必须严格保留原图主体类别、主体数量、主体轮廓、姿态、位置、构图边界、背景关系、主要颜色、品牌标识和可识别细节；如果原图是商品，生成图必须仍然是同一件商品，保留外形比例、结构分区、材质纹理、logo位置、文字位置和边缘轮廓；如果原图是人物，必须保留同一个人物、动作、表情、服装和画面构图。只改变绘画材质与艺术表现，不要重新设计主体，不要替换主体，不要自由创作新场景。画面要呈现真实油画颜料覆盖在画布上的质感，明显可见厚重颜料堆叠、刮刀肌理、粗细笔触、局部高低起伏、画布纹理、哑光颜料表面、手工绘制痕迹和装饰画成品质感。整体要像真实手绘厚涂油画作品，不像摄影、不像3D渲染、不像电商效果图，适合打印为定制装饰画。",
    negativePrompt:
      "不要生成无关风景、无关人物、无关商品、无关动物；不要改变主体类别、数量、姿态、轮廓、构图、品牌标识、文字位置和主要颜色；不要3D渲染、CGI、产品摄影、影棚灯光、电商白底渲染、塑料感、金属高光、镜面反光、过度光滑、皮革精修质感、真实照片质感、AI插画感、卡通动漫、平面海报、低肌理、无笔触、模糊、变形、额外物体、水印、错误文字。",
  },
  {
    id: "default-template-2",
    description: "增强画布肌理、刮刀笔触和立体颜料层次，适合装饰画成品效果。",
    prompt:
      "基于用户上传的参考图片进行图像改绘，转换为真实手工肌理画/3D UV肌理画打印效果。必须严格保留原图主体内容、主体数量、主体外形、构图边界、比例关系、背景关系、主要颜色和可识别细节；如果原图是商品，必须保留商品本身的轮廓、结构、logo、文字、纹理和摆放方式；如果原图是人物，必须保留人物身份特征、动作、表情、服装和构图。只增强艺术材质，不要重新创作画面。画面需要明显画布纹理、刮刀堆料、立体颜料层、粗细笔触、肌理浮雕感、手工绘画痕迹和高级装饰画成品质感，整体清晰干净，适合3D UV打印。",
    negativePrompt:
      "不要替换主体，不要新增无关人物、动物、山水、建筑或商品；不要改变主体类别、数量、外形、构图、logo、文字和颜色关系；不要摄影棚照片、3D渲染、CGI、塑料质感、镜面高光、电商效果图、过度光滑、真实产品精修图、卡通动漫、低肌理、无笔触、模糊、变形、错误文字、水印。",
  },
];

async function main() {
  for (const template of paintingTemplates) {
    const existing = await prisma.aiTemplate.findUnique({ where: { id: template.id } });
    if (!existing) {
      console.warn(`Template ${template.id} was not found, skipped.`);
      continue;
    }

    await prisma.aiTemplate.update({
      where: { id: template.id },
      data: {
        description: template.description,
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
      },
    });
    console.log(`Updated template: ${existing.name}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
