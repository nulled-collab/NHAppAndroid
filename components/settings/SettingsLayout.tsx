import { useI18n } from "@/lib/i18n/I18nContext";
import { useTheme } from "@/lib/ThemeContext";
import Constants from "expo-constants";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function SettingsLayout({
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        style={[styles.page, { backgroundColor: colors.bg }]}
        contentContainerStyle={{ paddingTop: 7, paddingBottom: 24 }}
        contentInsetAdjustmentBehavior="never"
      >
        {children}
        <Text style={[styles.caption, { color: colors.txt }]}>
          v{Constants.expoConfig?.version} {t("app.version.beta")}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 16 },
  caption: { textAlign: "center", opacity: 0.5, marginVertical: 24 },
});
