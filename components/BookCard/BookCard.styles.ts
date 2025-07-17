import { StyleSheet } from "react-native";

export const TAG_COLORS: Record<string, string> = {
  language: "#FF7D7F",
  artist:   "#FB8DF4",
  character:"#F3E17F",
  parody:   "#BCEA83",
  group:    "#86F0C6",
  category: "#92EFFF",
  tag:      "hsla(260, 25%, 65%, 1.00)",
};

export const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    backgroundColor: "#36334d",
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },

  /* cover */
  imageWrap: { position: "relative", width: "100%", aspectRatio: 3 / 4 },
  cover: { width: "100%", height: "100%" },
  langFlag: {
    position: "absolute",
    top: 4,
    left: 4,
    fontSize: 20,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 2,
  },
  favBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    padding: 5,
    borderRadius: 999,
  },
  newBadge: {
    position: "absolute",
    bottom: -8,
    left: 14,
    backgroundColor: "#ff4757",
    color: "#fff",
    fontWeight: "700",
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    textTransform: "uppercase",
  },

  /* body */
  body: { padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: "600", color: "#bcb8e0" },

  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#9b94d1" },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6,  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    color: "#ececec",
    backgroundColor: "#2b293d",
  },
  tagSelected: { borderWidth: 1, borderColor: "#fff" },
});
