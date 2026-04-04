import { useState } from "react";
import { cn } from "@/lib/utils";

type MarketingImageProps = React.ImgHTMLAttributes<HTMLImageElement>;

/**
 * Local marketing assets with graceful fallback if a file is missing in deploy.
 */
export function MarketingImage({
  src,
  className,
  alt = "",
  onError,
  ...rest
}: MarketingImageProps) {
  const [failed, setFailed] = useState(false);
  const resolved = failed ? `${import.meta.env.BASE_URL}placeholder.svg` : src;

  return (
    <img
      {...rest}
      src={resolved}
      alt={alt}
      className={cn(className)}
      onError={(e) => {
        if (!failed) setFailed(true);
        onError?.(e);
      }}
    />
  );
}
