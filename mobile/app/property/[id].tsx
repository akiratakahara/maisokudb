import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Share,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { api, Property } from "@/lib/api";
import { theme } from "@/constants/Colors";

const FIELD_CONFIG: { key: keyof Property; label: string }[] = [
  { key: "name", label: "物件名" },
  { key: "address", label: "所在地" },
  { key: "nearestStation", label: "最寄駅" },
  { key: "walkMinutes", label: "徒歩分数" },
  { key: "price", label: "価格（万円）" },
  { key: "managementFee", label: "管理費（円）" },
  { key: "repairReserve", label: "修繕積立金（円）" },
  { key: "deposit", label: "敷金（円）" },
  { key: "keyMoney", label: "礼金（円）" },
  { key: "layout", label: "間取り" },
  { key: "area", label: "専有面積（㎡）" },
  { key: "balconyArea", label: "バルコニー面積（㎡）" },
  { key: "builtDate", label: "築年月" },
  { key: "structure", label: "構造" },
  { key: "floors", label: "建物階数" },
  { key: "floor", label: "所在階" },
  { key: "transactionType", label: "取引態様" },
  { key: "managementCompany", label: "管理会社" },
  { key: "contactInfo", label: "連絡先" },
  { key: "notes", label: "備考" },
];

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [emailText, setEmailText] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    fetchProperty();
  }, [id]);

  async function fetchProperty() {
    try {
      const res = await api.getProperty(id);
      setProperty(res.property);
      initEditData(res.property);
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "物件の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  function initEditData(p: Property) {
    const data: Record<string, string> = {};
    for (const { key } of FIELD_CONFIG) {
      const val = p[key];
      data[key as string] = val !== null && val !== undefined ? String(val) : "";
    }
    setEditData(data);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.updateProperty(id, editData as unknown as Partial<Property>);
      setProperty(res.property);
      initEditData(res.property);
      setEditing(false);
      Alert.alert("成功", "物件情報を更新しました");
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "更新に失敗しました");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    Alert.alert("確認", "この物件を削除しますか？この操作は取り消せません。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteProperty(id);
            Alert.alert("成功", "物件を削除しました");
            router.back();
          } catch (e) {
            Alert.alert("エラー", e instanceof Error ? e.message : "削除に失敗しました");
          }
        },
      },
    ]);
  }

  async function handleGenerateEmail() {
    setEmailLoading(true);
    setEmailModalVisible(true);
    try {
      const res = await api.generateEmail(id);
      setEmailText(res.email);
    } catch (e) {
      setEmailText("");
      Alert.alert("エラー", e instanceof Error ? e.message : "メール生成に失敗しました");
      setEmailModalVisible(false);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleShareEmail() {
    if (emailText) {
      await Share.share({ message: emailText });
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>物件が見つかりません</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.headerName}>{property.name}</Text>
        <Text style={styles.headerPrice}>
          {property.price ? `${property.price}万円` : "価格未定"}
        </Text>
        <View style={styles.headerBadges}>
          {property.layout && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{property.layout}</Text>
            </View>
          )}
          {property.area && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{property.area}㎡</Text>
            </View>
          )}
          {property.structure && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{property.structure}</Text>
            </View>
          )}
        </View>
        {property.nearestStation && (
          <View style={styles.stationRow}>
            <FontAwesome name="train" size={12} color={theme.textSecondary} />
            <Text style={styles.stationText}>
              {property.nearestStation}
              {property.walkMinutes ? ` 徒歩${property.walkMinutes}分` : ""}
            </Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            if (editing) {
              setEditing(false);
              if (property) initEditData(property);
            } else {
              setEditing(true);
            }
          }}
        >
          <FontAwesome
            name={editing ? "times" : "pencil"}
            size={16}
            color={theme.text}
          />
          <Text style={styles.actionText}>
            {editing ? "キャンセル" : "編集"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleGenerateEmail}
        >
          <FontAwesome name="envelope" size={16} color={theme.text} />
          <Text style={styles.actionText}>紹介メール生成</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <FontAwesome name="trash" size={16} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* Detail Fields */}
      <View style={styles.fieldsCard}>
        {FIELD_CONFIG.map(({ key, label }) => (
          <View key={key as string} style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>{label}</Text>
            {editing ? (
              <TextInput
                style={styles.fieldInput}
                value={editData[key as string] ?? ""}
                onChangeText={(v) =>
                  setEditData((prev) => ({ ...prev, [key]: v }))
                }
                placeholder="未入力"
                placeholderTextColor={theme.textMuted}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {property[key] !== null && property[key] !== undefined
                  ? String(property[key])
                  : "—"}
              </Text>
            )}
          </View>
        ))}

        {/* Equipment */}
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>設備</Text>
          <View style={styles.equipmentRow}>
            {Array.isArray(property.equipment) &&
            property.equipment.length > 0 ? (
              (property.equipment as string[]).map((eq, i) => (
                <View key={i} style={styles.equipmentChip}>
                  <Text style={styles.equipmentText}>{eq}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.fieldValue}>—</Text>
            )}
          </View>
        </View>
      </View>

      {/* Save Button */}
      {editing && (
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveText}>保存</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Email Modal */}
      <Modal
        visible={emailModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEmailModalVisible(false)}
      >
        <View style={styles.emailOverlay}>
          <View style={styles.emailContent}>
            <View style={styles.emailHeader}>
              <Text style={styles.emailTitle}>紹介メール</Text>
              <TouchableOpacity onPress={() => setEmailModalVisible(false)}>
                <FontAwesome name="times" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            {emailLoading ? (
              <View style={styles.emailLoading}>
                <ActivityIndicator size="large" color={theme.accent} />
                <Text style={styles.emailLoadingText}>
                  AIがメールを生成中...
                </Text>
              </View>
            ) : (
              <>
                <ScrollView style={styles.emailScroll}>
                  <Text style={styles.emailBody} selectable>
                    {emailText}
                  </Text>
                </ScrollView>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareEmail}
                >
                  <FontAwesome name="share" size={16} color="#fff" />
                  <Text style={styles.shareText}>共有</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  errorText: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: "center",
    marginTop: 40,
  },
  headerCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  headerName: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 6,
  },
  headerPrice: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.accent,
    marginBottom: 10,
  },
  headerBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    backgroundColor: theme.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, color: theme.textSecondary },
  stationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stationText: { fontSize: 13, color: theme.textSecondary },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: theme.bgCard,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  deleteButton: {
    flex: 0,
    paddingHorizontal: 16,
    borderColor: theme.accent,
  },
  actionText: { fontSize: 13, color: theme.text },
  fieldsCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  fieldRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  fieldLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 15,
    color: theme.text,
  },
  fieldInput: {
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  equipmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  equipmentChip: {
    backgroundColor: theme.bgInput,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  equipmentText: { fontSize: 12, color: theme.text },
  saveButton: {
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 16,
  },
  buttonDisabled: { opacity: 0.6 },
  saveText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  emailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  emailContent: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "80%",
  },
  emailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  emailTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
  },
  emailLoading: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 16,
  },
  emailLoadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  emailScroll: {
    maxHeight: 400,
  },
  emailBody: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 22,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
  },
  shareText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
});
