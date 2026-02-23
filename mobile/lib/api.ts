import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem("token");
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "リクエストに失敗しました");
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string }) =>
    request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Properties
  getProperties: (params?: Record<string, string>) => {
    const query = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request<{ properties: Property[] }>(`/api/properties${query}`);
  },

  getProperty: (id: string) =>
    request<{ property: Property }>(`/api/properties/${id}`),

  createProperty: (body: Partial<Property>) =>
    request<{ property: Property }>("/api/properties", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateProperty: (id: string, body: Partial<Property>) =>
    request<{ property: Property }>(`/api/properties/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteProperty: (id: string) =>
    request<{ message: string }>(`/api/properties/${id}`, {
      method: "DELETE",
    }),

  // AI
  extractPdf: (pdfBase64: string) =>
    request<{ extracted: Partial<Property> }>("/api/ai/extract", {
      method: "POST",
      body: JSON.stringify({ pdfBase64 }),
    }),

  generateEmail: (propertyId: string) =>
    request<{ email: string }>("/api/ai/email", {
      method: "POST",
      body: JSON.stringify({ propertyId }),
    }),

  // Health
  health: () => request<{ status: string }>("/api/health"),
};

export interface User {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
  aiUsageCount?: number;
}

export interface Property {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  nearestStation: string | null;
  walkMinutes: number | null;
  price: number | null;
  managementFee: number | null;
  repairReserve: number | null;
  deposit: number | null;
  keyMoney: number | null;
  layout: string | null;
  area: number | null;
  balconyArea: number | null;
  builtDate: string | null;
  structure: string | null;
  floors: string | null;
  floor: string | null;
  equipment: string[] | null;
  transactionType: string | null;
  managementCompany: string | null;
  contactInfo: string | null;
  notes: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}
