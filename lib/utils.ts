import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

const APP_TIME_ZONE = "Asia/Shanghai";
const CHINA_OFFSET = "+08:00";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: Date | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function getTodayRangeInAppTimeZone(value = new Date()) {
  const { year, month, day } = getDatePartsInAppTimeZone(value);
  const start = new Date(`${year}-${month}-${day}T00:00:00${CHINA_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatDateStampInAppTimeZone(value = new Date()) {
  const { year, month, day } = getDatePartsInAppTimeZone(value);
  return `${year}${month}${day}`;
}

function getDatePartsInAppTimeZone(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);

  return {
    year: parts.find((part) => part.type === "year")?.value ?? "1970",
    month: parts.find((part) => part.type === "month")?.value ?? "01",
    day: parts.find((part) => part.type === "day")?.value ?? "01",
  };
}
