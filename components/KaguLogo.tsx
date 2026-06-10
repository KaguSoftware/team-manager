import { Image } from "expo-image";

// The Kagu mark is designed for a black field (its white/gray facets only read
// on dark), so in-app we render the icon tile — the same artwork as the app
// icon — which keeps the bird on black regardless of the screen's theme.
const ICON = require("@/assets/images/icon.png");

export function KaguLogo({ size = 64, radius }: { size?: number; radius?: number }) {
  return (
    <Image
      source={ICON}
      style={{ width: size, height: size, borderRadius: radius ?? size * 0.22 }}
      contentFit="cover"
      accessibilityLabel="Kagu"
    />
  );
}
