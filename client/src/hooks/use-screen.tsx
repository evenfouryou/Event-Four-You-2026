import { useState, useEffect, useMemo } from "react";

export type DeviceType = "mobile" | "tablet" | "desktop" | "large-desktop";
export type Orientation = "portrait" | "landscape";

export interface ScreenInfo {
  width: number;
  height: number;
  deviceType: DeviceType;
  orientation: Orientation;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  isTouchDevice: boolean;
  pixelRatio: number;
  isRetina: boolean;
  safeAreaInsets: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  deviceModel: string;
}

const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
} as const;

const DEVICE_PATTERNS = {
  iPhoneSE: { minWidth: 320, maxWidth: 375, minHeight: 568, maxHeight: 667 },
  iPhone: { minWidth: 375, maxWidth: 430, minHeight: 667, maxHeight: 932 },
  iPhoneProMax: { minWidth: 414, maxWidth: 430, minHeight: 896, maxHeight: 932 },
  iPad: { minWidth: 744, maxWidth: 834, minHeight: 1024, maxHeight: 1194 },
  iPadPro: { minWidth: 1024, maxWidth: 1366, minHeight: 1366, maxHeight: 1366 },
  androidSmall: { minWidth: 320, maxWidth: 360, minHeight: 568, maxHeight: 740 },
  androidMedium: { minWidth: 360, maxWidth: 412, minHeight: 640, maxHeight: 915 },
  androidLarge: { minWidth: 412, maxWidth: 480, minHeight: 732, maxHeight: 1024 },
  androidTablet: { minWidth: 600, maxWidth: 960, minHeight: 800, maxHeight: 1280 },
};

function matchesDevicePattern(
  width: number,
  height: number,
  pattern: { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number }
): boolean {
  const w = Math.min(width, height);
  const h = Math.max(width, height);
  return w >= pattern.minWidth && w <= pattern.maxWidth && h >= pattern.minHeight && h <= pattern.maxHeight;
}

function getDeviceTypeFromPatterns(width: number, height: number, userAgent: string): DeviceType | null {
  const ua = userAgent.toLowerCase();
  const isTouch = "ontouchstart" in globalThis || navigator.maxTouchPoints > 0;
  
  if (ua.includes("ipad") || matchesDevicePattern(width, height, DEVICE_PATTERNS.iPad) || 
      matchesDevicePattern(width, height, DEVICE_PATTERNS.iPadPro)) {
    return "tablet";
  }
  
  if (ua.includes("iphone") || (ua.includes("mobile") && ua.includes("safari"))) {
    if (matchesDevicePattern(width, height, DEVICE_PATTERNS.iPhoneSE) ||
        matchesDevicePattern(width, height, DEVICE_PATTERNS.iPhone) ||
        matchesDevicePattern(width, height, DEVICE_PATTERNS.iPhoneProMax)) {
      return "mobile";
    }
  }
  
  if (ua.includes("android")) {
    if (matchesDevicePattern(width, height, DEVICE_PATTERNS.androidTablet)) {
      return "tablet";
    }
    if (matchesDevicePattern(width, height, DEVICE_PATTERNS.androidSmall) ||
        matchesDevicePattern(width, height, DEVICE_PATTERNS.androidMedium) ||
        matchesDevicePattern(width, height, DEVICE_PATTERNS.androidLarge)) {
      return "mobile";
    }
    if (ua.includes("mobile")) {
      return "mobile";
    }
    if (isTouch && width >= 600 && width < 1024) {
      return "tablet";
    }
  }
  
  return null;
}

function getDeviceType(width: number, height?: number, userAgent?: string): DeviceType {
  if (height !== undefined && userAgent) {
    const patternMatch = getDeviceTypeFromPatterns(width, height, userAgent);
    if (patternMatch) return patternMatch;
  }
  
  if (width < BREAKPOINTS.md) return "mobile";
  if (width < BREAKPOINTS.lg) return "tablet";
  if (width < BREAKPOINTS["2xl"]) return "desktop";
  return "large-desktop";
}

function getOrientation(width: number, height: number): Orientation {
  return width > height ? "landscape" : "portrait";
}

