const baseHue = Math.round((260 / 360) * 65535); // ≈ 44975

export const hsbToHex = ({
  saturation,
  brightness,
}: {
  saturation: number;
  brightness: number;
}) => {
  const h = (baseHue / 65535) * 360;
  const s = saturation / 254;
  const v = brightness / 254;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (h >= 300 && h < 360) {
    r = c;
    g = 0;
    b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .padStart(6, "0")}`;
};

export const Colors = {
  light: {
    text: {
      hex: hsbToHex({ saturation: 76, brightness: 200 }), // ≈ #4F4A99
    },
    background: {
      hex: hsbToHex({ saturation: 76, brightness: 35 }), // ≈ #1C1733
    },
    tint: hsbToHex({ saturation: 150, brightness: 200 }), // ≈ #6B54D6
    icon: {
      hex: hsbToHex({ saturation: 50, brightness: 100 }), // ≈ #403A80
    },
    tabIconDefault: {
      hex: hsbToHex({ saturation: 50, brightness: 100 }), // ≈ #403A80
    },
    tabIconSelected: {
      hex: hsbToHex({ saturation: 150, brightness: 200 }), // ≈ #6B54D6
    },
  },
  dark: {
    text: {
      hex: hsbToHex({ saturation: 50, brightness: 220 }), // ≈ #B4A4FF
    },
    background: {
      hex: hsbToHex({ saturation: 76, brightness: 25 }), // ≈ #1C1733
    },
    tint: hsbToHex({ saturation: 150, brightness: 150 }), // ≈ #5B48B4
    icon: {
      hex: hsbToHex({ saturation: 40, brightness: 120 }), // ≈ #4C428F
    },
    tabIconDefault: {
      hex: hsbToHex({ saturation: 40, brightness: 120 }), // ≈ #4C428F
    },
    tabIconSelected: {
      hex: hsbToHex({ saturation: 150, brightness: 150 }), // ≈ #5B48B4
    },
  },
};
