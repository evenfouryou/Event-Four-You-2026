import logoHorizontal from "@/assets/logos/logo-horizontal.svg";
import logoHorizontalDark from "@/assets/logos/logo-horizontal-dark.svg";
import logoVertical from "@/assets/logos/logo-vertical.svg";
import logoVerticalDark from "@/assets/logos/logo-vertical-dark.svg";
import logoMonogram from "@/assets/logos/logo-monogram.svg";
import logoMonogramDark from "@/assets/logos/logo-monogram-dark.svg";
import logoHorizontalBlue from "@/assets/logos/logo-horizontal-blue.svg";
import logoVerticalBlue from "@/assets/logos/logo-vertical-blue.svg";
import logoMonogramBlue from "@/assets/logos/logo-monogram-blue.svg";

type LogoVariant = "horizontal" | "vertical" | "monogram";
type LogoColor = "white" | "dark" | "blue";

interface BrandLogoProps {
  variant?: LogoVariant;
  color?: LogoColor;
  className?: string;
  alt?: string;
}

const logoMap: Record<LogoVariant, Record<LogoColor, string>> = {
  horizontal: {
    white: logoHorizontal,
    dark: logoHorizontalDark,
    blue: logoHorizontalBlue,
  },
  vertical: {
    white: logoVertical,
    dark: logoVerticalDark,
    blue: logoVerticalBlue,
  },
  monogram: {
    white: logoMonogram,
    dark: logoMonogramDark,
    blue: logoMonogramBlue,
  },
};

export function BrandLogo({
  variant = "horizontal",
  color = "white",
  className = "",
  alt = "EventFourYou",
}: BrandLogoProps) {
  const src = logoMap[variant][color];

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      data-testid={`logo-${variant}-${color}`}
    />
  );
}

export {
  logoHorizontal,
  logoHorizontalDark,
  logoVertical,
  logoVerticalDark,
  logoMonogram,
  logoMonogramDark,
  logoHorizontalBlue,
  logoVerticalBlue,
  logoMonogramBlue,
};
