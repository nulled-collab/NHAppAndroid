import React from "react";
import { StyleSheet, View } from "react-native";
import { RowBtn, RowToggle } from "./Buttons";

export function ControlsMobile({
  colors,
  canDual,
  settings,
  setOrientation,
  toggleDual,
  toggleFit,
  tapFlipEnabled,
  toggleTapFlip,
  handSwap,
  toggleHandSwap,
  inspect,
  toggleInspect,
  onBack,
  isSingleFrame,
}: {
  colors: any;
  canDual: boolean;
  settings: {
    orientation: "vertical" | "horizontal";
    dualInLandscape: boolean;
    fit: "contain" | "cover";
  };
  setOrientation: (o: "vertical" | "horizontal") => void;
  toggleDual: () => void;
  toggleFit: () => void;
  tapFlipEnabled: boolean;
  toggleTapFlip: () => void;
  handSwap: boolean;
  toggleHandSwap: () => void;
  inspect: boolean;
  toggleInspect: () => void;
  onBack: () => void;
  isSingleFrame: boolean;
}) {
  const inspectDisabled = !isSingleFrame;

  return (
    <View
      style={[
        styles.bottomBar,
        { backgroundColor: colors.searchBg, borderColor: colors.page },
      ]}
    >
      <View style={styles.slot}>
        <RowBtn
          onPress={onBack}
          icon="corner-up-left"
          label="Назад"
          color={colors.searchTxt}
        />
      </View>

      <View style={styles.slot}>
        <RowToggle
          active={tapFlipEnabled}
          onToggle={toggleTapFlip}
          icon="loader"
          label="Тап"
          color={colors.searchTxt}
          activeColor={colors.accent}
        />
      </View>

      <View style={styles.slot}>
        <RowToggle
          active={handSwap}
          onToggle={toggleHandSwap}
          icon="repeat"
          label={handSwap ? "L-R" : "R-L"}
          color={colors.searchTxt}
          activeColor={colors.accent}
        />
      </View>

      <View style={styles.slot}>
        <RowBtn
          onPress={() =>
            setOrientation(
              settings.orientation === "vertical" ? "horizontal" : "vertical"
            )
          }
          icon={
            settings.orientation === "vertical" ? "arrow-down" : "arrow-right"
          }
          label="Ориент."
          color={colors.searchTxt}
        />
      </View>

      <View style={styles.slot}>
        <RowBtn
          onPress={toggleFit}
          icon={settings.fit === "contain" ? "maximize" : "minimize"}
          label={settings.fit === "contain" ? "Подогн." : "Заполн."}
          color={colors.searchTxt}
        />
      </View>

      <View style={[styles.slot, inspectDisabled && { opacity: 0.45 }]}>
        <RowToggle
          active={inspect && !inspectDisabled}
          onToggle={() => {
            if (!inspectDisabled) toggleInspect();
          }}
          icon="search"
          label="Осмотр"
          color={colors.searchTxt}
          activeColor={colors.accent}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8 + 28 + 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 6,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 0,
    zIndex: 19,
  },
  slot: {
    alignItems: "center",
    minWidth: 0,
    marginHorizontal: 0,
  },
});
