import React, { useContext, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { Text } from "../i18n/Text";
import { LanguageContext } from "../context/LanguageContext";
import { ThemeContext, PURPLE } from "../theme/constants";
import { styles, darkStyles } from "../theme/styles";
import { localDateKey } from "../utils/dates";

export function AppDatePicker({
  value,
  onSelect,
  onClose,
  onConfirm,
}: {
  value: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  onConfirm?: () => void;
}) {
  const dark = useContext(ThemeContext);
  const { language } = useContext(LanguageContext);
  const locale = language === "en" ? "en-GB" : "bn-BD";
  const weekdays =
    language === "en"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহস্পতি", "শুক্র", "শনি"];
  const [month, setMonth] = useState(
    new Date(value.getFullYear(), value.getMonth(), 1),
  );
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = new Date(year, monthIndex, 1).getDay();
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const selectedDay =
    value.getFullYear() === year && value.getMonth() === monthIndex
      ? value.getDate()
      : 0;
  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.modalBg}>
        <View
          style={[
            styles.modal,
            dark && darkStyles.modal,
            { paddingBottom: 22 },
          ]}
        >
          <Pressable style={styles.close} onPress={onClose}>
            <Text style={[styles.closeText, dark && darkStyles.closeText]}>
              ×
            </Text>
          </Pressable>
          <Text style={[styles.eyebrow, dark && darkStyles.eyebrow]}>
            তারিখ বেছে নিন
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 18,
            }}
          >
            <Pressable
              onPress={() => setMonth(new Date(year, monthIndex - 1, 1))}
            >
              <Text style={[styles.dateNav, dark && darkStyles.dateNav]}>
                ‹
              </Text>
            </Pressable>
            <Text
              style={[
                styles.modalTitle,
                dark && darkStyles.modalTitle,
                { marginBottom: 0 },
              ]}
            >
              {month.toLocaleDateString(locale, {
                month: "long",
                year: "numeric",
              })}
            </Text>
            <Pressable
              onPress={() => setMonth(new Date(year, monthIndex + 1, 1))}
            >
              <Text style={[styles.dateNav, dark && darkStyles.dateNav]}>
                ›
              </Text>
            </Pressable>
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 20,
            }}
          >
            {weekdays.map((day) => (
              <Text
                key={day}
                style={[styles.dateWeek, dark && darkStyles.dateWeek]}
              >
                {day}
              </Text>
            ))}
          </View>
          <View
            style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}
          >
            {Array.from({ length: 42 }, (_, index) => {
              const day = index - firstDay + 1;
              const valid = day > 0 && day <= days;
              const chosen = valid && day === selectedDay;
              return (
                <Pressable
                  key={index}
                  disabled={!valid}
                  onPress={() => onSelect(new Date(year, monthIndex, day))}
                  style={{
                    width: "14.285%",
                    height: 38,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={[
                      styles.dateDay,
                      dark && darkStyles.dateDay,
                      chosen &&
                        (dark
                          ? darkStyles.dateDayActive
                          : styles.dateDayActive),
                    ]}
                  >
                    {valid ? day : ""}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Pressable style={styles.primary} onPress={onConfirm || onClose}>
            <Text style={styles.primaryText}>তারিখ ঠিক আছে</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
