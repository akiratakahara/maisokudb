import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Linking,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { theme } from "@/constants/Colors";

export interface InvestorProfile {
  age: string;
  annualIncome: string;
  outstandingDebt: string;
  isListedCompany: boolean;
  dependents: string;
}

const PROFILE_STORAGE_KEY = "investor_profile";

export async function loadInvestorProfile(): Promise<InvestorProfile | null> {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function SettingsScreen() {
  const { user, loading: authLoading, logout } = useAuth();
  const { isPro, monthlyProduct, restore, status } = useSubscription();

  // Profile state
  const [age, setAge] = useState("");
  const [annualIncome, setAnnualIncome] = useState("");
  const [outstandingDebt, setOutstandingDebt] = useState("");
  const [isListedCompany, setIsListedCompany] = useState(false);
  const [dependents, setDependents] = useState("");
  const [profileDirty, setProfileDirty] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const profile = await loadInvestorProfile();
    if (profile) {
      setAge(profile.age);
      setAnnualIncome(profile.annualIncome);
      setOutstandingDebt(profile.outstandingDebt);
      setIsListedCompany(profile.isListedCompany);
      setDependents(profile.dependents);
    }
  }

  async function saveProfile() {
    const profile: InvestorProfile = {
      age,
      annualIncome,
      outstandingDebt,
      isListedCompany,
      dependents,
    };
    try {
      await AsyncStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
      setProfileDirty(false);
      Alert.alert("保存完了", "投資家プロフィールを保存しました");
    } catch {
      Alert.alert("エラー", "保存に失敗しました");
    }
  }

  function markDirty() {
    setProfileDirty(true);
  }

  if (authLoading || !user) return null;

  function handleLogout() {
    Alert.alert("ログアウト", "ログアウトしますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "ログアウト",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/auth");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アカウント</Text>
        <View style={styles.card}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <FontAwesome name="user" size={28} color={theme.text} />
            </View>
            <View style={styles.avatarInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Investor Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>投資家プロフィール</Text>
        <View style={styles.card}>
          <Text style={styles.profileHint}>
            シミュレーション時の融資審査判定に使用します
          </Text>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>年齢</Text>
            <TextInput
              style={styles.profileInput}
              value={age}
              onChangeText={(v) => { setAge(v); markDirty(); }}
              keyboardType="numeric"
              placeholder="35"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.profileUnit}>歳</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>年収</Text>
            <TextInput
              style={styles.profileInput}
              value={annualIncome}
              onChangeText={(v) => { setAnnualIncome(v); markDirty(); }}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.profileUnit}>万円</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>残債総額</Text>
            <TextInput
              style={styles.profileInput}
              value={outstandingDebt}
              onChangeText={(v) => { setOutstandingDebt(v); markDirty(); }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.profileUnit}>万円</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>扶養家族</Text>
            <TextInput
              style={styles.profileInput}
              value={dependents}
              onChangeText={(v) => { setDependents(v); markDirty(); }}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={theme.textMuted}
            />
            <Text style={styles.profileUnit}>人</Text>
          </View>

          <View style={styles.profileRow}>
            <Text style={[styles.profileLabel, { flex: 1 }]}>勤務先が上場企業</Text>
            <TouchableOpacity
              style={[styles.toggleButton, isListedCompany && styles.toggleActive]}
              onPress={() => { setIsListedCompany(!isListedCompany); markDirty(); }}
            >
              <Text style={[styles.toggleText, isListedCompany && styles.toggleTextActive]}>
                {isListedCompany ? "はい" : "いいえ"}
              </Text>
            </TouchableOpacity>
          </View>

          {profileDirty && (
            <TouchableOpacity style={styles.saveProfileButton} onPress={saveProfile}>
              <Text style={styles.saveProfileText}>プロフィールを保存</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Loan Presets Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>融資条件</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/loan-presets" as any)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <FontAwesome name="bank" size={18} color={theme.accent} />
              <View>
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>融資条件管理</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  ローン条件を保存・物件フィルタに活用
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Portfolio Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ポートフォリオ</Text>
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push("/portfolio" as any)}
          activeOpacity={0.7}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <FontAwesome name="pie-chart" size={18} color="#4CAF50" />
              <View>
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>ポートフォリオサマリー</Text>
                <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 2 }}>
                  購入済物件の合計CF・利回り・借入残高
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={14} color={theme.textMuted} />
          </View>
        </TouchableOpacity>
      </View>

      {/* Plan Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プラン</Text>
        <View style={styles.card}>
          <View style={styles.planRow}>
            <View
              style={[
                styles.planBadge,
                isPro && styles.planBadgePro,
              ]}
            >
              <Text
                style={[
                  styles.planBadgeText,
                  isPro && styles.planBadgeTextPro,
                ]}
              >
                {isPro ? "Pro" : "Free"}
              </Text>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planDesc}>
                {isPro
                  ? `Proプラン利用中${status.productId?.includes("yearly") ? "（年額）" : status.productId?.includes("monthly") ? "（月額）" : ""}`
                  : "月10回AI抽出 / 50物件保存"}
              </Text>
            </View>
          </View>
          {!isPro && (
            <>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => router.push("/paywall" as any)}
              >
                <Text style={styles.upgradeText}>
                  Proにアップグレード
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.restoreLink}
                onPress={restore}
              >
                <Text style={styles.restoreLinkText}>購入を復元</Text>
              </TouchableOpacity>
            </>
          )}
          {isPro && (
            <TouchableOpacity
              style={styles.manageSubButton}
              onPress={() => Linking.openURL("https://apps.apple.com/account/subscriptions")}
            >
              <Text style={styles.manageSubText}>サブスクリプションを管理</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* AI Usage Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI利用状況</Text>
        <View style={styles.card}>
          <View style={styles.usageRow}>
            <FontAwesome name="magic" size={18} color={theme.accent} />
            <Text style={styles.usageLabel}>今月のAI利用回数</Text>
            <Text style={styles.usageValue}>
              {user.aiUsageCount ?? 0}
              {!isPro ? " / 10回" : "回"}
            </Text>
          </View>
          {!isPro && (
            <View style={styles.usageBar}>
              <View
                style={[
                  styles.usageBarFill,
                  {
                    width: `${Math.min(((user.aiUsageCount ?? 0) / 10) * 100, 100)}%`,
                  },
                ]}
              />
            </View>
          )}
        </View>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>アプリ情報</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>バージョン</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>ビルド</Text>
            <Text style={styles.infoValue}>1</Text>
          </View>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <FontAwesome name="sign-out" size={18} color={theme.accent} />
        <Text style={styles.logoutText}>ログアウト</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: theme.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.bgInput,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInfo: { flex: 1 },
  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  // Profile
  profileHint: {
    fontSize: 12,
    color: theme.textMuted,
    marginBottom: 14,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  profileLabel: {
    fontSize: 14,
    color: theme.textSecondary,
    width: 80,
  },
  profileInput: {
    flex: 1,
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
    textAlign: "right",
  },
  profileUnit: {
    fontSize: 13,
    color: theme.textSecondary,
    width: 30,
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.bgInput,
    borderWidth: 1,
    borderColor: theme.border,
  },
  toggleActive: {
    backgroundColor: "rgba(232, 68, 58, 0.15)",
    borderColor: theme.accent,
  },
  toggleText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  toggleTextActive: {
    color: theme.accent,
    fontWeight: "bold",
  },
  saveProfileButton: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  saveProfileText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  // Plan
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  planBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: theme.bgInput,
  },
  planBadgePro: {
    backgroundColor: "rgba(232, 68, 58, 0.15)",
  },
  planBadgeText: {
    fontSize: 13,
    fontWeight: "bold",
    color: theme.textSecondary,
  },
  planBadgeTextPro: {
    color: theme.accent,
  },
  planInfo: { flex: 1 },
  planDesc: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  upgradeButton: {
    backgroundColor: theme.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  upgradeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  restoreLink: {
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
  },
  restoreLinkText: {
    color: theme.textSecondary,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  manageSubButton: {
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 4,
  },
  manageSubText: {
    color: theme.accent,
    fontSize: 13,
  },
  usageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  usageLabel: {
    flex: 1,
    fontSize: 14,
    color: theme.text,
  },
  usageValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.accent,
  },
  usageBar: {
    height: 6,
    backgroundColor: theme.bgInput,
    borderRadius: 3,
    overflow: "hidden",
  },
  usageBarFill: {
    height: "100%",
    backgroundColor: theme.accent,
    borderRadius: 3,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  infoValue: {
    fontSize: 14,
    color: theme.text,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.accent,
    marginTop: 8,
  },
  logoutText: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: "600",
  },
});
