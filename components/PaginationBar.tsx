import { hsbToHex } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
};

export default function PaginationBar({
  currentPage,
  totalPages,
  onChange,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [sliderPage, setSliderPage] = useState(currentPage);

  if (totalPages <= 1) return null;

  return (
    <>
      <View style={[styles.bar, { backgroundColor: COLORS.bg }]}>
        <TouchableOpacity
          onPress={() => currentPage > 1 && onChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Ionicons
            name="chevron-back"
            size={30}
            color={currentPage === 1 ? COLORS.disabled : COLORS.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setSliderPage(currentPage);
            setVisible(true);
          }}
        >
          <Text style={[styles.indicator, { color: COLORS.text }]}>
            {currentPage} / {totalPages}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => currentPage < totalPages && onChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Ionicons
            name="chevron-forward"
            size={30}
            color={currentPage === totalPages ? COLORS.disabled : COLORS.text}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.backdrop}>
          <View style={[styles.modal, { backgroundColor: COLORS.bg }]}>
            <Text style={[styles.title, { color: COLORS.text }]}>
              Сменить страницу
            </Text>
            <Slider
              style={{ width: "100%" }}
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
              >
                <Ionicons name="chevron-back" size={32} color={COLORS.text} />
              </TouchableOpacity>
              <Text style={[styles.pageText, { color: COLORS.text }]}>
                {sliderPage} / {totalPages}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  setSliderPage((p) => Math.min(totalPages, p + 1))
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={32}
                  color={COLORS.text}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.buttons}>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Text style={[styles.btnCancel, { color: COLORS.disabled }]}>
                  Отмена
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setVisible(false);
                  sliderPage !== currentPage && onChange(sliderPage);
                }}
              >
                <Text style={[styles.btnOk, { color: COLORS.accent }]}>OK</Text>
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
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  indicator: {
    fontSize: 20,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "85%",
    borderRadius: 8,
    padding: 20,
  },
  title: {
    fontSize: 20,
    marginBottom: 20,
  },
  pager: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 20,
  },
  pageText: {
    fontSize: 26,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  btnCancel: {
    fontSize: 18,
    padding: 10,
  },
  btnOk: {
    fontSize: 18,
    padding: 10,
  },
});
