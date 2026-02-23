import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { readAsStringAsync } from "expo-file-system";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { api, Property } from "@/lib/api";
import { theme } from "@/constants/Colors";

const FIELD_LABELS: Record<string, string> = {
  name: "物件名",
  address: "所在地",
  nearestStation: "最寄駅",
  walkMinutes: "徒歩分数",
  price: "価格（万円）",
  managementFee: "管理費（円）",
  repairReserve: "修繕積立金（円）",
  deposit: "敷金（円）",
  keyMoney: "礼金（円）",
  layout: "間取り",
  area: "専有面積（㎡）",
  balconyArea: "バルコニー面積（㎡）",
  builtDate: "築年月",
  structure: "構造",
  floors: "建物階数",
  floor: "所在階",
  transactionType: "取引態様",
  managementCompany: "管理会社",
  contactInfo: "連絡先",
  notes: "備考",
};

const EDITABLE_FIELDS = Object.keys(FIELD_LABELS);

export default function ImportScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState<"select" | "loading" | "preview">("select");
  const [extractedData, setExtractedData] = useState<Record<string, string | number | null>>({});
  const [equipment, setEquipment] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [pdfName, setPdfName] = useState("");

  if (!user) {
    router.replace("/auth");
    return null;
  }

  async function handlePickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setPdfName(file.name);
      setStep("loading");

      const base64 = await readAsStringAsync(file.uri, {
        encoding: "base64",
      });

      const res = await api.extractPdf(base64);
      const data = res.extracted as Record<string, unknown>;

      const equipmentData = Array.isArray(data.equipment)
        ? (data.equipment as string[])
        : [];
      setEquipment(equipmentData);

      const fields: Record<string, string | number | null> = {};
      for (const key of EDITABLE_FIELDS) {
        const val = data[key];
        fields[key] = val !== undefined && val !== null ? String(val) : null;
      }
      setExtractedData(fields);
      setStep("preview");
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "PDF読み込みに失敗しました");
      setStep("select");
    }
  }

  function updateField(key: string, value: string) {
    setExtractedData((prev) => ({ ...prev, [key]: value || null }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...extractedData, equipment };
      await api.createProperty(body as Partial<Property>);
      Alert.alert("成功", "物件を登録しました", [
        { text: "OK", onPress: () => {
          setStep("select");
          setExtractedData({});
          setEquipment([]);
          router.push("/(tabs)");
        }},
      ]);
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  if (step === "select") {
    return (
      <View style={styles.container}>
        <View style={styles.selectContent}>
          <FontAwesome name="file-pdf-o" size={64} color={theme.accent} />
          <Text style={styles.selectTitle}>マイソクPDFを読み込む</Text>
          <Text style={styles.selectDesc}>
            PDFを選択すると、AIが物件情報を自動で抽出します
          </Text>
          <TouchableOpacity style={styles.selectButton} onPress={handlePickPdf}>
            <FontAwesome name="folder-open" size={18} color="#fff" />
            <Text style={styles.selectButtonText}>PDFを選択</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === "loading") {
    return (
      <View style={styles.container}>
        <View style={styles.selectContent}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.loadingTitle}>AI解析中...</Text>
          <Text style={styles.loadingDesc}>{pdfName}</Text>
          <Text style={styles.loadingDesc}>
            物件情報を抽出しています。しばらくお待ちください。
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.previewContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>抽出結果プレビュー</Text>
        <Text style={styles.previewDesc}>
          内容を確認・編集して保存してください
        </Text>
      </View>

      {EDITABLE_FIELDS.map((key) => (
        <View key={key} style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>{FIELD_LABELS[key]}</Text>
          <TextInput
            style={styles.fieldInput}
            value={extractedData[key] != null ? String(extractedData[key]) : ""}
            onChangeText={(v) => updateField(key, v)}
            placeholder="未入力"
            placeholderTextColor={theme.textMuted}
          />
        </View>
      ))}

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>設備</Text>
        <Text style={styles.equipmentText}>
          {equipment.length > 0 ? equipment.join("、") : "なし"}
        </Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setStep("select");
            setExtractedData({});
            setEquipment([]);
          }}
        >
          <Text style={styles.cancelText}>キャンセル</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  selectContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 16,
  },
  selectTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text,
    marginTop: 8,
  },
  selectDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  selectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: theme.accent,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 12,
  },
  selectButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
    marginTop: 16,
  },
  loadingDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
  },
  previewContent: { padding: 16, paddingBottom: 40 },
  previewHeader: { marginBottom: 16 },
  previewTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 4,
  },
  previewDesc: { fontSize: 13, color: theme.textSecondary },
  fieldRow: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  equipmentText: {
    fontSize: 14,
    color: theme.text,
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  cancelText: { color: theme.textSecondary, fontSize: 15 },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.accent,
    alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
