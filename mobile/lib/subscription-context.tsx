import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { Platform, Alert } from "react-native";
import { useIAP, type Product, type ProductSubscription, type Purchase, type PurchaseError } from "react-native-iap";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./auth-context";

const PRODUCT_ID_MONTHLY = "com.maisokudb.app.pro.monthly";
const PRODUCT_ID_YEARLY = "com.maisokudb.app.pro.yearly";
const ALL_PRODUCT_IDS = [PRODUCT_ID_MONTHLY, PRODUCT_ID_YEARLY];
const SUBSCRIPTION_STORAGE_KEY = "subscription_status";

export interface SubscriptionStatus {
  isPro: boolean;
  expiresAt: string | null;
  productId: string | null;
}

interface SubscriptionContextType {
  isPro: boolean;
  loading: boolean;
  products: ProductSubscription[];
  monthlyProduct: ProductSubscription | null;
  yearlyProduct: ProductSubscription | null;
  purchase: (productId: string) => Promise<void>;
  restore: () => Promise<void>;
  status: SubscriptionStatus;
}

const defaultStatus: SubscriptionStatus = {
  isPro: false,
  expiresAt: null,
  productId: null,
};

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPro: false,
  loading: true,
  products: [],
  monthlyProduct: null,
  yearlyProduct: null,
  purchase: async () => {},
  restore: async () => {},
  status: defaultStatus,
});

function SubscriptionProviderInner({ children }: { children: ReactNode }) {
  const { user, setUser } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(defaultStatus);
  const [initialLoading, setInitialLoading] = useState(true);

  const {
    connected,
    subscriptions,
    fetchProducts,
    requestPurchase,
    getAvailablePurchases,
    availablePurchases,
    finishTransaction,
  } = useIAP();

  // キャッシュ読み込み
  useEffect(() => {
    loadCachedStatus().then(() => setInitialLoading(false));
  }, []);

  // 商品情報を取得
  useEffect(() => {
    if (connected) {
      fetchProducts({ skus: ALL_PRODUCT_IDS, type: "subs" });
    }
  }, [connected]);

  // 購入完了を監視（最新の購入のみ処理）
  useEffect(() => {
    if (availablePurchases.length > 0) {
      // 最新の有効なサブスク購入を1つだけ採用
      const proPurchases = availablePurchases
        .filter((p) => ALL_PRODUCT_IDS.includes(p.productId))
        .sort((a, b) => (b.transactionDate || 0) - (a.transactionDate || 0));
      if (proPurchases.length > 0) {
        handlePurchaseComplete(proPurchases[0]);
      }
    }
  }, [availablePurchases]);

  const monthlyProduct = subscriptions.find((s) => s.id === PRODUCT_ID_MONTHLY) || null;
  const yearlyProduct = subscriptions.find((s) => s.id === PRODUCT_ID_YEARLY) || null;

  async function loadCachedStatus() {
    try {
      const cached = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
      if (cached) {
        const parsed: SubscriptionStatus = JSON.parse(cached);
        if (parsed.isPro && parsed.expiresAt) {
          if (new Date(parsed.expiresAt) > new Date()) {
            setStatus(parsed);
          } else {
            await saveStatus(defaultStatus);
          }
        } else if (parsed.isPro) {
          setStatus(parsed);
        }
      }
    } catch {
      // ignore
    }
  }

  async function saveStatus(newStatus: SubscriptionStatus) {
    setStatus(newStatus);
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(newStatus));
    } catch {
      // ignore
    }
    if (user) {
      setUser({ ...user, plan: newStatus.isPro ? "pro" : "free" });
    }
  }

  async function handlePurchaseComplete(purchase: Purchase) {
    const newStatus: SubscriptionStatus = {
      isPro: true,
      expiresAt: null,
      productId: purchase.productId,
    };

    // サーバーサイドレシート検証
    try {
      const receipt = (purchase as any).transactionReceipt;
      if (receipt) {
        const res = await verifyReceipt(receipt);
        if (res.valid) {
          newStatus.expiresAt = res.expiresAt;
        }
      }
    } catch {
      // ネットワークエラー → ローカルで有効として扱う
    }

    await saveStatus(newStatus);

    try {
      await finishTransaction({ purchase, isConsumable: false });
    } catch {
      // ignore
    }
  }

  const purchaseAction = useCallback(async (productId: string) => {
    const targetProduct = subscriptions.find((s) => s.id === productId);
    if (!targetProduct) {
      Alert.alert("エラー", "サブスクリプション情報を取得できませんでした。しばらくしてからお試しください。");
      return;
    }
    try {
      await requestPurchase({
        request: {
          apple: { sku: productId },
        },
        type: "subs",
      });
    } catch (err: any) {
      if (err?.code !== "E_USER_CANCELLED") {
        Alert.alert("購入エラー", err?.message || "購入処理に失敗しました");
      }
    }
  }, [subscriptions, requestPurchase]);

  const restoreAction = useCallback(async () => {
    try {
      await getAvailablePurchases();
      // availablePurchases の更新は useEffect で処理される
      // ここでは少し待ってから結果を確認
      setTimeout(async () => {
        const cached = await AsyncStorage.getItem(SUBSCRIPTION_STORAGE_KEY);
        const parsed = cached ? JSON.parse(cached) : null;
        if (parsed?.isPro) {
          Alert.alert("復元完了", "MaisokuDB Pro が復元されました");
        } else {
          Alert.alert("復元", "有効なサブスクリプションが見つかりませんでした");
        }
      }, 2000);
    } catch {
      Alert.alert("エラー", "購入情報の復元に失敗しました");
    }
  }, [getAvailablePurchases]);

  return (
    <SubscriptionContext.Provider
      value={{
        isPro: status.isPro,
        loading: initialLoading || !connected,
        products: subscriptions,
        monthlyProduct,
        yearlyProduct,
        purchase: purchaseAction,
        restore: restoreAction,
        status,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  if (Platform.OS === "web") {
    return (
      <SubscriptionContext.Provider
        value={{
          isPro: false,
          loading: false,
          products: [],
          monthlyProduct: null,
          yearlyProduct: null,
          purchase: async () => {},
          restore: async () => {},
          status: defaultStatus,
        }}
      >
        {children}
      </SubscriptionContext.Provider>
    );
  }
  return <SubscriptionProviderInner>{children}</SubscriptionProviderInner>;
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}

// --- サーバーサイドレシート検証 ---
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://bukendb-production.up.railway.app";

async function verifyReceipt(
  receiptData: string
): Promise<{ valid: boolean; expiresAt: string | null }> {
  try {
    const token = await AsyncStorage.getItem("token");
    const res = await fetch(`${API_BASE}/api/v1/subscriptions/verify-receipt`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        receipt_data: receiptData,
        platform: Platform.OS,
      }),
    });
    if (!res.ok) return { valid: true, expiresAt: null };
    return await res.json();
  } catch {
    return { valid: true, expiresAt: null };
  }
}
