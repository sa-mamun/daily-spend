import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSQLiteContext } from "expo-sqlite";
import { Directory, File, Paths } from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "../../i18n/Text";
import type { Language } from "../../context/LanguageContext";
import { PURPLE } from "../../theme/constants";
import { MINT_MODAL_SURFACE } from "../../theme/mint";
import {
  createBackupPayload,
  getBackupMaxBytes,
  restoreBackup,
  validateBackupText,
  type BackupPayload,
  type BackupSummary,
} from "./backupService";

type RestoreCandidate = {
  payload: BackupPayload;
  summary: BackupSummary;
  fileName: string;
};

type Props = {
  visible: boolean;
  dark: boolean;
  language: Language;
  onClose: () => void;
  onRestored: () => Promise<void>;
};

const MAX_FILE_SIZE = getBackupMaxBytes();

function isPickerCancellation(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /cancel|dismiss/i.test(`${error.name} ${error.message}`);
}

function formattedDate(value: string, language: Language) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(language === "en" ? "en-GB" : "bn-BD", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

export function BackupModal({
  visible,
  dark,
  language,
  onClose,
  onRestored,
}: Props) {
  const db = useSQLiteContext();
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<RestoreCandidate | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const palette = useMemo(
    () => ({
      background: dark ? MINT_MODAL_SURFACE : "#efebe2",
      surface: dark ? "#2a2924" : "#ffffff",
      secondarySurface: dark ? "#36332c" : "#efebe2",
      text: dark ? "#f5f0e6" : "#181713",
      muted: dark ? "#b9b2a4" : "#706b61",
      border: dark ? "#454035" : "#e8e4db",
      green: dark ? "#edc176" : PURPLE,
      greenSurface: dark ? "#48391f" : "#f7ead0",
    }),
    [dark],
  );

  useEffect(() => {
    if (!visible) return;
    let active = true;
    db.getFirstAsync<{ value: string }>(
      "SELECT value FROM app_settings WHERE key = ?",
      ["lastBackupAt"],
    )
      .then((row) => {
        if (active) setLastBackupAt(row?.value || null);
      })
      .catch((error) => console.error("Failed to load backup status:", error));
    setCandidate(null);
    setConfirmReplace(false);
    setFeedback(null);
    return () => {
      active = false;
    };
  }, [db, visible]);

  const rememberBackupTime = async (createdAt: string) => {
    setLastBackupAt(createdAt);
    try {
      await db.runAsync(
        "INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)",
        ["lastBackupAt", createdAt],
      );
    } catch (error) {
      console.error("Could not save the last-backup timestamp:", error);
    }
  };

  const createBackup = async () => {
    if (busy) return;
    setBusy("backup");
    setFeedback(null);
    try {
      const payload = await createBackupPayload(db, "1.0.0");
      const json = JSON.stringify(payload, null, 2);
      const stamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `daily-spend-backup-${stamp}.json`;
      if (Platform.OS === "android") {
        const directory = await Directory.pickDirectoryAsync();
        const file = directory.createFile(fileName, "application/json");
        file.write(json);
      } else {
        const file = new File(Paths.cache, fileName);
        file.create({ overwrite: true, intermediates: true });
        file.write(json);
        const available = await Sharing.isAvailableAsync();
        if (!available) throw new Error("sharing-unavailable");
        await Sharing.shareAsync(file.uri, {
          dialogTitle:
            language === "en" ? "Save Daily Spend backup" : "Daily Spend backup সংরক্ষণ",
          mimeType: "application/json",
          UTI: "public.json",
        });
      }
      await rememberBackupTime(payload.createdAt);
      setFeedback({
        kind: "success",
        message:
          language === "en"
            ? "Backup file created successfully. Keep a copy somewhere safe."
            : "Backup file তৈরি হয়েছে। নিরাপদ কোনো জায়গায় একটি কপি রাখুন।",
      });
    } catch (error) {
      if (!isPickerCancellation(error)) {
        console.error("Failed to create backup:", error);
        setFeedback({
          kind: "error",
          message:
            language === "en"
              ? "Could not create the backup. Check the selected folder and try again."
              : "Backup তৈরি করা যায়নি। নির্বাচিত folder দেখে আবার চেষ্টা করুন।",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const chooseBackup = async () => {
    if (busy) return;
    setBusy("restore");
    setFeedback(null);
    setCandidate(null);
    setConfirmReplace(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/plain"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (typeof asset.size === "number" && asset.size > MAX_FILE_SIZE)
        throw new Error("backup-too-large");
      const parsed = validateBackupText(await new File(asset.uri).text());
      setCandidate({
        payload: parsed.payload,
        summary: parsed.summary,
        fileName: asset.name,
      });
    } catch (error) {
      if (!isPickerCancellation(error)) {
        console.error("Failed to read backup file:", error);
        const tooLarge =
          error instanceof Error && error.message === "backup-too-large";
        setFeedback({
          kind: "error",
          message:
            tooLarge
              ? language === "en"
                ? "This backup file is too large to restore."
                : "এই backup file-টি restore করার জন্য অতিরিক্ত বড়।"
              : language === "en"
                ? "This file is invalid or was created by an unsupported backup version. Your current data is unchanged."
                : "এই file সঠিক নয় বা backup version সমর্থিত নয়। আপনার বর্তমান data অপরিবর্তিত আছে।",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const applyRestore = async () => {
    if (!candidate || !confirmReplace || busy) return;
    setBusy("restore");
    setFeedback(null);
    try {
      await restoreBackup(db, candidate.payload);
      await onRestored();
      setCandidate(null);
      setConfirmReplace(false);
      setFeedback({
        kind: "success",
        message:
          language === "en"
            ? "Backup restored. Expenses, categories, budgets and reminders have been refreshed."
            : "Backup restore হয়েছে। Expense, category, budget ও reminder আপডেট করা হয়েছে।",
      });
    } catch (error) {
      console.error("Failed to restore backup:", error);
      setFeedback({
        kind: "error",
        message:
          language === "en"
            ? "Restore failed. The current data was kept unchanged. Try again with another backup file."
            : "Restore করা যায়নি। বর্তমান data অপরিবর্তিত আছে। অন্য backup file দিয়ে চেষ্টা করুন।",
      });
    } finally {
      setBusy(null);
    }
  };

  const cardStyle = {
    backgroundColor: palette.surface,
    borderColor: palette.border,
  } as const;
  const buttonStyle = (secondary = false) => ({
    backgroundColor: secondary ? palette.greenSurface : dark ? "#f4eedf" : "#181713",
    borderColor: secondary ? palette.border : PURPLE,
  });

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={false}
    >
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: dark ? "#10121acc" : "#20223588",
        }}
      >
        <View
          style={{
            maxHeight: "92%",
            backgroundColor: palette.background,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: dark ? 1 : 0,
            borderColor: palette.border,
            paddingTop: 22,
            paddingBottom: 18,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={language === "en" ? "Close backup settings" : "Backup settings বন্ধ করুন"}
            onPress={onClose}
            disabled={busy !== null}
            style={({ pressed }) => ({
              position: "absolute",
              zIndex: 2,
              right: 14,
              top: 9,
              width: 42,
              height: 42,
              borderRadius: 13,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? palette.secondarySurface : "transparent",
              opacity: busy ? 0.5 : 1,
            })}
          >
            <Ionicons name="close" size={25} color={palette.muted} />
          </Pressable>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={{ color: palette.green, fontSize: 13, fontWeight: "600" }}>
              ডেটা ও গোপনীয়তা
            </Text>
            <Text
              style={{
                color: palette.text,
                fontSize: 23,
                fontWeight: "600",
                marginTop: 3,
                marginBottom: 5,
              }}
            >
              ব্যাকআপ ও রিস্টোর
            </Text>
            <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 19, marginBottom: 16 }}>
              আপনার তথ্য এই ডিভাইসেই থাকে। Backup file আপনার বেছে নেওয়া জায়গায় সংরক্ষিত হবে।
            </Text>

            <View
              style={{
                ...cardStyle,
                borderWidth: 1,
                borderRadius: 16,
                padding: 15,
                marginBottom: 12,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.greenSurface,
                  }}
                >
                  <Ionicons name="cloud-download-outline" size={22} color={palette.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 15, fontWeight: "600" }}>
                    ব্যাকআপ তৈরি করুন
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 3 }}>
                    {lastBackupAt
                      ? `${language === "en" ? "Last backup" : "শেষ backup"}: ${formattedDate(lastBackupAt, language)}`
                      : "এখনও কোনো backup তৈরি হয়নি"}
                  </Text>
                </View>
              </View>
              <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18, marginTop: 12 }}>
              এতে expense, category, subcategory, budget, reminder history এবং app-এর appearance ও language setting থাকবে।
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={createBackup}
                disabled={busy !== null}
                style={({ pressed }) => ({
                  ...buttonStyle(),
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 13,
                  opacity: busy || pressed ? 0.78 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                {busy === "backup" ? (
                  <ActivityIndicator size="small" color={dark ? "#1b1b18" : "#fff"} />
                ) : (
                  <Ionicons name="download-outline" size={18} color={dark ? "#1b1b18" : "#fff"} />
                )}
                <Text style={{ color: dark ? "#1b1b18" : "#fff", fontWeight: "600", fontSize: 14 }}>
                  {busy === "backup"
                    ? language === "en"
                      ? "Creating backup…"
                      : "Backup তৈরি হচ্ছে…"
                    : "ব্যাকআপ তৈরি করুন"}
                </Text>
              </Pressable>
            </View>

            <View
              style={{
                ...cardStyle,
                borderWidth: 1,
                borderRadius: 16,
                padding: 15,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 13,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: palette.greenSurface,
                  }}
                >
                  <Ionicons name="folder-open-outline" size={22} color={palette.green} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: palette.text, fontSize: 15, fontWeight: "600" }}>
                    ফাইল থেকে restore করুন
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 3 }}>
                    Daily Spend JSON backup file বেছে নিন
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={chooseBackup}
                disabled={busy !== null}
                style={({ pressed }) => ({
                  ...buttonStyle(true),
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 8,
                  marginTop: 13,
                  opacity: busy || pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.985 : 1 }],
                })}
              >
                {busy === "restore" && !candidate ? (
                  <ActivityIndicator size="small" color={palette.green} />
                ) : (
                  <Ionicons name="folder-open-outline" size={18} color={palette.green} />
                )}
                <Text style={{ color: palette.green, fontWeight: "600", fontSize: 14 }}>
                  Backup file বেছে নিন
                </Text>
              </Pressable>

              {candidate && (
                <View
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 13,
                    backgroundColor: palette.secondarySurface,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="middle"
                    style={{ color: palette.text, fontSize: 13, fontWeight: "600" }}
                  >
                    {candidate.fileName}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 5 }}>
                    {language === "en"
                      ? `${candidate.summary.expenseCount} ${candidate.summary.expenseCount === 1 ? "expense" : "expenses"} · ${candidate.summary.categoryCount} ${candidate.summary.categoryCount === 1 ? "category" : "categories"} · ${candidate.summary.subcategoryCount} ${candidate.summary.subcategoryCount === 1 ? "subcategory" : "subcategories"} · ${candidate.summary.budgetCount} ${candidate.summary.budgetCount === 1 ? "budget" : "budgets"} · ${candidate.summary.reminderCount} ${candidate.summary.reminderCount === 1 ? "reminder" : "reminders"}`
                      : `${candidate.summary.expenseCount}টি expense · ${candidate.summary.categoryCount}টি category · ${candidate.summary.subcategoryCount}টি subcategory · ${candidate.summary.budgetCount}টি budget · ${candidate.summary.reminderCount}টি reminder`}
                  </Text>
                  <Text style={{ color: palette.muted, fontSize: 12, marginTop: 3 }}>
                    {language === "en" ? "Backup date: " : "Backup-এর তারিখ: "}
                    {formattedDate(candidate.summary.createdAt, language)}
                  </Text>
                  <View
                    style={{
                      marginTop: 11,
                      padding: 10,
                      borderRadius: 10,
                      backgroundColor: dark ? "#3c3028" : "#fff4df",
                    }}
                  >
                    <Text style={{ color: dark ? "#ffd18a" : "#8b5b0b", fontSize: 12, lineHeight: 18 }}>
                      এটি বর্তমান সব expense ও category বদলে দেবে। App থেকে এই পরিবর্তন undo করা যাবে না।
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmReplace }}
                    onPress={() => setConfirmReplace((checked) => !checked)}
                    style={({ pressed }) => ({
                      flexDirection: "row",
                      gap: 9,
                      alignItems: "center",
                      paddingVertical: 11,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <Ionicons
                      name={confirmReplace ? "checkbox" : "square-outline"}
                      size={21}
                      color={confirmReplace ? palette.green : palette.muted}
                    />
                    <Text style={{ flex: 1, color: palette.text, fontSize: 12, lineHeight: 17 }}>
                      বুঝেছি, এটি আমার বর্তমান data বদলে দেবে
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={applyRestore}
                    disabled={!confirmReplace || busy !== null}
                    style={({ pressed }) => ({
                      backgroundColor: confirmReplace ? "#c7444b" : dark ? "#4d3540" : "#f3dfe1",
                      borderRadius: 12,
                      paddingVertical: 12,
                      alignItems: "center",
                      opacity: busy || pressed ? 0.78 : confirmReplace ? 1 : 0.65,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    })}
                  >
                    {busy === "restore" && candidate ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={{ color: confirmReplace ? "#ffffff" : palette.muted, fontWeight: "600" }}>
                        বর্তমান data বদলে restore করুন
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setCandidate(null);
                      setConfirmReplace(false);
                    }}
                    style={({ pressed }) => ({ alignItems: "center", paddingTop: 11, opacity: pressed ? 0.65 : 1 })}
                  >
                    <Text style={{ color: palette.muted, fontWeight: "600" }}>Restore বাতিল করুন</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {feedback && (
              <View
                accessibilityRole={feedback.kind === "error" ? "alert" : "text"}
                style={{
                  marginTop: 12,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor:
                    feedback.kind === "error"
                      ? dark
                        ? "#452a34"
                        : "#fff0f1"
                      : palette.greenSurface,
                }}
              >
                <Text
                  style={{
                    color:
                      feedback.kind === "error"
                        ? dark
                          ? "#ffb6bb"
                          : "#a52f38"
                        : palette.green,
                    fontSize: 12,
                    lineHeight: 18,
                    fontWeight: "600",
                  }}
                >
                  {feedback.message}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
