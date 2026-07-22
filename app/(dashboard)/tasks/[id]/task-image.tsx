"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function TaskImage({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const imageSrc = `${src}${src.includes("?") ? "&" : "?"}v=${retryKey}`;

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
        <div>
          <div className="text-sm font-medium text-foreground">图片加载失败</div>
          <div className="mt-1 text-xs text-muted-foreground">可能是当前网络或浏览器缓存问题，可以重试或单独打开图片。</div>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRetryKey((value) => value + 1);
              setFailed(false);
            }}
          >
            <RefreshCw className="h-4 w-4" />
            重新加载
          </Button>
          <Button asChild type="button">
            <Link href={src} target="_blank">
              <ExternalLink className="h-4 w-4" />
              打开图片
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={retryKey}
      src={imageSrc}
      alt={title}
      className="max-h-full max-w-full rounded-md object-contain"
      onError={() => setFailed(true)}
    />
  );
}
