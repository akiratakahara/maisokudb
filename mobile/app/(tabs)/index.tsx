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
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useAuth } from "@/lib/auth-context";
import { api, Property } from "@/lib/api";
import { theme } from "@/constants/Colors";

const SORT_OPTIONS = [
  { label: "登録日順", value: "createdAt" },
  { label: "価格順", value: "price" },
  { label: "面積順", value: "area" },
  { label: "築年数順", value: "builtDate" },
];

const LAYOUT_OPTIONS = ["1K", "1LDK", "2K", "2LDK", "3LDK", "4LDK"];

export default function HomeScreen() {
  const { user } = useAuth();
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

  const fetchProperties = useCallback(async () => {
    if (!user) {
      router.replace("/auth");
      return;
    }
    try {
      const params: Record<string, string> = { sortBy, sortOrder };
      if (search) params.search = search;
      if (filterLayout) params.layout = filterLayout;
      if (filterMinPrice) params.minPrice = filterMinPrice;
      if (filterMaxPrice) params.maxPrice = filterMaxPrice;
      if (filterMinArea) params.minArea = filterMinArea;
      if (filterMaxArea) params.maxArea = filterMaxArea;

      const res = await api.getProperties(params);
      setProperties(res.properties);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, search, sortBy, sortOrder, filterLayout, filterMinPrice, filterMaxPrice, filterMinArea, filterMaxArea]);

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

  function formatPrice(price: number | null): string {
    if (!price) return "—";
    if (price >= 10000) return `${(price / 10000).toFixed(1)}億円`;
    return `${price}万円`;
  }

  function renderProperty({ item }: { item: Property }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/property/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
        </View>
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
        {item.address && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {item.address}
          </Text>
        )}
      </TouchableOpacity>
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
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <FontAwesome name="sliders" size={18} color={theme.text} />
        </TouchableOpacity>
      </View>

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
                name="building-o"
                size={48}
                color={theme.textMuted}
              />
              <Text style={styles.emptyText}>物件がありません</Text>
              <Text style={styles.emptySubText}>
                PDFを読み込んで物件を登録しましょう
              </Text>
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalClearButton}
                onPress={() => {
                  setFilterLayout("");
                  setFilterMinPrice("");
                  setFilterMaxPrice("");
                  setFilterMinArea("");
                  setFilterMaxArea("");
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
  emptySubText: { fontSize: 13, color: theme.textMuted },
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
});
