import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/lib/auth-context";
import { api, Property, LoanPreset, INVESTMENT_STATUSES, matchesLoanPreset } from "@/lib/api";
import { theme } from "@/constants/Colors";

const SORT_OPTIONS = [
  { label: "登録日順", value: "createdAt" },
  { label: "価格順", value: "price" },
  { label: "利回り順", value: "netYield" },
  { label: "面積順", value: "area" },
  { label: "築年数順", value: "builtDate" },
  { label: "駅近順", value: "walkMinutes" },
];

const LAYOUT_OPTIONS = ["1R", "1K", "1DK", "1LDK", "2K", "2DK", "2LDK", "3LDK", "4LDK"];

const WALK_OPTIONS = [
  { label: "指定なし", value: "" },
  { label: "5分以内", value: "5" },
  { label: "10分以内", value: "10" },
  { label: "15分以内", value: "15" },
];

const STRUCTURE_OPTIONS = ["RC", "SRC", "鉄骨", "木造"];

const YIELD_OPTIONS = [
  { label: "指定なし", value: "" },
  { label: "5%以上", value: "5" },
  { label: "7%以上", value: "7" },
  { label: "10%以上", value: "10" },
];

function calcGrossYield(p: Property): number | null {
  if (!p.price || p.price <= 0 || p.monthlyRent == null) return null;
  return p.grossYield != null ? p.grossYield : (p.monthlyRent * 12) / (p.price * 10000) * 100;
}

function calcNetYield(p: Property): number | null {
  if (!p.price || p.price <= 0 || p.monthlyRent == null) return null;
  return ((p.monthlyRent - (p.managementFee || 0) - (p.repairReserve || 0) - (p.otherMonthlyExpenses || 0)) * 12) / (p.price * 10000) * 100;
}

