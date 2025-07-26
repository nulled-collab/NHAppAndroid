// hooks/useThemeColor.ts
import { Colors } from '@/constants/Colors';
import type { ColorValue } from 'react-native';
import { useColorScheme } from './useColorScheme';

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors['light']
): ColorValue {
  const colorScheme = useColorScheme();
  const theme = colorScheme ?? 'light';

  // Use provided light/dark color if available, else fall back to Colors
  const colorFromProps = props[theme];
  if (colorFromProps) {
    return colorFromProps;
  }

  // Handle Colors object: extract hex if it's an object, else use the value directly
  const color = Colors[theme][colorName];
  return typeof color === 'string' ? color : color.hex;
}