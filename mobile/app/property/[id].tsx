import React, { useState, useEffect, useMemo } from "react";
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
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { File } from "expo-file-system";
import MapView, { Marker, Circle, Polygon } from "react-native-maps";
import { api, Property, PropertyAnalysis, PropertyScore, RentAnalysis, LandPricePoint, MarketComparison, ExitPrediction, InternalRentComparable, LoanPreset, SavedSimulationItem, INVESTMENT_STATUSES, matchesLoanPreset, ReinfolibTransactions, ReinfolibAreaInfo, CommunityComparable, CommunityMarketStats } from "@/lib/api";
import { isInCompareList, toggleCompareItem } from "@/lib/compare-store";
import { useSubscription } from "@/lib/subscription-context";
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
  const { isPro } = useSubscription();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  // AI分析
  const [analysis, setAnalysis] = useState<PropertyAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [analysisDate, setAnalysisDate] = useState<string | null>(null);
  // 相場比較
  const [marketComparison, setMarketComparison] = useState<MarketComparison | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketExpanded, setMarketExpanded] = useState(false);
  // 出口予測
  const [exitPrediction, setExitPrediction] = useState<ExitPrediction | null>(null);
  const [exitLoading, setExitLoading] = useState(false);
  const [exitExpanded, setExitExpanded] = useState(false);
  // 比較リスト
  const [inCompare, setInCompare] = useState(false);
  const [loanPresets, setLoanPresets] = useState<LoanPreset[]>([]);
  // 保存済みシミュレーション
  const [savedSims, setSavedSims] = useState<SavedSimulationItem[]>([]);
  const [savedSimsExpanded, setSavedSimsExpanded] = useState(false);
  // 物件スコア
  const [propertyScore, setPropertyScore] = useState<PropertyScore | null>(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  // 賃料相場
  const [rentAnalysis, setRentAnalysis] = useState<RentAnalysis | null>(null);
  const [rentLoading, setRentLoading] = useState(false);
  const [rentExpanded, setRentExpanded] = useState(false);
  // 不動産情報ライブラリ（国土交通省）
  const [reinfolibData, setReinfolibData] = useState<ReinfolibTransactions | null>(null);
  const [reinfolibAreaInfo, setReinfolibAreaInfo] = useState<ReinfolibAreaInfo | null>(null);
  const [reinfolibLoading, setReinfolibLoading] = useState(false);
  const [reinfolibExpanded, setReinfolibExpanded] = useState(true);
  // コミュニティデータ
  const [communityStats, setCommunityStats] = useState<CommunityMarketStats | null>(null);
  const [communityComparables, setCommunityComparables] = useState<CommunityComparable[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityExpanded, setCommunityExpanded] = useState(false);

  useEffect(() => {
    fetchProperty();
    fetchScore();
    fetchRentAnalysis();
    fetchSavedAnalysis();
    isInCompareList(id).then(setInCompare);
    api.getLoanPresets().then(setLoanPresets).catch(() => {});
    api.getSavedSimulations(parseInt(id, 10)).then(setSavedSims).catch(() => {});
  }, [id]);

  async function fetchScore() {
    setScoreLoading(true);
    try {
      const res = await api.getPropertyScore(id);
      setPropertyScore(res);
    } catch {
      // スコア取得失敗は無視
    } finally {
      setScoreLoading(false);
    }
  }

  async function fetchRentAnalysis() {
    setRentLoading(true);
    try {
      const res = await api.getRentAnalysis(id);
      setRentAnalysis(res);
    } catch {
      // 取得失敗は無視
    } finally {
      setRentLoading(false);
    }
  }

  async function fetchReinfolibData(p: Property) {
    // 最寄駅がなければ公的データは取得不可
    if (!p.nearestStation && !p.prefecture) return;
    setReinfolibLoading(true);
    try {
      const builtYear = p.builtDate ? parseInt(p.builtDate.replace(/[^0-9]/g, "").slice(0, 4), 10) || undefined : undefined;

      // 取引データ: prefecture+city があればそれを使い、なければ station_name で逆引き
      const txPromise = api.getReinfolibTransactions({
        prefecture: p.prefecture ?? undefined,
        city: p.city ?? undefined,
        station_name: p.nearestStation ?? undefined,
        area_sqm: p.area ?? undefined,
        built_year: builtYear,
      }).catch(() => null);

      // エリア情報: 住所優先、なければ駅名で取得（都道府県・市区町村も渡して精度向上）
      const areaPromise = (p.address || p.nearestStation)
        ? api.getReinfolibAreaInfo({
            address: p.address ?? undefined,
            station_name: p.nearestStation ?? undefined,
            prefecture: p.prefecture ?? undefined,
            city: p.city ?? undefined,
          }).catch(() => null)
        : Promise.resolve(null);

      const [txResult, areaResult] = await Promise.all([txPromise, areaPromise]);
      if (txResult) setReinfolibData(txResult);
      if (areaResult) setReinfolibAreaInfo(areaResult);
    } catch {
      // 取得失敗は無視
    } finally {
      setReinfolibLoading(false);
    }
  }

  async function fetchCommunityData(p: Property) {
    if (!p.nearestStation && !p.city) return;
    setCommunityLoading(true);
    try {
      const area = p.area ?? undefined;
      const [stats, comps] = await Promise.all([
        api.getCommunityMarketStats({
          station_name: p.nearestStation ?? undefined,
          prefecture: p.prefecture ?? undefined,
          city: p.city ?? undefined,
        }).catch(() => null),
        api.getCommunityComparables({
          station_name: p.nearestStation ?? undefined,
          prefecture: p.prefecture ?? undefined,
          city: p.city ?? undefined,
          min_area: area ? area * 0.7 : undefined,
          max_area: area ? area * 1.3 : undefined,
          exclude_property_id: parseInt(id, 10),
        }).catch(() => null),
      ]);
      if (stats) setCommunityStats(stats);
      if (comps) setCommunityComparables(comps.comparables);
    } catch {} finally {
      setCommunityLoading(false);
    }
  }

  async function fetchProperty() {
    try {
      const res = await api.getProperty(id);
      setProperty(res.property);
      initEditData(res.property);
      fetchReinfolibData(res.property);
      fetchCommunityData(res.property);
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

  function requirePro(featureName: string): boolean {
    if (!isPro) {
      Alert.alert("Pro限定機能", `${featureName}はProプランで利用できます。`, [
        { text: "キャンセル" },
        { text: "Proを見る", onPress: () => router.push("/paywall" as any) },
      ]);
      return false;
    }
    return true;
  }

  async function checkFreeLimit(key: string, limit: number, featureName: string): Promise<boolean> {
    if (isPro) return true;
    try {
      const AsyncStorage = (await import("@react-native-async-storage/async-storage")).default;
      const monthKey = `${key}_${new Date().getFullYear()}_${new Date().getMonth()}`;
      const count = parseInt(await AsyncStorage.getItem(monthKey) || "0", 10);
      if (count >= limit) {
        Alert.alert(
          "無料枠の上限",
          `${featureName}は月${limit}回まで無料です。Proプランで無制限に。`,
          [{ text: "OK" }, { text: "Proを見る", onPress: () => router.push("/paywall" as any) }]
        );
        return false;
      }
      await AsyncStorage.setItem(monthKey, String(count + 1));
    } catch {}
    return true;
  }

  async function handleMarketComparison() {
    if (!property || !requirePro("相場比較")) return;
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
    if (!requirePro("出口予測")) return;
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

  async function fetchSavedAnalysis() {
    try {
      const saved = await api.getSavedAnalysis(id);
      if (saved && !saved.status) {
        setAnalysis(saved);
        setAnalysisExpanded(true);
        if ((saved as any).analyzed_at) {
          setAnalysisDate((saved as any).analyzed_at);
        }
        if (saved.reference_data?.search_coords && !reinfolibAreaInfo) {
          const { lat, lng } = saved.reference_data.search_coords;
          api.getReinfolibAreaInfo({ lat, lng }).then(setReinfolibAreaInfo).catch(() => {});
        }
      }
    } catch {
      // 取得失敗は無視（未分析の場合含む）
    }
  }

  async function handleAnalysis() {
    if (!property) return;
    if (!(await checkFreeLimit("ai_analysis", 5, "AI分析"))) return;
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
      // AI分析で取得した座標を使ってハザード・用途地域情報を取得
      if (result.reference_data?.search_coords && !reinfolibAreaInfo) {
        const { lat, lng } = result.reference_data.search_coords;
        api.getReinfolibAreaInfo({ lat, lng }).then(setReinfolibAreaInfo).catch(() => {});
      }
      // 分析結果をDBに保存（バックグラウンドで）
      setAnalysisDate(new Date().toISOString());
      api.analyzeAndSave(id).catch(() => {});
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

  async function handleShareProperty() {
    if (!property) return;
    const lines: string[] = [];
    lines.push(`【${property.name || "物件情報"}】`);
    if (property.price) lines.push(`価格: ${property.price}万円`);
    if (property.monthlyRent) lines.push(`月額賃料: ${property.monthlyRent.toLocaleString()}円`);
    if (property.managementFee) lines.push(`管理費: ${property.managementFee.toLocaleString()}円/月`);
    if (property.repairReserve) lines.push(`修繕積立金: ${property.repairReserve.toLocaleString()}円/月`);
    if (property.layout) lines.push(`間取り: ${property.layout}`);
    if (property.area) lines.push(`面積: ${property.area}㎡`);
    if (property.structure) lines.push(`構造: ${property.structure}`);
    if (property.builtDate) lines.push(`築年月: ${property.builtDate}`);
    if (property.nearestStation) {
      let st = `最寄駅: ${property.nearestStation}`;
      if (property.walkMinutes) st += ` 徒歩${property.walkMinutes}分`;
      lines.push(st);
    }
    if (property.address) lines.push(`所在地: ${property.address}`);
    // 利回り（自動計算対応）
    if (property.price && property.price > 0 && property.monthlyRent) {
      const grossYield = property.grossYield != null
        ? property.grossYield
        : (property.monthlyRent * 12) / (property.price * 10000) * 100;
      lines.push(`表面利回り: ${grossYield.toFixed(2)}%`);
      const netYield = ((property.monthlyRent - (property.managementFee || 0) - (property.repairReserve || 0) - (property.otherMonthlyExpenses || 0)) * 12) / (property.price * 10000) * 100;
      lines.push(`実質利回り: ${netYield.toFixed(2)}%`);
    }
    // スコアがあれば追加
    if (propertyScore) {
      lines.push(`\n投資スコア: ${Math.round(propertyScore.total)}/100 (ランク${propertyScore.rank})`);
    }
    lines.push("\n-- MaisokuDB で分析");
    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      // ユーザーがキャンセル
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
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.headerName}>{property.name}</Text>
          {property.isDemo && (
            <View style={{ backgroundColor: "#E0E0E0", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, color: "#757575", fontWeight: "600" }}>デモ物件</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={styles.headerPrice}>
            {property.price ? `${property.price}万円` : "価格未定"}
          </Text>
          {propertyScore && (
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              onPress={() => Alert.alert(
                `${propertyScore.rank}ランク（${Math.round(propertyScore.total)}点/100点）`,
                "投資スコアは公的データをもとに自動算出しています。\n\n" +
                "S（80〜100点）: 非常に優良\n" +
                "A（60〜79点）: 優良\n" +
                "B（40〜59点）: 標準\n" +
                "C（20〜39点）: やや注意\n" +
                "D（0〜19点）: 要検討\n\n" +
                "立地・収益性・資産性・将来性の4カテゴリで採点しています。"
              )}
            >
              <View style={[{
                backgroundColor: propertyScore.rank === "S" ? "#F59E0B" :
                  propertyScore.rank === "A" ? "#22C55E" :
                  propertyScore.rank === "B" ? "#3B82F6" :
                  propertyScore.rank === "C" ? "#F97316" : "#EF4444",
                borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
              }]}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#fff" }}>
                  {propertyScore.rank} {Math.round(propertyScore.total)}点
                </Text>
              </View>
              <FontAwesome name="question-circle-o" size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* 利回り表示（自動計算対応） */}
        {property.price && property.price > 0 && property.monthlyRent != null && (
          <View style={styles.yieldRow}>
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>表面利回り</Text>
              <Text style={styles.yieldValue}>
                {(property.grossYield != null
                  ? property.grossYield
                  : (property.monthlyRent * 12) / (property.price * 10000) * 100
                ).toFixed(2)}%
              </Text>
            </View>
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>実質利回り</Text>
              <Text style={[styles.yieldValue, styles.yieldValueNet]}>
                {(((property.monthlyRent - (property.managementFee || 0) - (property.repairReserve || 0) - (property.otherMonthlyExpenses || 0)) * 12) / (property.price * 10000) * 100).toFixed(2)}%
              </Text>
            </View>
          </View>
        )}

        {/* 融資適格性バッジ */}
        {loanPresets.length > 0 && (
          <View style={styles.loanEligibilityRow}>
            {loanPresets.map((preset) => {
              const result = matchesLoanPreset(property, preset);
              return (
                <TouchableOpacity
                  key={preset.id}
                  style={[
                    styles.loanEligibilityBadge,
                    result.matches ? styles.loanEligible : styles.loanIneligible,
                  ]}
                  onPress={() => {
                    if (!result.matches) {
                      Alert.alert(
                        `${preset.name}：不適合`,
                        result.reasons.join("\n"),
                        [{ text: "OK" }]
                      );
                    }
                  }}
                >
                  <FontAwesome
                    name={result.matches ? "check-circle" : "times-circle"}
                    size={12}
                    color={result.matches ? "#16A34A" : "#DC2626"}
                  />
                  <Text style={[
                    styles.loanEligibilityText,
                    { color: result.matches ? "#16A34A" : "#DC2626" },
                  ]}>
                    {preset.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

      {/* クイックインサイト（公的データ） */}
      {reinfolibLoading && (
        <View style={{ padding: 16, alignItems: "center" }}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>公的データ取得中...</Text>
        </View>
      )}
      {!reinfolibLoading && reinfolibAreaInfo && (
        <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, backgroundColor: theme.bgCard, borderRadius: 12, gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.text, marginBottom: 2 }}>
            <FontAwesome name="database" size={12} color={theme.accent} />  公的データサマリー
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {/* DID */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: (reinfolibAreaInfo.did || []).length > 0 ? "rgba(59,130,246,0.08)" : "rgba(255,193,7,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <FontAwesome name="users" size={11} color={(reinfolibAreaInfo.did || []).length > 0 ? "#3B82F6" : "#F59E0B"} />
              <Text style={{ fontSize: 12, color: (reinfolibAreaInfo.did || []).length > 0 ? "#3B82F6" : "#F59E0B", marginLeft: 4, fontWeight: "600" }}>
                {(reinfolibAreaInfo.did || []).length > 0 ? "DID区域内" : "DID区域外"}
              </Text>
            </View>
            {/* 人口トレンド */}
            {(reinfolibAreaInfo.future_population || []).length > 0 && reinfolibAreaInfo.future_population[0].trend && (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: reinfolibAreaInfo.future_population[0].trend === "growing" ? "rgba(76,175,80,0.08)" : reinfolibAreaInfo.future_population[0].trend === "declining" ? "rgba(244,67,54,0.08)" : "rgba(255,193,7,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <FontAwesome name="line-chart" size={11} color={reinfolibAreaInfo.future_population[0].trend === "growing" ? "#4CAF50" : reinfolibAreaInfo.future_population[0].trend === "declining" ? "#F44336" : "#F59E0B"} />
                <Text style={{ fontSize: 12, color: reinfolibAreaInfo.future_population[0].trend === "growing" ? "#4CAF50" : reinfolibAreaInfo.future_population[0].trend === "declining" ? "#F44336" : "#F59E0B", marginLeft: 4, fontWeight: "600" }}>
                  人口{reinfolibAreaInfo.future_population[0].trend === "growing" ? "増加" : reinfolibAreaInfo.future_population[0].trend === "declining" ? "減少" : "横ばい"}
                  {reinfolibAreaInfo.future_population[0].change_rate_2040 != null ? ` ${reinfolibAreaInfo.future_population[0].change_rate_2040 > 0 ? "+" : ""}${reinfolibAreaInfo.future_population[0].change_rate_2040}%` : ""}
                </Text>
              </View>
            )}
            {/* 洪水リスク */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: reinfolibAreaInfo.flood_risk.length > 0 ? "rgba(244,67,54,0.08)" : "rgba(76,175,80,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <FontAwesome name="tint" size={11} color={reinfolibAreaInfo.flood_risk.length > 0 ? "#F44336" : "#4CAF50"} />
              <Text style={{ fontSize: 12, color: reinfolibAreaInfo.flood_risk.length > 0 ? "#F44336" : "#4CAF50", marginLeft: 4, fontWeight: "600" }}>
                {reinfolibAreaInfo.flood_risk.length > 0 ? "浸水リスクあり" : "浸水想定外"}
              </Text>
            </View>
            {/* 土砂災害 */}
            <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: reinfolibAreaInfo.landslide_risk.length > 0 ? "rgba(244,67,54,0.08)" : "rgba(76,175,80,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
              <FontAwesome name="warning" size={11} color={reinfolibAreaInfo.landslide_risk.length > 0 ? "#F44336" : "#4CAF50"} />
              <Text style={{ fontSize: 12, color: reinfolibAreaInfo.landslide_risk.length > 0 ? "#F44336" : "#4CAF50", marginLeft: 4, fontWeight: "600" }}>
                {reinfolibAreaInfo.landslide_risk.length > 0 ? "土砂警戒区域" : "土砂警戒外"}
              </Text>
            </View>
            {/* 用途地域 */}
            {reinfolibAreaInfo.zoning.length > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: "rgba(6,182,212,0.08)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                <FontAwesome name="building" size={11} color="#06B6D4" />
                <Text style={{ fontSize: 12, color: "#06B6D4", marginLeft: 4, fontWeight: "600" }}>
                  {reinfolibAreaInfo.zoning[0].youto_name || reinfolibAreaInfo.zoning[0].youto || "用途地域"}
                </Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 10, color: theme.textMuted }}>出典: 国土交通省 不動産情報ライブラリ</Text>
        </View>
      )}

      {/* Investment Status */}
      <View style={styles.statusRow}>
        {INVESTMENT_STATUSES.map((s) => {
          const active = property.investmentStatus === s.key;
          return (
            <TouchableOpacity
              key={s.key}
              style={[
                styles.statusChip,
                { borderColor: s.color },
                active && { backgroundColor: s.color },
              ]}
              onPress={async () => {
                const newStatus = active ? null : s.key;
                try {
                  await api.updateProperty(id, { investmentStatus: newStatus } as any);
                  setProperty({ ...property, investmentStatus: newStatus } as Property);
                } catch {}
              }}
            >
              <FontAwesome
                name={s.icon as any}
                size={12}
                color={active ? "#fff" : s.color}
              />
              <Text style={[styles.statusChipText, { color: active ? "#fff" : s.color }]}>
                {s.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
          style={[styles.actionButton, inCompare && styles.compareActiveButton]}
          onPress={async () => {
            const result = await toggleCompareItem(id);
            if (result.maxReached) {
              Alert.alert("上限", "比較できる物件は最大3件です。比較画面で選択を解除してください。");
            } else {
              setInCompare(result.added);
            }
          }}
        >
          <FontAwesome name="bar-chart" size={16} color={inCompare ? theme.accent : theme.text} />
          <Text style={[styles.actionText, inCompare && { color: theme.accent }]}>
            {inCompare ? "比較中" : "比較に追加"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleShareProperty}
        >
          <FontAwesome name="share-alt" size={16} color={theme.text} />
          <Text style={styles.actionText}>共有</Text>
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
                property_id: property.id,
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

      {/* 保存済みシミュレーション */}
      {savedSims.length > 0 && (
        <View style={styles.savedSimsSection}>
          <TouchableOpacity
            style={styles.savedSimsHeader}
            onPress={() => setSavedSimsExpanded(!savedSimsExpanded)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FontAwesome name="bookmark" size={16} color="#3B82F6" />
              <Text style={styles.savedSimsTitle}>
                保存済みシミュレーション ({savedSims.length})
              </Text>
            </View>
            <FontAwesome
              name={savedSimsExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          {savedSimsExpanded && savedSims.map((sim) => {
            const monthlyCfColor = (sim.monthly_cf ?? 0) >= 0 ? theme.success : "#EF4444";
            return (
              <View key={sim.id} style={styles.savedSimCard}>
                <View style={styles.savedSimRow}>
                  <Text style={styles.savedSimLabel}>{sim.label}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      Alert.alert("削除確認", `「${sim.label}」を削除しますか？`, [
                        { text: "キャンセル", style: "cancel" },
                        {
                          text: "削除",
                          style: "destructive",
                          onPress: async () => {
                            try {
                              await api.deleteSavedSimulation(sim.id);
                              setSavedSims(savedSims.filter((s) => s.id !== sim.id));
                            } catch {}
                          },
                        },
                      ]);
                    }}
                  >
                    <FontAwesome name="trash-o" size={14} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={styles.savedSimMetrics}>
                  <View style={styles.savedSimMetric}>
                    <Text style={styles.savedSimMetricLabel}>金利</Text>
                    <Text style={styles.savedSimMetricValue}>
                      {sim.interest_rate != null ? `${(sim.interest_rate * 100).toFixed(2)}%` : "-"}
                    </Text>
                  </View>
                  <View style={styles.savedSimMetric}>
                    <Text style={styles.savedSimMetricLabel}>月額CF</Text>
                    <Text style={[styles.savedSimMetricValue, { color: monthlyCfColor }]}>
                      {sim.monthly_cf != null ? `¥${sim.monthly_cf.toLocaleString()}` : "-"}
                    </Text>
                  </View>
                  <View style={styles.savedSimMetric}>
                    <Text style={styles.savedSimMetricLabel}>実質利回り</Text>
                    <Text style={styles.savedSimMetricValue}>
                      {sim.net_yield != null ? `${Number(sim.net_yield).toFixed(2)}%` : "-"}
                    </Text>
                  </View>
                  <View style={styles.savedSimMetric}>
                    <Text style={styles.savedSimMetricLabel}>ROI</Text>
                    <Text style={styles.savedSimMetricValue}>
                      {sim.roi != null ? `${Number(sim.roi).toFixed(2)}%` : "-"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.savedSimDate}>
                  {new Date(sim.created_at).toLocaleDateString("ja-JP")}
                </Text>
              </View>
            );
          })}
        </View>
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

      {/* 賃料相場分析 */}
      {rentLoading && (
        <View style={styles.analysisLoadingCard}>
          <ActivityIndicator size="large" color="#10B981" />
          <Text style={[styles.analysisLoadingTitle, { color: "#10B981" }]}>賃料相場を分析中...</Text>
        </View>
      )}
      {rentAnalysis && !rentLoading && (
        <TouchableOpacity
          style={styles.fieldsCard}
          onPress={() => setRentExpanded(!rentExpanded)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <FontAwesome name="yen" size={16} color="#10B981" />
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: "#10B981" }]}>賃料相場分析</Text>
            </View>
            <FontAwesome name={rentExpanded ? "chevron-up" : "chevron-down"} size={14} color={theme.textMuted} />
          </View>

          {/* サマリー（常に表示） */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {rentAnalysis.current_rent != null && (
              <View style={[styles.summaryMetricBox, { borderColor: "rgba(16, 185, 129, 0.2)" }]}>
                <Text style={styles.summaryMetricLabel}>現在賃料</Text>
                <Text style={[styles.summaryMetricValue, { color: "#10B981" }]}>
                  {rentAnalysis.current_rent.toLocaleString()}円
                </Text>
              </View>
            )}
            {rentAnalysis.estimated_rent != null && (
              <View style={[styles.summaryMetricBox, { borderColor: "rgba(16, 185, 129, 0.2)" }]}>
                <Text style={styles.summaryMetricLabel}>推定適正賃料</Text>
                <Text style={[styles.summaryMetricValue, { color: "#10B981" }]}>
                  {rentAnalysis.estimated_rent.toLocaleString()}円
                </Text>
              </View>
            )}
            {rentAnalysis.assessment && (
              <View style={[styles.summaryMetricBox, { borderColor: rentAnalysis.assessment === "割安" ? "rgba(34, 197, 94, 0.3)" : rentAnalysis.assessment === "割高" ? "rgba(239, 68, 68, 0.3)" : "rgba(16, 185, 129, 0.2)" }]}>
                <Text style={styles.summaryMetricLabel}>判定</Text>
                <Text style={[styles.summaryMetricValue, {
                  color: rentAnalysis.assessment === "割安" ? "#22C55E" : rentAnalysis.assessment === "割高" ? "#EF4444" : "#10B981",
                  fontSize: 14,
                }]}>
                  {rentAnalysis.assessment}
                  {rentAnalysis.diff_pct != null ? ` (${rentAnalysis.diff_pct > 0 ? "+" : ""}${rentAnalysis.diff_pct}%)` : ""}
                </Text>
              </View>
            )}
          </View>

          {/* 詳細（展開時） */}
          {rentExpanded && (
            <View style={{ marginTop: 12 }}>
              {/* 推定レンジ */}
              {rentAnalysis.estimated_range && (
                <View style={{ marginBottom: 12, padding: 10, backgroundColor: "rgba(16,185,129,0.06)", borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: "#10B981", marginBottom: 4 }}>推定賃料レンジ</Text>
                  <Text style={{ fontSize: 13, color: theme.text }}>
                    {rentAnalysis.estimated_range.low.toLocaleString()}円 〜 {rentAnalysis.estimated_range.high.toLocaleString()}円
                  </Text>
                  {rentAnalysis.current_rent_m2 != null && rentAnalysis.estimated_rent_m2 != null && (
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
                      m²単価: 現在 {rentAnalysis.current_rent_m2.toLocaleString()}円 / 推定 {rentAnalysis.estimated_rent_m2.toLocaleString()}円
                    </Text>
                  )}
                </View>
              )}

              {/* 利回り分析 */}
              {rentAnalysis.yield_analysis && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text, marginBottom: 6 }}>現在の利回り</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>表面利回り</Text>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#22C55E" }}>{rentAnalysis.yield_analysis.gross_yield}%</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>実質利回り</Text>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: "#3B82F6" }}>{rentAnalysis.yield_analysis.net_yield}%</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>年間手取り</Text>
                      <Text style={{ fontSize: 14, fontWeight: "bold", color: theme.text }}>{(rentAnalysis.yield_analysis.annual_net_income / 10000).toFixed(1)}万</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 推定賃料での利回り */}
              {rentAnalysis.estimated_yield && rentAnalysis.yield_analysis && (
                <View style={{ marginBottom: 12, padding: 10, backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 8, borderWidth: 1, borderColor: "rgba(16,185,129,0.15)" }}>
                  <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 4 }}>推定適正賃料での利回り</Text>
                  <Text style={{ fontSize: 13, color: theme.text }}>
                    表面 {rentAnalysis.estimated_yield.gross_yield}% / 実質 {rentAnalysis.estimated_yield.net_yield}%
                  </Text>
                </View>
              )}

              {/* 比較物件統計 */}
              {rentAnalysis.comparable_stats && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text, marginBottom: 6 }}>
                    同エリア賃料統計（{rentAnalysis.comparable_stats.count}件）
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>中央値/㎡</Text>
                      <Text style={{ fontSize: 12, fontWeight: "bold", color: theme.text }}>{rentAnalysis.comparable_stats.median_rent_m2.toLocaleString()}円</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>最低/㎡</Text>
                      <Text style={{ fontSize: 12, fontWeight: "bold", color: theme.text }}>{rentAnalysis.comparable_stats.min_rent_m2.toLocaleString()}円</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 6, padding: 8, alignItems: "center" }}>
                      <Text style={{ fontSize: 9, color: theme.textMuted }}>最高/㎡</Text>
                      <Text style={{ fontSize: 12, fontWeight: "bold", color: theme.text }}>{rentAnalysis.comparable_stats.max_rent_m2.toLocaleString()}円</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 比較物件リスト */}
              {rentAnalysis.comparables.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: theme.text, marginBottom: 6 }}>比較物件</Text>
                  {rentAnalysis.comparables.slice(0, 5).map((c, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" }}>
                      <Text style={{ fontSize: 11, color: theme.textMuted, flex: 1 }} numberOfLines={1}>{c.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.text, marginLeft: 8 }}>{c.rent_m2.toLocaleString()}円/㎡</Text>
                      <Text style={{ fontSize: 11, color: theme.textMuted, marginLeft: 8 }}>{c.area}㎡</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* モデル入力 */}
              <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 4 }}>
                推定根拠: {[
                  rentAnalysis.model_inputs.area ? `${rentAnalysis.model_inputs.area}㎡` : null,
                  rentAnalysis.model_inputs.age_years != null ? `築${Math.round(rentAnalysis.model_inputs.age_years)}年` : null,
                  rentAnalysis.model_inputs.walk_minutes != null ? `徒歩${rentAnalysis.model_inputs.walk_minutes}分` : null,
                  rentAnalysis.model_inputs.structure,
                  rentAnalysis.model_inputs.daily_passengers ? `乗降${rentAnalysis.model_inputs.daily_passengers.toLocaleString()}人/日` : null,
                ].filter(Boolean).join(" / ")}
              </Text>
            </View>
          )}
        </TouchableOpacity>
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

          {/* 予測モデルの解説 */}
          <View style={styles.exitModelBox}>
            <Text style={styles.exitModelTitle}>予測モデル</Text>
            <Text style={styles.exitModelFormula}>
              売却価格 = 現在価格 × (土地変化 × 土地比率 + 建物残価変化 × 建物比率) × 流動性 × 人口補正
            </Text>
          </View>

          {/* 計算前提（解説付き） */}
          <View style={styles.exitAssumptionBox}>
            {/* 建物減価 */}
            {exitPrediction.structure && (
              <View style={styles.exitFactorRow}>
                <View style={styles.exitFactorHeader}>
                  <FontAwesome name="building" size={11} color="#F59E0B" />
                  <Text style={styles.exitFactorTitle}>建物減価</Text>
                </View>
                <Text style={styles.exitFactorValue}>
                  {exitPrediction.structure} ・ 法定耐用年数 {exitPrediction.legal_life}年
                </Text>
                <Text style={styles.exitFactorDesc}>
                  現在の建物残存価値は{exitPrediction.current_building_residual_pct}%。法定耐用年数に基づく定額法で減価し、最低20%を保証。{exitPrediction.structure === "RC造" || exitPrediction.structure === "SRC造" ? "RC/SRC造は47年と長く、価値の目減りが緩やか。" : exitPrediction.structure === "木造" ? "木造は22年と短く、築古になるほど建物価値の下落が大きい。" : ""}
                </Text>
              </View>
            )}

            {/* 地価トレンド */}
            <View style={styles.exitFactorRow}>
              <View style={styles.exitFactorHeader}>
                <FontAwesome name="area-chart" size={11} color="#F59E0B" />
                <Text style={styles.exitFactorTitle}>地価トレンド</Text>
              </View>
              <Text style={styles.exitFactorValue}>
                年率 {exitPrediction.land_price_trend_pct > 0 ? "+" : ""}{exitPrediction.land_price_trend_pct}%
                {exitPrediction.land_price_trend_basis ? ` （${exitPrediction.land_price_trend_basis}）` : ""}
              </Text>
              <Text style={styles.exitFactorDesc}>
                最寄駅周辺の地価公示データから算出した年間変化率。{exitPrediction.land_price_trend_pct > 0 ? `このエリアは地価が上昇傾向にあり、土地分の資産価値は年${exitPrediction.land_price_trend_pct}%ずつ増加する前提で計算。` : exitPrediction.land_price_trend_pct < 0 ? `このエリアは地価が下落傾向にあり、土地分の資産価値が年${Math.abs(exitPrediction.land_price_trend_pct)}%ずつ減少する前提で計算。` : "このエリアの地価は横ばい傾向。"}複利で将来価値を算出。
              </Text>
            </View>

            {/* 土地・建物比率 */}
            <View style={styles.exitFactorRow}>
              <View style={styles.exitFactorHeader}>
                <FontAwesome name="pie-chart" size={11} color="#F59E0B" />
                <Text style={styles.exitFactorTitle}>土地・建物比率</Text>
              </View>
              <Text style={styles.exitFactorValue}>
                土地 {exitPrediction.assumptions.land_ratio_pct}% / 建物 {exitPrediction.assumptions.building_ratio_pct}%
              </Text>
              <Text style={styles.exitFactorDesc}>
                物件種別から推定した一般的な比率。{exitPrediction.assumptions.land_ratio_pct <= 25 ? "区分マンションは土地持分が小さいため、建物の減価が価格に大きく影響する。" : exitPrediction.assumptions.land_ratio_pct >= 40 ? "土地比率が高いため、地価トレンドの影響を受けやすい。" : ""}土地部分は地価トレンドで変化し、建物部分は法定耐用年数で減価。
              </Text>
            </View>

            {/* 流動性 */}
            <View style={styles.exitFactorRow}>
              <View style={styles.exitFactorHeader}>
                <FontAwesome name="exchange" size={11} color="#F59E0B" />
                <Text style={styles.exitFactorTitle}>流動性係数</Text>
              </View>
              <Text style={styles.exitFactorValue}>
                ×{exitPrediction.liquidity_multiplier} （{exitPrediction.num_lines}路線利用可）
              </Text>
              <Text style={styles.exitFactorDesc}>
                利用可能な鉄道路線数から算出。{exitPrediction.num_lines >= 3 ? "複数路線が利用でき、売却時に買い手が見つかりやすい立地。" : exitPrediction.num_lines === 0 ? "鉄道アクセスが確認できず、流動性の補正なし。" : "路線数は標準的で、流動性への影響は小さい。"}路線が多いほど需要が厚く、実勢価格が理論値を上回りやすい。
              </Text>
            </View>

            {/* 人口補正 */}
            {exitPrediction.population && (
              <View style={styles.exitFactorRow}>
                <View style={styles.exitFactorHeader}>
                  <FontAwesome name="users" size={11} color="#F59E0B" />
                  <Text style={styles.exitFactorTitle}>人口動態補正</Text>
                </View>
                <Text style={styles.exitFactorValue}>
                  {exitPrediction.population.pref}{exitPrediction.population.city ? ` ${exitPrediction.population.city}` : ""}：2040年 {exitPrediction.population.change_rate_2040 != null ? `${exitPrediction.population.change_rate_2040 > 0 ? "+" : ""}${exitPrediction.population.change_rate_2040}%` : "—"}
                </Text>
                <Text style={styles.exitFactorDesc}>
                  {exitPrediction.population.trend === "growing" ? "人口増加エリアのため、将来の需要維持が見込め売却価格を上方補正。" : exitPrediction.population.trend === "declining" ? "人口減少エリアのため、将来の需要低下リスクを織り込み売却価格を下方補正。" : "人口はほぼ横ばいで、需給への影響は限定的。"}感応度0.3（人口10%変化 → 価格3%補正）で計算。
                </Text>
              </View>
            )}
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
                {f.population_multiplier != null && f.population_multiplier !== 1.0 && (
                  <Text style={[styles.forecastResidual, { color: f.population_multiplier > 1 ? "#4CAF50" : "#F44336" }]}>
                    人口{f.population_multiplier > 1 ? "+" : ""}{((f.population_multiplier - 1) * 100).toFixed(1)}%
                  </Text>
                )}
              </View>
            </View>
          ))}

          {/* 悲観・楽観の説明 */}
          <View style={styles.exitRangeExplain}>
            <Text style={styles.exitRangeText}>
              悲観・楽観は中央値から±15%の幅。地価変動の不確実性・物件固有の劣化リスク・市況変動を考慮したレンジ。実際の売却は仲介手数料（3%+6万円）等の諸費用が別途発生。
            </Text>
          </View>

          <View style={styles.dataSourceBox}>
            <Text style={[styles.dataSourceText, { fontWeight: "bold", marginBottom: 4 }]}>データソース</Text>
            {exitPrediction.data_sources?.land_price && (
              <Text style={styles.dataSourceText}>地価: {exitPrediction.data_sources.land_price}</Text>
            )}
            {exitPrediction.data_sources?.station && (
              <Text style={styles.dataSourceText}>駅: {exitPrediction.data_sources.station}</Text>
            )}
            {exitPrediction.data_sources?.depreciation && (
              <Text style={styles.dataSourceText}>減価: {exitPrediction.data_sources.depreciation}</Text>
            )}
            {exitPrediction.data_sources?.population && (
              <Text style={styles.dataSourceText}>人口: {exitPrediction.data_sources.population}</Text>
            )}
            {exitPrediction.calculated_at && (
              <Text style={[styles.dataSourceText, { marginTop: 4 }]}>
                算出: {exitPrediction.calculated_at.replace("T", " ")}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* 人口トレンドセクション */}
      {property?.population && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisTitleRow}>
            <FontAwesome name="users" size={14} color="#60A5FA" />
            <Text style={[styles.analysisSectionTitle, { color: "#60A5FA" }]}>
              エリア人口トレンド（2020→2040年推計）
            </Text>
          </View>
          <View style={styles.populationRow}>
            <View style={styles.populationBadge}>
              <Text style={[
                styles.populationTrend,
                property.population.trend === "growing" && { color: "#4CAF50" },
                property.population.trend === "stable" && { color: "#F59E0B" },
                property.population.trend === "declining" && { color: theme.accent },
              ]}>
                {property.population.trend === "growing" ? "▲ 人口増加" :
                 property.population.trend === "declining" ? "▼ 人口減少" : "━ 横ばい"}
              </Text>
              <Text style={styles.populationChangeRate}>
                {property.population.change_rate_2040 != null
                  ? `${property.population.change_rate_2040 > 0 ? "+" : ""}${property.population.change_rate_2040.toFixed(1)}%`
                  : "—"}
              </Text>
            </View>
            <View style={styles.populationStats}>
              <Text style={styles.populationStatRow}>
                2020年: {property.population.pop_2020?.toLocaleString() ?? "—"} 人
              </Text>
              <Text style={styles.populationStatRow}>
                2040年: {property.population.pop_2040?.toLocaleString() ?? "—"} 人（推計）
              </Text>
              <Text style={styles.populationStatRow}>
                2050年: {property.population.pop_2050?.toLocaleString() ?? "—"} 人（推計）
              </Text>
            </View>
          </View>
          {/* ミニバーチャート: 2020→2025→2030→2035→2040 */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, marginTop: 12, height: 48 }}>
            {([
              { y: 2025, idx: property.population.idx_2025 },
              { y: 2030, idx: property.population.idx_2030 },
              { y: 2035, idx: property.population.idx_2035 },
              { y: 2040, idx: property.population.idx_2040 },
              { y: 2045, idx: property.population.idx_2045 },
              { y: 2050, idx: property.population.idx_2050 },
            ] as { y: number; idx: number | null }[]).map(({ y, idx }) => {
              if (idx == null) return null;
              const barH = Math.max(4, Math.round(48 * (idx / 100)));
              const barColor = idx >= 100 ? "#4CAF50" : idx >= 85 ? "#F59E0B" : theme.accent;
              return (
                <View key={y} style={{ flex: 1, alignItems: "center" }}>
                  <View style={{ width: "100%", height: barH, backgroundColor: barColor, borderRadius: 3 }} />
                  <Text style={{ fontSize: 8, color: "#6b6459", marginTop: 2 }}>{String(y).slice(2)}</Text>
                </View>
              );
            })}
          </View>
          <Text style={[styles.dataSourceText, { marginTop: 6 }]}>
            出典: 国立社会保障・人口問題研究所（2023年推計）
          </Text>
        </View>
      )}

      {/* 公的取引データ（国土交通省 不動産情報ライブラリ） */}
      {reinfolibLoading && (
        <View style={styles.analysisLoadingCard}>
          <ActivityIndicator size="large" color="#0891B2" />
          <Text style={[styles.analysisLoadingTitle, { color: "#0891B2" }]}>公的取引データ取得中...</Text>
          <Text style={styles.analysisLoadingDesc}>国土交通省 不動産情報ライブラリを照会しています</Text>
        </View>
      )}
      {reinfolibData && !reinfolibLoading && (
        <View style={[styles.analysisCard, { borderLeftColor: "#0891B2", borderLeftWidth: 3 }]}>
          <TouchableOpacity style={styles.analysisTitleRow} onPress={() => setReinfolibExpanded(!reinfolibExpanded)}>
            <FontAwesome name="bank" size={14} color="#0891B2" />
            <Text style={[styles.analysisSectionTitle, { color: "#0891B2" }]}>
              公的取引データ（{reinfolibData.count}件）
            </Text>
            <FontAwesome name={reinfolibExpanded ? "chevron-up" : "chevron-down"} size={12} color={theme.textMuted} />
          </TouchableOpacity>

          {reinfolibExpanded && (
            <View>
              {/* この物件の㎡単価 vs 市場平均 */}
              {property.price && property.area && property.area > 0 && (() => {
                const myM2 = Math.round((property.price * 10000) / property.area / 10000);
                const avgM2 = Math.round(reinfolibData.avg_price_m2 / 10000);
                const diffPct = ((myM2 - avgM2) / avgM2) * 100;
                const isBelow = diffPct < -5;
                const isAbove = diffPct > 5;
                return (
                  <View style={[styles.priceCompareBox, { backgroundColor: isBelow ? "rgba(76,175,80,0.08)" : isAbove ? "rgba(244,67,54,0.08)" : "rgba(255,193,7,0.08)", borderRadius: 8, padding: 10, marginBottom: 6 }]}>
                    <View style={styles.priceCompareItem}>
                      <Text style={styles.priceCompareLabel}>この物件</Text>
                      <Text style={[styles.priceCompareValue, { color: isBelow ? "#4CAF50" : isAbove ? "#F44336" : "#FFC107", fontWeight: "bold" }]}>{myM2.toLocaleString()}万円/㎡</Text>
                    </View>
                    <View style={[styles.priceCompareItem, { alignItems: "center" }]}>
                      <Text style={{ color: theme.textMuted, fontSize: 11 }}>vs</Text>
                      <Text style={{ color: isBelow ? "#4CAF50" : isAbove ? "#F44336" : "#FFC107", fontSize: 13, fontWeight: "bold" }}>{diffPct > 0 ? "+" : ""}{diffPct.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.priceCompareItem}>
                      <Text style={styles.priceCompareLabel}>市場平均</Text>
                      <Text style={styles.priceCompareValue}>{avgM2.toLocaleString()}万円/㎡</Text>
                    </View>
                  </View>
                );
              })()}
              {/* 単価サマリー */}
              <View style={styles.priceCompareBox}>
                <View style={styles.priceCompareItem}>
                  <Text style={styles.priceCompareLabel}>平均㎡単価</Text>
                  <Text style={styles.priceCompareValue}>{Math.round(reinfolibData.avg_price_m2 / 10000).toLocaleString()}万円/㎡</Text>
                </View>
                <View style={styles.priceCompareItem}>
                  <Text style={styles.priceCompareLabel}>中央値</Text>
                  <Text style={[styles.priceCompareValue, { color: theme.textSecondary }]}>{Math.round(reinfolibData.median_price_m2 / 10000).toLocaleString()}万円/㎡</Text>
                </View>
              </View>
              <View style={styles.priceCompareBox}>
                <View style={styles.priceCompareItem}>
                  <Text style={styles.priceCompareLabel}>最安値</Text>
                  <Text style={[styles.priceCompareValue, { fontSize: 13 }]}>{Math.round(reinfolibData.min_price_m2 / 10000).toLocaleString()}万円/㎡</Text>
                </View>
                <View style={styles.priceCompareItem}>
                  <Text style={styles.priceCompareLabel}>最高値</Text>
                  <Text style={[styles.priceCompareValue, { fontSize: 13 }]}>{Math.round(reinfolibData.max_price_m2 / 10000).toLocaleString()}万円/㎡</Text>
                </View>
                <View style={styles.priceCompareItem}>
                  <Text style={styles.priceCompareLabel}>平均総額</Text>
                  <Text style={[styles.priceCompareValue, { fontSize: 13 }]}>{Math.round(reinfolibData.avg_total_price / 10000).toLocaleString()}万円</Text>
                </View>
              </View>

              {/* この物件との比較 */}
              {property.price && property.area && property.area > 0 && (
                (() => {
                  const propertyM2 = (property.price * 10000) / property.area;
                  const diffPct = ((propertyM2 - reinfolibData.avg_price_m2) / reinfolibData.avg_price_m2) * 100;
                  const isBelow = diffPct < -5;
                  const isAbove = diffPct > 5;
                  return (
                    <View style={[styles.assessmentBadge, {
                      backgroundColor: isBelow ? "rgba(76,175,80,0.15)" : isAbove ? "rgba(244,67,54,0.15)" : "rgba(255,193,7,0.15)",
                      marginVertical: 8,
                    }]}>
                      <Text style={[styles.assessmentText, {
                        color: isBelow ? "#4CAF50" : isAbove ? "#F44336" : "#FFC107",
                      }]}>
                        この物件: {Math.round(propertyM2 / 10000).toLocaleString()}万円/㎡（公的データ平均比 {diffPct > 0 ? "+" : ""}{diffPct.toFixed(1)}%）
                      </Text>
                    </View>
                  );
                })()
              )}

              {/* 取引事例サンプル */}
              {reinfolibData.samples.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={[styles.comparableHeader, { color: "#0891B2" }]}>直近の取引事例</Text>
                  {reinfolibData.samples.slice(0, 5).map((s, i) => (
                    <View key={i} style={styles.comparableRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.comparableName}>
                          {s.district || s.municipality || "—"} {s.floor_plan || ""}
                        </Text>
                        <Text style={styles.comparableDetail}>
                          {s.area}㎡ ・ {s.building_year ? `${s.building_year}年築` : "築年不明"} ・ {s.structure || ""}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.comparablePrice}>
                          {Math.round(s.total_price / 10000).toLocaleString()}万円
                        </Text>
                        <Text style={[styles.comparableDetail, { color: "#0891B2" }]}>
                          {Math.round(s.unit_price / 10000).toLocaleString()}万円/㎡
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.dataSourceText, { marginTop: 8 }]}>
                出典: {reinfolibData.source}（{reinfolibData.period}）
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ハザード・用途地域情報（国土交通省） */}
      {reinfolibAreaInfo && (
        <View style={[styles.analysisCard, { borderLeftColor: "#06B6D4", borderLeftWidth: 3 }]}>
          <View style={styles.analysisTitleRow}>
            <FontAwesome name="shield" size={14} color="#06B6D4" />
            <Text style={[styles.analysisSectionTitle, { color: "#06B6D4" }]}>
              ハザード・用途地域
            </Text>
          </View>

          {/* 用途地域 */}
          {reinfolibAreaInfo.zoning.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.comparableHeader, { color: "#06B6D4" }]}>用途地域</Text>
              {reinfolibAreaInfo.zoning.slice(0, 3).map((z, i) => (
                <View key={i} style={[styles.comparableRow, { flexDirection: "column", alignItems: "flex-start" }]}>
                  <Text style={styles.comparableName}>{z.youto_name || z.youto || "—"}</Text>
                  {(z.kenpei || z.youseki) && (
                    <Text style={styles.comparableDetail}>
                      {z.kenpei ? `建蔽率: ${z.kenpei}%` : ""}{z.kenpei && z.youseki ? " / " : ""}{z.youseki ? `容積率: ${z.youseki}%` : ""}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 洪水リスク */}
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.comparableHeader, { color: "#3B82F6" }]}>
              <FontAwesome name="tint" size={11} color="#3B82F6" /> 洪水浸水想定
            </Text>
            {reinfolibAreaInfo.flood_risk.length > 0 ? (
              reinfolibAreaInfo.flood_risk.slice(0, 3).map((f, i) => (
                <View key={i} style={styles.comparableRow}>
                  <Text style={[styles.comparableName, { color: "#F59E0B" }]}>
                    {f.depth || f.rank || "浸水リスクあり"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.comparableDetail, { color: "#4CAF50" }]}>浸水想定区域外</Text>
            )}
          </View>

          {/* 土砂災害 */}
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.comparableHeader, { color: "#F97316" }]}>
              <FontAwesome name="warning" size={11} color="#F97316" /> 土砂災害警戒
            </Text>
            {reinfolibAreaInfo.landslide_risk.length > 0 ? (
              reinfolibAreaInfo.landslide_risk.slice(0, 3).map((l, i) => (
                <View key={i} style={styles.comparableRow}>
                  <Text style={[styles.comparableName, { color: "#F44336" }]}>
                    {l.saigai_type || l.name || "警戒区域内"}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[styles.comparableDetail, { color: "#4CAF50" }]}>警戒区域外</Text>
            )}
          </View>

          {/* 地価公示 */}
          {reinfolibAreaInfo.land_prices.length > 0 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.comparableHeader, { color: "#8B5CF6" }]}>周辺地価公示</Text>
              {reinfolibAreaInfo.land_prices.slice(0, 3).map((lp, i) => (
                <View key={i} style={styles.comparableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.comparableName} numberOfLines={1}>{lp.addr || lp.address || "—"}</Text>
                    <Text style={styles.comparableDetail}>{lp.youto_name || lp.youto || ""}</Text>
                  </View>
                  <Text style={styles.comparablePrice}>
                    {lp.price ? `${Number(lp.price).toLocaleString()}円/㎡` : "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* DID（人口集中地区）判定 */}
          <View style={{ marginBottom: 10 }}>
            <Text style={[styles.comparableHeader, { color: "#3B82F6" }]}>
              <FontAwesome name="users" size={11} color="#3B82F6" /> 人口集中地区（DID）
            </Text>
            {(reinfolibAreaInfo.did || []).length > 0 ? (
              <View style={{ padding: 8, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 6 }}>
                <Text style={[styles.comparableName, { color: "#3B82F6" }]}>DID区域内 ✓</Text>
                <Text style={styles.comparableDetail}>
                  {reinfolibAreaInfo.did[0].municipality || ""}
                  {reinfolibAreaInfo.did[0].population ? ` ・ 人口 ${reinfolibAreaInfo.did[0].population.toLocaleString()}人` : ""}
                  {reinfolibAreaInfo.did[0].density ? ` ・ 密度 ${reinfolibAreaInfo.did[0].density.toLocaleString()}人/k㎡` : ""}
                </Text>
                {reinfolibAreaInfo.did[0].households && (
                  <Text style={styles.comparableDetail}>世帯数: {reinfolibAreaInfo.did[0].households.toLocaleString()}</Text>
                )}
              </View>
            ) : (
              <View style={{ padding: 8, backgroundColor: "rgba(255,193,7,0.06)", borderRadius: 6 }}>
                <Text style={[styles.comparableName, { color: "#F59E0B" }]}>DID区域外</Text>
                <Text style={styles.comparableDetail}>人口集中地区に該当しません。賃貸需要や流動性に注意が必要です。</Text>
              </View>
            )}
          </View>

          {/* 将来推計人口 */}
          {(reinfolibAreaInfo.future_population || []).length > 0 && reinfolibAreaInfo.future_population[0].pop_2020 && (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.comparableHeader, { color: "#10B981" }]}>
                <FontAwesome name="line-chart" size={11} color="#10B981" /> 将来推計人口（250mメッシュ）
              </Text>
              <View style={{ padding: 8, backgroundColor: "rgba(16,185,129,0.06)", borderRadius: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={styles.comparableDetail}>2020年: {reinfolibAreaInfo.future_population[0].pop_2020?.toLocaleString()}人</Text>
                  <Text style={styles.comparableDetail}>2030年: {reinfolibAreaInfo.future_population[0].pop_2030?.toLocaleString() || "—"}人</Text>
                  <Text style={styles.comparableDetail}>2040年: {reinfolibAreaInfo.future_population[0].pop_2040?.toLocaleString() || "—"}人</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                  <Text style={styles.comparableDetail}>2050年: {reinfolibAreaInfo.future_population[0].pop_2050?.toLocaleString() || "—"}人</Text>
                  <Text style={[styles.comparableName, {
                    color: reinfolibAreaInfo.future_population[0].trend === "growing" ? "#4CAF50" :
                           reinfolibAreaInfo.future_population[0].trend === "declining" ? "#F44336" : "#F59E0B",
                    fontSize: 13,
                  }]}>
                    {reinfolibAreaInfo.future_population[0].trend === "growing" ? "↑ 人口増加" :
                     reinfolibAreaInfo.future_population[0].trend === "declining" ? "↓ 人口減少" : "→ 横ばい"}
                    {reinfolibAreaInfo.future_population[0].change_rate_2040 != null
                      ? ` (${reinfolibAreaInfo.future_population[0].change_rate_2040 > 0 ? "+" : ""}${reinfolibAreaInfo.future_population[0].change_rate_2040}%)`
                      : ""}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* 駅乗降客数 */}
          {(reinfolibAreaInfo.stations || []).length > 0 && (() => {
            // 駅名で重複除去（乗降客数があるレコードを優先）
            const stMap = new Map<string, any>();
            for (const s of reinfolibAreaInfo.stations) {
              const rawName = (s.name || s.station_name || "").trim();
              if (!rawName) continue;
              const passengers = Number(s.daily_passengers || s.passengers || 0);
              const existing = stMap.get(rawName);
              if (!existing) {
                stMap.set(rawName, s);
              } else {
                const existingPassengers = Number(existing.daily_passengers || existing.passengers || 0);
                if (!existingPassengers && passengers) {
                  stMap.set(rawName, s);
                }
              }
            }
            const uniqueStations = Array.from(stMap.values()).slice(0, 5);
            return (
            <View style={{ marginBottom: 10 }}>
              <Text style={[styles.comparableHeader, { color: "#6366F1" }]}>
                <FontAwesome name="train" size={11} color="#6366F1" /> 周辺駅乗降客数
              </Text>
              {uniqueStations.map((s: any, i: number) => (
                <View key={i} style={styles.comparableRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.comparableName}>{s.name || s.station_name || "—"}</Text>
                    <Text style={styles.comparableDetail}>
                      {s.line_name || s.lines?.map((l: any) => l.line || l.name).join("・") || ""}
                    </Text>
                  </View>
                  <Text style={styles.comparablePrice}>
                    {s.daily_passengers ? `${Number(s.daily_passengers).toLocaleString()}人/日` :
                     s.passengers ? `${Number(s.passengers).toLocaleString()}人/日` : "—"}
                  </Text>
                </View>
              ))}
            </View>
            );
          })()}

          <Text style={styles.dataSourceText}>
            出典: {reinfolibAreaInfo.source}
          </Text>
        </View>
      )}

      {/* エリアマップ */}
      {reinfolibAreaInfo && (() => {
        // 座標を取得（analysis結果 → reinfolibAreaInfo → 物件座標）
        const coords = analysis?.reference_data?.search_coords
          || reinfolibAreaInfo?.search_coords;
        const mapLat = coords?.lat;
        const mapLng = coords?.lng;
        if (!mapLat || !mapLng) return null;

        const didAreas = reinfolibAreaInfo.did || [];
        const populationData = reinfolibAreaInfo.future_population || [];
        const stationsData = reinfolibAreaInfo.stations || [];
        const landPrices = reinfolibAreaInfo.land_prices || [];
        const floodRisk = reinfolibAreaInfo.flood_risk || [];

        return (
          <View style={[styles.analysisCard, { borderLeftColor: "#3B82F6", borderLeftWidth: 3 }]}>
            <View style={styles.analysisTitleRow}>
              <FontAwesome name="map" size={14} color="#3B82F6" />
              <Text style={[styles.analysisSectionTitle, { color: "#3B82F6" }]}>
                エリアマップ
              </Text>
            </View>

            <View style={styles.mapContainer}>
              <MapView
                style={styles.mapView}
                initialRegion={{
                  latitude: mapLat,
                  longitude: mapLng,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }}
                mapType="standard"
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                {/* 物件位置 */}
                <Marker
                  coordinate={{ latitude: mapLat, longitude: mapLng }}
                  title={property.name || "この物件"}
                  pinColor="#E8443A"
                />

                {/* DID範囲（半径500mの円で近似表示） */}
                {didAreas.length > 0 && (
                  <Circle
                    center={{ latitude: mapLat, longitude: mapLng }}
                    radius={500}
                    fillColor="rgba(59, 130, 246, 0.08)"
                    strokeColor="rgba(59, 130, 246, 0.3)"
                    strokeWidth={1}
                  />
                )}

                {/* 洪水リスクエリア */}
                {floodRisk.length > 0 && (
                  <Circle
                    center={{ latitude: mapLat, longitude: mapLng }}
                    radius={300}
                    fillColor="rgba(59, 130, 246, 0.12)"
                    strokeColor="rgba(59, 130, 246, 0.4)"
                    strokeWidth={1}
                  />
                )}

                {/* 地価公示ポイント */}
                {landPrices.slice(0, 5).map((lp, i) => {
                  const lpLat = lp.lat || lp.latitude;
                  const lpLng = lp.lng || lp.longitude;
                  if (!lpLat || !lpLng) return null;
                  return (
                    <Marker
                      key={`lp-${i}`}
                      coordinate={{ latitude: lpLat, longitude: lpLng }}
                      title={`${lp.price ? Number(lp.price).toLocaleString() : "—"}円/㎡`}
                      description={lp.addr || lp.address || ""}
                      pinColor="#8B5CF6"
                    />
                  );
                })}

                {/* 駅マーカー */}
                {stationsData.slice(0, 5).map((s, i) => {
                  // 駅の座標はAPI結果に含まれない場合あり
                  // feature geometryから取れる場合のみ表示
                  return null; // 座標なしの場合はスキップ
                })}
              </MapView>
            </View>

            {/* マップ凡例 */}
            <View style={styles.mapLegend}>
              <View style={styles.mapLegendItem}>
                <View style={[styles.mapLegendDot, { backgroundColor: "#E8443A" }]} />
                <Text style={styles.mapLegendText}>物件</Text>
              </View>
              {didAreas.length > 0 && (
                <View style={styles.mapLegendItem}>
                  <View style={[styles.mapLegendDot, { backgroundColor: "rgba(59,130,246,0.3)" }]} />
                  <Text style={styles.mapLegendText}>人口集中地区（DID）</Text>
                </View>
              )}
              {landPrices.some((lp) => lp.lat || lp.latitude) && (
                <View style={styles.mapLegendItem}>
                  <View style={[styles.mapLegendDot, { backgroundColor: "#8B5CF6" }]} />
                  <Text style={styles.mapLegendText}>地価公示</Text>
                </View>
              )}
            </View>

            {/* 人口密度・DIDサマリー */}
            {didAreas.length > 0 && (
              <View style={{ marginTop: 8, padding: 10, backgroundColor: "rgba(59,130,246,0.06)", borderRadius: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#3B82F6", marginBottom: 4 }}>
                  人口集中地区（DID）内
                </Text>
                <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                  {didAreas[0].municipality || "—"} ・ 人口 {didAreas[0].population?.toLocaleString() || "—"}人
                  {didAreas[0].density ? ` ・ 密度 ${didAreas[0].density.toLocaleString()}人/k㎡` : ""}
                </Text>
              </View>
            )}
            {didAreas.length === 0 && (
              <View style={{ marginTop: 8, padding: 10, backgroundColor: "rgba(255,193,7,0.08)", borderRadius: 8 }}>
                <Text style={{ fontSize: 12, color: "#F59E0B" }}>DID（人口集中地区）外</Text>
              </View>
            )}

            {/* 将来推計人口（メッシュ） */}
            {populationData.length > 0 && populationData[0].pop_2020 && (
              <View style={{ marginTop: 8, padding: 10, backgroundColor: "rgba(16,185,129,0.06)", borderRadius: 8 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#10B981", marginBottom: 4 }}>
                  250mメッシュ将来推計人口
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    2020年: {populationData[0].pop_2020?.toLocaleString()}人
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.textSecondary }}>
                    2040年: {populationData[0].pop_2040?.toLocaleString()}人
                  </Text>
                  <Text style={[{ fontSize: 11, fontWeight: "600" }, {
                    color: populationData[0].trend === "growing" ? "#4CAF50" :
                           populationData[0].trend === "declining" ? "#F44336" : "#F59E0B"
                  }]}>
                    {populationData[0].change_rate_2040 != null
                      ? `${populationData[0].change_rate_2040 > 0 ? "+" : ""}${populationData[0].change_rate_2040}%`
                      : ""}
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.dataSourceText, { marginTop: 8 }]}>
              出典: {reinfolibAreaInfo.source}
            </Text>
          </View>
        );
      })()}

      {/* 標高・生活利便・統計データ */}
      {reinfolibAreaInfo && (reinfolibAreaInfo.elevation || reinfolibAreaInfo.facilities || reinfolibAreaInfo.estat || (reinfolibAreaInfo.resas?.fiscal_strength || reinfolibAreaInfo.resas?.estate_transactions)) && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisTitleRow}>
            <FontAwesome name="bar-chart" size={14} color="#06B6D4" />
            <Text style={[styles.analysisSectionTitle, { color: "#06B6D4" }]}>
              エリア詳細データ
            </Text>
          </View>

          {/* 標高 */}
          {reinfolibAreaInfo.elevation?.elevation_m != null && (
            <View style={{ backgroundColor: "rgba(6,182,212,0.08)", borderRadius: 8, padding: 10, marginTop: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <FontAwesome name="arrow-up" size={12} color="#06B6D4" />
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  標高: <Text style={{ fontWeight: "bold" }}>{reinfolibAreaInfo.elevation.elevation_m.toFixed(1)}m</Text>
                </Text>
                {reinfolibAreaInfo.elevation.elevation_m < 5 && (
                  <Text style={{ color: theme.accent, fontSize: 11 }}>低地注意</Text>
                )}
                {reinfolibAreaInfo.elevation.elevation_m >= 20 && (
                  <Text style={{ color: "#4CAF50", fontSize: 11 }}>高台</Text>
                )}
              </View>
            </View>
          )}

          {/* 生活利便施設 */}
          {reinfolibAreaInfo.facilities && reinfolibAreaInfo.facilities.total > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
                生活利便施設（半径{reinfolibAreaInfo.facilities.radius_m}m）
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(reinfolibAreaInfo.facilities.facilities).map(([key, cat]: [string, any]) => {
                  if (!cat || cat.count === 0) return null;
                  const colors: Record<string, string> = {
                    convenience: "#4CAF50", supermarket: "#2196F3", drugstore: "#9C27B0",
                    restaurant: "#FF9800", bank: "#607D8B", post_office: "#F44336",
                    hospital: "#E91E63", school: "#3F51B5", park: "#8BC34A",
                  };
                  return (
                    <View key={key} style={{
                      backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
                      borderLeftWidth: 3, borderLeftColor: colors[key] || "#666",
                    }}>
                      <Text style={{ color: theme.text, fontSize: 12 }}>
                        {cat.label} <Text style={{ fontWeight: "bold", color: colors[key] || "#666" }}>{cat.count}</Text>
                      </Text>
                    </View>
                  );
                })}
              </View>
              {/* 最寄り施設の詳細 */}
              <View style={{ marginTop: 8 }}>
                {Object.entries(reinfolibAreaInfo.facilities.facilities).map(([key, cat]: [string, any]) => {
                  if (!cat || cat.count === 0 || !cat.items || cat.items.length === 0) return null;
                  const nearest = cat.items[0];
                  if (!nearest.name) return null;
                  return (
                    <Text key={key} style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                      {cat.label}: {nearest.name}（{nearest.distance_m}m）
                    </Text>
                  );
                })}
              </View>
            </View>
          )}

          {/* e-Stat データ */}
          {reinfolibAreaInfo.estat && (
            <View style={{ marginTop: 12 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {/* 空き家率 */}
                {reinfolibAreaInfo.estat.vacancy_rate && (
                  <View style={{
                    backgroundColor: reinfolibAreaInfo.estat.vacancy_rate.rate > 15
                      ? "rgba(239,68,68,0.1)" : reinfolibAreaInfo.estat.vacancy_rate.rate > 10
                      ? "rgba(245,158,11,0.1)" : "rgba(74,222,128,0.1)",
                    borderRadius: 8, padding: 10, flex: 1, minWidth: 140,
                  }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>空き家率（{reinfolibAreaInfo.estat.vacancy_rate.level || property.prefecture || "都道府県"}）</Text>
                    <Text style={{
                      fontSize: 20, fontWeight: "bold",
                      color: reinfolibAreaInfo.estat.vacancy_rate.rate > 15
                        ? "#EF4444" : reinfolibAreaInfo.estat.vacancy_rate.rate > 10
                        ? "#F59E0B" : "#4CAF50",
                    }}>
                      {reinfolibAreaInfo.estat.vacancy_rate.rate}%
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                      ({reinfolibAreaInfo.estat.vacancy_rate.year}年)
                    </Text>
                  </View>
                )}

                {/* 転入転出 */}
                {reinfolibAreaInfo.estat.migration && (
                  <View style={{
                    backgroundColor: reinfolibAreaInfo.estat.migration.net_migration > 0
                      ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                    borderRadius: 8, padding: 10, flex: 1, minWidth: 140,
                  }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>人口移動（{property.prefecture || "都道府県"}）</Text>
                    <Text style={{
                      fontSize: 16, fontWeight: "bold",
                      color: reinfolibAreaInfo.estat.migration.net_migration > 0 ? "#4CAF50" : "#EF4444",
                    }}>
                      {reinfolibAreaInfo.estat.migration.trend}
                    </Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 10 }}>
                      純増減: {reinfolibAreaInfo.estat.migration.net_migration > 0 ? "+" : ""}{reinfolibAreaInfo.estat.migration.net_migration.toLocaleString()}人
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* RESAS データ (RESAS API提供終了のため、実データがある場合のみ表示) */}
          {reinfolibAreaInfo.resas && (reinfolibAreaInfo.resas.fiscal_strength || reinfolibAreaInfo.resas.estate_transactions) && (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {/* 財政力指数 */}
                {reinfolibAreaInfo.resas.fiscal_strength && (
                  <View style={{
                    backgroundColor: "rgba(96,165,250,0.1)", borderRadius: 8, padding: 10,
                    flex: 1, minWidth: 140,
                  }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>財政力指数</Text>
                    <Text style={{ fontSize: 20, fontWeight: "bold", color: "#60A5FA" }}>
                      {reinfolibAreaInfo.resas.fiscal_strength.index?.toFixed(2) ?? "—"}
                    </Text>
                    <Text style={{
                      fontSize: 11, fontWeight: "bold",
                      color: reinfolibAreaInfo.resas.fiscal_strength.rating === "優良" ? "#4CAF50"
                        : reinfolibAreaInfo.resas.fiscal_strength.rating === "標準" ? "#F59E0B" : "#EF4444",
                    }}>
                      {reinfolibAreaInfo.resas.fiscal_strength.rating}
                    </Text>
                  </View>
                )}

                {/* 不動産取引 */}
                {reinfolibAreaInfo.resas.estate_transactions && (
                  <View style={{
                    backgroundColor: "rgba(168,85,247,0.1)", borderRadius: 8, padding: 10,
                    flex: 1, minWidth: 140,
                  }}>
                    <Text style={{ color: theme.textSecondary, fontSize: 11 }}>不動産取引</Text>
                    <Text style={{
                      fontSize: 16, fontWeight: "bold",
                      color: reinfolibAreaInfo.resas.estate_transactions.trend === "活況" ? "#4CAF50" : "#F59E0B",
                    }}>
                      {reinfolibAreaInfo.resas.estate_transactions.trend}
                    </Text>
                    {reinfolibAreaInfo.resas.estate_transactions.data?.map((d: any, i: number) => (
                      <Text key={i} style={{ color: theme.textSecondary, fontSize: 10 }}>
                        {d.year}年: {d.value?.toLocaleString()}件
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            </View>
          )}

          <Text style={[styles.dataSourceText, { marginTop: 8 }]}>
            出典: 国土地理院 / OpenStreetMap / e-Stat{reinfolibAreaInfo.resas && (reinfolibAreaInfo.resas.fiscal_strength || reinfolibAreaInfo.resas.estate_transactions) ? " / RESAS" : ""}
          </Text>
        </View>
      )}

      {/* コミュニティ比較データ */}
      {(communityStats || communityComparables.length > 0 || communityLoading) && (
        <View style={styles.analysisCard}>
          <TouchableOpacity
            style={styles.analysisTitleRow}
            onPress={() => setCommunityExpanded(!communityExpanded)}
          >
            <FontAwesome name="users" size={14} color="#EC4899" />
            <Text style={[styles.analysisSectionTitle, { color: "#EC4899", flex: 1 }]}>
              コミュニティ比較データ
            </Text>
            {communityStats && (
              <Text style={{ color: theme.textSecondary, fontSize: 12, marginRight: 8 }}>
                {communityStats.total_properties}件登録
              </Text>
            )}
            <FontAwesome
              name={communityExpanded ? "chevron-up" : "chevron-down"}
              size={12}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          {communityLoading && <ActivityIndicator style={{ marginTop: 8 }} />}

          {communityExpanded && communityStats && (
            <View style={{ marginTop: 12 }}>
              {/* エリア相場統計 */}
              {communityStats.price_stats && communityStats.price_stats.count > 0 && (
                <View style={[styles.analysisCard, { backgroundColor: "rgba(236,72,153,0.08)", marginBottom: 8 }]}>
                  <Text style={{ color: "#EC4899", fontWeight: "bold", fontSize: 13, marginBottom: 8 }}>
                    {communityStats.station_name ? `${communityStats.station_name}駅周辺` : communityStats.city || "エリア"}の相場
                  </Text>
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 11 }}>平均価格</Text>
                      <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 14 }}>
                        {communityStats.price_stats.avg ? `${Math.round(communityStats.price_stats.avg / 10000).toLocaleString()}万円` : "—"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 11 }}>平均利回り</Text>
                      <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 14 }}>
                        {communityStats.yield_stats?.avg ? `${communityStats.yield_stats.avg.toFixed(1)}%` : "—"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "center", flex: 1 }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 11 }}>平均面積</Text>
                      <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 14 }}>
                        {communityStats.area_stats?.avg ? `${communityStats.area_stats.avg.toFixed(1)}㎡` : "—"}
                      </Text>
                    </View>
                  </View>

                  {/* この物件との比較 */}
                  {property.price && communityStats.price_stats.avg && (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 11, marginBottom: 4 }}>この物件との比較</Text>
                      {(() => {
                        const priceDiff = ((property.price * 10000) / communityStats.price_stats.avg! - 1) * 100;
                        return (
                          <Text style={{ color: priceDiff > 0 ? theme.accent : "#4CAF50", fontSize: 13, fontWeight: "bold" }}>
                            価格: 相場より{priceDiff > 0 ? `${priceDiff.toFixed(0)}%高い` : `${Math.abs(priceDiff).toFixed(0)}%安い`}
                          </Text>
                        );
                      })()}
                    </View>
                  )}
                </View>
              )}

              {/* 人気駅ランキング */}
              {communityStats.station_ranking.length > 0 && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "bold", marginBottom: 4 }}>
                    注目されている駅 TOP5
                  </Text>
                  {communityStats.station_ranking.slice(0, 5).map((s, i) => (
                    <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 }}>
                      <Text style={{ color: theme.text, fontSize: 12 }}>{i + 1}. {s.station}</Text>
                      <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{s.count}件</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* 類似物件リスト */}
              {communityComparables.length > 0 && (
                <View>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, fontWeight: "bold", marginBottom: 6 }}>
                    類似物件（コミュニティ登録）
                  </Text>
                  {communityComparables.slice(0, 5).map((c, i) => (
                    <TouchableOpacity
                      key={i}
                      style={{
                        backgroundColor: theme.bgCard,
                        borderRadius: 8,
                        padding: 10,
                        marginBottom: 6,
                        borderLeftWidth: 3,
                        borderLeftColor: "#EC4899",
                      }}
                      onPress={() => router.push(`/property/${c.id}`)}
                    >
                      <Text style={{ color: theme.text, fontWeight: "bold", fontSize: 13 }} numberOfLines={1}>
                        {c.name || "物件名なし"}
                      </Text>
                      <View style={{ flexDirection: "row", marginTop: 4, flexWrap: "wrap", gap: 8 }}>
                        {c.price != null && (
                          <Text style={{ color: "#F59E0B", fontSize: 12, fontWeight: "bold" }}>
                            {Math.round(c.price / 10000).toLocaleString()}万円
                          </Text>
                        )}
                        {c.gross_yield != null && (
                          <Text style={{ color: "#4CAF50", fontSize: 12 }}>
                            利回り {c.gross_yield.toFixed(1)}%
                          </Text>
                        )}
                        {c.area != null && (
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{c.area.toFixed(1)}㎡</Text>
                        )}
                        {c.station_name && (
                          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{c.station_name}</Text>
                        )}
                      </View>
                      {c.full_address && (
                        <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                          {c.full_address}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={[styles.dataSourceText, { marginTop: 6 }]}>
                出典: マイソクDBコミュニティ（ユーザー登録物件の匿名統計）
              </Text>
            </View>
          )}
        </View>
      )}

      {/* 空室リスクシミュレーション */}
      {property.monthlyRent && property.price && property.price > 0 && (
        <View style={styles.analysisCard}>
          <View style={styles.analysisTitleRow}>
            <FontAwesome name="home" size={14} color="#8B5CF6" />
            <Text style={[styles.analysisSectionTitle, { color: "#8B5CF6" }]}>
              空室リスクシミュレーション
            </Text>
          </View>
          <View style={styles.vacancyExplainBox}>
            <Text style={styles.vacancyExplainText}>
              空室率とは、1年間のうち部屋が空いている割合です。例えば空室率5%は「年間約18日の空室」、10%は「約36日（退去〜次の入居まで約1ヶ月）」に相当します。
            </Text>
            <View style={styles.vacancyGuideRow}>
              <View style={styles.vacancyGuideItem}>
                <Text style={[styles.vacancyGuideRate, { color: "#4CAF50" }]}>0〜5%</Text>
                <Text style={styles.vacancyGuideLabel}>都心・駅近</Text>
              </View>
              <View style={styles.vacancyGuideItem}>
                <Text style={[styles.vacancyGuideRate, { color: "#F59E0B" }]}>5〜10%</Text>
                <Text style={styles.vacancyGuideLabel}>一般的な水準</Text>
              </View>
              <View style={styles.vacancyGuideItem}>
                <Text style={[styles.vacancyGuideRate, { color: theme.accent }]}>10〜20%</Text>
                <Text style={styles.vacancyGuideLabel}>郊外・築古</Text>
              </View>
            </View>
          </View>
          <View style={styles.vacancyTable}>
            <View style={styles.vacancyHeaderRow}>
              <Text style={styles.vacancyHeaderCell}>空室率</Text>
              <Text style={styles.vacancyHeaderCell}>年間収入</Text>
              <Text style={styles.vacancyHeaderCell}>手取月額</Text>
              <Text style={styles.vacancyHeaderCell}>実質利回り</Text>
            </View>
            {[0, 5, 10, 15, 20].map((rate) => {
              const rent = property.monthlyRent!;
              const expenses = (property.managementFee || 0) + (property.repairReserve || 0) + (property.otherMonthlyExpenses || 0);
              const effectiveRent = rent * (1 - rate / 100);
              const annualIncome = effectiveRent * 12;
              const netMonthly = effectiveRent - expenses;
              const netYield = ((effectiveRent - expenses) * 12) / (property.price! * 10000) * 100;
              const isBase = rate === 0;
              return (
                <View key={rate} style={[styles.vacancyRow, isBase && styles.vacancyRowBase]}>
                  <Text style={[styles.vacancyCell, isBase && styles.vacancyCellBold]}>{rate}%</Text>
                  <Text style={[styles.vacancyCell, isBase && styles.vacancyCellBold]}>
                    {Math.round(annualIncome / 10000).toLocaleString()}万
                  </Text>
                  <Text style={[styles.vacancyCell, isBase && styles.vacancyCellBold, netMonthly < 0 && { color: theme.accent }]}>
                    {Math.round(netMonthly).toLocaleString()}円
                  </Text>
                  <Text style={[styles.vacancyCell, isBase && styles.vacancyCellBold, netYield < 0 && { color: theme.accent }]}>
                    {netYield.toFixed(2)}%
                  </Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.analysisDisclaimer}>
            * 管理費・修繕積立金・その他月額費用を控除後の概算値
          </Text>
        </View>
      )}

      {/* 修繕積立金の将来予測 */}
      {property && property.repairReserve && property.repairReserve > 0 && property.builtDate && (
        (() => {
          const builtYearMatch = property.builtDate!.match(/(\d{4})/);
          if (!builtYearMatch) return null;
          const builtYear = parseInt(builtYearMatch[1]);
          const currentYear = new Date().getFullYear();
          const buildingAge = currentYear - builtYear;
          const currentReserve = property.repairReserve!;

          // 国交省ガイドライン基準の修繕積立金目安 (円/㎡/月)
          // 階数・延床面積で異なるが、区分マンション標準で概算
          const guidelinePerSqm = property.area
            ? (property.area < 60 ? 335 : property.area < 80 ? 252 : 220)
            : 252;
          const guidelineAmount = property.area ? Math.round(guidelinePerSqm * property.area) : null;

          // 修繕積立金は段階増額方式が一般的
          // 築12年前後で1回目大規模修繕、以降12年周期
          // 増額率: 築0-12年 → 基準、12-24年 → 1.5倍、24-36年 → 2.0倍、36年〜 → 2.5倍
          const forecasts = [5, 10, 15, 20, 25, 30].map((yearsAhead) => {
            const futureAge = buildingAge + yearsAhead;
            let multiplier = 1.0;
            if (futureAge >= 36) multiplier = 2.5;
            else if (futureAge >= 24) multiplier = 2.0;
            else if (futureAge >= 12) multiplier = 1.5;

            // 現在の築年数に応じた現在の multiplier を算出
            let currentMultiplier = 1.0;
            if (buildingAge >= 36) currentMultiplier = 2.5;
            else if (buildingAge >= 24) currentMultiplier = 2.0;
            else if (buildingAge >= 12) currentMultiplier = 1.5;

            const futureReserve = Math.round(currentReserve * (multiplier / currentMultiplier));
            const annualImpact = (futureReserve - currentReserve) * 12;
            return {
              yearsAhead,
              futureAge,
              futureReserve,
              multiplier,
              annualImpact,
            };
          });

          const nextMajorRepair = (() => {
            const cycles = [12, 24, 36, 48];
            for (const c of cycles) {
              if (buildingAge < c) return c - buildingAge;
            }
            return null;
          })();

          return (
            <View style={[styles.analysisCard, { borderColor: "rgba(249, 115, 22, 0.2)" }]}>
              <View style={styles.analysisTitleRow}>
                <FontAwesome name="wrench" size={14} color="#F97316" />
                <Text style={[styles.analysisSectionTitle, { color: "#F97316" }]}>
                  修繕積立金の将来予測
                </Text>
              </View>

              {/* 現状 */}
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
                <View style={[styles.summaryMetricBox, { borderColor: "rgba(249, 115, 22, 0.2)" }]}>
                  <Text style={styles.summaryMetricLabel}>現在の積立金</Text>
                  <Text style={[styles.summaryMetricValue, { color: "#F97316" }]}>
                    ¥{currentReserve.toLocaleString()}/月
                  </Text>
                </View>
                <View style={[styles.summaryMetricBox, { borderColor: "rgba(249, 115, 22, 0.2)" }]}>
                  <Text style={styles.summaryMetricLabel}>築年数</Text>
                  <Text style={[styles.summaryMetricValue, { color: "#F97316" }]}>
                    {buildingAge}年
                  </Text>
                </View>
                {nextMajorRepair && (
                  <View style={[styles.summaryMetricBox, { borderColor: "rgba(249, 115, 22, 0.2)" }]}>
                    <Text style={styles.summaryMetricLabel}>次回大規模修繕</Text>
                    <Text style={[styles.summaryMetricValue, { color: "#F97316" }]}>
                      約{nextMajorRepair}年後
                    </Text>
                  </View>
                )}
              </View>

              {/* ガイドライン比較 */}
              {guidelineAmount && (
                <View style={{
                  backgroundColor: "rgba(249, 115, 22, 0.05)",
                  borderRadius: 8,
                  padding: 10,
                  marginBottom: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: "#F97316",
                }}>
                  <Text style={{ fontSize: 11, color: theme.textSecondary, lineHeight: 17 }}>
                    国交省ガイドライン目安: ¥{guidelineAmount.toLocaleString()}/月
                    （{guidelinePerSqm}円/㎡）
                    {currentReserve < guidelineAmount * 0.7
                      ? " → 現在の積立金は目安を大幅に下回っています。将来の増額リスクが高いです。"
                      : currentReserve < guidelineAmount
                      ? " → やや低めです。今後の増額に注意してください。"
                      : " → 適正水準です。"}
                  </Text>
                </View>
              )}

              {/* 予測テーブル */}
              <View style={styles.vacancyTable}>
                <View style={[styles.vacancyHeaderRow, { backgroundColor: "rgba(249, 115, 22, 0.1)" }]}>
                  <Text style={[styles.vacancyHeaderCell, { color: "#F97316" }]}>年後</Text>
                  <Text style={[styles.vacancyHeaderCell, { color: "#F97316" }]}>築年数</Text>
                  <Text style={[styles.vacancyHeaderCell, { color: "#F97316" }]}>予測額/月</Text>
                  <Text style={[styles.vacancyHeaderCell, { color: "#F97316" }]}>年間増額</Text>
                </View>
                {forecasts.map((f, i) => {
                  const isIncrease = f.futureReserve > currentReserve;
                  return (
                    <View key={f.yearsAhead} style={[styles.vacancyRow, i === 0 && styles.vacancyRowBase]}>
                      <Text style={styles.vacancyCell}>{f.yearsAhead}年後</Text>
                      <Text style={styles.vacancyCell}>築{f.futureAge}年</Text>
                      <Text style={[styles.vacancyCell, isIncrease && { color: "#F97316", fontWeight: "bold" }]}>
                        ¥{f.futureReserve.toLocaleString()}
                      </Text>
                      <Text style={[styles.vacancyCell, f.annualImpact > 0 && { color: "#EF4444" }]}>
                        {f.annualImpact > 0 ? `+¥${f.annualImpact.toLocaleString()}` : "±0"}
                      </Text>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.analysisDisclaimer}>
                * 段階増額方式（12年周期）の一般的なモデルに基づく概算。管理組合の修繕計画により異なります。
              </Text>
            </View>
          );
        })()
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
        <View>
          <TouchableOpacity
            style={styles.analysisButton}
            onPress={handleAnalysis}
          >
            <FontAwesome name={analysis ? "refresh" : "bar-chart"} size={18} color={theme.accent} />
            <Text style={styles.analysisButtonText}>
              {analysis ? "AI投資分析を再実行" : "AI投資分析を実行"}
            </Text>
          </TouchableOpacity>
          {analysisDate && (
            <Text style={{ textAlign: "center", fontSize: 10, color: theme.textMuted, marginTop: -4, marginBottom: 8 }}>
              前回分析: {new Date(analysisDate).toLocaleDateString("ja-JP")}
            </Text>
          )}
        </View>
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

      {/* 物件スコア (100点満点) */}
      {scoreLoading && (
        <View style={styles.fieldsCard}>
          <ActivityIndicator color={theme.accent} />
          <Text style={[styles.analysisLoadingDesc, { marginTop: 8 }]}>スコアを算出中...</Text>
        </View>
      )}
      {propertyScore && !scoreLoading && (
        <View style={styles.fieldsCard}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
            <FontAwesome name="star" size={18} color="#F59E0B" />
            <Text style={[styles.sectionTitle, { marginLeft: 8, marginBottom: 0 }]}>
              投資スコア
            </Text>
          </View>

          {/* 総合スコア + ランク */}
          <View style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={styles.scoreTotalCircle}>
              <Text style={styles.scoreTotalNumber}>{Math.round(propertyScore.total)}</Text>
              <Text style={styles.scoreTotalMax}>/100</Text>
            </View>
            <View style={[styles.scoreRankBadge, {
              backgroundColor: propertyScore.rank === "S" ? "#F59E0B" :
                propertyScore.rank === "A" ? "#22C55E" :
                propertyScore.rank === "B" ? "#3B82F6" :
                propertyScore.rank === "C" ? "#F97316" : "#EF4444"
            }]}>
              <Text style={styles.scoreRankText}>ランク {propertyScore.rank}</Text>
            </View>
            <Text style={styles.scoreComment}>{propertyScore.comment}</Text>
          </View>

          {/* カテゴリ別バー */}
          {(["profitability", "location", "asset_quality", "growth"] as const).map((catKey) => {
            const cat = propertyScore.categories[catKey];
            const pct = (cat.score / cat.max) * 100;
            const barColor = catKey === "profitability" ? "#22C55E" :
              catKey === "location" ? "#3B82F6" :
              catKey === "asset_quality" ? "#8B5CF6" : "#F59E0B";
            return (
              <View key={catKey} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>{cat.label}</Text>
                  <Text style={{ fontSize: 13, fontWeight: "bold", color: barColor }}>{cat.score}/{cat.max}</Text>
                </View>
                <View style={{ height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4 }}>
                  <View style={{ height: 8, width: `${pct}%`, backgroundColor: barColor, borderRadius: 4 }} />
                </View>
                {/* 内訳 */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  {cat.details.map((d, i) => (
                    <Text key={i} style={{ fontSize: 10, color: theme.textMuted }}>
                      {d.item}: {d.value} ({d.score}/{d.max})
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
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
  loanEligibilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
    marginTop: 4,
  },
  loanEligibilityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  loanEligible: {
    backgroundColor: "rgba(22, 163, 74, 0.1)",
    borderColor: "rgba(22, 163, 74, 0.3)",
  },
  loanIneligible: {
    backgroundColor: "rgba(220, 38, 38, 0.08)",
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
  loanEligibilityText: {
    fontSize: 11,
    fontWeight: "600",
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
  statusRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 12,
  },
  statusChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: "transparent",
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "bold",
  },
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
  compareActiveButton: {
    borderColor: theme.accent,
    backgroundColor: "rgba(232, 68, 58, 0.08)",
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
  populationRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
  },
  populationBadge: {
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderRadius: 8,
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 90,
  },
  populationTrend: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textSecondary,
    marginBottom: 2,
  },
  populationChangeRate: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
  },
  populationStats: {
    flex: 1,
    justifyContent: "space-around",
  },
  populationStatRow: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 2,
  },
  vacancyExplainBox: {
    backgroundColor: "rgba(139, 92, 246, 0.05)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#8B5CF6",
  },
  vacancyExplainText: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 17,
    marginBottom: 8,
  },
  vacancyGuideRow: {
    flexDirection: "row",
    gap: 8,
  },
  vacancyGuideItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderRadius: 6,
    paddingVertical: 6,
  },
  vacancyGuideRate: {
    fontSize: 12,
    fontWeight: "bold",
  },
  vacancyGuideLabel: {
    fontSize: 9,
    color: theme.textSecondary,
    marginTop: 2,
  },
  vacancyTable: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.border,
  },
  vacancyHeaderRow: {
    flexDirection: "row",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingVertical: 8,
  },
  vacancyHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: "bold",
    color: "#8B5CF6",
    textAlign: "center",
  },
  vacancyRow: {
    flexDirection: "row",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  vacancyRowBase: {
    backgroundColor: "rgba(139, 92, 246, 0.05)",
  },
  vacancyCell: {
    flex: 1,
    fontSize: 12,
    color: theme.textSecondary,
    textAlign: "center",
  },
  vacancyCellBold: {
    fontWeight: "bold",
    color: theme.text,
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
  exitModelBox: {
    backgroundColor: "rgba(245,158,11,0.05)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#F59E0B",
  },
  exitModelTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#F59E0B",
    marginBottom: 4,
  },
  exitModelFormula: {
    fontSize: 10,
    color: theme.textSecondary,
    lineHeight: 16,
    fontFamily: "monospace",
  },
  exitAssumptionBox: {
    marginBottom: 12,
    gap: 0,
  },
  exitFactorRow: {
    backgroundColor: "rgba(245,158,11,0.05)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  exitFactorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  exitFactorTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  exitFactorValue: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 4,
  },
  exitFactorDesc: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 17,
  },
  exitRangeExplain: {
    backgroundColor: "rgba(245,158,11,0.05)",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 8,
  },
  exitRangeText: {
    fontSize: 11,
    color: theme.textSecondary,
    lineHeight: 17,
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
  mapContainer: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },
  mapView: {
    width: "100%",
    height: 240,
  },
  mapLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 10,
  },
  mapLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  mapLegendText: {
    fontSize: 10,
    color: theme.textMuted,
  },
  comparableHeader: {
    fontSize: 12,
    fontWeight: "600" as const,
    marginBottom: 6,
  },
  comparableRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  comparableName: {
    fontSize: 12,
    color: theme.text,
    fontWeight: "500" as const,
  },
  comparableDetail: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 1,
  },
  comparablePrice: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: theme.text,
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
  // 保存済みシミュレーション
  savedSimsSection: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(59, 130, 246, 0.2)",
    overflow: "hidden",
  },
  savedSimsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  savedSimsTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#3B82F6",
  },
  savedSimCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  savedSimRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  savedSimLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.text,
    flex: 1,
  },
  savedSimMetrics: {
    flexDirection: "row",
    gap: 8,
  },
  savedSimMetric: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 6,
    padding: 6,
    alignItems: "center",
  },
  savedSimMetricLabel: {
    fontSize: 9,
    color: theme.textMuted,
    marginBottom: 2,
  },
  savedSimMetricValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.text,
  },
  savedSimDate: {
    fontSize: 10,
    color: theme.textMuted,
    marginTop: 4,
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 12,
  },
  scoreTotalCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#F59E0B",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  scoreTotalNumber: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#F59E0B",
  },
  scoreTotalMax: {
    fontSize: 14,
    color: theme.textMuted,
    marginTop: -4,
  },
  scoreRankBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  scoreRankText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  scoreComment: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  summaryMetricBox: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    alignItems: "center",
  },
  summaryMetricLabel: {
    fontSize: 10,
    color: theme.textMuted,
    marginBottom: 4,
  },
  summaryMetricValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
  },
});
