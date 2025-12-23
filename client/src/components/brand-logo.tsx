import { useTheme } from "@/hooks/use-theme";

type LogoVariant = "horizontal" | "vertical" | "monogram";

interface BrandLogoProps {
  variant?: LogoVariant;
  className?: string;
  alt?: string;
}

export function BrandLogo({
  variant = "horizontal",
  className = "",
  alt = "EventFourYou",
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  
  const logoSuffix = isDark ? "" : "-dark";
  const src = `/logos/logo-${variant}${logoSuffix}.svg`;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      data-testid={`logo-${variant}`}
    />
  );
}
