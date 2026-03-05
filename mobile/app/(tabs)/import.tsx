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
import { Paths, File, Directory } from "expo-file-system";
import * as FileSystemLegacy from "expo-file-system/legacy";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { api, Property, PropertyAnalysis } from "@/lib/api";
import { theme } from "@/constants/Colors";

const FIELD_LABELS: Record<string, string> = {
  // シミュレーション必須項目
  name: "物件名",
  price: "価格（万円）",
  grossYield: "表面利回り（%）",
  monthlyRent: "月額賃料（円）",
  managementFee: "管理費（円/月）",
  repairReserve: "修繕積立金（円/月）",
  otherMonthlyExpenses: "その他月額費用（円/月）",
  builtDate: "築年月",
  structure: "構造",
  area: "専有面積（㎡）",
  totalUnits: "総戸数",
  // エリア・物件評価
  prefecture: "都道府県",
  city: "市区町村",
  address: "所在地",
  nearestStation: "最寄駅",
  walkMinutes: "徒歩分数",
  layout: "間取り",
  floors: "建物階数",
  floor: "所在階",
  balconyArea: "バルコニー面積（㎡）",
  // サブリース・管理
  sublease: "サブリース",
  subleaseDetail: "サブリース詳細",
  managementCompany: "管理会社",
  // 補足情報
  transactionType: "取引態様",
  contactInfo: "連絡先",
  notes: "備考",
};

const EDITABLE_FIELDS = Object.keys(FIELD_LABELS);

const SCORE_LABELS: Record<string, string> = {
  location: "立地",
  profitability: "収益性",
  growth: "将来性",
  liquidity: "流動性",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreRow}>
      <Text style={styles.scoreLabel}>{label}</Text>
      <View style={styles.scoreBarBg}>
        <View style={[styles.scoreBarFill, { width: `${(value / 5) * 100}%` }]} />
      </View>
      <Text style={styles.scoreValue}>{value}/5</Text>
    </View>
  );
}

