import { hsbToHex } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const COLORS = {
  bg: hsbToHex({ saturation: 80, brightness: 60 }),
  text: hsbToHex({ saturation: 100, brightness: 200 }),
  accent: hsbToHex({ saturation: 100, brightness: 200 }),
  disabled: hsbToHex({ saturation: 100, brightness: 100 }),
  progress: hsbToHex({ saturation: 90, brightness: 180 }),
};

export default function PaginationBar({
  currentPage,
  totalPages,
  onChange,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [sliderPage, setSliderPage] = useState(currentPage);
  const scaleAnim = useState(new Animated.Value(1))[0];

  if (totalPages <= 1) return null;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <View style={styles.bar}>
        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => currentPage > 1 && onChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={styles.button}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentPage === 1 ? COLORS.disabled : COLORS.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => {
            setSliderPage(currentPage);
            setVisible(true);
          }}
          style={styles.indicatorContainer}
        >
          <Animated.View style={[styles.indicatorWrapper, { transform: [{ scale: scaleAnim }] }]}>
            <Text style={[styles.indicator, { color: COLORS.text }]}>
              {currentPage}/{totalPages}
            </Text>
          </Animated.View>
        </TouchableOpacity>

        <TouchableOpacity
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          onPress={() => currentPage < totalPages && onChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={styles.button}
        >
          <Ionicons
            name="chevron-forward"
            size={24}
            color={currentPage === totalPages ? COLORS.disabled : COLORS.text}
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
          <View style={[styles.modal, { backgroundColor: COLORS.bg }]}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              Выбор страницы
            </Text>
            <Slider
              style={styles.slider}
              minimumValue={1}
              maximumValue={totalPages}
              step={1}
              value={sliderPage}
              onValueChange={setSliderPage}
              minimumTrackTintColor={COLORS.accent}
              maximumTrackTintColor={COLORS.disabled}
              thumbTintColor={COLORS.accent}
            />
            <View style={styles.pager}>
              <TouchableOpacity
                onPress={() => setSliderPage((p) => Math.max(1, p - 1))}
                style={styles.modalButton}
              >
                <Ionicons name="chevron-back" size={28} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: COLORS.text }]}>
                {sliderPage}/{totalPages}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSliderPage((p) => Math.min(totalPages, p + 1))
                }
                style={styles.modalButton}
              >
                <Ionicons name="chevron-forward" size={28} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.buttons}>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.actionButton}
              >
                <Text style={[styles.btnCancel, { color: COLORS.disabled }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  sliderPage !== currentPage && onChange(sliderPage);
                }}
                style={[styles.actionButton, { backgroundColor: COLORS.accent }]}
              >
                <Text style={[styles.btnOk, { color: COLORS.bg }]}>OK</Text>
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
    paddingVertical: 0,
    paddingHorizontal: 16,
    backgroundColor: COLORS.bg,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
  },
  button: {
    padding: 8,
    borderRadius: 16,
  },
  indicatorContainer: {
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
  },
  indicatorWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircle: {
    width: 100,
    height: 4,
    backgroundColor: COLORS.disabled,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  indicator: {
    fontSize: 16,
    fontWeight: "600",
  },
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
  slider: {
    width: "100%",
    height: 40,
  },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 16,
  },
  pageText: {
    fontSize: 22,
    fontWeight: "500",
  },
  modalButton: {
    padding: 8,
    borderRadius: 12,
  },
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
  btnCancel: {
    fontSize: 16,
    fontWeight: "500",
  },
  btnOk: {
    fontSize: 16,
    fontWeight: "600",
  },
});