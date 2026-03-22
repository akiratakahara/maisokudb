import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useSubscription } from "@/lib/subscription-context";
import { theme } from "@/constants/Colors";

const PRODUCT_ID_MONTHLY = "com.maisokudb.app.pro.monthly";
const PRODUCT_ID_YEARLY = "com.maisokudb.app.pro.yearly";

const FEATURES = [
  { icon: "magic" as const, title: "AI解析 無制限", desc: "URL・PDF・スクショから物件情報を自動抽出" },
  { icon: "database" as const, title: "物件保存 無制限", desc: "検討物件をいくつでも保存・管理" },
  { icon: "line-chart" as const, title: "収益シミュレーション", desc: "複数銀行の融資条件で詳細比較" },
  { icon: "bar-chart" as const, title: "AI投資分析", desc: "公的データ × AI で相場比較・出口予測" },
  { icon: "bank" as const, title: "公的取引データ", desc: "国土交通省の取引相場・ハザード情報を自動取得" },
  { icon: "calculator" as const, title: "減価償却・節税計算", desc: "年次収支計画・税効果を自動算出" },
];

export default function PaywallScreen() {
  const { isPro, loading, monthlyProduct, yearlyProduct, purchase, restore } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<"yearly" | "monthly">("yearly");
  const [purchasing, setPurchasing] = useState(false);

  const monthlyPrice = monthlyProduct?.price || "¥1,480";
  const yearlyPrice = yearlyProduct?.price || "¥9,800";

  // 年額の月あたり計算
  const yearlyPriceNum = yearlyProduct?.price ? parseFloat(String(yearlyProduct.price).replace(/[^0-9.]/g, "")) : 9800;
  const monthlyPriceNum = monthlyProduct?.price ? parseFloat(String(monthlyProduct.price).replace(/[^0-9.]/g, "")) : 1480;
  const monthlyEquivalent = Math.round(yearlyPriceNum / 12);
  const savingPct = Math.round((1 - yearlyPriceNum / (monthlyPriceNum * 12)) * 100);

  async function handlePurchase() {
    const productId = selectedPlan === "yearly" ? PRODUCT_ID_YEARLY : PRODUCT_ID_MONTHLY;
    setPurchasing(true);
    try {
      await purchase(productId);
    } finally {
      setPurchasing(false);
    }
  }

  if (isPro) {
    return (
      <View style={styles.container}>
        <View style={styles.proActive}>
          <FontAwesome name="check-circle" size={64} color={theme.success} />
          <Text style={styles.proActiveTitle}>Pro プラン利用中</Text>
          <Text style={styles.proActiveDesc}>すべての機能をご利用いただけます</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <FontAwesome name="rocket" size={32} color="#fff" />
        </View>
        <Text style={styles.title}>MaisokuDB Pro</Text>
        <Text style={styles.subtitle}>不動産投資の意思決定を加速</Text>
      </View>

      {/* Features */}
      <View style={styles.featuresCard}>
        {FEATURES.map((f, i) => (
          <View key={i} style={[styles.featureRow, i < FEATURES.length - 1 && styles.featureBorder]}>
            <View style={styles.featureIcon}>
              <FontAwesome name={f.icon} size={20} color={theme.accent} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Free Plan Limits */}
      <View style={styles.freeCard}>
        <Text style={styles.freeTitle}>Free プランの制限</Text>
        <Text style={styles.freeItem}>・AI分析: 月5回まで</Text>
        <Text style={styles.freeItem}>・AI抽出: 月10回まで</Text>
        <Text style={styles.freeItem}>・相場比較・出口予測: Pro限定</Text>
      </View>

      {/* Plan Selection */}
      <View style={styles.planContainer}>
        {/* Yearly */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "yearly" && styles.planCardSelected]}
          onPress={() => setSelectedPlan("yearly")}
          activeOpacity={0.7}
        >
          {savingPct > 0 && (
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>{savingPct}% OFF</Text>
            </View>
          )}
          <View style={styles.planRadio}>
            <View style={[styles.radioOuter, selectedPlan === "yearly" && styles.radioOuterSelected]}>
              {selectedPlan === "yearly" && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>年額プラン</Text>
            <Text style={styles.planPrice}>{yearlyPrice}<Text style={styles.planPeriod}> / 年</Text></Text>
            <Text style={styles.planNote}>月あたり ¥{monthlyEquivalent.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>

        {/* Monthly */}
        <TouchableOpacity
          style={[styles.planCard, selectedPlan === "monthly" && styles.planCardSelected]}
          onPress={() => setSelectedPlan("monthly")}
          activeOpacity={0.7}
        >
          <View style={styles.planRadio}>
            <View style={[styles.radioOuter, selectedPlan === "monthly" && styles.radioOuterSelected]}>
              {selectedPlan === "monthly" && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.planInfo}>
            <Text style={styles.planName}>月額プラン</Text>
            <Text style={styles.planPrice}>{monthlyPrice}<Text style={styles.planPeriod}> / 月</Text></Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Purchase Button */}
      <TouchableOpacity
        style={styles.purchaseButton}
        onPress={handlePurchase}
        disabled={loading || purchasing}
        activeOpacity={0.8}
      >
        {loading || purchasing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.purchaseText}>
            {selectedPlan === "yearly" ? "年額プランで始める" : "月額プランで始める"}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.trialNote}>サブスクリプションはいつでもキャンセル可能です</Text>

      {/* Restore */}
      <TouchableOpacity style={styles.restoreButton} onPress={restore} disabled={loading}>
        <Text style={styles.restoreText}>購入を復元</Text>
      </TouchableOpacity>

      {/* Legal */}
      <View style={styles.legalSection}>
        <Text style={styles.legalText}>
          購入確認時にApple IDアカウントに請求されます。
          現在の期間終了の24時間前までにキャンセルしない限り、サブスクリプションは自動更新されます。
          購入後はアカウント設定から管理できます。
        </Text>
        <View style={styles.legalLinks}>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                "https://extraordinary-reflection-production.up.railway.app/terms"
              )
            }
          >
            <Text style={styles.legalLink}>利用規約</Text>
          </TouchableOpacity>
          <Text style={styles.legalSep}>|</Text>
          <TouchableOpacity
            onPress={() =>
              Linking.openURL(
                "https://extraordinary-reflection-production.up.railway.app/privacy"
              )
            }
          >
            <Text style={styles.legalLink}>プライバシーポリシー</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 20, paddingBottom: 60 },
  header: { alignItems: "center", marginBottom: 28 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.accent,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: theme.textSecondary,
  },
  featuresCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 14,
  },
  featureBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(232, 68, 58, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { flex: 1 },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    color: theme.textSecondary,
  },
  freeCard: {
    backgroundColor: theme.bgInput,
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  freeTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textMuted,
    marginBottom: 8,
  },
  freeItem: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  // Plan selection
  planContainer: {
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    borderColor: theme.border,
    position: "relative",
    overflow: "hidden",
  },
  planCardSelected: {
    borderColor: theme.accent,
    backgroundColor: "rgba(232, 68, 58, 0.06)",
  },
  saveBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  saveBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  planRadio: {
    marginRight: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: theme.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.accent,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.text,
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.text,
  },
  planPeriod: {
    fontSize: 14,
    fontWeight: "normal",
    color: theme.textSecondary,
  },
  planNote: {
    fontSize: 12,
    color: theme.accent,
    marginTop: 2,
    fontWeight: "500",
  },
  purchaseButton: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  purchaseText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  trialNote: {
    fontSize: 12,
    color: theme.textMuted,
    textAlign: "center",
    marginBottom: 12,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 24,
  },
  restoreText: {
    color: theme.textSecondary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  legalSection: {
    alignItems: "center",
  },
  legalText: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
  },
  legalLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legalLink: {
    fontSize: 12,
    color: theme.accent,
    textDecorationLine: "underline",
  },
  legalSep: {
    fontSize: 12,
    color: theme.textMuted,
  },
  // Pro active state
  proActive: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  proActiveTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.text,
    marginTop: 20,
    marginBottom: 8,
  },
  proActiveDesc: {
    fontSize: 15,
    color: theme.textSecondary,
    marginBottom: 32,
  },
  backButton: {
    backgroundColor: theme.bgCard,
    borderRadius: 10,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  backButtonText: {
    color: theme.text,
    fontSize: 15,
    fontWeight: "600",
  },
});
