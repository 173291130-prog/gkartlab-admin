import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const defaultTemplates = [
  {
    id: "default-template-1",
    name: "厚涂油画",
    description: "生成厚涂油画质感效果图，用于3D UV肌理画打印，保持图案颜色不变。",
    prompt:
      "基于用户上传的参考图片进行改图，将原图转换为高质感厚涂油画风格，适用于3D UV肌理画打印。必须保留原图的主体类别、主体数量、姿态、位置、构图、边界、颜色关系和整体内容；如果原图是宠物就仍然是同一只宠物，如果是商品就仍然是同一件商品，如果是人物就保留人物身份特征。只改变绘画材质和笔触效果，不要自由创作，不要替换主体，不要新增人物、动物或无关物体。画面需要明显油画笔触、厚重颜料堆叠感、细腻肌理、自然光影和高级装饰画质感，整体清晰干净，适合打印成定制装饰画成品。",
    negativePrompt:
      "避免主体被替换、内容跑偏、凭空新增人物、凭空新增动物、主体数量变化、构图大幅变化、五官变形、脸部失真、手指错误、主体变形、颜色大幅偏移、过度磨皮、低清晰度、文字、水印、边框、畸变、模糊、噪点、卡通化、动漫风、过度锐化、背景脏污。",
  },
  {
    id: "default-template-2",
    name: "肌理画",
    description: "增强画布肌理和笔触层次，适合装饰画成品效果。",
    prompt:
      "基于用户上传的参考图片进行改图，转换为适合3D UV肌理画打印的艺术装饰画效果。保持原图主体内容、构图、比例和主要颜色不变，增强画面肌理、画布纹理、笔触层次和立体质感，画面清晰干净，适合成品打印。",
    negativePrompt:
      "避免主体被替换、内容跑偏、颜色大幅偏移、主体变形、文字、水印、边框、畸变、模糊、噪点、卡通化、过度锐化。",
  },
  {
    id: "default-template-3",
    name: "无框画效果图",
    description: "生成适合展示无框画成品的空间效果图。",
    prompt:
      "基于用户上传图案生成无框画成品展示效果图。保持图案内容和颜色关系不变，呈现装饰画挂墙后的真实质感、清晰边缘、自然光影和高级家居展示氛围。",
    negativePrompt:
      "避免改变图案主体、颜色大幅偏移、文字、水印、边框错误、畸变、模糊、噪点、低清晰度。",
  },
  {
    id: "default-template-4",
    name: "高清修复",
    description: "提升清晰度，修复噪点和轻微模糊。",
    prompt:
      "对用户上传图片进行高清修复。保持原图内容、构图和颜色不变，提升清晰度、细节质感和打印适配度，减少噪点、压缩痕迹和轻微模糊。",
    negativePrompt:
      "避免改变主体身份、改变图案颜色、过度锐化、过度磨皮、生成文字、水印、边框、畸变、噪点。",
  },
  {
    id: "default-template-5",
    name: "指定尺寸生成",
    description: "按指定尺寸比例优化画面构图。",
    prompt:
      "根据指定成品尺寸比例优化用户上传图片的构图。保持主体内容、图案颜色和核心视觉不变，必要时自然扩展边缘背景，使画面适合打印成指定尺寸装饰画。",
    negativePrompt:
      "避免主体被替换、内容跑偏、主体变形、颜色大幅偏移、文字、水印、边框、畸变、模糊、噪点。",
  },
];

export async function seedDefaults(prisma: PrismaClient) {
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || "admin123456";
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL || "admin@example.com";
  const adminName = process.env.ADMIN_INITIAL_NAME || "系统管理员";
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: UserRole.ADMIN,
      status: "ACTIVE",
    },
    create: {
      name: adminName,
      email: adminEmail,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  for (const [index, template] of defaultTemplates.entries()) {
    await prisma.aiTemplate.upsert({
      where: { id: template.id },
      update: {
        name: template.name,
        description: template.description,
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
        isDefault: true,
        sortOrder: index + 1,
      },
      create: {
        id: template.id,
        name: template.name,
        description: template.description,
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
        isDefault: true,
        sortOrder: index + 1,
      },
    });
  }
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await seedDefaults(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
