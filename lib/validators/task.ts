import { z } from "zod";

export const taskCreateSchema = z.object({
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  orderNo: z.string().optional(),
  requestedWidth: z.coerce.number().int().positive().optional(),
  requestedHeight: z.coerce.number().int().positive().optional(),
  platform: z.enum(["TAOBAO", "PINDUODUO", "CN_1688", "WECHAT", "DOUYIN", "XIAOHONGSHU", "OTHER"]),
  templateId: z.string().optional(),
  sizeMode: z.enum(["PRESET", "CUSTOM"]),
  sizePreset: z.string().optional(),
  customWidth: z.coerce.number().int().positive().optional(),
  customHeight: z.coerce.number().int().positive().optional(),
});
