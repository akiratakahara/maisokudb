import { Link, Stack } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { theme } from "@/constants/Colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "エラー" }} />
      <View style={styles.container}>
        <Text style={styles.title}>ページが見つかりません</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>ホームに戻る</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.bg,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
  },
  link: {
    marginTop: 16,
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 14,
    color: theme.accent,
  },
});