export default function ImportScreen() {
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState<"select" | "loading" | "preview">("select");
  const [extractedData, setExtractedData] = useState<Record<string, string | number | null>>({});
  const [equipment, setEquipment] = useState<string[]>([]);
  const [stationDailyPassengers, setStationDailyPassengers] = useState<number | null>(null);
  const [stationLines, setStationLines] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [pdfName, setPdfName] = useState("");
  const [localPdfPath, setLocalPdfPath] = useState("");
  // AI分析
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);

  if (authLoading || !user) return null;

  // 分析をバックグラウンドで実行
  async function runAnalysis(data: Record<string, unknown>) {
    setAnalysisLoading(true);
    setAnalysisReady(false);
    try {
      const result = await api.analyzeProperty({
        name: data.name ? String(data.name) : undefined,
        prefecture: data.prefecture ? String(data.prefecture) : undefined,
        city: data.city ? String(data.city) : undefined,
        address: data.address ? String(data.address) : undefined,
        nearestStation: data.nearestStation ? String(data.nearestStation) : undefined,
        walkMinutes: typeof data.walkMinutes === "number" ? data.walkMinutes : undefined,
        price: typeof data.price === "number" ? data.price : undefined,
        monthlyRent: typeof data.monthlyRent === "number" ? data.monthlyRent : undefined,
        grossYield: typeof data.grossYield === "number" ? data.grossYield : undefined,
        managementFee: typeof data.managementFee === "number" ? data.managementFee : undefined,
        repairReserve: typeof data.repairReserve === "number" ? data.repairReserve : undefined,
        area: typeof data.area === "number" ? data.area : undefined,
        structure: data.structure ? String(data.structure) : undefined,
        builtDate: data.builtDate ? String(data.builtDate) : undefined,
        layout: data.layout ? String(data.layout) : undefined,
        totalUnits: typeof data.totalUnits === "number" ? data.totalUnits : undefined,
        floor: data.floor ? String(data.floor) : undefined,
        floors: data.floors ? String(data.floors) : undefined,
      });
      setAnalysis(result);
      setAnalysisReady(true);
    } catch (e) {
      console.error("Analysis error:", e);
      setAnalysis(null);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handlePickPdf() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];

      // ファイルサイズチェック（20MB上限）
      if (file.size && file.size > 20 * 1024 * 1024) {
        Alert.alert("エラー", "PDFファイルが大きすぎます（上限20MB）");
        return;
      }

      setPdfName(file.name);
      setStep("loading");
      setAnalysis(null);

      // マイソクPDFをローカルストレージに保存
      const maisokuDir = new Directory(Paths.document, "maisoku");
      if (!maisokuDir.exists) {
        maisokuDir.create();
      }
      const srcFile = new File(file.uri);
      const destFile = new File(maisokuDir, `${Date.now()}_${file.name}`);
      srcFile.copy(destFile);
      setLocalPdfPath(destFile.uri);

      // Gemini APIで物件情報を抽出（legacy APIでbase64読み込み）
      const base64 = await FileSystemLegacy.readAsStringAsync(file.uri, {
        encoding: FileSystemLegacy.EncodingType.Base64,
      });

      const res = await api.extractPdf(base64);
      const data = res.extracted as Record<string, unknown>;

      const equipmentData = Array.isArray(data.equipment)
        ? (data.equipment as string[])
        : [];
      setEquipment(equipmentData);
      setStationDailyPassengers(typeof data.stationDailyPassengers === "number" ? data.stationDailyPassengers : null);
      setStationLines(Array.isArray(data.stationLines) ? data.stationLines as string[] : null);

      const fields: Record<string, string | number | null> = {};
      for (const key of EDITABLE_FIELDS) {
        const val = data[key];
        if (key === "sublease") {
          fields[key] = val === true ? "あり" : val === false ? "なし" : null;
        } else {
          fields[key] = val !== undefined && val !== null ? String(val) : null;
        }
      }
      setExtractedData(fields);
      setStep("preview");

      // バックグラウンドでAI分析を実行
      runAnalysis(data);
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
      const toNum = (v: unknown) => { const n = Number(v); return v != null && v !== "" && !isNaN(n) ? n : null; };
      const body: Partial<Property> = {
        name: String(extractedData.name || ""),
        prefecture: extractedData.prefecture ? String(extractedData.prefecture) : null,
        city: extractedData.city ? String(extractedData.city) : null,
        address: extractedData.address ? String(extractedData.address) : null,
        nearestStation: extractedData.nearestStation ? String(extractedData.nearestStation) : null,
        walkMinutes: toNum(extractedData.walkMinutes),
        stationDailyPassengers,
        stationLines,
        price: toNum(extractedData.price),
        grossYield: toNum(extractedData.grossYield),
        monthlyRent: toNum(extractedData.monthlyRent),
        managementFee: toNum(extractedData.managementFee),
        repairReserve: toNum(extractedData.repairReserve),
        otherMonthlyExpenses: toNum(extractedData.otherMonthlyExpenses),
        layout: extractedData.layout ? String(extractedData.layout) : null,
        area: toNum(extractedData.area),
        balconyArea: toNum(extractedData.balconyArea),
        builtDate: extractedData.builtDate ? String(extractedData.builtDate) : null,
        structure: extractedData.structure ? String(extractedData.structure) : null,
        floors: extractedData.floors ? String(extractedData.floors) : null,
        floor: extractedData.floor ? String(extractedData.floor) : null,
        totalUnits: toNum(extractedData.totalUnits),
        transactionType: extractedData.transactionType ? String(extractedData.transactionType) : null,
        sublease: extractedData.sublease === "あり" ? true : extractedData.sublease === "なし" ? false : null,
        subleaseDetail: extractedData.subleaseDetail ? String(extractedData.subleaseDetail) : null,
        managementCompany: extractedData.managementCompany ? String(extractedData.managementCompany) : null,
        contactInfo: extractedData.contactInfo ? String(extractedData.contactInfo) : null,
        notes: extractedData.notes ? String(extractedData.notes) : null,
        equipment,
        pdfUrl: localPdfPath || null,
      };
      await api.createProperty(body);
      Alert.alert("成功", "物件を登録しました", [
        { text: "OK", onPress: () => {
          setStep("select");
          setExtractedData({});
          setEquipment([]);
          setLocalPdfPath("");
          setAnalysis(null);
          router.replace("/(tabs)");
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

      {/* AI分析セクション */}
      <View style={styles.analysisSection}>
        <View style={styles.analysisTitleRow}>
          <FontAwesome name="bar-chart" size={16} color={theme.accent} />
          <Text style={styles.analysisSectionTitle}>AI投資分析</Text>
        </View>

        {analysisLoading && (
          <View style={styles.analysisLoadingBox}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={styles.analysisLoadingText}>
              公的データ（地価公示・DID・駅データ）と照合して分析中...
            </Text>
          </View>
        )}

        {analysis && (
          <>
            {/* 総合評価 */}
            <View style={styles.analysisSummaryBox}>
              <Text style={styles.analysisSummary}>{analysis.summary}</Text>
            </View>

            {/* スコア */}
            {analysis.score && (
              <View style={styles.analysisScoreBox}>
                {Object.entries(SCORE_LABELS).map(([key, label]) => (
                  <ScoreBar
                    key={key}
                    label={label}
                    value={analysis.score[key as keyof typeof analysis.score] || 3}
                  />
                ))}
              </View>
            )}

            {/* ポジティブ/リスク */}
            {analysis.positive_points && analysis.positive_points.length > 0 && (
              <View style={styles.analysisPointsBox}>
                <Text style={styles.analysisPointsTitle}>
                  <FontAwesome name="check-circle" size={13} color="#4CAF50" /> ポジティブ要因
                </Text>
                {analysis.positive_points.map((p, i) => (
                  <Text key={i} style={styles.analysisPoint}>  {p}</Text>
                ))}
              </View>
            )}
            {analysis.risk_points && analysis.risk_points.length > 0 && (
              <View style={[styles.analysisPointsBox, styles.analysisRiskBox]}>
                <Text style={styles.analysisRiskTitle}>
                  <FontAwesome name="exclamation-triangle" size={13} color="#FF9800" /> リスク要因
                </Text>
                {analysis.risk_points.map((p, i) => (
                  <Text key={i} style={styles.analysisPoint}>  {p}</Text>
                ))}
              </View>
            )}

            {/* 詳細分析 */}
            {analysis.land_price_analysis && (
              <View style={styles.analysisDetailRow}>
                <Text style={styles.analysisDetailLabel}>地価トレンド</Text>
                <Text style={styles.analysisDetailText}>{analysis.land_price_analysis}</Text>
              </View>
            )}
            {analysis.area_analysis && (
              <View style={styles.analysisDetailRow}>
                <Text style={styles.analysisDetailLabel}>エリア評価</Text>
                <Text style={styles.analysisDetailText}>{analysis.area_analysis}</Text>
              </View>
            )}
            {analysis.station_analysis && (
              <View style={styles.analysisDetailRow}>
                <Text style={styles.analysisDetailLabel}>駅力評価</Text>
                <Text style={styles.analysisDetailText}>{analysis.station_analysis}</Text>
              </View>
            )}
            {analysis.rent_assessment && (
              <View style={styles.analysisDetailRow}>
                <Text style={styles.analysisDetailLabel}>賃料評価</Text>
                <Text style={styles.analysisDetailText}>{analysis.rent_assessment}</Text>
              </View>
            )}

            {/* 公的データ概要 */}
            {analysis.public_data?.land_price && (
              <View style={styles.publicDataBox}>
                <Text style={styles.publicDataTitle}>周辺地価データ</Text>
                <Text style={styles.publicDataText}>
                  平均地価: {analysis.public_data.land_price.avg_price.toLocaleString()}円/㎡
                  {analysis.public_data.land_price.avg_rate != null &&
                    ` (前年比${analysis.public_data.land_price.avg_rate > 0 ? "+" : ""}${analysis.public_data.land_price.avg_rate}%)`}
                </Text>
                {analysis.public_data.land_price.trend_5y != null && (
                  <Text style={styles.publicDataText}>
                    5年変動: {analysis.public_data.land_price.trend_5y > 0 ? "+" : ""}{analysis.public_data.land_price.trend_5y}%
                    {analysis.public_data.land_price.trend_10y != null &&
                      ` / 10年変動: ${analysis.public_data.land_price.trend_10y > 0 ? "+" : ""}${analysis.public_data.land_price.trend_10y}%`}
                  </Text>
                )}
              </View>
            )}
            {analysis.public_data?.did && (
              <View style={styles.publicDataBox}>
                <Text style={styles.publicDataTitle}>DID（人口集中地区）</Text>
                <Text style={[
                  styles.publicDataText,
                  { color: analysis.public_data.did.in_did ? "#4CAF50" : "#FF9800" },
                ]}>
                  {analysis.public_data.did.in_did
                    ? `DID内 - ${analysis.public_data.did.municipality} (人口密度: ${analysis.public_data.did.density?.toLocaleString()}人/km²)`
                    : "DID外（郊外エリア）"}
                </Text>
              </View>
            )}

            <Text style={styles.analysisDisclaimer}>
              * 国土交通省 地価公示・国勢調査DID・国土数値情報に基づくAI分析です。投資判断は自己責任で行ってください。
            </Text>
          </>
        )}
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

      {/* 実質利回り（自動計算） */}
      {(() => {
        const price = Number(extractedData.price);
        const rent = Number(extractedData.monthlyRent);
        const mgmt = Number(extractedData.managementFee) || 0;
        const repair = Number(extractedData.repairReserve) || 0;
        const other = Number(extractedData.otherMonthlyExpenses) || 0;
        if (price > 0 && rent > 0) {
          const netYield = ((rent - mgmt - repair - other) * 12) / (price * 10000) * 100;
          return (
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>実質利回り（自動計算）</Text>
              <View style={styles.computedField}>
                <Text style={styles.computedValue}>{netYield.toFixed(2)}%</Text>
              </View>
            </View>
          );
        }
        return null;
      })()}

      {/* 駅情報（乗降客数・路線） */}
      {stationDailyPassengers != null && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>最寄駅 乗降客数（日平均）</Text>
          <View style={styles.computedField}>
            <Text style={styles.computedValue}>
              {stationDailyPassengers.toLocaleString()}人/日
            </Text>
          </View>
        </View>
      )}
      {stationLines && stationLines.length > 0 && (
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>利用可能路線</Text>
          <Text style={styles.equipmentText}>
            {stationLines.join("、")}
          </Text>
        </View>
      )}

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
            setAnalysis(null);
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
  // AI分析セクション
  analysisSection: {
    marginBottom: 20,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.2)",
  },
  analysisTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  analysisSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.accent,
  },
  analysisLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    backgroundColor: "rgba(33, 150, 243, 0.05)",
    borderRadius: 8,
  },
  analysisLoadingText: {
    fontSize: 13,
    color: theme.textSecondary,
    flex: 1,
  },
  analysisSummaryBox: {
    backgroundColor: "rgba(33, 150, 243, 0.08)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  analysisSummary: {
    fontSize: 14,
    color: theme.text,
    lineHeight: 22,
  },
  analysisScoreBox: {
    marginBottom: 12,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  scoreLabel: {
    width: 50,
    fontSize: 12,
    color: theme.textSecondary,
  },
  scoreBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 4,
    marginHorizontal: 8,
  },
  scoreBarFill: {
    height: 8,
    backgroundColor: theme.accent,
    borderRadius: 4,
  },
  scoreValue: {
    width: 30,
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: "right",
  },
  analysisPointsBox: {
    backgroundColor: "rgba(76, 175, 80, 0.08)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  analysisRiskBox: {
    backgroundColor: "rgba(255, 152, 0, 0.08)",
  },
  analysisPointsTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#4CAF50",
    marginBottom: 4,
  },
  analysisRiskTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#FF9800",
    marginBottom: 4,
  },
  analysisPoint: {
    fontSize: 13,
    color: theme.text,
    lineHeight: 20,
  },
  analysisDetailRow: {
    marginBottom: 8,
  },
  analysisDetailLabel: {
    fontSize: 11,
    color: theme.accent,
    fontWeight: "bold",
    marginBottom: 2,
  },
  analysisDetailText: {
    fontSize: 13,
    color: theme.text,
    lineHeight: 20,
  },
  publicDataBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  publicDataTitle: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: "bold",
    marginBottom: 4,
  },
  publicDataText: {
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  analysisDisclaimer: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 10,
    lineHeight: 14,
  },
  // フィールド
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
  computedField: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  computedValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4CAF50",
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
