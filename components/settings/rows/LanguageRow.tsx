import { useTheme } from "@/lib/ThemeContext";
import { AppLocale, useI18n } from "@/lib/i18n/I18nContext";
import React from "react";
import { Pressable, Text, View } from "react-native";

export default function LanguageRow() {
  const { colors } = useTheme();
  const { t, available, locale, setLocale } = useI18n();

  return (
    <View>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.txt }}>
        {t("settings.language.choose")}
      </Text>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
        {available.map((opt) => (
          <Chip
            key={opt.code}
            active={locale === opt.code}
            label={opt.label}
            onPress={() => setLocale(opt.code as AppLocale)}
            colors={colors}
          />
        ))}
      </View>

      <Text style={{ fontSize: 12, color: colors.sub, marginTop: 10 }}>
        {t("settings.language.note")}
      </Text>
    </View>
  );
}

function Chip({
  active,
  label,
  onPress,
  colors,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
  colors: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.accent : colors.page,
        backgroundColor: active ? colors.accent + "22" : colors.bg,
      }}
    >
      <Text style={{ color: active ? colors.accent : colors.txt, fontWeight: "600" }}>{label}</Text>
    </Pressable>
  );
}
