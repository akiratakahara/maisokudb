import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/lib/auth-context";
import { api, Property } from "@/lib/api";
import { theme } from "@/constants/Colors";
import { getCompareList, toggleCompareItem } from "@/lib/compare-store";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_SIZE = SCREEN_WIDTH - 48;
const CHART_H = Math.round(CHART_SIZE * 0.7);
const Y_LABEL_W = 14;
const Y_TICK_W = 40;
const CHART_W = CHART_SIZE - Y_LABEL_W - Y_TICK_W - 4;

const AXIS_OPTIONS = [
  { label: "価格（万円）", key: "price" },
  { label: "面積（㎡）", key: "area" },
  { label: "㎡単価", key: "pricePerSqm" },
  { label: "利回り（%）", key: "grossYield" },
  { label: "築年数", key: "age" },
  { label: "駅距離（分）", key: "walkMinutes" },
  { label: "管理費（円）", key: "managementFee" },
] as const;

type AxisKey = (typeof AXIS_OPTIONS)[number]["key"];

function getPropertyValue(p: Property, key: AxisKey): number | null {
  switch (key) {
    case "price":
      return p.price;
    case "area":
      return p.area;
    case "pricePerSqm":
      return p.pricePerM2;
    case "grossYield": {
      if (p.grossYield != null) return p.grossYield;
      // monthlyRent と price から自動計算
      if (p.monthlyRent && p.price && p.price > 0) {
        return (p.monthlyRent * 12) / (p.price * 10000) * 100;
      }
      return null;
    }
    case "age": {
      if (!p.builtDate) return null;
      const match = p.builtDate.match(/(\d{4})/);
      if (!match) return null;
      return new Date().getFullYear() - parseInt(match[1]);
    }
    case "walkMinutes":
      return p.walkMinutes;
    case "managementFee":
      return p.managementFee;
    default:
      return null;
  }
}