function detectDeviceModel(width: number, height: number, userAgent: string): string {
  const ua = userAgent.toLowerCase();
  
  if (ua.includes("iphone")) {
    if (height <= 667) return "iPhone SE / 8";
    if (height <= 812) return "iPhone X / 11 Pro";
    if (height <= 844) return "iPhone 12 / 13 / 14";
    if (height <= 896) return "iPhone 11 / XR";
    if (height <= 926) return "iPhone 12/13/14 Pro Max";
    if (height <= 932) return "iPhone 14/15 Pro Max";
    return "iPhone";
  }
  
  if (ua.includes("ipad")) {
    if (width >= 1024) return "iPad Pro";
    if (width >= 834) return "iPad Air";
    return "iPad";
  }
  
  if (ua.includes("android")) {
    if (ua.includes("samsung")) {
      if (width >= 412) return "Samsung Galaxy S23/S24";
      return "Samsung Galaxy";
    }
    if (ua.includes("pixel")) {
      return "Google Pixel";
    }
    if (ua.includes("oneplus")) {
      return "OnePlus";
    }
    if (ua.includes("xiaomi") || ua.includes("redmi")) {
      return "Xiaomi/Redmi";
    }
    if (width >= 600) return "Android Tablet";
    return "Android";
  }
  
  if (width >= 1536) return "Desktop Large";
  if (width >= 1280) return "Desktop";
  if (width >= 1024) return "Laptop";
  
  return "Unknown";
}

function getSafeAreaInsets(): ScreenInfo["safeAreaInsets"] {
  if (typeof window === "undefined" || !window.CSS?.supports) {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue("--sat") || "0", 10) || 0,
    bottom: parseInt(computedStyle.getPropertyValue("--sab") || "0", 10) || 0,
    left: parseInt(computedStyle.getPropertyValue("--sal") || "0", 10) || 0,
    right: parseInt(computedStyle.getPropertyValue("--sar") || "0", 10) || 0,
  };
}

function isTouchDevice(): boolean {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

export function useScreen(): ScreenInfo {
  const [screenInfo, setScreenInfo] = useState<ScreenInfo>(() => {
    if (typeof window === "undefined") {
      return {
        width: 1024,
        height: 768,
        deviceType: "desktop",
        orientation: "landscape",
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isLargeDesktop: false,
        isPortrait: false,
        isLandscape: true,
        isTouchDevice: false,
        pixelRatio: 1,
        isRetina: false,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        deviceModel: "Desktop",
      };
    }
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ua = navigator.userAgent;
    const deviceType = getDeviceType(width, height, ua);
    const orientation = getOrientation(width, height);
    const pixelRatio = window.devicePixelRatio || 1;
    
    return {
      width,
      height,
      deviceType,
      orientation,
      isMobile: deviceType === "mobile",
      isTablet: deviceType === "tablet",
      isDesktop: deviceType === "desktop",
      isLargeDesktop: deviceType === "large-desktop",
      isPortrait: orientation === "portrait",
      isLandscape: orientation === "landscape",
      isTouchDevice: isTouchDevice(),
      pixelRatio,
      isRetina: pixelRatio >= 2,
      safeAreaInsets: getSafeAreaInsets(),
      deviceModel: detectDeviceModel(width, height, ua),
    };
  });

  useEffect(() => {
    const updateScreenInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const ua = navigator.userAgent;
      const deviceType = getDeviceType(width, height, ua);
      const orientation = getOrientation(width, height);
      const pixelRatio = window.devicePixelRatio || 1;
      
      setScreenInfo({
        width,
        height,
        deviceType,
        orientation,
        isMobile: deviceType === "mobile",
        isTablet: deviceType === "tablet",
        isDesktop: deviceType === "desktop",
        isLargeDesktop: deviceType === "large-desktop",
        isPortrait: orientation === "portrait",
        isLandscape: orientation === "landscape",
        isTouchDevice: isTouchDevice(),
        pixelRatio,
        isRetina: pixelRatio >= 2,
        safeAreaInsets: getSafeAreaInsets(),
        deviceModel: detectDeviceModel(width, height, ua),
      });
    };

    window.addEventListener("resize", updateScreenInfo);
    window.addEventListener("orientationchange", updateScreenInfo);
    
    updateScreenInfo();
    
    return () => {
      window.removeEventListener("resize", updateScreenInfo);
      window.removeEventListener("orientationchange", updateScreenInfo);
    };
  }, []);

  return screenInfo;
}

export function useBreakpoint() {
  const { width } = useScreen();
  
  return useMemo(() => ({
    isXs: width < BREAKPOINTS.sm,
    isSm: width >= BREAKPOINTS.sm && width < BREAKPOINTS.md,
    isMd: width >= BREAKPOINTS.md && width < BREAKPOINTS.lg,
    isLg: width >= BREAKPOINTS.lg && width < BREAKPOINTS.xl,
    isXl: width >= BREAKPOINTS.xl && width < BREAKPOINTS["2xl"],
    is2xl: width >= BREAKPOINTS["2xl"],
    breakpoint: width < BREAKPOINTS.sm ? "xs" 
      : width < BREAKPOINTS.md ? "sm"
      : width < BREAKPOINTS.lg ? "md"
      : width < BREAKPOINTS.xl ? "lg"
      : width < BREAKPOINTS["2xl"] ? "xl"
      : "2xl",
  }), [width]);
}

export { BREAKPOINTS };
