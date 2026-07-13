export const PLATFORM_OPTIONS = [
  { value: "TAOBAO", label: "淘宝" },
  { value: "PINDUODUO", label: "拼多多" },
  { value: "CN_1688", label: "1688" },
  { value: "WECHAT", label: "微信" },
  { value: "DOUYIN", label: "抖音" },
  { value: "XIAOHONGSHU", label: "小红书" },
  { value: "OTHER", label: "其它" },
] as const;

export function platformLabel(value?: string) {
  return PLATFORM_OPTIONS.find((item) => item.value === value)?.label ?? value ?? "-";
}
