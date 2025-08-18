import { ThemeColors } from "@/lib/ThemeContext";
import { ImageStyle, TextStyle, ViewStyle } from "react-native";

export function makeCardStyles(
  colors: ThemeColors,
  cardWidth: number,
  scale = 1
) {
  const S = scale;

  const radius = Math.round(cardWidth * 0.1 * S);
  const coverH = Math.round(cardWidth * 1.28);
  const bodyPad = Math.max(10, Math.round(cardWidth * 0.085 * S));

  const newFont = Math.max(10, Math.round(cardWidth * 0.08 * S));
  const newPadX = Math.max(6, Math.round(cardWidth * 0.04 * S));
  const newPadY = Math.max(2, Math.round(cardWidth * 0.03 * S));

  const flagSide = Math.max(18, Math.round(cardWidth * 0.15 * S));
  const heartPad = Math.max(6, Math.round(cardWidth * 0.045 * S));

  const titleSize = Math.max(12, Math.round(cardWidth * 0.105 * S));
  const subtitleSize = Math.max(11, Math.round(cardWidth * 0.095 * S));
  const metaFont = Math.max(12, Math.round(cardWidth * 0.09 * S));

  const chipFont = Math.max(11, Math.round(metaFont));
  const chipPadX = Math.max(8, Math.round(cardWidth * 0.05 * S));
  const chipPadY = Math.max(4, Math.round(cardWidth * 0.03 * S));
  const chipRadius = Math.max(10, Math.round(cardWidth * 0.08 * S));

  const progH = Math.max(12, Math.round(cardWidth * 0.07 * S));
  const progRadius = Math.max(6, Math.round(progH / 2));
  const labelFont = Math.max(9, Math.round(cardWidth * 0.028 * S));

  const tagFont = Math.max(10, Math.round(cardWidth * 0.088 * S));
  const tagPadX = Math.max(6, Math.round(cardWidth * 0.04 * S));
  const tagPadY = Math.max(3, Math.round(cardWidth * 0.028 * S));
  const tagRadius = Math.max(7, Math.round(cardWidth * 0.055 * S));

  const pillFont = Math.max(11, Math.round(cardWidth * 0.09 * S));
  const pillPadX = Math.max(10, Math.round(cardWidth * 0.06 * S));
  const pillPadY = Math.max(5, Math.round(cardWidth * 0.035 * S));

  return {
    card: {
      flex: 1,
      width: cardWidth,
      borderRadius: radius,
      backgroundColor: colors.bg,
      overflow: "hidden",
      elevation: 5,
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    } as ViewStyle,

    hCard: {
      width: "100%",
      flexDirection: "row",
      borderRadius: radius,
      backgroundColor: colors.bg,
      overflow: "hidden",
      elevation: 2,
    } as ViewStyle,

    imageWrap: {
      position: "relative",
      width: "100%",
      height: coverH,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
      overflow: "hidden",
    } as ViewStyle,

    hImageWrap: {
      width: 120,
      height: 148,
      borderTopLeftRadius: radius,
      borderBottomLeftRadius: radius,
      overflow: "hidden",
    } as ViewStyle,

    cover: {
      width: "100%",
      height: "100%",
    } as ImageStyle,

    hCover: {
      width: "100%",
      height: "100%",
    } as ImageStyle,

    coverGradient: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: "55%",
    } as ViewStyle,

    newBadge: {
      position: "absolute",
      right: 0,
      bottom: 22,
      marginHorizontal: pillPadX,
      marginVertical: pillPadY,
      backgroundColor: colors.newBadgeBg,
      color: "#fff",
      fontWeight: "800",
      fontSize: newFont,
      paddingHorizontal: newPadX,
      paddingVertical: newPadY,
      borderRadius: 999,
      letterSpacing: 0.6,
    } as TextStyle,

    ribbon: {
      paddingHorizontal: tagPadX - 2,
      paddingVertical: tagPadY - 2,
      borderRadius: tagRadius,
      fontSize: tagFont,
      color: "#ececec",
      backgroundColor: colors.tagBg,
      marginBottom: Math.round(tagPadY * 1.4),
      marginRight: tagPadX,
      borderWidth: 2,
      borderColor: "#fff",
      fontWeight: "500",
      letterSpacing: 0.2,
    } as ViewStyle,

    ribbonBorderGood: { borderColor: "#7CFFAA" } as ViewStyle,
    ribbonBorderOk: { borderColor: "#FFE07C" } as ViewStyle,
    ribbonBorderWarn: { borderColor: "#FF8D8D" } as ViewStyle,

    ribbonText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: Math.max(11, Math.round(metaFont * 0.95)),
      textAlign: "center",
    } as TextStyle,

    ribbonGood: { color: "#7CFFAA" } as TextStyle,
    ribbonOk: { color: "#FFE07C" } as TextStyle,
    ribbonWarn: { color: "#FF8D8D" } as TextStyle,

    langBadge: {
      position: "absolute",
      top: 0,
      left: 0,
      width: flagSide * 1.3,
      height: flagSide,
      borderRadius: 3,
      overflow: "hidden",
      marginHorizontal: pillPadX,
      marginVertical: pillPadY * 2,
      borderWidth: 1,
      borderColor: colors.page,
      backgroundColor: colors.page,
    } as ViewStyle,

    langImg: {
      width: "100%",
      height: "100%",
    } as ImageStyle,

    favWrap: {
      position: "absolute",
      top: 0,
      right: 0,
      marginHorizontal: pillPadX,
      marginVertical: pillPadY * 2,
      alignItems: "center",
    } as ViewStyle,

    favBtn: {
      backgroundColor: "rgba(0,0,0,0.6)",
      padding: heartPad,
      borderRadius: 999,
    } as ViewStyle,
    favCount: {
      marginTop: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
      fontSize: Math.max(10, Math.round(cardWidth * 0.075 * S)),
      fontWeight: "800",
      color: "#fff",
      backgroundColor: "rgba(0,0,0,0.55)",
      borderRadius: 999,
      overflow: "hidden",
    } as TextStyle,

    body: {
      padding: bodyPad,
      backgroundColor: colors.bg,
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderWidth: 1,
      borderColor: colors.bg,
      marginTop: -18,
    } as ViewStyle,

    hBody: {
      flex: 1,
      padding: bodyPad,
      backgroundColor: colors.searchBg,
      borderLeftWidth: 1,
      borderColor: colors.page,
      justifyContent: "space-between",
      gap: 8,
    } as ViewStyle,

    titleRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    } as ViewStyle,

    title: {
      flex: 1,
      fontSize: titleSize,
      fontWeight: "600",
      color: colors.title,
      lineHeight: Math.round(titleSize * 1.15),
    } as TextStyle,

    subtitle: {
      fontSize: subtitleSize,
      color: colors.metaText,
      marginTop: 4,
    } as TextStyle,

    hFavBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 999,
      backgroundColor: colors.tagBg,
    } as ViewStyle,
    hFavCount: {
      color: colors.title,
      fontWeight: "800",
      fontSize: Math.max(11, Math.round(metaFont)),
    } as TextStyle,

    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 8,
      marginBottom: 4,
    } as ViewStyle,
    metaItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    } as ViewStyle,
    metaIcon: {
      fontSize: metaFont,
      color: colors.metaText,
    } as TextStyle,
    metaText: {
      fontSize: metaFont,
      color: colors.metaText,
    } as TextStyle,

    chipsRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 6,
    } as ViewStyle,
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: chipPadX,
      paddingVertical: chipPadY,
      borderRadius: chipRadius,
      backgroundColor: colors.tagBg,
    } as ViewStyle,
    chipGhost: {
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: colors.page,
    } as ViewStyle,
    chipText: {
      fontSize: chipFont,
      color: colors.metaText,
      fontWeight: "700",
    } as TextStyle,

    progWrapV: {
      position: "absolute",
      left: 0,
      right: 0,
      gap: 6,
      marginHorizontal: pillPadX,
      marginVertical: pillPadY,
    } as ViewStyle,

    progWrapH: {
      marginTop: 8,
    } as ViewStyle,

    progTrack: {
      height: progH,
      borderRadius: progRadius,
      backgroundColor: colors.page,
      overflow: "hidden",
      position: "relative",
    } as ViewStyle,
    progFill: {
      height: "100%",
      borderRadius: progRadius,
      backgroundColor: colors.accent,
    } as ViewStyle,
    progLabel: {
      position: "absolute",
      left: 0,
      right: 0,
      top: Math.max(0, Math.round((progH - labelFont) / 2) - 1),
      fontSize: labelFont,
      fontWeight: "800",
      color: "#fff",
      textAlign: "center",
      textShadowColor: "rgba(0,0,0,0.8)",
      textShadowRadius: 3,
      textShadowOffset: { width: 0, height: 1 },
    } as TextStyle,

    donePill: {
      position: "absolute",
      left: 10,
      bottom: 24,
      paddingHorizontal: pillPadX,
      paddingVertical: pillPadY,
      borderRadius: 999,
      backgroundColor: colors.accent,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    } as ViewStyle,
    doneTxt: {
      color: colors.bg,
      fontSize: pillFont,
      fontWeight: "900",
    } as TextStyle,

    doneChipH: {
      alignSelf: "flex-start",
      marginTop: 8,
      paddingHorizontal: pillPadX,
      paddingVertical: pillPadY,
      borderRadius: 999,
      backgroundColor: colors.accent,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    } as ViewStyle,
    doneChipTxtH: {
      color: colors.bg,
      fontSize: pillFont,
      fontWeight: "900",
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
      marginBottom: Math.round(tagPadY * 1.4),
      marginRight: tagPadX,
      fontWeight: "500",
      letterSpacing: 0.2,
    } as TextStyle,
    tagSelected: {
      borderWidth: 1,
      borderColor: "#fff",
    } as TextStyle,
  };
}
