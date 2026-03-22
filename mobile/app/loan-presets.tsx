import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
} from "react-native";
import { router, Stack } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { api, LoanPreset } from "@/lib/api";


const STRUCTURE_OPTIONS = ["RC", "SRC", "鉄骨造", "木造", "軽量鉄骨"];
const PREFECTURE_OPTIONS = [
  "東京都", "神奈川県", "千葉県", "埼玉県", "大阪府",
  "京都府", "兵庫県", "愛知県", "福岡県", "北海道",
];
const FORMULA_OPTIONS = [
  { value: "age_limit", label: "完済時年齢上限", desc: "融資期間 = 上限年齢 − 現在年齢" },
  { value: "building_age_limit", label: "築年数上限", desc: "融資期間 = 上限値 − 築年数" },
  { value: "fixed", label: "固定", desc: "融資期間 = 最大融資期間（固定）" },
];

export default function LoanPresetsScreen() {
  const [presets, setPresets] = useState<LoanPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPreset, setEditingPreset] = useState<Partial<LoanPreset> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPresets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLoanPresets();
      setPresets(data);
      // 初回でプリセットが0件ならシステムプリセットをシード
      if (data.length === 0) {
        await api.seedSystemPresets();
        const seeded = await api.getLoanPresets();
        setPresets(seeded);
      }
    } catch (e: any) {
      Alert.alert("エラー", e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPresets(); }, []);

  const handleDelete = (preset: LoanPreset) => {
    if (preset.is_system) {
      Alert.alert("削除不可", "システムプリセットは削除できません");
      return;
    }
    Alert.alert("削除確認", `「${preset.name}」を削除しますか？`, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除", style: "destructive", onPress: async () => {
          try {
            await api.deleteLoanPreset(preset.id);
            fetchPresets();
          } catch (e: any) {
            Alert.alert("エラー", e.message);
          }
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!editingPreset?.name) {
      Alert.alert("エラー", "プリセット名を入力してください");
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await api.createLoanPreset(editingPreset as any);
      } else {
        await api.updateLoanPreset(editingPreset!.id!, editingPreset as any);
      }
      setEditingPreset(null);
      fetchPresets();
    } catch (e: any) {
      Alert.alert("エラー", e.message);
    } finally {
      setSaving(false);
    }
  };

  const openNew = () => {
    setIsNew(true);
    setEditingPreset({
      name: "",
      is_system: false,
      interest_rate: null,
      max_loan_years: 35,
      loan_year_formula: "age_limit",
      loan_year_base: 80,
      down_payment_ratio: 10,
      admin_fee_rate: 2.2,
      is_default: false,
      max_building_age: null,
      min_area: null,
      max_walk_minutes: null,
      max_completion_age: null,
      allowed_structures: null,
      allowed_prefectures: null,
      min_price: null,
      max_price: null,
      min_yield: null,
      requires_new_quake_standard: false,
      memo: null,
    });
  };

  const openEdit = (preset: LoanPreset) => {
    setIsNew(false);
    setEditingPreset({ ...preset });
  };

  const toggleStructure = (s: string) => {
    const current = editingPreset?.allowed_structures || [];
    const updated = current.includes(s) ? current.filter(x => x !== s) : [...current, s];
    setEditingPreset({ ...editingPreset, allowed_structures: updated.length > 0 ? updated : null });
  };

  const togglePrefecture = (p: string) => {
    const current = editingPreset?.allowed_prefectures || [];
    const updated = current.includes(p) ? current.filter(x => x !== p) : [...current, p];
    setEditingPreset({ ...editingPreset, allowed_prefectures: updated.length > 0 ? updated : null });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: "融資条件管理" }} />
        <ActivityIndicator size="large" color={"#3B82F6"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "融資条件管理" }} />

      {/* 一覧 */}
      {!editingPreset && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.description}>
            銀行から提示された融資条件を保存して、物件の融資適格性を自動判定できます。
          </Text>

          {presets.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={[styles.card, preset.is_default && styles.cardDefault]}
              onPress={() => openEdit(preset)}
            >
              <View style={styles.cardHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  {preset.is_system && (
                    <View style={styles.systemBadge}>
                      <Text style={styles.systemBadgeText}>システム</Text>
                    </View>
                  )}
                  {preset.is_default && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>デフォルト</Text>
                    </View>
                  )}
                  <Text style={styles.cardName} numberOfLines={1}>{preset.name}</Text>
                </View>
                {!preset.is_system && (
                  <TouchableOpacity onPress={() => handleDelete(preset)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <FontAwesome name="trash-o" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.cardBody}>
                <View style={styles.condRow}>
                  <Text style={styles.condLabel}>金利</Text>
                  <Text style={styles.condValue}>
                    {preset.interest_rate != null ? `${preset.interest_rate}%` : "−"}
                  </Text>
                </View>
                <View style={styles.condRow}>
                  <Text style={styles.condLabel}>最大期間</Text>
                  <Text style={styles.condValue}>
                    {preset.max_loan_years != null ? `${preset.max_loan_years}年` : "−"}
                  </Text>
                </View>
                <View style={styles.condRow}>
                  <Text style={styles.condLabel}>期間計算</Text>
                  <Text style={styles.condValue}>
                    {preset.loan_year_formula === "age_limit" && preset.loan_year_base
                      ? `完済${preset.loan_year_base}歳まで`
                      : preset.loan_year_formula === "building_age_limit" && preset.loan_year_base
                      ? `${preset.loan_year_base}−築年数`
                      : preset.loan_year_formula === "fixed"
                      ? "固定"
                      : "−"}
                  </Text>
                </View>
                <View style={styles.condRow}>
                  <Text style={styles.condLabel}>頭金</Text>
                  <Text style={styles.condValue}>
                    {preset.down_payment_ratio != null ? `${preset.down_payment_ratio}%` : "−"}
                  </Text>
                </View>
              </View>

              {/* 審査条件サマリー */}
              <View style={styles.filterSummary}>
                {preset.max_building_age != null && (
                  <View style={styles.filterTag}>
                    <Text style={styles.filterTagText}>築{preset.max_building_age}年以内</Text>
                  </View>
                )}
                {preset.requires_new_quake_standard && (
                  <View style={styles.filterTag}>
                    <Text style={styles.filterTagText}>新耐震</Text>
                  </View>
                )}
                {preset.min_area != null && (
                  <View style={styles.filterTag}>
                    <Text style={styles.filterTagText}>{preset.min_area}㎡以上</Text>
                  </View>
                )}
                {preset.max_walk_minutes != null && (
                  <View style={styles.filterTag}>
                    <Text style={styles.filterTagText}>徒歩{preset.max_walk_minutes}分以内</Text>
                  </View>
                )}
                {preset.allowed_prefectures && preset.allowed_prefectures.length > 0 && (
                  <View style={styles.filterTag}>
                    <Text style={styles.filterTagText}>
                      {preset.allowed_prefectures.length <= 3
                        ? preset.allowed_prefectures.join("・")
                        : `${preset.allowed_prefectures.slice(0, 2).join("・")}他${preset.allowed_prefectures.length - 2}`}
                    </Text>
                  </View>
                )}
                {preset.allowed_structures && preset.allowed_structures.length > 0 && (
                  <View style={styles.filterTag}>
                    <Text style={styles.filterTagText}>{preset.allowed_structures.join("/")}</Text>
                  </View>
                )}
              </View>

              {preset.memo && (
                <Text style={styles.memo} numberOfLines={2}>{preset.memo}</Text>
              )}
            </TouchableOpacity>
          ))}

          <TouchableOpacity style={styles.addButton} onPress={openNew}>
            <FontAwesome name="plus" size={16} color="#fff" />
            <Text style={styles.addButtonText}>新しい融資条件を追加</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* 編集モーダル */}
      {editingPreset && (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionTitle}>
            {isNew ? "新規融資条件" : "融資条件を編集"}
          </Text>

          {/* プリセット名 */}
          <Text style={styles.label}>プリセット名</Text>
          <TextInput
            style={styles.input}
            value={editingPreset.name || ""}
            onChangeText={(v) => setEditingPreset({ ...editingPreset, name: v })}
            placeholder="例: SBI 2026年3月提示条件"
          />

          {/* === 基本融資条件 === */}
          <Text style={styles.sectionTitle}>基本融資条件</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>金利（%）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.interest_rate != null ? String(editingPreset.interest_rate) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, interest_rate: v ? parseFloat(v) : null })}
                keyboardType="decimal-pad"
                placeholder="1.90"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>最大融資期間（年）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.max_loan_years != null ? String(editingPreset.max_loan_years) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, max_loan_years: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder="35"
              />
            </View>
          </View>

          {/* 融資期間計算式 */}
          <Text style={styles.label}>融資期間の計算方法</Text>
          {FORMULA_OPTIONS.map((f) => (
            <TouchableOpacity
              key={f.value}
              style={[
                styles.formulaOption,
                editingPreset.loan_year_formula === f.value && styles.formulaOptionActive,
              ]}
              onPress={() => setEditingPreset({ ...editingPreset, loan_year_formula: f.value as any })}
            >
              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.formulaLabel,
                  editingPreset.loan_year_formula === f.value && styles.formulaLabelActive,
                ]}>{f.label}</Text>
                <Text style={styles.formulaDesc}>{f.desc}</Text>
              </View>
              {editingPreset.loan_year_formula === f.value && (
                <FontAwesome name="check" size={16} color={"#3B82F6"} />
              )}
            </TouchableOpacity>
          ))}

          {editingPreset.loan_year_formula && editingPreset.loan_year_formula !== "fixed" && (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.label}>
                {editingPreset.loan_year_formula === "age_limit" ? "完済時年齢上限" : "築年数上限値"}
              </Text>
              <View style={styles.chipRow}>
                {(editingPreset.loan_year_formula === "age_limit"
                  ? [75, 79, 80, 84, 85]
                  : [47, 50, 55, 60, 65]
                ).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.chip,
                      editingPreset.loan_year_base === v && styles.chipActive,
                    ]}
                    onPress={() => setEditingPreset({ ...editingPreset, loan_year_base: v })}
                  >
                    <Text style={[
                      styles.chipText,
                      editingPreset.loan_year_base === v && styles.chipTextActive,
                    ]}>
                      {editingPreset.loan_year_formula === "age_limit" ? `${v}歳` : `${v}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[styles.input, { marginTop: 6 }]}
                value={editingPreset.loan_year_base != null ? String(editingPreset.loan_year_base) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, loan_year_base: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder="その他の値を直接入力"
              />
              <Text style={styles.hint}>
                {editingPreset.loan_year_formula === "age_limit"
                  ? "融資期間 = 上限年齢 − 現在年齢（最大融資期間で制限）"
                  : "融資期間 = 上限値 − 築年数（最大融資期間で制限）"}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>頭金割合（%）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.down_payment_ratio != null ? String(editingPreset.down_payment_ratio) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, down_payment_ratio: v ? parseFloat(v) : null })}
                keyboardType="decimal-pad"
                placeholder="10"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>事務手数料（%）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.admin_fee_rate != null ? String(editingPreset.admin_fee_rate) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, admin_fee_rate: v ? parseFloat(v) : null })}
                keyboardType="decimal-pad"
                placeholder="2.2"
              />
            </View>
          </View>

          {/* === 審査条件 === */}
          <Text style={styles.sectionTitle}>審査条件（物件フィルタ用）</Text>
          <Text style={styles.hint}>設定した条件に合う物件を自動判定します。空欄は「制限なし」として扱います。</Text>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>最大築年数</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.max_building_age != null ? String(editingPreset.max_building_age) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, max_building_age: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder="30"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>最低面積（㎡）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.min_area != null ? String(editingPreset.min_area) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, min_area: v ? parseFloat(v) : null })}
                keyboardType="decimal-pad"
                placeholder="20"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>最大駅徒歩（分）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.max_walk_minutes != null ? String(editingPreset.max_walk_minutes) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, max_walk_minutes: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder="15"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>完済時最大年齢</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.max_completion_age != null ? String(editingPreset.max_completion_age) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, max_completion_age: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder="80"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>最低価格（万円）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.min_price != null ? String(editingPreset.min_price) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, min_price: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder="500"
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>最高価格（万円）</Text>
              <TextInput
                style={styles.input}
                value={editingPreset.max_price != null ? String(editingPreset.max_price) : ""}
                onChangeText={(v) => setEditingPreset({ ...editingPreset, max_price: v ? parseInt(v) : null })}
                keyboardType="number-pad"
                placeholder=""
              />
            </View>
          </View>

          <View style={styles.halfField}>
            <Text style={styles.label}>最低利回り（%）</Text>
            <TextInput
              style={styles.input}
              value={editingPreset.min_yield != null ? String(editingPreset.min_yield) : ""}
              onChangeText={(v) => setEditingPreset({ ...editingPreset, min_yield: v ? parseFloat(v) : null })}
              keyboardType="decimal-pad"
              placeholder="5.0"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>新耐震基準必須</Text>
            <Switch
              value={editingPreset.requires_new_quake_standard || false}
              onValueChange={(v) => setEditingPreset({ ...editingPreset, requires_new_quake_standard: v })}
              trackColor={{ true: "#3B82F6" }}
            />
          </View>

          {/* 構造 */}
          <Text style={styles.label}>対象構造</Text>
          <View style={styles.chipRow}>
            {STRUCTURE_OPTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={[
                  styles.chip,
                  (editingPreset.allowed_structures || []).includes(s) && styles.chipActive,
                ]}
                onPress={() => toggleStructure(s)}
              >
                <Text style={[
                  styles.chipText,
                  (editingPreset.allowed_structures || []).includes(s) && styles.chipTextActive,
                ]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>未選択＝全構造OK</Text>

          {/* エリア */}
          <Text style={styles.label}>対象エリア</Text>
          <View style={styles.chipRow}>
            {PREFECTURE_OPTIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.chip,
                  (editingPreset.allowed_prefectures || []).includes(p) && styles.chipActive,
                ]}
                onPress={() => togglePrefecture(p)}
              >
                <Text style={[
                  styles.chipText,
                  (editingPreset.allowed_prefectures || []).includes(p) && styles.chipTextActive,
                ]}>{p.replace(/[都府県]$/, "")}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>未選択＝全国OK</Text>

          {/* メモ */}
          <Text style={styles.label}>メモ</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={editingPreset.memo || ""}
            onChangeText={(v) => setEditingPreset({ ...editingPreset, memo: v || null })}
            multiline
            placeholder="審査時の注意点、担当者名など自由にメモ"
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>デフォルトに設定</Text>
            <Switch
              value={editingPreset.is_default || false}
              onValueChange={(v) => setEditingPreset({ ...editingPreset, is_default: v })}
              trackColor={{ true: "#3B82F6" }}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setEditingPreset(null)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>保存</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F5F5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F5F5F5" },
  content: { padding: 16, paddingBottom: 32 },
  description: { fontSize: 13, color: "#666", marginBottom: 16, lineHeight: 20 },

  // Card
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardDefault: { borderWidth: 2, borderColor: "#3B82F6" },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  cardName: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", flex: 1 },
  systemBadge: { backgroundColor: "#E0E7FF", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  systemBadgeText: { fontSize: 10, color: "#4338CA", fontWeight: "600" },
  defaultBadge: { backgroundColor: "#FEF3C7", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  defaultBadgeText: { fontSize: 10, color: "#B45309", fontWeight: "600" },

  cardBody: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  condRow: { width: "48%", flexDirection: "row", justifyContent: "space-between" },
  condLabel: { fontSize: 12, color: "#888" },
  condValue: { fontSize: 13, fontWeight: "600", color: "#333" },

  filterSummary: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  filterTag: { backgroundColor: "#F0F9FF", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  filterTagText: { fontSize: 11, color: "#0369A1" },
  memo: { fontSize: 12, color: "#888", marginTop: 6 },

  // Add button
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  addButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },

  // Edit form
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A", marginTop: 20, marginBottom: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginTop: 12, marginBottom: 4 },
  hint: { fontSize: 11, color: "#999", marginTop: 2, marginBottom: 4 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  row: { flexDirection: "row", gap: 12 },
  halfField: { flex: 1 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },

  // Formula
  formulaOption: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    padding: 12,
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  formulaOptionActive: { borderColor: "#3B82F6", backgroundColor: "#F0F9FF" },
  formulaLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  formulaLabelActive: { color: "#3B82F6" },
  formulaDesc: { fontSize: 11, color: "#888", marginTop: 2 },

  // Chips
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: {
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  chipText: { fontSize: 13, color: "#555" },
  chipTextActive: { color: "#fff", fontWeight: "600" },

  // Buttons
  buttonRow: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D0D0D0",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: { fontSize: 15, fontWeight: "600", color: "#666" },
  saveButton: {
    flex: 1,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
