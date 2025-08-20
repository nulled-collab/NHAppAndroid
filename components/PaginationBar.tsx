import { useTheme } from "@/lib/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React, { useMemo, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
  onRequestScrollTop?: () => void;
}

export default function PaginationBar({
  currentPage,
  totalPages,
  onChange,
  onRequestScrollTop,
}: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const [sliderPage, setSliderPage] = useState(currentPage);
  const scaleAnim = useMemo(() => new Animated.Value(1), []);

  if (totalPages <= 1) return null;

  const animate = (to: number) =>
    Animated.spring(scaleAnim, { toValue: to, useNativeDriver: true }).start();

  const handleChange = (next: number) => {
    if (next === currentPage) return;
    onRequestScrollTop?.();
    onChange(next);
  };

  return (
    <>
      <View style={[styles.bar, { backgroundColor: colors.menuBg }]}>
        <TouchableOpacity
          onPressIn={() => animate(0.95)}
          onPressOut={() => animate(1)}
          onPress={() => currentPage > 1 && handleChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={styles.button}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentPage === 1 ? colors.sub : colors.menuTxt}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPressIn={() => animate(0.95)}
          onPressOut={() => animate(1)}
          onPress={() => {
            setSliderPage(currentPage);
            setVisible(true);
          }}
          style={styles.indicatorContainer}
        >
          <Animated.View
            style={[
              styles.indicatorWrapper,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            <Text style={[styles.indicator, { color: colors.menuTxt }]}>
              {currentPage}/{totalPages}
            </Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPressIn={() => animate(0.95)}
          onPressOut={() => animate(1)}
          onPress={() =>
            currentPage < totalPages && handleChange(currentPage + 1)
          }
          disabled={currentPage === totalPages}
          style={styles.button}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={currentPage === totalPages ? colors.sub : colors.menuTxt}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: colors.page }]}>
            <Text style={[styles.title, { color: colors.txt }]}>
              Выбор страницы
            </Text>

            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={totalPages}
              step={1}
              value={sliderPage}
              onValueChange={setSliderPage}
              minimumTrackTintColor={colors.accent}
              maximumTrackTintColor={colors.sub}
              thumbTintColor={colors.accent}
            />

            <View style={styles.pager}>
              <TouchableOpacity
                onPress={() => setSliderPage((p) => Math.max(1, p - 1))}
                style={styles.modalButton}
              >
                <Ionicons name="chevron-back" size={28} color={colors.txt} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: colors.txt }]}>
                {sliderPage}/{totalPages}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSliderPage((p) => Math.min(totalPages, p + 1))
                }
                style={styles.modalButton}
              >
                <Ionicons name="chevron-forward" size={28} color={colors.txt} />
              </TouchableOpacity>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.actionButton}
              >
                <Text style={[styles.btnCancel, { color: colors.sub }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  if (sliderPage !== currentPage) handleChange(sliderPage);
                }}
                style={[
                  styles.actionButton,
                  { backgroundColor: colors.accent },
                ]}
              >
                <Text style={[styles.btnOk, { color: colors.bg }]}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  button: { padding: 8, borderRadius: 16 },
  indicatorContainer: { flex: 1, marginHorizontal: 8, alignItems: "center" },
  indicatorWrapper: { alignItems: "center", justifyContent: "center" },
  indicator: { fontSize: 16, fontWeight: "600" },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  slider: { width: "100%", height: 40 },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },
  pageText: { fontSize: 22, fontWeight: "500" },
  modalButton: { padding: 8, borderRadius: 12 },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 12,
    minWidth: 100,
    alignItems: "center",
  },
  btnCancel: { fontSize: 16, fontWeight: "500" },
  btnOk: { fontSize: 16, fontWeight: "600" },
});
