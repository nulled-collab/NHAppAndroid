import { hsbToHex } from "@/constants/Colors";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

const bgColor = hsbToHex({ saturation: 96, brightness: 45 });
const shadowColor = "#000";
const titleColor = hsbToHex({ saturation: 60, brightness: 200 });
const metaTextColor = hsbToHex({ saturation: 40, brightness: 180 });
const tagBg = hsbToHex({ saturation: 50, brightness: 60 });
const newBadgeBg = "#ff4757";

export const TAG_COLORS: Record<string, string> = {
  language: "#FF7D7F",
  artist: "#FB8DF4",
  character: "#F3E17F",
  parody: "#BCEA83",
  group: "#86F0C6",
  category: "#92EFFF",
  tag: hsbToHex({ saturation: 100, brightness: 160 }),
};

export function makeCardStyles(cardWidth: number, scale: number = 1) {
  // Мастер-параметр — scale
  const S = scale;

  const borderRadius = Math.round(cardWidth * 0.06 * S);
  const coverHeight = Math.round(cardWidth * 1.24);
  const flagW = Math.round(cardWidth * 0.17 * S);
  const flagH = Math.round(cardWidth * 0.12 * S);
  const favIcon = Math.round(cardWidth * 0.09 * S);
  const favBtnPad = Math.max(3, Math.round(cardWidth * 0.045 * S));
  const newFont = Math.max(10, Math.round(cardWidth * 0.09 * S));
  const newPadX = Math.max(4, Math.round(cardWidth * 0.03 * S));
  const newPadY = Math.max(2, Math.round(cardWidth * 0.015 * S));
  const titleSize = Math.max(11, Math.round(cardWidth * 0.11 * S));
  const metaFont = Math.max(9, Math.round(cardWidth * 0.09 * S));
  const tagFont = Math.max(9, Math.round(cardWidth * 0.085 * S));
  const tagPadX = Math.max(3, Math.round(cardWidth * 0.03 * S));
  const tagPadY = Math.max(2, Math.round(cardWidth * 0.016 * S));
  const tagRadius = Math.max(4, Math.round(cardWidth * 0.045 * S));
  const bodyPad = Math.max(8, Math.round(cardWidth * 0.08 * S));

  return {
    card: {
      flex: 1,
      width: cardWidth,
      borderRadius,
      backgroundColor: bgColor,
      overflow: "hidden" as ViewStyle["overflow"],
      elevation: 4,
      shadowColor: shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: borderRadius,
    } as ViewStyle,
    flagImg: {
      position: "absolute" as ViewStyle["position"],
      top: flagW * 0.15,
      left: flagW * 0.15,
      width: flagW,
      height: flagH,
      borderRadius: 2,
    } as ImageStyle,
    imageWrap: {
      position: "relative" as ViewStyle["position"],
      width: "100%",
      height: coverHeight,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      overflow: "hidden" as ViewStyle["overflow"],
    } as ViewStyle,
    cover: {
      width: "100%",
      height: "100%",
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    } as ImageStyle,
    favBtn: {
      position: "absolute" as ViewStyle["position"],
      top: favBtnPad,
      right: favBtnPad,
      backgroundColor: "rgba(0,0,0,0.65)",
      padding: favBtnPad,
      borderRadius: 999,
    } as ViewStyle,
    newBadge: {
      position: "absolute" as TextStyle["position"],
      bottom: newPadY * 5,
      left: newPadX * 3,
      backgroundColor: newBadgeBg,
      color: "#fff",
      fontWeight: "700" as TextStyle["fontWeight"],
      fontSize: newFont,
      paddingHorizontal: newPadX,
      paddingVertical: newPadY,
      borderRadius: borderRadius * 0.35,
      textTransform: "uppercase" as TextStyle["textTransform"],
      overflow: "hidden" as TextStyle["overflow"],
    } as TextStyle,
    body: { padding: bodyPad } as ViewStyle,
    title: {
      fontSize: titleSize,
      fontWeight: "600" as TextStyle["fontWeight"],
      color: titleColor,
    } as TextStyle,
    metaRow: {
      flexDirection: "row" as ViewStyle["flexDirection"],
      justifyContent: "space-between" as ViewStyle["justifyContent"],
      alignItems: "center" as ViewStyle["alignItems"],
      marginBottom: metaFont * 0.4,
    } as ViewStyle,
    metaItem: {
      flexDirection: "row" as ViewStyle["flexDirection"],
      alignItems: "center" as ViewStyle["alignItems"],
      marginRight: metaFont * 0.5,
      gap: metaFont * 0.4,
    } as ViewStyle,
    metaText: { fontSize: metaFont, color: metaTextColor } as TextStyle,
    tagsRow: {
      flexDirection: "row" as ViewStyle["flexDirection"],
      flexWrap: "wrap" as ViewStyle["flexWrap"],
      marginTop: tagPadY,
    } as ViewStyle,
    tag: {
      paddingHorizontal: tagPadX,
      paddingVertical: tagPadY,
      borderRadius: tagRadius,
      fontSize: tagFont,
      color: "#ececec",
      backgroundColor: tagBg,
      marginBottom: tagPadY * 1.4,
      marginRight: tagPadX,
    } as TextStyle,
    tagSelected: { borderWidth: 1, borderColor: "#fff" } as TextStyle,
  };
}
