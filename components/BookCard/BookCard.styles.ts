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

  const titleSize = Math.max(12, Math.round(cardWidth * 0.115 * S));
  const metaFont = Math.max(10, Math.round(cardWidth * 0.09 * S));
  const tagFont = Math.max(10, Math.round(cardWidth * 0.085 * S));
  const tagPadX = Math.max(4, Math.round(cardWidth * 0.03 * S));
  const tagPadY = Math.max(2, Math.round(cardWidth * 0.016 * S));
  const tagRadius = Math.max(6, Math.round(cardWidth * 0.045 * S));
  const bodyPad = Math.max(10, Math.round(cardWidth * 0.08 * S));

  // горизонтальные дополнения
  const subtitleSize = Math.max(11, Math.round(titleSize * 0.85));
  const chipPadX = Math.max(8, Math.round(cardWidth * 0.05 * S));
  const chipPadY = Math.max(4, Math.round(cardWidth * 0.03 * S));
  const chipRadius = Math.max(10, Math.round(cardWidth * 0.09 * S));
  const chipFont = Math.max(11, Math.round(metaFont));
  const chipGap = Math.max(8, Math.round(cardWidth * 0.05 * S));

  return {
    // ===== общий каркас =====
    card: {
      flex: 1,
      width: cardWidth, // для вертикальной плитки
      borderRadius,
      backgroundColor: colors.bg,
      overflow: "hidden",
      elevation: 4,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: borderRadius * 0.6,
    } as ViewStyle,

    // ===== улучшенный контейнер для горизонтального «лист-тайла» =====
    hCard: {
      width: "100%",
      flexDirection: "row",
      borderRadius,
      backgroundColor: colors.bg,
      overflow: "hidden",
      elevation: 2,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: borderRadius * 0.4,
    } as ViewStyle,

    // ===== обложка =====
    imageWrap: {
      position: "relative",
      width: "100%",
      height: coverHeight,
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
      overflow: "hidden",
      borderRadius: borderRadius,
    } as ViewStyle,

    // горизонтальный wrap обложки — скругляем слева
    hImageWrap: {
      width: 120,
      height: 140,
      borderTopLeftRadius: borderRadius,
      borderBottomLeftRadius: borderRadius,
      overflow: "hidden",
    } as ViewStyle,

    cover: {
      width: "100%",
      height: "100%",
      borderTopLeftRadius: borderRadius,
      borderTopRightRadius: borderRadius,
    } as ImageStyle,

    hCover: {
      width: "100%",
      height: "100%",
      borderTopLeftRadius: borderRadius,
      borderBottomLeftRadius: borderRadius,
    } as ImageStyle,

    // ===== overlay элементы для вертикального =====
    flagImg: {
      position: "absolute",
      top: flagW * 0.15,
      left: flagW * 0.15,
      width: flagW,
      height: flagH,
      borderRadius: 2,
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
      backgroundColor: "#000000ff",
      borderRadius: 82,
      paddingHorizontal: 2,
      paddingVertical: 2,
    } as ViewStyle,

    scoreText: {
      color: "#fff",
      fontWeight: "700",
      fontSize: Math.max(12, Math.round(tagFont * 1.05)),
    } as TextStyle,

    // ===== body =====
    body: { padding: bodyPad } as ViewStyle,

    // компактный body для горизонтального
    hBody: {
      flex: 1,
      paddingVertical: Math.max(10, Math.round(bodyPad * 0.9)),
      paddingHorizontal: Math.max(10, Math.round(bodyPad * 0.9)),
      justifyContent: "space-between",
      gap: Math.max(6, Math.round(bodyPad * 0.5)),
    } as ViewStyle,

    title: {
      fontSize: titleSize,
      fontWeight: "600",
      color: colors.title,
    } as TextStyle,

    // заголовок плюс бейджи справа
    hTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
    } as ViewStyle,

    hTitle: {
      flex: 1,
      lineHeight: Math.round(titleSize * 1.2),
    } as TextStyle,

    subtitle: {
      fontSize: subtitleSize,
      color: colors.metaText,
    } as TextStyle,

    // подзаголовок: язык + автор + избранное справа
    hSubtitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    } as ViewStyle,

    hLangFlag: {
      width: 16,
      height: 12,
      borderRadius: 2,
    } as ImageStyle,

    // бейджи справа от заголовка
    hBadges: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginLeft: 8,
    } as ViewStyle,

    hBadgeNew: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.newBadgeBg,
      color: "#fff",
      fontWeight: "700",
      fontSize: Math.max(10, Math.round(metaFont * 0.95)),
      textTransform: "uppercase",
    } as TextStyle,

    hBadgeScore: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      fontWeight: "700",
      fontSize: Math.max(10, Math.round(metaFont * 0.95)),
      color: "#fff",
    } as TextStyle,
    hBadgeScoreGood: { backgroundColor: "#1f9d55" } as TextStyle,
    hBadgeScoreOk: { backgroundColor: "#d97706" } as TextStyle,
    hBadgeScoreWarn: { backgroundColor: "#b91c1c" } as TextStyle,

    // избранное inline
    hFavInline: {
      marginLeft: "auto",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    } as ViewStyle,

    hFavBtn: {
      backgroundColor: colors.tagBg,
      borderRadius: 999,
      padding: Math.max(6, Math.round(bodyPad * 0.4)),
    } as ViewStyle,

    hFavCount: {
      fontSize: Math.max(11, Math.round(metaFont)),
      fontWeight: "700",
      color: colors.title,
    } as TextStyle,

    // старая мета для вертикального
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

    // чипы мета (горизонтальный)
    chipsRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: chipGap,
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

    chipText: {
      fontSize: chipFont,
      color: colors.metaText,
    } as TextStyle,

    // теги
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
