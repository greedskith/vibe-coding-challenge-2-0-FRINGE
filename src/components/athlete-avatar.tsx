/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { cn } from "cn";

interface AthleteAvatarProps {
  name: string;
  imageUrl?: string | null;
  className?: string;
  textClassName?: string;
  alt?: string;
}

export function AthleteAvatar({
  name,
  imageUrl,
  className = "size-10",
  textClassName = "text-xs",
  alt,
}: AthleteAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  const cleanName = (name || "").trim();
  const initials = cleanName
    ? cleanName
        .split(/\s+/)
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "A";

  const showImage = Boolean(imageUrl && imageUrl.trim() && !imgFailed);

  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-sm border-2 border-zinc-700 bg-zinc-900 text-zinc-300 font-mono font-semibold overflow-hidden select-none",
        className
      )}
    >
      {showImage ? (
        <img
          src={imageUrl!}
          alt={alt || cleanName || "Athlete avatar"}
          className="size-full object-cover"
          onError={() => setImgFailed(true)}
          loading="lazy"
        />
      ) : (
        <span className={cn("text-zinc-200 tracking-wider", textClassName)}>
          {initials}
        </span>
      )}
    </div>
  );
}
