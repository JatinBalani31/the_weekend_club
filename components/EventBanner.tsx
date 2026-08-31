"use client";

import { useState } from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";

export default function EventBanner({
  src,
  sizes,
  className,
  priority,
}: {
  src: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-ink/40 ${className ?? ""}`}>
        <ImageOff aria-hidden="true" size={28} className="text-paper/50" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
