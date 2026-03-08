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
  Share,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { File } from "expo-file-system";
import { api, Property, PropertyAnalysis, LandPricePoint, MarketComparison, ExitPrediction, InternalRentComparable } from "@/lib/api";
import { theme } from "@/constants/Colors";

const FIELD_CONFIG: { key: keyof Property; label: string }[] = [
  { key: "name", label: "物件名" },
  { key: "price", label: "価格（万円）" },
  { key: "grossYield", label: "表面利回り（%）" },
  { key: "monthlyRent", label: "月額賃料（円）" },
  { key: "managementFee", label: "管理費（円/月）" },
  { key: "repairReserve", label: "修繕積立金（円/月）" },
  { key: "otherMonthlyExpenses", label: "その他月額費用（円/月）" },
  { key: "builtDate", label: "築年月" },
  { key: "structure", label: "構造" },
  { key: "area", label: "専有面積（㎡）" },
  { key: "totalUnits", label: "総戸数" },
  { key: "prefecture", label: "都道府県" },
  { key: "city", label: "市区町村" },
  { key: "address", label: "所在地" },
  { key: "nearestStation", label: "最寄駅" },
  { key: "walkMinutes", label: "徒歩分数" },
  { key: "layout", label: "間取り" },
  { key: "floors", label: "建物階数" },
  { key: "floor", label: "所在階" },
  { key: "balconyArea", label: "バルコニー面積（㎡）" },
  { key: "sublease", label: "サブリース" },
  { key: "subleaseDetail", label: "サブリース詳細" },
  { key: "managementCompany", label: "管理会社" },
  { key: "transactionType", label: "取引態様" },
  { key: "contactInfo", label: "連絡先" },
  { key: "notes", label: "備考" },
];

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

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // AI分析
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  // 相場比較
  const [marketComparison, setMarketComparison] = useState<MarketComparison | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketExpanded, setMarketExpanded] = useState(false);
  // 出口予測
  const [exitPrediction, setExitPrediction] = useState<ExitPrediction | null>(null);
  const [exitLoading, setExitLoading] = useState(false);
  const [exitExpanded, setExitExpanded] = useState(false);

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
      if (key === "sublease") {
        data[key] = p.sublease === true ? "あり" : p.sublease === false ? "なし" : "";
      } else {
        const val = p[key];
        data[key as string] = val !== null && val !== undefined ? String(val) : "";
      }
    }
    setEditData(data);
  }

  async function handleMarketComparison() {
    if (!property) return;
    setMarketLoading(true);
    setMarketExpanded(true);
    try {
      const result = await api.getMarketComparison(id);
      setMarketComparison(result);
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "相場比較に失敗しました");
    } finally {
      setMarketLoading(false);
    }
  }

  async function handleExitPrediction() {
    if (!property) return;
    setExitLoading(true);
    setExitExpanded(true);
    try {
      const result = await api.getExitPrediction(id);
      setExitPrediction(result);
    } catch (e) {
      Alert.alert("エラー", e instanceof Error ? e.message : "出口予測に失敗しました");
    } finally {
      setExitLoading(false);
    }
  }

  async function handleAnalysis() {
    if (!property) return;
    setAnalysisLoading(true);
    setAnalysisExpanded(true);
    try {
      const result = await api.analyzeProperty({
        name: property.name ?? undefined,
        prefecture: property.prefecture ?? undefined,
        city: property.city ?? undefined,
        address: property.address ?? undefined,
        nearestStation: property.nearestStation ?? undefined,
        walkMinutes: property.walkMinutes ?? undefined,
        price: property.price ?? undefined,
        monthlyRent: property.monthlyRent ?? undefined,
        grossYield: property.grossYield ?? undefined,
        managementFee: property.managementFee ?? undefined,
        repairReserve: property.repairReserve ?? undefined,
        area: property.area ?? undefined,
        structure: property.structure ?? undefined,
        builtDate: property.builtDate ?? undefined,
        layout: property.layout ?? undefined,
        totalUnits: property.totalUnits ?? undefined,
        floor: property.floor ?? undefined,
        floors: property.floors ?? undefined,
      });
      setAnalysis(result);
    } catch (e) {
      console.error("Analysis error:", e);
      Alert.alert("分析エラー", e instanceof Error ? e.message : "分析に失敗しました。ネットワーク接続を確認してください。");
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const toNum = (v: string) => { const n = Number(v); return v && !isNaN(n) ? n : null; };
      const body: Partial<Property> = {
        name: editData.name || "",
        prefecture: editData.prefecture || null,
        city: editData.city || null,
        address: editData.address || null,
        nearestStation: editData.nearestStation || null,
        walkMinutes: toNum(editData.walkMinutes),
        price: toNum(editData.price),
        grossYield: toNum(editData.grossYield),
        monthlyRent: toNum(editData.monthlyRent),
        managementFee: toNum(editData.managementFee),
        repairReserve: toNum(editData.repairReserve),
        otherMonthlyExpenses: toNum(editData.otherMonthlyExpenses),
        layout: editData.layout || null,
        area: toNum(editData.area),
        balconyArea: toNum(editData.balconyArea),
        builtDate: editData.builtDate || null,
        structure: editData.structure || null,
        floors: editData.floors || null,
        floor: editData.floor || null,
        totalUnits: toNum(editData.totalUnits),
        transactionType: editData.transactionType || null,
        sublease: editData.sublease === "あり" ? true : editData.sublease === "なし" ? false : null,
        subleaseDetail: editData.subleaseDetail || null,
        managementCompany: editData.managementCompany || null,
        contactInfo: editData.contactInfo || null,
        notes: editData.notes || null,
        equipment: property?.equipment || null,
        pdfUrl: property?.pdfUrl || null,
      };
      const res = await api.updateProperty(id, body);
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

  async function handleViewPdf() {
    if (!property?.pdfUrl) return;
    try {
      const pdfFile = new File(property.pdfUrl);
      if (!pdfFile.exists) {
        Alert.alert("エラー", "PDFファイルが見つかりません。削除された可能性があります。");
        return;
      }
      await Share.share({ url: property.pdfUrl });
    } catch (e) {
      Alert.alert("エラー", "PDFを開けませんでした");
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {/* Header Card */}
      <View style={styles.headerCard}>
        <Text style={styles.headerName}>{property.name}</Text>
        <Text style={styles.headerPrice}>
          {property.price ? `${property.price}万円` : "価格未定"}
        </Text>

        {/* 利回り表示 */}
        {property.price && property.price > 0 && (
          <View style={styles.yieldRow}>
            {property.grossYield != null && (
              <View style={styles.yieldItem}>
                <Text style={styles.yieldLabel}>表面利回り</Text>
                <Text style={styles.yieldValue}>{property.grossYield.toFixed(2)}%</Text>
              </View>
            )}
            {property.monthlyRent != null && (
              <View style={styles.yieldItem}>
                <Text style={styles.yieldLabel}>実質利回り</Text>
                <Text style={[styles.yieldValue, styles.yieldValueNet]}>
                  {(((property.monthlyRent - (property.managementFee || 0) - (property.repairReserve || 0) - (property.otherMonthlyExpenses || 0)) * 12) / (property.price * 10000) * 100).toFixed(2)}%
                </Text>
              </View>
            )}
          </View>
        )}

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
        {property.stationDailyPassengers != null && property.stationDailyPassengers > 0 && (
          <Text style={styles.passengerText}>
            乗降客数 {property.stationDailyPassengers.toLocaleString()}人/日
          </Text>
        )}
        {property.stationLines && property.stationLines.length > 0 && (
          <Text style={styles.stationLinesText}>
            {property.stationLines.join(" / ")}
          </Text>
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
          style={[styles.actionButton, styles.deleteButton]}
          onPress={handleDelete}
        >
          <FontAwesome name="trash" size={16} color={theme.accent} />
        </TouchableOpacity>
      </View>

      {/* マイソクPDF表示ボタン */}
      {property?.pdfUrl && (
        <TouchableOpacity style={styles.pdfButton} onPress={handleViewPdf}>
          <FontAwesome name="file-pdf-o" size={18} color={theme.accent} />
          <Text style={styles.pdfButtonText}>マイソクPDFを表示</Text>
        </TouchableOpacity>
      )}

      {/* シミュレーションボタン */}
      {property && property.price && (
        <TouchableOpacity
          style={styles.simulationButton}
          onPress={() => {
            router.push({
              pathname: "/(tabs)/simulation",
              params: {
                property_price: String((property.price || 0) * 10000),
                monthly_rent: String(property.monthlyRent || 0),
                management_fee: String(property.managementFee || 0),
                repair_reserve: String(property.repairReserve || 0),
                other_monthly_expenses: String(property.otherMonthlyExpenses || 0),
                built_year: property.builtDate?.match(/(\d{4})/)?.[1] || "",
                structure: property.structure || "RC造",
                exclusive_area: String(property.area || 0),
                total_units: String(property.totalUnits || 30),
              },
            });
          }}
        >
          <FontAwesome name="calculator" size={18} color="#fff" />
          <Text style={styles.simulationButtonText}>収益シミュレーション</Text>
        </TouchableOpacity>
      )}

      {/* 相場比較ボタン */}
      {marketLoading ? (
        <View style={styles.analysisLoadingCard}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={[styles.analysisLoadingTitle, { color: "#8B5CF6" }]}>相場比較中...</Text>
          <Text style={styles.analysisLoadingDesc}>複数駅スコア + 取引事例を照合しています</Text>
        </View>
      ) : (
        <TouchableOpacity style={[styles.analysisButton, styles.marketButton]} onPress={handleMarketComparison}>
          <FontAwesome name="home" size={18} color="#8B5CF6" />
          <Text style={[styles.analysisButtonText, { color: "#8B5CF6" }]}>
            {marketComparison ? "相場比較を再取得" : "相場比較（割安・割高）"}
          </Text>
        </TouchableOpacity>
      )}

      {/* 相場比較結果 */}
      {marketComparison && marketExpanded && (
        <View style={[styles.analysisCard, styles.marketCard]}>
          <TouchableOpacity style={styles.analysisTitleRow} onPress={() => setMarketExpanded(!marketExpanded)}>
            <FontAwesome name="home" size={14} color="#8B5CF6" />
            <Text style={[styles.analysisSectionTitle, { color: "#8B5CF6" }]}>相場比較</Text>
            <FontAwesome name={marketExpanded ? "chevron-up" : "chevron-down"} size={12} color={theme.textMuted} />
          </TouchableOpacity>

          {/* 判定バッジ */}
          {marketComparison.assessment && (
            <View style={[styles.assessmentBadge, {
              backgroundColor: marketComparison.assessment === "割安" ? "rgba(76,175,80,0.15)"
                : marketComparison.assessment === "割高" ? "rgba(244,67,54,0.15)"
                : "rgba(255,193,7,0.15)",
            }]}>
              <Text style={[styles.assessmentText, {
                color: marketComparison.assessment === "割安" ? "#4CAF50"
                  : marketComparison.assessment === "割高" ? "#F44336"
                  : "#FFC107",
              }]}>
                {marketComparison.assessment}
                {marketComparison.diff_pct != null && ` (${marketComparison.diff_pct > 0 ? "+" : ""}${marketComparison.diff_pct}%)`}
              </Text>
            </View>
          )}

          {/* m²単価比較 */}
          {marketComparison.property_price_m2 && (
            <View style={styles.priceCompareBox}>
              <View style={styles.priceCompareItem}>
                <Text style={styles.priceCompareLabel}>この物件</Text>
                <Text style={styles.priceCompareValue}>{Math.round(marketComparison.property_price_m2 / 10000).toLocaleString()}万円/㎡</Text>
              </View>
              {marketComparison.market_avg_price_m2 && (
                <View style={styles.priceCompareItem}>
                  <Text style={styles.priceCompareLabel}>周辺相場平均</Text>
                  <Text style={[styles.priceCompareValue, { color: theme.textSecondary }]}>
                    {Math.round(marketComparison.market_avg_price_m2 / 10000).toLocaleString()}万円/㎡
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* 利用駅（スコア順） */}
          {marketComparison.stations.length > 0 && (
            <View style={styles.stationsBox}>
              <Text style={styles.stationsTitle}>アクセス評価（複数駅合算スコア: {marketComparison.total_access_score.toLocaleString()}）</Text>
              {marketComparison.stations.map((st, i) => (
                <View key={i} style={styles.stationScoreRow}>
                  <FontAwesome name="train" size={11} color="#8B5CF6" />
                  <Text style={styles.stationScoreName}>{st.name}</Text>
                  <Text style={styles.stationScoreSub}>徒歩{st.walk_minutes}分</Text>
                  {st.daily_passengers && (
                    <Text style={styles.stationScoreSub}>{(st.daily_passengers / 10000).toFixed(0)}万人/日</Text>
                  )}
                  <Text style={[styles.stationScoreVal, { color: "#8B5CF6" }]}>スコア {st.score.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 取引事例サマリー */}
          {marketComparison.transaction_summary && (
            <View style={styles.refDataSection}>
              <Text style={styles.refDataSectionTitle}>
                参照: 国交省取引事例 {marketComparison.transaction_summary.count}件 ({marketComparison.transaction_summary.period})
              </Text>
              <View style={styles.refDataTable}>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>m²単価範囲</Text>
                  <Text style={styles.refDataVal}>
                    {Math.round(marketComparison.transaction_summary.min_price_m2 / 10000)}〜{Math.round(marketComparison.transaction_summary.max_price_m2 / 10000)}万円/㎡
                  </Text>
                </View>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>平均取引額</Text>
                  <Text style={styles.refDataVal}>{marketComparison.transaction_summary.avg_total_price.toLocaleString()}万円</Text>
                </View>
              </View>
            </View>
          )}

          {!marketComparison.transaction_summary && (
            <Text style={styles.analysisDisclaimer}>
              取引事例データなし（REINFOLIB APIキー未設定または対象エリアのデータなし）
            </Text>
          )}

          {/* 内部DB相場（登録済み物件からの集計） */}
          {marketComparison.internal_comparable && (
            <View style={styles.refDataSection}>
              <Text style={styles.refDataSectionTitle}>
                参照: アプリ内登録物件 {marketComparison.internal_comparable.count}件（同エリア・同種別）
              </Text>
              {marketComparison.internal_comparable.reliable ? (
                <View style={styles.refDataTable}>
                  <View style={styles.refDataRow}>
                    <Text style={styles.refDataKey}>中央値単価</Text>
                    <Text style={styles.refDataVal}>
                      {Math.round((marketComparison.internal_comparable.median_price_m2 ?? 0) / 10000).toLocaleString()}万円/㎡
                    </Text>
                  </View>
                  <View style={styles.refDataRow}>
                    <Text style={styles.refDataKey}>平均単価</Text>
                    <Text style={styles.refDataVal}>
                      {Math.round((marketComparison.internal_comparable.avg_price_m2 ?? 0) / 10000).toLocaleString()}万円/㎡
                    </Text>
                  </View>
                  <View style={styles.refDataRow}>
                    <Text style={styles.refDataKey}>単価レンジ</Text>
                    <Text style={styles.refDataVal}>
                      {Math.round((marketComparison.internal_comparable.min_price_m2 ?? 0) / 10000)}〜{Math.round((marketComparison.internal_comparable.max_price_m2 ?? 0) / 10000)}万円/㎡
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.analysisDisclaimer}>
                  まだデータ不足（{marketComparison.internal_comparable.count}件 / 最低3件必要）。物件を登録するほど精度が上がります。
                </Text>
              )}
            </View>
          )}

          {/* 賃料相場（登録済み物件の賃料から集計） */}
          {marketComparison.internal_rent_comparable && (
            <View style={styles.refDataSection}>
              <Text style={styles.refDataSectionTitle}>
                {"賃料相場（アプリ内 " + marketComparison.internal_rent_comparable.count + "件）" +
                  (marketComparison.internal_rent_comparable.potential_count > 0
                    ? "  ※うち満室想定 " + marketComparison.internal_rent_comparable.potential_count + "件含む"
                    : "")}
              </Text>
              {marketComparison.internal_rent_comparable.reliable ? (
                <View style={styles.refDataTable}>
                  <View style={styles.refDataRow}>
                    <Text style={styles.refDataKey}>中央値単価</Text>
                    <Text style={styles.refDataVal}>
                      {(marketComparison.internal_rent_comparable.median_rent_m2 ?? 0).toLocaleString()}円/㎡/月
                    </Text>
                  </View>
                  <View style={styles.refDataRow}>
                    <Text style={styles.refDataKey}>レンジ</Text>
                    <Text style={styles.refDataVal}>
                      {(marketComparison.internal_rent_comparable.min_rent_m2 ?? 0).toLocaleString()}〜{(marketComparison.internal_rent_comparable.max_rent_m2 ?? 0).toLocaleString()}円/㎡/月
                    </Text>
                  </View>
                  {marketComparison.internal_rent_comparable.potential_count > 0 && (
                    <Text style={styles.analysisDisclaimer}>
                      ※満室想定賃料は売主・業者の見積もり値のため参考値です
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={styles.analysisDisclaimer}>
                  賃料データ不足（{marketComparison.internal_rent_comparable.count}件 / 最低3件必要）
                </Text>
              )}
            </View>
          )}

          <View style={styles.dataSourceBox}>
            {marketComparison.calculated_at && (
              <Text style={styles.dataSourceText}>
                算出日時: {marketComparison.calculated_at.replace("T", " ")}
              </Text>
            )}
            {marketComparison.data_sources?.transaction && (
              <Text style={styles.dataSourceText}>取引: {marketComparison.data_sources.transaction}</Text>
            )}
            {marketComparison.data_sources?.internal && (
              <Text style={styles.dataSourceText}>内部DB: {marketComparison.data_sources.internal}</Text>
            )}
            {marketComparison.data_sources?.internal_rent && (
              <Text style={styles.dataSourceText}>賃料: {marketComparison.data_sources.internal_rent}</Text>
            )}
            {marketComparison.data_sources?.station && (
              <Text style={styles.dataSourceText}>駅: {marketComparison.data_sources.station}</Text>
            )}
          </View>
        </View>
      )}

      {/* 出口予測ボタン */}
      {exitLoading ? (
        <View style={styles.analysisLoadingCard}>
          <ActivityIndicator size="large" color="#F59E0B" />
          <Text style={[styles.analysisLoadingTitle, { color: "#F59E0B" }]}>出口予測計算中...</Text>
          <Text style={styles.analysisLoadingDesc}>築年数減価・地価トレンド・駅アクセスを計算しています</Text>
        </View>
      ) : (
        <TouchableOpacity style={[styles.analysisButton, styles.exitButton]} onPress={handleExitPrediction}>
          <FontAwesome name="line-chart" size={18} color="#F59E0B" />
          <Text style={[styles.analysisButtonText, { color: "#F59E0B" }]}>
            {exitPrediction ? "出口予測を再計算" : "出口予測（5年・10年・15年後）"}
          </Text>
        </TouchableOpacity>
      )}

      {/* 出口予測結果 */}
      {exitPrediction && exitExpanded && (
        <View style={[styles.analysisCard, styles.exitCard]}>
          <TouchableOpacity style={styles.analysisTitleRow} onPress={() => setExitExpanded(!exitExpanded)}>
            <FontAwesome name="line-chart" size={14} color="#F59E0B" />
            <Text style={[styles.analysisSectionTitle, { color: "#F59E0B" }]}>出口予測</Text>
            <FontAwesome name={exitExpanded ? "chevron-up" : "chevron-down"} size={12} color={theme.textMuted} />
          </TouchableOpacity>

          {/* 計算前提 */}
          <View style={styles.exitAssumptionBox}>
            {exitPrediction.structure && (
              <Text style={styles.exitAssumptionText}>
                構造: {exitPrediction.structure} (法定{exitPrediction.legal_life}年) ・
                現在残価: {exitPrediction.current_building_residual_pct}%
              </Text>
            )}
            <Text style={styles.exitAssumptionText}>
              地価トレンド: {exitPrediction.land_price_trend_pct > 0 ? "+" : ""}{exitPrediction.land_price_trend_pct}%/年
              {exitPrediction.land_price_trend_basis ? `（${exitPrediction.land_price_trend_basis}）` : ""}
            </Text>
            <Text style={styles.exitAssumptionText}>
              流動性: ×{exitPrediction.liquidity_multiplier} ({exitPrediction.num_lines}路線)
            </Text>
            <Text style={styles.exitAssumptionText}>
              土地比率 {exitPrediction.assumptions.land_ratio_pct}% / 建物比率 {exitPrediction.assumptions.building_ratio_pct}%
            </Text>
          </View>

          {/* 予測テーブル */}
          {exitPrediction.forecasts.map((f) => (
            <View key={f.year} style={styles.forecastRow}>
              <View style={styles.forecastYearBox}>
                <Text style={styles.forecastYear}>{f.year}年</Text>
                <Text style={styles.forecastYearSub}>{f.years_ahead}年後</Text>
              </View>
              <View style={styles.forecastPrices}>
                <View style={styles.forecastPriceItem}>
                  <Text style={styles.forecastPriceLabel}>悲観</Text>
                  <Text style={[styles.forecastPrice, { color: "#F44336" }]}>{Math.round(f.price_low / 10000).toLocaleString()}万</Text>
                </View>
                <View style={[styles.forecastPriceItem, styles.forecastMid]}>
                  <Text style={styles.forecastPriceLabel}>中央値</Text>
                  <Text style={[styles.forecastPrice, { color: "#F59E0B", fontSize: 16 }]}>{Math.round(f.price_mid / 10000).toLocaleString()}万</Text>
                </View>
                <View style={styles.forecastPriceItem}>
                  <Text style={styles.forecastPriceLabel}>楽観</Text>
                  <Text style={[styles.forecastPrice, { color: "#4CAF50" }]}>{Math.round(f.price_high / 10000).toLocaleString()}万</Text>
                </View>
              </View>
              <View style={styles.forecastRoiBox}>
                <Text style={[styles.forecastRoi, { color: f.roi_pct >= 0 ? "#4CAF50" : "#F44336" }]}>
                  {f.roi_pct > 0 ? "+" : ""}{f.roi_pct}%
                </Text>
                {f.building_residual_pct != null && (
                  <Text style={styles.forecastResidual}>残価{f.building_residual_pct}%</Text>
                )}
              </View>
            </View>
          ))}

          <Text style={styles.analysisDisclaimer}>
            * 法定耐用年数ベースの簡易モデル。地価公示・駅データ活用。実際の売却価格は市況・物件状態により大きく異なります。
          </Text>

          <View style={styles.dataSourceBox}>
            {exitPrediction.calculated_at && (
              <Text style={styles.dataSourceText}>
                算出日時: {exitPrediction.calculated_at.replace("T", " ")}
              </Text>
            )}
            {exitPrediction.data_sources?.land_price && (
              <Text style={styles.dataSourceText}>地価: {exitPrediction.data_sources.land_price}</Text>
            )}
            {exitPrediction.data_sources?.station && (
              <Text style={styles.dataSourceText}>駅: {exitPrediction.data_sources.station}</Text>
            )}
            {exitPrediction.data_sources?.depreciation && (
              <Text style={styles.dataSourceText}>減価: {exitPrediction.data_sources.depreciation}</Text>
            )}
          </View>
        </View>
      )}

      {/* AI分析ボタン / ローディング表示 */}
      {analysisLoading ? (
        <View style={styles.analysisLoadingCard}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={styles.analysisLoadingTitle}>AI分析中...</Text>
          <Text style={styles.analysisLoadingDesc}>
            地価公示・DID・駅データと照合しています（15-30秒）
          </Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.analysisButton}
          onPress={handleAnalysis}
        >
          <FontAwesome name="bar-chart" size={18} color={theme.accent} />
          <Text style={styles.analysisButtonText}>
            {analysis ? "AI投資分析を再実行" : "AI投資分析"}
          </Text>
        </TouchableOpacity>
      )}

      {/* AI分析結果 */}
      {analysis && analysisExpanded && (
        <View style={styles.analysisCard}>
          <TouchableOpacity
            style={styles.analysisTitleRow}
            onPress={() => setAnalysisExpanded(!analysisExpanded)}
          >
            <FontAwesome name="bar-chart" size={14} color={theme.accent} />
            <Text style={styles.analysisSectionTitle}>AI投資分析</Text>
            <FontAwesome
              name={analysisExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color={theme.textMuted}
            />
          </TouchableOpacity>

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

          {/* 参照データ: 駅マスター */}
          {analysis.reference_data?.station && (
            <View style={styles.refDataSection}>
              <Text style={styles.refDataSectionTitle}>
                <FontAwesome name="database" size={11} color={theme.textMuted} /> 参照: 駅マスター（国土数値情報S12）
              </Text>
              <View style={styles.refDataTable}>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>駅名</Text>
                  <Text style={styles.refDataVal}>{analysis.reference_data.station.name}</Text>
                </View>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>乗降客数</Text>
                  <Text style={styles.refDataVal}>
                    {analysis.reference_data.station.daily_passengers?.toLocaleString() ?? "—"}人/日
                  </Text>
                </View>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>路線</Text>
                  <Text style={styles.refDataVal}>
                    {analysis.reference_data.station.lines.map(l => `${l.operator} ${l.line}`).join("\n")}
                  </Text>
                </View>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>座標</Text>
                  <Text style={styles.refDataVal}>
                    {analysis.reference_data.station.lat.toFixed(5)}, {analysis.reference_data.station.lng.toFixed(5)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 参照データ: DID */}
          {analysis.reference_data?.did && (
            <View style={styles.refDataSection}>
              <Text style={styles.refDataSectionTitle}>
                <FontAwesome name="database" size={11} color={theme.textMuted} /> 参照: DID 人口集中地区（国勢調査A16）
              </Text>
              <View style={styles.refDataTable}>
                <View style={styles.refDataRow}>
                  <Text style={styles.refDataKey}>判定</Text>
                  <Text style={[styles.refDataVal, {
                    color: analysis.reference_data.did.in_did ? "#4CAF50" : "#FF9800",
                    fontWeight: "bold",
                  }]}>
                    {analysis.reference_data.did.in_did ? "DID内（人口集中地区）" : "DID外（郊外エリア）"}
                  </Text>
                </View>
                {analysis.reference_data.did.in_did && (
                  <>
                    <View style={styles.refDataRow}>
                      <Text style={styles.refDataKey}>自治体</Text>
                      <Text style={styles.refDataVal}>{analysis.reference_data.did.municipality}</Text>
                    </View>
                    <View style={styles.refDataRow}>
                      <Text style={styles.refDataKey}>人口密度</Text>
                      <Text style={styles.refDataVal}>{analysis.reference_data.did.density?.toLocaleString()}人/km²</Text>
                    </View>
                    <View style={styles.refDataRow}>
                      <Text style={styles.refDataKey}>DID内人口</Text>
                      <Text style={styles.refDataVal}>{analysis.reference_data.did.population?.toLocaleString()}人</Text>
                    </View>
                    <View style={styles.refDataRow}>
                      <Text style={styles.refDataKey}>世帯数</Text>
                      <Text style={styles.refDataVal}>{analysis.reference_data.did.households?.toLocaleString()}世帯</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}

          {/* 参照データ: 地価公示 */}
          {analysis.reference_data?.land_price_points && analysis.reference_data.land_price_points.length > 0 && (
            <View style={styles.refDataSection}>
              <Text style={styles.refDataSectionTitle}>
                <FontAwesome name="database" size={11} color={theme.textMuted} /> 参照: 地価公示（国土交通省L02, {analysis.reference_data.land_price_points.length}地点）
              </Text>
              {analysis.reference_data.land_price_points.map((pt, idx) => (
                <View key={idx} style={styles.refLandPriceCard}>
                  <View style={styles.refLandPriceHeader}>
                    <Text style={styles.refLandPriceAddr} numberOfLines={1}>
                      {idx + 1}. {pt.addr}
                    </Text>
                    <Text style={styles.refLandPriceDist}>{pt.distance_m}m</Text>
                  </View>
                  <View style={styles.refLandPriceRow}>
                    <Text style={styles.refLandPriceLabel}>地価</Text>
                    <Text style={styles.refLandPriceValue}>{pt.price.toLocaleString()}円/㎡</Text>
                    {pt.rate != null && (
                      <Text style={[
                        styles.refLandPriceRate,
                        { color: pt.rate >= 0 ? "#4CAF50" : "#F44336" },
                      ]}>
                        {pt.rate > 0 ? "+" : ""}{pt.rate}%
                      </Text>
                    )}
                  </View>
                  <View style={styles.refLandPriceRow}>
                    <Text style={styles.refLandPriceLabel}>用途</Text>
                    <Text style={styles.refLandPriceMeta}>{pt.use}</Text>
                    <Text style={styles.refLandPriceLabel}>地域</Text>
                    <Text style={styles.refLandPriceMeta}>{pt.zoning}</Text>
                    {pt.bcr != null && (
                      <>
                        <Text style={styles.refLandPriceLabel}>建/容</Text>
                        <Text style={styles.refLandPriceMeta}>{pt.bcr}/{pt.far}%</Text>
                      </>
                    )}
                  </View>
                  {/* 価格推移（直近5年分） */}
                  {pt.history && (
                    <View style={styles.refLandPriceHistoryRow}>
                      {Object.entries(pt.history)
                        .sort(([a], [b]) => Number(a) - Number(b))
                        .slice(-5)
                        .map(([year, price]) => (
                          <View key={year} style={styles.refHistoryCell}>
                            <Text style={styles.refHistoryYear}>{year.slice(2)}</Text>
                            <Text style={styles.refHistoryPrice}>{Math.round(price / 1000)}k</Text>
                          </View>
                        ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.analysisDisclaimer}>
            * 国土交通省 地価公示・国勢調査DID・国土数値情報に基づくAI分析です。投資判断は自己責任で行ってください。
          </Text>
        </View>
      )}

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
                {key === "sublease"
                  ? property.sublease === true ? "あり" : property.sublease === false ? "なし" : "—"
                  : property[key] !== null && property[key] !== undefined
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
  yieldRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 10,
  },
  yieldItem: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  yieldLabel: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  yieldValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.accent,
  },
  yieldValueNet: {
    color: theme.success,
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
  passengerText: { fontSize: 12, color: theme.accent, marginTop: 4 },
  stationLinesText: { fontSize: 11, color: theme.textMuted, marginTop: 2 },
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
  pdfButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.bgCard,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  pdfButtonText: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "bold",
  },
  simulationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.accent,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  simulationButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  // AI分析ボタン
  analysisButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: theme.bgCard,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.3)",
  },
  analysisButtonText: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "bold",
  },
  analysisLoadingCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(33, 150, 243, 0.2)",
  },
  analysisLoadingTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.accent,
  },
  analysisLoadingDesc: {
    fontSize: 13,
    color: theme.textSecondary,
    textAlign: "center",
  },
  // AI分析結果カード
  analysisCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
    fontSize: 15,
    fontWeight: "bold",
    color: theme.accent,
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
  // 参照データ
  refDataSection: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    paddingTop: 10,
  },
  refDataSectionTitle: {
    fontSize: 11,
    color: theme.textMuted,
    fontWeight: "bold",
    marginBottom: 6,
  },
  refDataTable: {
    gap: 2,
  },
  refDataRow: {
    flexDirection: "row",
    paddingVertical: 3,
  },
  refDataKey: {
    width: 70,
    fontSize: 11,
    color: theme.textSecondary,
  },
  refDataVal: {
    flex: 1,
    fontSize: 12,
    color: theme.text,
  },
  refLandPriceCard: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  refLandPriceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  refLandPriceAddr: {
    flex: 1,
    fontSize: 12,
    color: theme.text,
    fontWeight: "600",
  },
  refLandPriceDist: {
    fontSize: 11,
    color: theme.textMuted,
    marginLeft: 8,
  },
  refLandPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  refLandPriceLabel: {
    fontSize: 10,
    color: theme.textSecondary,
  },
  refLandPriceValue: {
    fontSize: 12,
    color: theme.accent,
    fontWeight: "bold",
  },
  refLandPriceRate: {
    fontSize: 11,
    fontWeight: "bold",
  },
  refLandPriceMeta: {
    fontSize: 11,
    color: theme.textSecondary,
    marginRight: 4,
  },
  refLandPriceHistoryRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  refHistoryCell: {
    alignItems: "center",
    flex: 1,
  },
  refHistoryYear: {
    fontSize: 9,
    color: theme.textMuted,
  },
  refHistoryPrice: {
    fontSize: 10,
    color: theme.textSecondary,
    fontWeight: "600",
  },
  analysisDisclaimer: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 10,
    lineHeight: 14,
  },
  // 相場比較
  marketButton: {
    borderColor: "rgba(139,92,246,0.3)",
  },
  marketCard: {
    borderColor: "rgba(139,92,246,0.2)",
  },
  assessmentBadge: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  assessmentText: {
    fontSize: 18,
    fontWeight: "bold",
  },
  priceCompareBox: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  priceCompareItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
  },
  priceCompareLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  priceCompareValue: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.accent,
  },
  stationsBox: {
    marginBottom: 10,
  },
  stationsTitle: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: 6,
  },
  stationScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  stationScoreName: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
    fontWeight: "600",
  },
  stationScoreSub: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  stationScoreVal: {
    fontSize: 11,
    fontWeight: "bold",
  },
  // 出口予測
  exitButton: {
    borderColor: "rgba(245,158,11,0.3)",
  },
  exitCard: {
    borderColor: "rgba(245,158,11,0.2)",
  },
  exitAssumptionBox: {
    backgroundColor: "rgba(245,158,11,0.07)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 2,
  },
  exitAssumptionText: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 8,
  },
  forecastYearBox: {
    width: 52,
    alignItems: "center",
  },
  forecastYear: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  forecastYearSub: {
    fontSize: 10,
    color: theme.textMuted,
  },
  forecastPrices: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  forecastPriceItem: {
    flex: 1,
    alignItems: "center",
  },
  forecastMid: {
    backgroundColor: "rgba(245,158,11,0.07)",
    borderRadius: 6,
    paddingVertical: 2,
  },
  forecastPriceLabel: {
    fontSize: 9,
    color: theme.textMuted,
    marginBottom: 2,
  },
  forecastPrice: {
    fontSize: 13,
    fontWeight: "bold",
  },
  forecastRoiBox: {
    width: 52,
    alignItems: "center",
  },
  forecastRoi: {
    fontSize: 13,
    fontWeight: "bold",
  },
  forecastResidual: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 2,
  },
  dataSourceBox: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
    gap: 2,
  },
  dataSourceText: {
    fontSize: 9,
    color: theme.textMuted,
    lineHeight: 14,
  },
  // フィールド
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
});
