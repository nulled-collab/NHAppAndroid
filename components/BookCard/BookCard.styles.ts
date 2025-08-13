import { ThemeColors } from "@/lib/ThemeContext";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export function makeCardStyles(
  colors: ThemeColors,
  cardWidth: number,
  scale = 1
) {
  const S = scale;

  const borderRadius = Math.round(cardWidth * 0.06 * S);
  const coverHeight = Math.round(cardWidth * 1.24);
  const flagW = Math.round(cardWidth * 0.17 * S);
  const flagH = Math.round(cardWidth * 0.12 * S);

  const favBtnPad = Math.max(3, Math.round(cardWidth * 0.045 * S));
  const favGapY = Math.max(2, Math.round(cardWidth * 0.02 * S));
  const favFont = Math.max(10, Math.round(cardWidth * 0.09 * S));

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
      backgroundColor: colors.bg,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: borderRadius,
    } as ViewStyle,

    flagImg: {
      position: "absolute",
      top: flagW * 0.15,
      left: flagW * 0.15,
      width: flagW,
      height: flagH,
      borderRadius: 2,
    } as ImageStyle,

    imageWrap: {
      position: "relative",
      width: "100%",
      height: coverHeight,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      overflow: "hidden",
    } as ViewStyle,

    cover: {
      width: "100%",
      height: "100%",
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    } as ImageStyle,

    favWrap: {
      position: "absolute",
      top: favBtnPad,
      right: favBtnPad,
      alignItems: "center",
    } as ViewStyle,

    favBtn: {
      backgroundColor: "rgba(0,0,0,0.65)",
      padding: favBtnPad,
      borderRadius: 999,
    } as ViewStyle,

    favCount: {
      marginTop: favGapY,
      paddingHorizontal: favBtnPad,
      paddingVertical: Math.max(2, Math.round(favBtnPad * 0.6)),
      fontSize: favFont,
      fontWeight: "700",
      color: "#fff",
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 999,
      overflow: "hidden",
    } as TextStyle,

    newBadge: {
      position: "absolute",
      bottom: newPadY * 5,
      left: newPadX * 3,
      backgroundColor: colors.newBadgeBg,
      color: "#fff",
      fontWeight: "700",
      fontSize: newFont,
      paddingHorizontal: newPadX,
      paddingVertical: newPadY,
      borderRadius: borderRadius * 0.35,
      textTransform: "uppercase",
      overflow: "hidden",
    } as TextStyle,

    scoreBadge: {
      position: "absolute",
      left: favBtnPad,
      bottom: favBtnPad,
      backgroundColor: "#444",
      borderRadius: 8,
      paddingHorizontal: favBtnPad,
      paddingVertical: Math.max(2, Math.round(favBtnPad * 0.6)),
    } as ViewStyle,

    scoreText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: Math.max(12, Math.round(tagFont * 1.05)),
    } as TextStyle,

    body: { padding: bodyPad } as ViewStyle,

    title: {
      fontSize: titleSize,
      fontWeight: "600",
      color: colors.title,
    } as TextStyle,

    metaRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: metaFont * 0.4,
    } as ViewStyle,

    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      marginRight: metaFont * 0.5,
      gap: metaFont * 0.4,
    } as ViewStyle,

    metaText: {
      fontSize: metaFont,
      color: colors.metaText,
    } as TextStyle,

    tagsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: tagPadY,
    } as ViewStyle,

    tag: {
      paddingHorizontal: tagPadX,
      paddingVertical: tagPadY,
      borderRadius: tagRadius,
      fontSize: tagFont,
      color: "#ececec",
      backgroundColor: colors.tagBg,
      marginBottom: tagPadY * 1.4,
      marginRight: tagPadX,
    } as TextStyle,

    tagSelected: {
      borderWidth: 1,
      borderColor: "#fff",
    } as TextStyle,
  };
}
