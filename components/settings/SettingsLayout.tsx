import { useTheme } from "@/lib/ThemeContext";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function SettingsLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.topBar, { paddingTop: 7, backgroundColor: colors.searchBg, borderColor: colors.page }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} android_ripple={{ color: "#ffffff22", borderless: false }}>
          <Feather name="arrow-left" size={20} color={colors.searchTxt} />
        </Pressable>
        <Text style={[styles.topTitle, { color: colors.searchTxt }]}>{title}</Text>
        <View style={styles.iconBtn} />
      </View>
      <ScrollView style={[styles.page, { backgroundColor: colors.bg }]} contentContainerStyle={{ paddingTop: 7, paddingBottom: 24 }} contentInsetAdjustmentBehavior="never">
        {children}
        <Text style={[styles.caption, { color: colors.txt }]}>v{Constants.expoConfig?.version} Beta</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  topBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  topTitle: { flex: 1, fontSize: 16, fontWeight: "700", marginLeft: 6 },
  iconBtn: { padding: 8, borderRadius: 10, overflow: "hidden" },
  caption: { textAlign: "center", opacity: 0.5, marginVertical: 24 },
});