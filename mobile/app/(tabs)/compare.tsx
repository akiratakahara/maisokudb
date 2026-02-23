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

const SCREEN_WIDTH = Dimensions.get("window").width;
const CHART_SIZE = SCREEN_WIDTH - 48;

const AXIS_OPTIONS = [
  { label: "価格（万円）", key: "price" },
  { label: "面積（㎡）", key: "area" },
  { label: "㎡単価", key: "pricePerSqm" },
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
      return p.price && p.area ? Math.round((p.price * 10000) / p.area) : null;
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
  const { user } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [xAxis, setXAxis] = useState<AxisKey>("price");
  const [yAxis, setYAxis] = useState<AxisKey>("area");
  const [axisModalFor, setAxisModalFor] = useState<"x" | "y" | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [compareList, setCompareList] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!user) {
        router.replace("/auth");
        return;
      }
      fetchProperties();
    }, [user])
  );

  async function fetchProperties() {
    try {
      const res = await api.getProperties();
      setProperties(res.properties);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareList((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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

  const comparedProperties = properties.filter((p) =>
    compareList.includes(p.id)
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent} style={{ marginTop: 40 }} />
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
        <Text style={styles.yAxisLabel}>{getAxisLabel(yAxis)}</Text>
        <View style={styles.chart}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <View
              key={`h-${pct}`}
              style={[
                styles.gridLineH,
                { bottom: `${pct * 100}%` },
              ]}
            />
          ))}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => (
            <View
              key={`v-${pct}`}
              style={[
                styles.gridLineV,
                { left: `${pct * 100}%` },
              ]}
            />
          ))}

          {/* Data points */}
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
              />
            );
          })}
        </View>
        <Text style={styles.xAxisLabel}>{getAxisLabel(xAxis)}</Text>
      </View>

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
                <View key={p.id} style={styles.tableValueCell}>
                  <Text style={styles.tableHeaderText} numberOfLines={2}>
                    {p.name}
                  </Text>
                </View>
              ))}
            </View>
            {[
              { label: "価格", fn: (p: Property) => p.price ? `${p.price}万円` : "—" },
              { label: "間取り", fn: (p: Property) => p.layout ?? "—" },
              { label: "面積", fn: (p: Property) => p.area ? `${p.area}㎡` : "—" },
              { label: "築年月", fn: (p: Property) => p.builtDate ?? "—" },
              { label: "最寄駅", fn: (p: Property) => p.nearestStation ? `${p.nearestStation} 徒歩${p.walkMinutes ?? "?"}分` : "—" },
              { label: "構造", fn: (p: Property) => p.structure ?? "—" },
              { label: "管理費", fn: (p: Property) => p.managementFee ? `${p.managementFee.toLocaleString()}円` : "—" },
              { label: "階数", fn: (p: Property) => p.floor ?? "—" },
            ].map((row, i) => (
              <View key={i} style={[styles.tableRow, i % 2 === 0 && styles.tableRowAlt]}>
                <View style={styles.tableLabelCell}>
                  <Text style={styles.tableLabelText}>{row.label}</Text>
                </View>
                {comparedProperties.map((p) => (
                  <View key={p.id} style={styles.tableValueCell}>
                    <Text style={styles.tableValueText}>{row.fn(p)}</Text>
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
    fontSize: 11,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  chart: {
    width: CHART_SIZE,
    height: CHART_SIZE * 0.7,
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
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.accent,
    marginLeft: -7,
    marginBottom: -7,
    opacity: 0.8,
  },
  dotSelected: {
    backgroundColor: theme.warning,
    opacity: 1,
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    marginBottom: -9,
    borderWidth: 2,
    borderColor: "#fff",
  },
  xAxisLabel: {
    fontSize: 11,
    color: theme.textSecondary,
    marginTop: 4,
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
  tableValueText: {
    fontSize: 12,
    color: theme.text,
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
