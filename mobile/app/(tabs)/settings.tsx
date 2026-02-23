import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { theme } from "@/constants/Colors";

export default function SettingsScreen() {
  const { user, logout } = useAuth();

  if (!user) {
    router.replace("/auth");
    return null;
  }

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

      {/* Plan Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>プラン</Text>
        <View style={styles.card}>
          <View style={styles.planRow}>
            <View
              style={[
                styles.planBadge,
                user.plan === "pro" && styles.planBadgePro,
              ]}
            >
              <Text
                style={[
                  styles.planBadgeText,
                  user.plan === "pro" && styles.planBadgeTextPro,
                ]}
              >
                {user.plan === "pro" ? "Pro" : "Free"}
              </Text>
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planDesc}>
                {user.plan === "pro"
                  ? "無制限プラン（¥1,480/月）"
                  : "月10回AI抽出 / 50物件保存"}
              </Text>
            </View>
          </View>
          {user.plan === "free" && (
            <TouchableOpacity style={styles.upgradeButton}>
              <Text style={styles.upgradeText}>Proにアップグレード</Text>
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
              {user.plan === "free" ? " / 10回" : "回"}
            </Text>
          </View>
          {user.plan === "free" && (
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
