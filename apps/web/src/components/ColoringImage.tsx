'use client';

import Image from 'next/image';

interface ColoringImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  placeholderSize?: number;
}

export function ColoringImage({
  src,
  alt,
  fill = false,
  sizes,
  priority = false,
  className = '',
  placeholderSize = 48,
}: ColoringImageProps) {
  return (
    <>
      <Image
        src={src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={className}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = 'none';
        }}
      />
      {/* SVG placeholder shown behind the image (visible when image fails/missing) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={placeholderSize}
          height={placeholderSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-300 dark:text-zinc-600"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    </>
  );
}
