import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { theme } from "@/constants/Colors";
import { api, Property, SavedSimulationItem } from "@/lib/api";

const formatManYen = (n: number) => `${Math.round(n).toLocaleString()}万円`;
const formatYen = (n: number) => `¥${Math.round(n).toLocaleString()}`;
const formatPct = (n: number) => `${n.toFixed(2)}%`;

interface PortfolioProperty extends Property {
  sims: SavedSimulationItem[];
  bestSim: SavedSimulationItem | null;
}

export default function PortfolioScreen() {
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);

  useEffect(() => {
    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    try {
      // 購入済み物件を取得
      const res = await api.getProperties({ in_investment_status: "購入済" });
      const props = res.properties;

      // 各物件の保存済みシミュレーションを取得
      const withSims: PortfolioProperty[] = await Promise.all(
        props.map(async (p) => {
          let sims: SavedSimulationItem[] = [];
          try {
            sims = await api.getSavedSimulations(parseInt(p.id, 10));
          } catch {}
          // 最新のシミュレーションをベストとする
          const bestSim = sims.length > 0 ? sims[0] : null;
          return { ...p, sims, bestSim };
        })
      );

      setProperties(withSims);
    } catch (e) {
      console.error("Portfolio load error:", e);
    } finally {
      setLoading(false);
    }
  }

  // --- 集計 ---
  const totalProperties = properties.length;
  const totalInvestment = properties.reduce((sum, p) => sum + (p.price || 0), 0);
  const totalMonthlyRent = properties.reduce((sum, p) => sum + (p.monthlyRent || 0), 0);
  const totalAnnualRent = totalMonthlyRent * 12;
  const avgYield = totalInvestment > 0 ? (totalAnnualRent / (totalInvestment * 10000)) * 100 : 0;

  // シミュレーション連携の集計
  const propsWithSim = properties.filter((p) => p.bestSim != null);
  const totalMonthlyCf = propsWithSim.reduce((sum, p) => sum + (p.bestSim!.monthly_cf || 0), 0);
  const totalAnnualCf = totalMonthlyCf * 12;
  const totalLoanAmount = propsWithSim.reduce((sum, p) => sum + (p.bestSim!.loan_amount || 0), 0);
  const totalMonthlyPayment = propsWithSim.reduce((sum, p) => sum + (p.bestSim!.monthly_payment || 0), 0);
  const avgRoi = propsWithSim.length > 0
    ? propsWithSim.reduce((sum, p) => sum + (Number(p.bestSim!.roi) || 0), 0) / propsWithSim.length
    : 0;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={styles.loadingText}>ポートフォリオを読み込み中...</Text>
      </View>
    );
  }

  if (totalProperties === 0) {
    return (
      <View style={styles.emptyContainer}>
        <FontAwesome name="pie-chart" size={48} color={theme.textMuted} />
        <Text style={styles.emptyTitle}>購入済み物件がありません</Text>
        <Text style={styles.emptyDesc}>
          物件のステータスを「購入済」に変更すると{"\n"}ポートフォリオに表示されます
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>戻る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ヘッダー */}
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="arrow-left" size={18} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ポートフォリオ</Text>
        <View style={{ width: 18 }} />
      </View>

      {/* サマリーカード */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>投資サマリー</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem label="保有物件数" value={`${totalProperties}件`} />
          <SummaryItem label="総投資額" value={formatManYen(totalInvestment)} />
          <SummaryItem label="月間賃料収入" value={formatYen(totalMonthlyRent)} />
          <SummaryItem label="年間賃料収入" value={formatYen(totalAnnualRent)} />
          <SummaryItem label="平均表面利回り" value={formatPct(avgYield)} accent />
        </View>
      </View>

      {/* CF集計（シミュレーション連携） */}
      {propsWithSim.length > 0 && (
        <View style={styles.cfCard}>
          <Text style={styles.cfTitle}>
            キャッシュフロー分析
            <Text style={styles.cfSubtitle}> ({propsWithSim.length}件連携)</Text>
          </Text>
          <View style={styles.summaryGrid}>
            <SummaryItem
              label="月間CF合計"
              value={formatYen(totalMonthlyCf)}
              positive={totalMonthlyCf >= 0}
              negative={totalMonthlyCf < 0}
            />
            <SummaryItem
              label="年間CF合計"
              value={formatYen(totalAnnualCf)}
              positive={totalAnnualCf >= 0}
              negative={totalAnnualCf < 0}
            />
            <SummaryItem label="借入残高合計" value={formatYen(totalLoanAmount)} />
            <SummaryItem label="月間返済合計" value={formatYen(totalMonthlyPayment)} />
            <SummaryItem label="平均ROI" value={formatPct(avgRoi)} accent />
          </View>
        </View>
      )}

      {/* 物件別カード */}
      <Text style={styles.sectionTitle}>物件別詳細</Text>
      {properties.map((p) => {
        const sim = p.bestSim;
        return (
          <TouchableOpacity
            key={p.id}
            style={styles.propertyCard}
            onPress={() => router.push(`/property/${p.id}`)}
          >
            <View style={styles.propertyHeader}>
              <Text style={styles.propertyName} numberOfLines={1}>
                {p.name || "無題"}
              </Text>
              {p.price && (
                <Text style={styles.propertyPrice}>{formatManYen(p.price)}</Text>
              )}
            </View>

            <View style={styles.propertyMetrics}>
              <MetricChip
                label="利回り"
                value={p.grossYield ? `${p.grossYield.toFixed(1)}%` : "-"}
              />
              <MetricChip
                label="月額賃料"
                value={p.monthlyRent ? formatYen(p.monthlyRent) : "-"}
              />
              {sim ? (
                <>
                  <MetricChip
                    label="月間CF"
                    value={sim.monthly_cf != null ? formatYen(sim.monthly_cf) : "-"}
                    color={
                      sim.monthly_cf != null
                        ? sim.monthly_cf >= 0
                          ? theme.success
                          : "#EF4444"
                        : undefined
                    }
                  />
                  <MetricChip
                    label="ROI"
                    value={sim.roi != null ? formatPct(Number(sim.roi)) : "-"}
                  />
                </>
              ) : (
                <MetricChip label="CF" value="未計算" />
              )}
            </View>

            {p.nearestStation && (
              <Text style={styles.propertyStation}>
                {p.nearestStation} {p.walkMinutes ? `徒歩${p.walkMinutes}分` : ""}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}

      {propsWithSim.length < totalProperties && (
        <View style={styles.hintBox}>
          <FontAwesome name="info-circle" size={14} color="#3B82F6" />
          <Text style={styles.hintText}>
            シミュレーション結果を保存すると、CF・ROI等の詳細集計が可能になります
          </Text>
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function SummaryItem({
  label,
  value,
  accent,
  positive,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemLabel}>{label}</Text>
      <Text
        style={[
          styles.summaryItemValue,
          accent && { color: theme.accent },
          positive && { color: theme.success },
          negative && { color: "#EF4444" },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MetricChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metricChip}>
      <Text style={styles.metricChipLabel}>{label}</Text>
      <Text style={[styles.metricChipValue, color ? { color } : undefined]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16 },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: { color: theme.textSecondary, fontSize: 14 },
  emptyContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontWeight: "bold", color: theme.text },
  emptyDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 8,
  },
  backButtonText: { color: theme.text, fontSize: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: theme.text },
  // サマリーカード
  summaryCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  summaryItem: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    padding: 10,
    minWidth: "45%",
    flex: 1,
  },
  summaryItemLabel: {
    fontSize: 11,
    color: theme.textMuted,
    marginBottom: 4,
  },
  summaryItemValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
  },
  // CFカード
  cfCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.3)",
  },
  cfTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.success,
    marginBottom: 12,
  },
  cfSubtitle: {
    fontSize: 12,
    fontWeight: "normal",
    color: theme.textSecondary,
  },
  // セクション
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 10,
    marginTop: 8,
  },
  // 物件カード
  propertyCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.border,
  },
  propertyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    flex: 1,
    marginRight: 8,
  },
  propertyPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.accent,
  },
  propertyMetrics: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  metricChip: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignItems: "center",
  },
  metricChipLabel: {
    fontSize: 9,
    color: theme.textMuted,
    marginBottom: 2,
  },
  metricChipValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.text,
  },
  propertyStation: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 6,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(59, 130, 246, 0.08)",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: "#3B82F6",
    lineHeight: 18,
  },
});