export default function HomeScreen() {
  const { user, loading: authLoading } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filterVisible, setFilterVisible] = useState(false);
  const [filterLayout, setFilterLayout] = useState("");
  const [filterMinPrice, setFilterMinPrice] = useState("");
  const [filterMaxPrice, setFilterMaxPrice] = useState("");
  const [filterMinArea, setFilterMinArea] = useState("");
  const [filterMaxArea, setFilterMaxArea] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [loanPresets, setLoanPresets] = useState<LoanPreset[]>([]);
  const [filterLoanPresetId, setFilterLoanPresetId] = useState<number | null>(null);
  const [filterMaxWalk, setFilterMaxWalk] = useState("");
  const [filterStructure, setFilterStructure] = useState("");
  const [filterMinYield, setFilterMinYield] = useState("");
  const [myOnly, setMyOnly] = useState(false);
  const [error, setError] = useState("");

  const fetchProperties = useCallback(async () => {
    if (authLoading || !user) {
      setLoading(false);
      return;
    }
    try {
      const clientSortKeys = ["netYield", "walkMinutes"];
      const params: Record<string, string> = {
        sortBy: clientSortKeys.includes(sortBy) ? "createdAt" : sortBy,
        sortOrder: clientSortKeys.includes(sortBy) ? "desc" : sortOrder,
      };
      if (search) params.search = search;
      if (filterLayout) params.layout = filterLayout;
      if (filterMinPrice) params.minPrice = filterMinPrice;
      if (filterMaxPrice) params.maxPrice = filterMaxPrice;
      if (filterMinArea) params.minArea = filterMinArea;
      if (filterMaxArea) params.maxArea = filterMaxArea;
      if (filterStatus) params.in_investment_status = filterStatus;
      if (myOnly) params.my_only = "true";

      const res = await api.getProperties(params);
      let items = res.properties;

      // クライアント側フィルタ: 駅徒歩
      if (filterMaxWalk) {
        const maxW = parseInt(filterMaxWalk, 10);
        items = items.filter(p => p.walkMinutes != null && p.walkMinutes <= maxW);
      }

      // クライアント側フィルタ: 構造
      if (filterStructure) {
        items = items.filter(p => p.structure && p.structure.includes(filterStructure));
      }

      // クライアント側フィルタ: 最低利回り
      if (filterMinYield) {
        const minY = parseFloat(filterMinYield);
        items = items.filter(p => {
          const y = calcNetYield(p);
          return y != null && y >= minY;
        });
      }

      // クライアント側ソート
      if (sortBy === "netYield") {
        items = [...items].sort((a, b) => {
          const ya = calcNetYield(a) ?? -Infinity;
          const yb = calcNetYield(b) ?? -Infinity;
          return sortOrder === "desc" ? yb - ya : ya - yb;
        });
      } else if (sortBy === "walkMinutes") {
        items = [...items].sort((a, b) => {
          const wa = a.walkMinutes ?? Infinity;
          const wb = b.walkMinutes ?? Infinity;
          return sortOrder === "asc" ? wa - wb : wb - wa;
        });
      }

      // 物件が0件の場合、デモ物件をシード
      if (items.length === 0 && !search && !filterStatus) {
        try {
          const seedResult = await api.seedDemo();
          if (seedResult.created > 0) {
            const res2 = await api.getProperties(params);
            items = res2.properties;
          }
        } catch {
          // デモシード失敗は無視
        }
      }

      // ローンプリセットをロード（初回のみ）
      if (loanPresets.length === 0) {
        try {
          const presetData = await api.getLoanPresets();
          if (presetData.length === 0) {
            await api.seedSystemPresets();
            const seeded = await api.getLoanPresets();
            setLoanPresets(seeded);
          } else {
            setLoanPresets(presetData);
          }
        } catch { /* ignore */ }
      }

      // ローンプリセットフィルタ（クライアント側）
      if (filterLoanPresetId != null) {
        const preset = loanPresets.find(p => p.id === filterLoanPresetId);
        if (preset) {
          items = items.filter(p => matchesLoanPreset(p, preset).matches);
        }
      }

      setProperties(items);
      setError("");
    } catch (e) {
      console.error("物件取得エラー:", e);
      setError(e instanceof Error ? e.message : "物件の取得に失敗しました");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading, search, sortBy, sortOrder, filterLayout, filterMinPrice, filterMaxPrice, filterMinArea, filterMaxArea, filterStatus, filterLoanPresetId, filterMaxWalk, filterStructure, filterMinYield, myOnly]);

  useFocusEffect(
    useCallback(() => {
      fetchProperties();
    }, [fetchProperties])
  );

  function handleRefresh() {
    setRefreshing(true);
    fetchProperties();
  }

  function toggleSortOrder() {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }

  const activeFilterCount = [
    filterLayout, filterMinPrice, filterMaxPrice,
    filterMinArea, filterMaxArea, filterMaxWalk,
    filterStructure, filterMinYield,
  ].filter(Boolean).length + (filterStatus ? 1 : 0) + (filterLoanPresetId ? 1 : 0);

  function clearAllFilters() {
    setFilterLayout("");
    setFilterMinPrice("");
    setFilterMaxPrice("");
    setFilterMinArea("");
    setFilterMaxArea("");
    setFilterMaxWalk("");
    setFilterStructure("");
    setFilterMinYield("");
    setFilterStatus(null);
    setFilterLoanPresetId(null);
  }

  function formatPrice(price: number | null): string {
    if (!price) return "—";
    if (price >= 10000) return `${(price / 10000).toFixed(1)}億円`;
    return `${price}万円`;
  }

  function renderProperty({ item }: { item: Property }) {
    const grossYield = calcGrossYield(item);
    const netYield = calcNetYield(item);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/property/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
            {item.isDemo && (
              <View style={[styles.cardStatusBadge, { backgroundColor: "#E0E0E0" }]}>
                <Text style={[styles.cardStatusText, { color: "#757575" }]}>デモ</Text>
              </View>
            )}
            {item.investmentStatus && (() => {
              const s = INVESTMENT_STATUSES.find((st) => st.key === item.investmentStatus);
              return s ? (
                <View style={[styles.cardStatusBadge, { backgroundColor: s.color }]}>
                  <Text style={styles.cardStatusText}>{s.label}</Text>
                </View>
              ) : null;
            })()}
            <Text style={[styles.cardName, { flex: 1 }]} numberOfLines={1}>
              {item.name && item.name !== "無題の物件" ? item.name : (item.address || item.nearestStation ? `${item.nearestStation || ""}周辺` : item.city || "無題の物件")}
            </Text>
          </View>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
        </View>
        {/* 利回り */}
        {(grossYield != null || netYield != null) && (
          <View style={styles.yieldRow}>
            {grossYield != null && (
              <Text style={styles.yieldText}>
                表面 <Text style={styles.yieldNum}>{grossYield.toFixed(2)}%</Text>
              </Text>
            )}
            {netYield != null && (
              <Text style={styles.yieldText}>
                実質 <Text style={styles.yieldNumNet}>{netYield.toFixed(2)}%</Text>
              </Text>
            )}
          </View>
        )}
        <View style={styles.cardDetails}>
          {item.layout && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.layout}</Text>
            </View>
          )}
          {item.area && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.area}㎡</Text>
            </View>
          )}
          {item.nearestStation && (
            <View style={styles.badge}>
              <FontAwesome name="train" size={10} color={theme.textSecondary} />
              <Text style={styles.badgeText}>
                {" "}
                {item.nearestStation}
                {item.walkMinutes ? ` 徒歩${item.walkMinutes}分` : ""}
              </Text>
            </View>
          )}
        </View>
        {(item.prefecture || item.address) && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.prefecture && item.city
              ? `${item.prefecture} ${item.city}`
              : item.address}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  if (authLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      </View>
    );
  }

  if (!user) return null;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <FontAwesome
            name="search"
            size={14}
            color={theme.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="物件名・住所で検索"
            placeholderTextColor={theme.textMuted}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchProperties}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={[styles.filterButton, activeFilterCount > 0 && { borderColor: theme.accent }]}
          onPress={() => setFilterVisible(true)}
        >
          <FontAwesome name="sliders" size={18} color={activeFilterCount > 0 ? theme.accent : theme.text} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 自分の物件/すべてトグル */}
      {user && user.id !== "guest" && (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
          <TouchableOpacity
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
              backgroundColor: !myOnly ? theme.accent : theme.bgCard,
              borderWidth: 1, borderColor: !myOnly ? theme.accent : theme.border,
            }}
            onPress={() => { setMyOnly(false); }}
          >
            <Text style={{ color: !myOnly ? "#000" : theme.text, fontSize: 13, fontWeight: "bold" }}>すべて</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16,
              backgroundColor: myOnly ? theme.accent : theme.bgCard,
              borderWidth: 1, borderColor: myOnly ? theme.accent : theme.border,
            }}
            onPress={() => { setMyOnly(true); }}
          >
            <Text style={{ color: myOnly ? "#000" : theme.text, fontSize: 13, fontWeight: "bold" }}>自分の物件</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 件数表示 */}
      {!loading && (
        <View style={styles.countRow}>
          <Text style={styles.countText}>{properties.length}件の物件</Text>
          {activeFilterCount > 0 && (
            <TouchableOpacity onPress={clearAllFilters}>
              <Text style={styles.clearAllText}>フィルタをクリア</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Status Filter */}
      <View style={styles.statusFilterRow}>
        <TouchableOpacity
          style={[styles.statusFilterChip, !filterStatus && styles.statusFilterChipActive]}
          onPress={() => setFilterStatus(null)}
        >
          <Text style={[styles.statusFilterText, !filterStatus && styles.statusFilterTextActive]}>すべて</Text>
        </TouchableOpacity>
        {INVESTMENT_STATUSES.map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[
              styles.statusFilterChip,
              filterStatus === s.key && { backgroundColor: s.color, borderColor: s.color },
            ]}
            onPress={() => setFilterStatus(filterStatus === s.key ? null : s.key)}
          >
            <FontAwesome name={s.icon as any} size={10} color={filterStatus === s.key ? "#fff" : s.color} />
            <Text style={[styles.statusFilterText, filterStatus === s.key && { color: "#fff" }]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Loan Preset Filter */}
      {loanPresets.length > 0 && (
        <View style={styles.statusFilterRow}>
          <TouchableOpacity
            style={[styles.statusFilterChip, !filterLoanPresetId && styles.loanFilterChipDefault]}
            onPress={() => setFilterLoanPresetId(null)}
          >
            <FontAwesome name="bank" size={10} color={!filterLoanPresetId ? "#3B82F6" : theme.textMuted} />
            <Text style={[styles.statusFilterText, !filterLoanPresetId && { color: "#3B82F6" }]}>融資条件なし</Text>
          </TouchableOpacity>
          {loanPresets.map((lp) => (
            <TouchableOpacity
              key={lp.id}
              style={[
                styles.statusFilterChip,
                filterLoanPresetId === lp.id && { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
              ]}
              onPress={() => setFilterLoanPresetId(filterLoanPresetId === lp.id ? null : lp.id)}
            >
              <FontAwesome name="check-circle" size={10} color={filterLoanPresetId === lp.id ? "#fff" : theme.textMuted} />
              <Text style={[styles.statusFilterText, filterLoanPresetId === lp.id && { color: "#fff" }]}>
                {lp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sort Bar */}
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.sortChip, sortBy === opt.value && styles.sortChipActive]}
            onPress={() => {
              if (sortBy === opt.value) {
                toggleSortOrder();
              } else {
                setSortBy(opt.value);
                setSortOrder("desc");
              }
            }}
          >
            <Text
              style={[
                styles.sortChipText,
                sortBy === opt.value && styles.sortChipTextActive,
              ]}
            >
              {opt.label}
            </Text>
            {sortBy === opt.value && (
              <FontAwesome
                name={sortOrder === "asc" ? "arrow-up" : "arrow-down"}
                size={10}
                color={theme.accent}
              />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Property List */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color={theme.accent}
          style={styles.loader}
        />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.id}
          renderItem={renderProperty}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <FontAwesome
                name={error ? "exclamation-circle" : "building-o"}
                size={48}
                color={error ? theme.accent : theme.textMuted}
              />
              <Text style={styles.emptyText}>
                {error ? "読み込みエラー" : "物件がありません"}
              </Text>
              <Text style={styles.emptySubText}>
                {error || "PDFを読み込んで物件を登録しましょう"}
              </Text>
              {error && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={fetchProperties}
                >
                  <Text style={styles.retryText}>再試行</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>フィルタ</Text>
            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>

            <Text style={styles.filterLabel}>間取り</Text>
            <View style={styles.layoutRow}>
              <TouchableOpacity
                style={[
                  styles.layoutChip,
                  !filterLayout && styles.layoutChipActive,
                ]}
                onPress={() => setFilterLayout("")}
              >
                <Text
                  style={[
                    styles.layoutChipText,
                    !filterLayout && styles.layoutChipTextActive,
                  ]}
                >
                  すべて
                </Text>
              </TouchableOpacity>
              {LAYOUT_OPTIONS.map((l) => (
                <TouchableOpacity
                  key={l}
                  style={[
                    styles.layoutChip,
                    filterLayout === l && styles.layoutChipActive,
                  ]}
                  onPress={() => setFilterLayout(filterLayout === l ? "" : l)}
                >
                  <Text
                    style={[
                      styles.layoutChipText,
                      filterLayout === l && styles.layoutChipTextActive,
                    ]}
                  >
                    {l}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>価格帯（万円）</Text>
            <View style={styles.rangeRow}>
              <TextInput
                style={styles.rangeInput}
                placeholder="下限"
                placeholderTextColor={theme.textMuted}
                value={filterMinPrice}
                onChangeText={setFilterMinPrice}
                keyboardType="numeric"
              />
              <Text style={styles.rangeSeparator}>〜</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="上限"
                placeholderTextColor={theme.textMuted}
                value={filterMaxPrice}
                onChangeText={setFilterMaxPrice}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.filterLabel}>面積（㎡）</Text>
            <View style={styles.rangeRow}>
              <TextInput
                style={styles.rangeInput}
                placeholder="下限"
                placeholderTextColor={theme.textMuted}
                value={filterMinArea}
                onChangeText={setFilterMinArea}
                keyboardType="numeric"
              />
              <Text style={styles.rangeSeparator}>〜</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="上限"
                placeholderTextColor={theme.textMuted}
                value={filterMaxArea}
                onChangeText={setFilterMaxArea}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.filterLabel}>駅徒歩</Text>
            <View style={styles.layoutRow}>
              {WALK_OPTIONS.map((w) => (
                <TouchableOpacity
                  key={w.value}
                  style={[styles.layoutChip, filterMaxWalk === w.value && styles.layoutChipActive]}
                  onPress={() => setFilterMaxWalk(filterMaxWalk === w.value ? "" : w.value)}
                >
                  <Text style={[styles.layoutChipText, filterMaxWalk === w.value && styles.layoutChipTextActive]}>{w.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>構造</Text>
            <View style={styles.layoutRow}>
              <TouchableOpacity
                style={[styles.layoutChip, !filterStructure && styles.layoutChipActive]}
                onPress={() => setFilterStructure("")}
              >
                <Text style={[styles.layoutChipText, !filterStructure && styles.layoutChipTextActive]}>すべて</Text>
              </TouchableOpacity>
              {STRUCTURE_OPTIONS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.layoutChip, filterStructure === s && styles.layoutChipActive]}
                  onPress={() => setFilterStructure(filterStructure === s ? "" : s)}
                >
                  <Text style={[styles.layoutChipText, filterStructure === s && styles.layoutChipTextActive]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterLabel}>最低実質利回り</Text>
            <View style={styles.layoutRow}>
              {YIELD_OPTIONS.map((y) => (
                <TouchableOpacity
                  key={y.value}
                  style={[styles.layoutChip, filterMinYield === y.value && styles.layoutChipActive]}
                  onPress={() => setFilterMinYield(filterMinYield === y.value ? "" : y.value)}
                >
                  <Text style={[styles.layoutChipText, filterMinYield === y.value && styles.layoutChipTextActive]}>{y.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  setFilterLayout("");
                  setFilterMinPrice("");
                  setFilterMaxPrice("");
                  setFilterMinArea("");
                  setFilterMaxArea("");
                  setFilterMaxWalk("");
                  setFilterStructure("");
                  setFilterMinYield("");
                }}
              >
                <Text style={styles.modalClearText}>クリア</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={() => {
                  setFilterVisible(false);
                  fetchProperties();
                }}
              >
                <Text style={styles.modalApplyText}>適用</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  searchRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bgInput,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.text,
    paddingVertical: 10,
  },
  filterButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.bgInput,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.border,
  },
  statusFilterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 5,
    marginBottom: 8,
  },
  statusFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: "transparent",
  },
  statusFilterChipActive: {
    borderColor: theme.accent,
    backgroundColor: "rgba(232, 68, 58, 0.1)",
  },
  statusFilterText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  statusFilterTextActive: {
    color: theme.accent,
  },
  loanFilterChipDefault: {
    borderColor: "#3B82F6",
    backgroundColor: "rgba(59, 130, 246, 0.08)",
  },
  cardStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardStatusText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#fff",
  },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    gap: 6,
    marginBottom: 8,
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.bgInput,
    borderWidth: 1,
    borderColor: theme.border,
  },
  sortChipActive: {
    borderColor: theme.accent,
    backgroundColor: "rgba(232, 68, 58, 0.1)",
  },
  sortChipText: { fontSize: 12, color: theme.textSecondary },
  sortChipTextActive: { color: theme.accent },
  list: { paddingHorizontal: 12, paddingBottom: 20 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.text,
    flex: 1,
    marginRight: 8,
  },
  cardPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.accent,
  },
  yieldRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 6,
  },
  yieldText: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  yieldNum: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.accent,
  },
  yieldNumNet: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.success,
  },
  cardDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bgInput,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, color: theme.textSecondary },
  cardAddress: { fontSize: 12, color: theme.textMuted },
  loader: { marginTop: 40 },
  empty: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { fontSize: 16, color: theme.textSecondary },
  emptySubText: { fontSize: 13, color: theme.textMuted, textAlign: "center", paddingHorizontal: 20 },
  retryButton: {
    marginTop: 12,
    backgroundColor: theme.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: theme.bgCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 20,
    textAlign: "center",
  },
  filterLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    marginBottom: 8,
    marginTop: 12,
  },
  layoutRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  layoutChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.bgInput,
    borderWidth: 1,
    borderColor: theme.border,
  },
  layoutChipActive: {
    borderColor: theme.accent,
    backgroundColor: "rgba(232, 68, 58, 0.15)",
  },
  layoutChipText: { fontSize: 13, color: theme.textSecondary },
  layoutChipTextActive: { color: theme.accent },
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rangeInput: {
    flex: 1,
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  rangeSeparator: { color: theme.textSecondary, fontSize: 14 },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalClearButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: "center",
  },
  modalClearText: { color: theme.textSecondary, fontSize: 15 },
  modalApplyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: theme.accent,
    alignItems: "center",
  },
  modalApplyText: { color: "#fff", fontSize: 15, fontWeight: "bold" },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: theme.accent,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#fff",
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  countText: {
    fontSize: 12,
    color: theme.textMuted,
  },
  clearAllText: {
    fontSize: 12,
    color: theme.accent,
  },
});