export default function CompareScreen() {
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [xAxis, setXAxis] = useState<AxisKey>("pricePerSqm");
  const [yAxis, setYAxis] = useState<AxisKey>("grossYield");
  const [axisModalFor, setAxisModalFor] = useState<"x" | "y" | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (authLoading || !user) return;
      fetchProperties();
      getCompareList().then(setCompareList);
    }, [user, authLoading])
  );

  async function fetchProperties() {
    try {
      const res = await api.getProperties();
      // リストAPIはnotes不足のため、詳細APIで補完
      const detailed = await Promise.all(
        res.properties.map(async (p) => {
          if (p.grossYield == null || p.pricePerM2 == null) {
            try {
              const detail = await api.getProperty(p.id);
              return detail.property;
            } catch {
              return p;
            }
          }
          return p;
        })
      );
      setProperties(detailed);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  async function toggleCompare(id: string) {
    const result = await toggleCompareItem(id);
    setCompareList(result.list);
  }

  // Scatter plot data
  const points = properties
    .map((p) => ({
      property: p,
      x: getPropertyValue(p, xAxis),
      y: getPropertyValue(p, yAxis),
    }))
    .filter((d) => d.x !== null && d.y !== null) as {
    property: Property;
    x: number;
    y: number;
  }[];

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.min(...xValues, 0);
  const xMax = Math.max(...xValues, 1);
  const yMin = Math.min(...yValues, 0);
  const yMax = Math.max(...yValues, 1);

  const xRange = xMax - xMin || 1;
  const yRange = yMax - yMin || 1;

  function getAxisLabel(key: AxisKey): string {
    return AXIS_OPTIONS.find((o) => o.key === key)?.label ?? key;
  }

  function formatTickValue(value: number, key: AxisKey): string {
    const v = Math.round(value);
    switch (key) {
      case "price": return `${v}万`;
      case "area": return `${v}㎡`;
      case "pricePerSqm": return v >= 10000 ? `${Math.round(v / 10000)}万/㎡` : `${v}円/㎡`;
      case "grossYield": return `${value.toFixed(1)}%`;
      case "age": return `${v}年`;
      case "walkMinutes": return `${v}分`;
      case "managementFee": return v >= 10000 ? `${Math.round(v / 10000)}万` : `${v}`;
      default: return `${v}`;
    }
  }

  const comparedProperties = properties.filter((p) =>
    compareList.includes(p.id)
  );

  if (authLoading || loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
      </View>
    );
  }

  if (!user) return null;

  if (properties.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <FontAwesome name="bar-chart" size={48} color={theme.textSecondary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12, fontSize: 15 }}>
          物件を登録すると比較できます
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Axis Selectors */}
      <View style={styles.axisRow}>
        <TouchableOpacity
          style={styles.axisSelector}
          onPress={() => setAxisModalFor("x")}
        >
          <Text style={styles.axisSelectorLabel}>X軸</Text>
          <Text style={styles.axisSelectorValue}>{getAxisLabel(xAxis)}</Text>
          <FontAwesome name="caret-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.axisSelector}
          onPress={() => setAxisModalFor("y")}
        >
          <Text style={styles.axisSelectorLabel}>Y軸</Text>
          <Text style={styles.axisSelectorValue}>{getAxisLabel(yAxis)}</Text>
          <FontAwesome name="caret-down" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Scatter Plot */}
      <View style={styles.chartContainer}>
        <View style={{ flexDirection: "row" }}>
          {/* Y軸ラベル: コンテナごと rotate して縦置き */}
          <View style={{ width: Y_LABEL_W, height: CHART_H, overflow: "visible" }}>
            <View style={{
              position: "absolute",
              width: CHART_H,
              height: Y_LABEL_W,
              left: (Y_LABEL_W - CHART_H) / 2,
              top: (CHART_H - Y_LABEL_W) / 2,
              justifyContent: "center",
              alignItems: "center",
              transform: [{ rotate: "-90deg" }],
            }}>
              <Text style={styles.yAxisLabel}>{getAxisLabel(yAxis)}</Text>
            </View>
          </View>

          {/* Y軸 目盛り値（上・中・下） */}
          <View style={{ width: Y_TICK_W, height: CHART_H, justifyContent: "space-between", paddingVertical: 2 }}>
            <Text style={styles.yTickLabel}>{formatTickValue(yMax, yAxis)}</Text>
            <Text style={styles.yTickLabel}>{formatTickValue((yMin + yMax) / 2, yAxis)}</Text>
            <Text style={styles.yTickLabel}>{formatTickValue(yMin, yAxis)}</Text>
          </View>

          {/* チャート本体 */}
          <View style={styles.chart}>
            {/* 水平グリッド線 */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <View key={`h-${pct}`} style={[styles.gridLineH, { bottom: `${pct * 100}%` }]} />
            ))}
            {/* 垂直グリッド線 */}
            {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
              <View key={`v-${pct}`} style={[styles.gridLineV, { left: `${pct * 100}%` }]} />
            ))}

            {/* データ点 */}
            {points.map((pt, i) => {
              const px = ((pt.x - xMin) / xRange) * 100;
              const py = ((pt.y - yMin) / yRange) * 100;
              const isSelected = compareList.includes(pt.property.id);
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.dot,
                    {
                      left: `${Math.min(Math.max(px, 2), 96)}%`,
                      bottom: `${Math.min(Math.max(py, 2), 96)}%`,
                    },
                    isSelected && styles.dotSelected,
                  ]}
                  onPress={() => setSelectedProperty(pt.property)}
                >
                  <Text style={[styles.dotLabel, isSelected && styles.dotLabelSelected]}>
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {points.length === 0 && (
              <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>
                  表示できるデータがありません
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* X軸 目盛り値（左・中・右） */}
        <View style={{
          flexDirection: "row",
          justifyContent: "space-between",
          width: CHART_W,
          marginLeft: Y_LABEL_W + Y_TICK_W,
          marginTop: 4,
        }}>
          <Text style={styles.xTickLabel}>{formatTickValue(xMin, xAxis)}</Text>
          <Text style={styles.xTickLabel}>{formatTickValue((xMin + xMax) / 2, xAxis)}</Text>
          <Text style={styles.xTickLabel}>{formatTickValue(xMax, xAxis)}</Text>
        </View>

        {/* X軸ラベル */}
        <Text style={styles.xAxisLabel}>{getAxisLabel(xAxis)}</Text>
      </View>

      {/* 凡例 */}
      {points.length > 0 && (
        <View style={styles.legendContainer}>
          {points.map((pt, i) => {
            const isSelected = compareList.includes(pt.property.id);
            return (
              <TouchableOpacity
                key={pt.property.id}
                style={[styles.legendRow, i === points.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => setSelectedProperty(pt.property)}
              >
                <View style={[styles.legendBadge, isSelected && styles.legendBadgeSelected]}>
                  <Text style={[styles.legendBadgeText, isSelected && styles.legendBadgeTextSelected]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={styles.legendName} numberOfLines={1}>{pt.property.name}</Text>
                <Text style={styles.legendValue}>
                  {formatTickValue(pt.x, xAxis)}  /  {formatTickValue(pt.y, yAxis)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Compare Section */}
      <View style={styles.compareSection}>
        <Text style={styles.sectionTitle}>比較する物件を選択</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipRow}>
            {properties.map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.propertyChip,
                  compareList.includes(p.id) && styles.propertyChipActive,
                ]}
                onPress={() => toggleCompare(p.id)}
              >
                <Text
                  style={[
                    styles.propertyChipText,
                    compareList.includes(p.id) && styles.propertyChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Compare Table */}
      {comparedProperties.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableScroll}>
          <View>
            <View style={styles.tableHeaderRow}>
              <View style={styles.tableLabelCell}>
                <Text style={styles.tableHeaderText}>項目</Text>
              </View>
              {comparedProperties.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={styles.tableValueCell}
                  onPress={() => router.push(`/property/${p.id}`)}
                >
                  <Text style={styles.tableHeaderText} numberOfLines={2}>
                    {p.name}
                  </Text>
                  <FontAwesome name="chevron-right" size={10} color={theme.textSecondary} style={{ marginTop: 2 }} />
                </TouchableOpacity>
              ))}
            </View>
            {[
              { label: "価格", fn: (p: Property) => p.price ? `${p.price.toLocaleString()}万円` : "—" },
              { label: "㎡単価", fn: (p: Property) => p.pricePerM2 ? `${p.pricePerM2.toLocaleString()}円/㎡` : "—", highlight: true },
              { label: "利回り", fn: (p: Property) => p.grossYield != null ? `${p.grossYield.toFixed(1)}%` : "—", highlight: true },
              { label: "月額賃料", fn: (p: Property) => p.monthlyRent ? `${p.monthlyRent.toLocaleString()}円` : "—" },
              { label: "間取り", fn: (p: Property) => p.layout ?? "—" },
              { label: "面積", fn: (p: Property) => p.area ? `${p.area}㎡` : "—" },
              { label: "築年月", fn: (p: Property) => p.builtDate ?? "—" },
              { label: "最寄駅", fn: (p: Property) => p.nearestStation ? `${p.nearestStation} 徒歩${p.walkMinutes ?? "?"}分` : "—" },
              { label: "構造", fn: (p: Property) => p.structure ?? "—" },
              { label: "管理費", fn: (p: Property) => p.managementFee ? `${p.managementFee.toLocaleString()}円` : "—" },
              { label: "階数", fn: (p: Property) => p.floor ?? "—" },
            ].map((row, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt, row.highlight && styles.tableRowHighlight]}>
                <View style={styles.tableLabelCell}>
                  <Text style={[styles.tableLabelText, row.highlight && styles.tableLabelHighlight]}>{row.label}</Text>
                </View>
                {comparedProperties.map((p) => (
                  <View key={p.id} style={styles.tableValueCell}>
                    <Text style={[styles.tableValueText, row.highlight && styles.tableValueHighlight]}>{row.fn(p)}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Axis Selection Modal */}
      <Modal
        visible={axisModalFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setAxisModalFor(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setAxisModalFor(null)}
        >
          <View style={styles.axisModal}>
            <Text style={styles.axisModalTitle}>
              {axisModalFor === "x" ? "X軸" : "Y軸"}を選択
            </Text>
            <FlatList
              data={AXIS_OPTIONS}
              keyExtractor={(item) => item.key}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.axisOption}
                  onPress={() => {
                    if (axisModalFor === "x") setXAxis(item.key);
                    else setYAxis(item.key);
                    setAxisModalFor(null);
                  }}
                >
                  <Text
                    style={[
                      styles.axisOptionText,
                      (axisModalFor === "x" ? xAxis : yAxis) === item.key &&
                        styles.axisOptionTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Property Popup */}
      <Modal
        visible={selectedProperty !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProperty(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedProperty(null)}
        >
          {selectedProperty && (
            <View style={styles.popupCard}>
              <Text style={styles.popupName}>{selectedProperty.name}</Text>
              <Text style={styles.popupDetail}>
                {selectedProperty.price
                  ? `${selectedProperty.price}万円`
                  : "価格不明"}{" "}
                / {selectedProperty.layout ?? "—"} /{" "}
                {selectedProperty.area ? `${selectedProperty.area}㎡` : "—"}
              </Text>
              <Text style={styles.popupDetail}>
                {selectedProperty.nearestStation ?? ""}{" "}
                {selectedProperty.walkMinutes
                  ? `徒歩${selectedProperty.walkMinutes}分`
                  : ""}
              </Text>
              <TouchableOpacity
                style={styles.popupButton}
                onPress={() => {
                  setSelectedProperty(null);
                  router.push(`/property/${selectedProperty.id}`);
                }}
              >
                <Text style={styles.popupButtonText}>詳細を見る</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  axisRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  axisSelector: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.bgCard,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  axisSelectorLabel: {
    fontSize: 12,
    color: theme.accent,
    fontWeight: "bold",
  },
  axisSelectorValue: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
  },
  chartContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  yAxisLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    textAlign: "center",
  },
  yTickLabel: {
    fontSize: 9,
    color: theme.textSecondary,
    textAlign: "right",
  },
  xTickLabel: {
    fontSize: 9,
    color: theme.textSecondary,
    textAlign: "center",
  },
  chart: {
    width: CHART_W,
    height: CHART_H,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    position: "relative",
    overflow: "hidden",
  },
  gridLineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme.border,
  },
  gridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme.border,
  },
  dot: {
    position: "absolute",
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.accent,
    marginLeft: -11,
    marginBottom: -11,
    opacity: 0.85,
    justifyContent: "center",
    alignItems: "center",
  },
  dotLabel: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  dotLabelSelected: {
    color: "#fff",
  },
  dotSelected: {
    opacity: 1,
    width: 26,
    height: 26,
    borderRadius: 13,
    marginLeft: -13,
    marginBottom: -13,
    borderWidth: 2,
    borderColor: "#fff",
    backgroundColor: theme.accent,
  },
  xAxisLabel: {
    fontSize: 10,
    color: theme.textSecondary,
    marginTop: 2,
    textAlign: "center",
    width: CHART_W,
    marginLeft: Y_LABEL_W + Y_TICK_W,
  },
  legendContainer: {
    backgroundColor: theme.bgCard,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
    overflow: "hidden",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    gap: 10,
  },
  legendBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.bgInput,
    borderWidth: 1,
    borderColor: theme.border,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  legendBadgeSelected: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  legendBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.textSecondary,
  },
  legendBadgeTextSelected: {
    color: "#fff",
  },
  legendName: {
    flex: 1,
    fontSize: 13,
    color: theme.text,
  },
  legendValue: {
    fontSize: 12,
    color: theme.textSecondary,
    flexShrink: 0,
  },
  compareSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  propertyChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.bgInput,
    borderWidth: 1,
    borderColor: theme.border,
    maxWidth: 160,
  },
  propertyChipActive: {
    borderColor: theme.accent,
    backgroundColor: "rgba(232, 68, 58, 0.15)",
  },
  propertyChipText: { fontSize: 13, color: theme.textSecondary },
  propertyChipTextActive: { color: theme.accent },
  tableScroll: { marginBottom: 20 },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: theme.border,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tableRowAlt: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tableRowHighlight: {
    backgroundColor: "rgba(232, 68, 58, 0.08)",
  },
  tableLabelCell: {
    width: 80,
    padding: 10,
    justifyContent: "center",
  },
  tableValueCell: {
    width: 130,
    padding: 10,
    justifyContent: "center",
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: theme.text,
  },
  tableLabelText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  tableLabelHighlight: {
    color: theme.text,
    fontWeight: "600",
  },
  tableValueText: {
    fontSize: 12,
    color: theme.text,
  },
  tableValueHighlight: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.accent,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  axisModal: {
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    padding: 20,
    width: 260,
  },
  axisModalTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 12,
    textAlign: "center",
  },
  axisOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  axisOptionText: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
  },
  axisOptionTextActive: {
    color: theme.accent,
    fontWeight: "bold",
  },
  popupCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    padding: 20,
    width: 280,
    gap: 8,
  },
  popupName: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
  },
  popupDetail: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  popupButton: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  popupButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});
