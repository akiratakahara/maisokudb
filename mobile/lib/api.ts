import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://bukendb-production.up.railway.app";

async function getToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem("token");
  } catch {
    return null;
  }
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

  // 204 No Content（削除成功等）はボディなし
  if (res.status === 204) {
    return null as T;
  }

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.error || "リクエストに失敗しました");
  }

  return data as T;
}

// バックエンドの PropertyListResponse → モバイル Property 変換
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendListItem(item: any): Property {
  // notes dict からモバイル固有フィールドを取得（detail と同じ優先度）
  const notes = item.notes || {};

  // station_info: "横浜 徒歩10分" / "JR中央線 東京 徒歩5分" → パース
  let nearestStation: string | null = null;
  let walkMinutes: number | null = null;
  if (item.station_info) {
    const m = item.station_info.match(/(.+)\s+徒歩(\d+)分/);
    if (m) {
      nearestStation = m[1].trim();
      walkMinutes = parseInt(m[2]);
    } else {
      nearestStation = item.station_info;
    }
  }

  return {
    id: String(item.id),
    userId: "",
    name: item.name || "",
    prefecture: notes.prefecture || item.prefecture || null,
    city: notes.city || item.city || null,
    address: item.full_address || null,
    nearestStation,
    walkMinutes,
    stationDailyPassengers: notes.station_daily_passengers ?? null,
    stationLines: notes.station_lines ?? null,
    price: item.price ? Math.round(Number(item.price) / 10000) : null,
    grossYield: notes.gross_yield ?? (item.yield_rate ? Number(item.yield_rate) : null),
    monthlyRent: notes.monthly_rent ?? null,
    managementFee: notes.management_fee ?? null,
    repairReserve: notes.repair_reserve ?? null,
    otherMonthlyExpenses: notes.other_monthly_expenses ?? null,
    layout: notes.layout ?? null,
    area: item.building_area_sqm
      ? Number(item.building_area_sqm)
      : item.building_area_tsubo
      ? Math.round(Number(item.building_area_tsubo) * 3.306 * 10) / 10
      : null,
    balconyArea: notes.balcony_area ?? null,
    builtDate: item.built_year ? `${item.built_year}年` : null,
    structure: notes.structure ?? null,
    floors: notes.floors ?? null,
    floor: notes.floor ?? null,
    totalUnits: notes.total_units ?? null,
    equipment: notes.equipment ?? null,
    transactionType: notes.transaction_type ?? null,
    sublease: notes.sublease ?? null,
    subleaseDetail: notes.sublease_detail ?? null,
    managementCompany: notes.management_company ?? null,
    contactInfo: notes.contact_info ?? null,
    notes: notes.text ?? null,
    pdfUrl: notes.local_pdf_path || item.primary_image_url || null,
    pricePerM2: item.price_per_m2 ?? null,
    population: item.population ?? null,
    investmentStatus: item.investment_status ?? null,
    isDemo: !!notes.is_demo,
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || "",
  };
}

// バックエンドの PropertyResponse(detail) → モバイル Property 変換
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapBackendDetail(item: any): Property {
  const building = item.building || {};
  const accesses = item.accesses || [];
  const firstAccess = accesses[0] || {};
  const notes = item.notes || {};

  let floors: string | null = null;
  if (building.floors_above) {
    floors = `地上${building.floors_above}階`;
    if (building.floors_below) floors += ` 地下${building.floors_below}階`;
  }

  return {
    id: String(item.id),
    userId: "",
    name: item.name || "",
    prefecture: notes.prefecture || item.prefecture || null,
    city: notes.city || item.city || null,
    address: item.full_address || null,
    nearestStation: firstAccess.station_name || null,
    walkMinutes: firstAccess.walk_minutes || null,
    stationDailyPassengers: notes.station_daily_passengers ?? null,
    stationLines: notes.station_lines ?? null,
    price: item.price ? Math.round(Number(item.price) / 10000) : null,
    grossYield: notes.gross_yield ?? null,
    monthlyRent: notes.monthly_rent ?? null,
    managementFee: notes.management_fee ?? null,
    repairReserve: notes.repair_reserve ?? null,
    otherMonthlyExpenses: notes.other_monthly_expenses ?? null,
    layout: building.layout || notes.layout || null,
    area: building.exclusive_area ? Number(building.exclusive_area) : (building.total_area ? Number(building.total_area) : (building.total_area_sqm ? Number(building.total_area_sqm) : null)),
    balconyArea: building.balcony_area_sqm ? Number(building.balcony_area_sqm) : (notes.balcony_area ?? null),
    builtDate: building.built_year ? `${building.built_year}年${building.built_month ? building.built_month + "月" : ""}` : null,
    structure: building.structure || notes.structure || null,
    floors,
    floor: notes.floor ?? null,
    totalUnits: notes.total_units ?? null,
    equipment: notes.equipment ?? null,
    transactionType: item.transaction_mode || notes.transaction_type || null,
    sublease: notes.sublease ?? null,
    subleaseDetail: notes.sublease_detail ?? null,
    managementCompany: notes.management_company ?? null,
    contactInfo: item.source_phone || notes.contact_info || null,
    notes: notes.text ?? null,
    pdfUrl: notes.local_pdf_path || null,
    pricePerM2: (() => {
      const areaSqm = building.exclusive_area ? Number(building.exclusive_area) : (building.total_area ? Number(building.total_area) : (building.total_area_sqm ? Number(building.total_area_sqm) : null));
      if (item.price && areaSqm && areaSqm > 0) return Math.round(Number(item.price) / areaSqm);
      return null;
    })(),
    population: item.population ?? null,
    investmentStatus: item.investment_status ?? null,
    isDemo: !!notes.is_demo,
    createdAt: item.created_at || "",
    updatedAt: item.updated_at || "",
  };
}

// 文字列を数値に安全変換（NaN → undefined）
function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

// モバイル Property → バックエンド PropertyCreate 変換
function mapToBackendCreate(body: Partial<Property>): Record<string, unknown> {
  const builtDateStr = body.builtDate != null ? String(body.builtDate) : "";
  const floorsStr = body.floors != null ? String(body.floors) : "";
  const builtYearMatch = builtDateStr.match(/(\d{4})/);
  const builtMonthMatch = builtDateStr.match(/(\d{4})年(\d{1,2})月/);
  const floorsMatch = floorsStr.match(/(\d+)/);

  const price = toNum(body.price);
  const area = toNum(body.area);
  const balconyArea = toNum(body.balconyArea);
  const walkMinutes = toNum(body.walkMinutes);

  // 物件名: 空なら駅名・間取り・住所から生成
  let name = body.name && body.name.trim() ? body.name.trim() : "";
  if (!name) {
    const parts: string[] = [];
    if (body.nearestStation) parts.push(`${body.nearestStation}駅`);
    if (body.layout) parts.push(body.layout);
    if (body.structure) parts.push(body.structure);
    if (parts.length === 0 && body.city) parts.push(body.city);
    if (parts.length === 0 && body.address) parts.push(body.address);
    name = parts.join(" ") || "物件";
  }

  // notes: undefinedだとJSON.stringifyで消えるのでnullを使用
  const n = (v: unknown) => v !== undefined && v !== null && v !== "" ? v : null;

  return {
    name,
    property_type: "区分マンション",
    prefecture: body.prefecture || undefined,
    city: body.city || undefined,
    full_address: body.address || undefined,
    price: price ? price * 10000 : undefined,
    investment_status: body.investmentStatus || undefined,
    building: {
      structure: body.structure || undefined,
      layout: body.layout || undefined,
      total_area: area,
      exclusive_area: area,
      balcony_area: balconyArea,
      built_year: builtYearMatch ? parseInt(builtYearMatch[1]) : undefined,
      built_month: builtMonthMatch ? parseInt(builtMonthMatch[2]) : undefined,
      floors_above: floorsMatch ? parseInt(floorsMatch[1]) : undefined,
    },
    accesses: body.nearestStation ? [{
      station_name: body.nearestStation,
      walk_minutes: walkMinutes,
    }] : [],
    notes: {
      prefecture: n(body.prefecture),
      city: n(body.city),
      station_daily_passengers: body.stationDailyPassengers ?? null,
      station_lines: body.stationLines ?? null,
      gross_yield: toNum(body.grossYield) ?? null,
      monthly_rent: toNum(body.monthlyRent) ?? null,
      management_fee: toNum(body.managementFee) ?? null,
      repair_reserve: toNum(body.repairReserve) ?? null,
      other_monthly_expenses: toNum(body.otherMonthlyExpenses) ?? null,
      total_units: toNum(body.totalUnits) ?? null,
      layout: n(body.layout),
      structure: n(body.structure),
      floors: n(body.floors),
      floor: n(body.floor),
      balcony_area: balconyArea ?? null,
      equipment: body.equipment ?? null,
      transaction_type: n(body.transactionType),
      sublease: body.sublease ?? null,
      sublease_detail: n(body.subleaseDetail),
      management_company: n(body.managementCompany),
      contact_info: n(body.contactInfo),
      text: n(body.notes),
      local_pdf_path: n(body.pdfUrl),
    },
  };
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
  getProperties: async (params?: Record<string, string>): Promise<{ properties: Property[] }> => {
    // モバイルのパラメータ → バックエンドのパラメータにマッピング
    const backendParams: Record<string, string> = {};
    if (params) {
      if (params.sortBy) {
        const sortMap: Record<string, string> = {
          createdAt: "created_at",
          price: "price",
          area: "total_area_sqm",
          builtDate: "built_year",
        };
        backendParams.sort = sortMap[params.sortBy] || "created_at";
      }
      if (params.sortOrder) backendParams.order = params.sortOrder;
      if (params.search) backendParams.search = params.search;
      if (params.minPrice) backendParams.min_price = String(Number(params.minPrice) * 10000);
      if (params.maxPrice) backendParams.max_price = String(Number(params.maxPrice) * 10000);
      if (params.in_investment_status) backendParams.in_investment_status = params.in_investment_status;
      if (params.my_only) backendParams.my_only = "true";
    }
    const query = Object.keys(backendParams).length
      ? "?" + new URLSearchParams(backendParams).toString()
      : "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await request<any>(`/api/v1/properties${query}`);
    const items = res.items || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { properties: items.map((item: any) => mapBackendListItem(item)) };
  },

  seedDemo: async (): Promise<{ created: number }> => {
    return request<{ created: number }>("/api/v1/properties/seed-demo", {
      method: "POST",
    });
  },

  getProperty: async (id: string): Promise<{ property: Property }> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await request<any>(`/api/v1/properties/${id}`);
    return { property: mapBackendDetail(res) };
  },

  createProperty: async (body: Partial<Property>): Promise<{ property: Property }> => {
    const backendBody = mapToBackendCreate(body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await request<any>("/api/v1/properties", {
      method: "POST",
      body: JSON.stringify(backendBody),
    });
    return { property: mapBackendDetail(res) };
  },

  updateProperty: async (id: string, body: Partial<Property>): Promise<{ property: Property }> => {
    const backendBody = mapToBackendCreate(body);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await request<any>(`/api/v1/properties/${id}`, {
      method: "PUT",
      body: JSON.stringify(backendBody),
    });
    return { property: mapBackendDetail(res) };
  },

  deleteProperty: (id: string) =>
    request<null>(`/api/v1/properties/${id}`, {
      method: "DELETE",
    }),

  // AI - PDF抽出
  extractPdf: (pdfBase64: string) =>
    request<{ extracted: Partial<Property> }>("/api/v1/documents/extract-base64", {
      method: "POST",
      body: JSON.stringify({ pdfBase64 }),
    }),

  // AI - 画像（スクショ）抽出
  extractImage: (imageBase64: string, mimeType: string) =>
    request<{ extracted: Partial<Property> }>("/api/v1/documents/extract-base64", {
      method: "POST",
      body: JSON.stringify({ pdfBase64: imageBase64, mimeType }),
    }),

  // AI - URL抽出
  extractUrl: (url: string) =>
    request<{ extracted: Partial<Property> & { sourceUrl?: string } }>("/api/v1/documents/extract-url", {
      method: "POST",
      body: JSON.stringify({ url }),
    }),

  // Banks
  getBanks: () => request<Bank[]>("/api/v1/banks"),
  getEligibleBanks: (params: Record<string, string>) => {
    const query = "?" + new URLSearchParams(params).toString();
    return request<Bank[]>(`/api/v1/banks/eligible${query}`);
  },

  // Simulations
  calculateSimulation: (body: SimulationRequest) =>
    request<SimulationResult>("/api/v1/simulations/calculate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  compareBanks: (body: CompareRequest) =>
    request<BankComparisonItem[]>("/api/v1/simulations/compare", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // AI分析
  analyzeProperty: (body: AnalysisInput) =>
    request<PropertyAnalysis>("/api/v1/analysis/property", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // AI分析（物件ID指定で実行＆保存）
  analyzeAndSave: (propertyId: string) =>
    request<PropertyAnalysis>(`/api/v1/analysis/property/${propertyId}`, {
      method: "POST",
    }),

  // 保存済みAI分析結果を取得
  getSavedAnalysis: (propertyId: string) =>
    request<PropertyAnalysis & { analyzed_at?: string; status?: string }>(`/api/v1/analysis/saved/${propertyId}`),

  // 相場比較
  getMarketComparison: (propertyId: string) =>
    request<MarketComparison>(`/api/v1/analysis/market-comparison/${propertyId}`),

  // 出口予測
  getExitPrediction: (propertyId: string) =>
    request<ExitPrediction>(`/api/v1/analysis/exit-prediction/${propertyId}`),

  // 物件スコアリング (100点満点)
  getPropertyScore: (propertyId: string) =>
    request<PropertyScore>(`/api/v1/analysis/score/${propertyId}`),

  // 賃料相場分析
  getRentAnalysis: (propertyId: string) =>
    request<RentAnalysis>(`/api/v1/analysis/rent-analysis/${propertyId}`),

  // Loan Presets
  getLoanPresets: () =>
    request<LoanPreset[]>("/api/v1/loan-presets"),

  getLoanPreset: (id: number) =>
    request<LoanPreset>(`/api/v1/loan-presets/${id}`),

  createLoanPreset: (body: Omit<LoanPreset, "id" | "createdAt" | "updatedAt">) =>
    request<LoanPreset>("/api/v1/loan-presets", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  updateLoanPreset: (id: number, body: Partial<LoanPreset>) =>
    request<LoanPreset>(`/api/v1/loan-presets/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),

  deleteLoanPreset: (id: number) =>
    request<{ detail: string }>(`/api/v1/loan-presets/${id}`, {
      method: "DELETE",
    }),

  seedSystemPresets: () =>
    request<{ detail: string; seeded: number }>("/api/v1/loan-presets/seed-system", {
      method: "POST",
    }),

  // Saved Simulations
  getSavedSimulations: (propertyId?: number) => {
    const query = propertyId != null ? `?property_id=${propertyId}` : "";
    return request<SavedSimulationItem[]>(`/api/v1/saved-simulations${query}`);
  },

  getSavedSimulation: (id: number) =>
    request<SavedSimulationItem>(`/api/v1/saved-simulations/${id}`),

  saveSimulation: (body: SavedSimulationCreate) =>
    request<SavedSimulationItem>("/api/v1/saved-simulations", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  deleteSavedSimulation: (id: number) =>
    request<{ detail: string }>(`/api/v1/saved-simulations/${id}`, {
      method: "DELETE",
    }),

  // Health
  health: () => request<{ status: string }>("/health"),

  // 不動産情報ライブラリ
  getReinfolibTransactions: (params: { prefecture?: string; city?: string; station_name?: string; area_sqm?: number; built_year?: number }) => {
    const query = new URLSearchParams();
    if (params.prefecture) query.set("prefecture", params.prefecture);
    if (params.city) query.set("city", params.city);
    if (params.station_name) query.set("station_name", params.station_name);
    if (params.area_sqm) query.set("area_sqm", String(params.area_sqm));
    if (params.built_year) query.set("built_year", String(params.built_year));
    return request<ReinfolibTransactions>(`/api/v1/reinfolib/transactions?${query}`);
  },

  getReinfolibAreaInfo: (params: { lat?: number; lng?: number; station_name?: string; address?: string; prefecture?: string; city?: string }) => {
    const query = new URLSearchParams();
    if (params.lat != null) query.set("lat", String(params.lat));
    if (params.lng != null) query.set("lng", String(params.lng));
    if (params.address) query.set("address", params.address);
    if (params.station_name) query.set("station_name", params.station_name);
    if (params.prefecture) query.set("prefecture", params.prefecture);
    if (params.city) query.set("city", params.city);
    return request<ReinfolibAreaInfo>(`/api/v1/reinfolib/area-info?${query}`);
  },

  // コミュニティデータ
  getCommunityMarketStats: (params: { station_name?: string; prefecture?: string; city?: string }) => {
    const query = new URLSearchParams();
    if (params.station_name) query.set("station_name", params.station_name);
    if (params.prefecture) query.set("prefecture", params.prefecture);
    if (params.city) query.set("city", params.city);
    return request<CommunityMarketStats>(`/api/v1/community/market-stats?${query}`);
  },

  getCommunityComparables: (params: { station_name?: string; prefecture?: string; city?: string; min_area?: number; max_area?: number; structure?: string; exclude_property_id?: number }) => {
    const query = new URLSearchParams();
    if (params.station_name) query.set("station_name", params.station_name);
    if (params.prefecture) query.set("prefecture", params.prefecture);
    if (params.city) query.set("city", params.city);
    if (params.min_area != null) query.set("min_area", String(params.min_area));
    if (params.max_area != null) query.set("max_area", String(params.max_area));
    if (params.structure) query.set("structure", params.structure);
    if (params.exclude_property_id != null) query.set("exclude_property_id", String(params.exclude_property_id));
    return request<CommunityComparables>(`/api/v1/community/comparables?${query}`);
  },
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
  prefecture: string | null;
  city: string | null;
  address: string | null;
  nearestStation: string | null;
  walkMinutes: number | null;
  stationDailyPassengers: number | null;
  stationLines: string[] | null;
  price: number | null;
  grossYield: number | null;
  monthlyRent: number | null;
  managementFee: number | null;
  repairReserve: number | null;
  otherMonthlyExpenses: number | null;
  layout: string | null;
  area: number | null;
  balconyArea: number | null;
  builtDate: string | null;
  structure: string | null;
  floors: string | null;
  floor: string | null;
  totalUnits: number | null;
  equipment: string[] | null;
  transactionType: string | null;
  sublease: boolean | null;
  subleaseDetail: string | null;
  managementCompany: string | null;
  contactInfo: string | null;
  notes: string | null;
  pdfUrl: string | null;
  pricePerM2: number | null;
  population: {
    code: number;
    pref: string;
    city: string | null;
    pop_2020: number | null;
    pop_2040: number | null;
    pop_2050: number | null;
    idx_2025: number | null;
    idx_2030: number | null;
    idx_2035: number | null;
    idx_2040: number | null;
    idx_2045: number | null;
    idx_2050: number | null;
    change_rate_2040: number | null;
    trend: "growing" | "stable" | "declining" | "unknown";
  } | null;
  investmentStatus: "検討中" | "交渉中" | "購入済" | "見送り" | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export const INVESTMENT_STATUSES = [
  { key: "検討中", label: "検討中", color: "#60A5FA", icon: "search" },
  { key: "交渉中", label: "交渉中", color: "#F59E0B", icon: "handshake-o" },
  { key: "購入済", label: "購入済", color: "#4CAF50", icon: "check-circle" },
  { key: "見送り", label: "見送り", color: "#9E9E9E", icon: "times-circle" },
] as const;

export interface Bank {
  id: number;
  name: string;
  display_name: string | null;
  category: string | null;
  min_annual_income: number | null;
  interest_rate_min: number | null;
  interest_rate_max: number | null;
  interest_rate_default: number | null;
  down_payment_type: string | null;
  down_payment_ratio: number | null;
  down_payment_note: string | null;
  max_loan_years: number | null;
  loan_year_formula: string | null;
  max_completion_age: number | null;
  admin_fee_type: string | null;
  admin_fee_fixed: number | null;
  admin_fee_rate: number | null;
  notes: string | null;
  campaign_rate: number | null;
  campaign_deadline: string | null;
  is_active: boolean;
}

export interface SimulationRequest {
  property_price: number;
  monthly_rent: number;
  management_fee: number;
  repair_reserve: number;
  other_expenses: number;
  rental_management_fee: number;
  built_year: number;
  structure: string;
  exclusive_area: number;
  total_units: number;
  bank_id: number;
  down_payment: number;
  interest_rate_override?: number;
  loan_years_override?: number;
  buyer_age: number;
  annual_income: number;
  simulation_years: number;
  registration_fee?: number;
  property_tax?: number;
  fire_insurance?: number;
  acquisition_tax?: number;
}

export interface CompareRequest {
  property_price: number;
  monthly_rent: number;
  management_fee: number;
  repair_reserve: number;
  other_expenses: number;
  rental_management_fee: number;
  built_year: number;
  structure: string;
  exclusive_area: number;
  total_units: number;
  walk_minutes?: number;
  buyer_age: number;
  annual_income: number;
  outstanding_debt?: number;
  is_listed_company?: boolean;
  dependents?: number;
}

export interface BankComparisonItem {
  bank_name: string;
  is_eligible: boolean;
  ineligible_reason: string | null;
  interest_rate: number;
  loan_years: number;
  loan_amount: number;
  down_payment: number;
  monthly_payment: number;
  total_payment: number;
  total_interest: number;
  admin_fee: number;
  initial_costs_total: number;
  annual_balance: number;
  yield_after_loan: number;
  breakeven_year10: number;
}

export interface InitialCosts {
  brokerage_fee: number;
  stamp_duty_property: number;
  stamp_duty_loan: number;
  stamp_duty_total: number;
  registration_fee: number;
  fire_insurance: number;
  acquisition_tax: number;
  admin_fee: number;
  total: number;
}

export interface YearlyPlan {
  year: number;
  annual_rent: number;
  management_fee: number;
  repair_reserve: number;
  loan_payment: number;
  property_tax: number;
  other_expenses: number;
  initial_costs: number;
  total_expenses: number;
  annual_balance: number;
  cumulative_balance: number;
}

export interface BreakevenYear {
  year: number;
  remaining_debt: number;
  cumulative_balance: number;
  breakeven_price: number;
  profit_at_purchase_price: number;
}

export interface TaxSaving {
  statutory_life: number;
  building_age: number;
  remaining_life: number;
  depreciation_rate: number;
  structure_depreciation: number;
  equipment_depreciation: number;
  total_depreciation: number;
  rental_income: number;
  deductible_expenses: number;
  real_estate_income: number;
  salary_income_manyen: number;
  salary_deduction_manyen: number;
  taxable_income_before_manyen: number;
  tax_before_manyen: number;
  taxable_income_after_manyen: number;
  tax_after_manyen: number;
  tax_saving_manyen: number;
  tax_saving_yen: number;
  is_first_year: boolean;
  first_year_extra_deduction: number;
}

export interface AnalysisInput {
  name?: string;
  prefecture?: string;
  city?: string;
  address?: string;
  nearestStation?: string;
  walkMinutes?: number;
  price?: number;
  monthlyRent?: number;
  grossYield?: number;
  managementFee?: number;
  repairReserve?: number;
  area?: number;
  structure?: string;
  builtDate?: string;
  layout?: string;
  totalUnits?: number;
  floor?: string;
  floors?: string;
}

export interface AnalysisScore {
  location: number;
  profitability: number;
  growth: number;
  liquidity: number;
}

export interface PropertyAnalysis {
  summary: string;
  land_price_analysis: string | null;
  area_analysis: string | null;
  station_analysis: string | null;
  risk_points: string[];
  positive_points: string[];
  rent_assessment: string | null;
  score: AnalysisScore;
  public_data: {
    land_price: {
      count: number;
      avg_price: number;
      min_price: number;
      max_price: number;
      avg_rate: number | null;
      trend_5y: number | null;
      trend_10y: number | null;
      nearest: {
        addr: string;
        price: number;
        rate: number;
        zoning: string;
        distance_m: number;
      };
      price_history: Record<string, number>;
    } | null;
    did: {
      in_did: boolean;
      municipality?: string;
      population?: number;
      density?: number;
      households?: number;
    } | null;
  };
  reference_data?: {
    land_price_points: LandPricePoint[];
    station: {
      name: string;
      lat: number;
      lng: number;
      daily_passengers: number | null;
      lines: { operator: string; line: string }[];
    } | null;
    did: {
      in_did: boolean;
      municipality?: string;
      population?: number;
      area_km2?: number;
      density?: number;
      households?: number;
    } | null;
    search_coords: { lat: number; lng: number } | null;
  };
}

export interface LandPricePoint {
  addr: string;
  price: number;
  rate: number | null;
  use: string;
  zoning: string;
  bcr: number | null;
  far: number | null;
  distance_m: number;
  history: Record<string, number>;
}

export interface SimulationResult {
  property_price: number;
  loan_amount: number;
  down_payment: number;
  interest_rate: number;
  loan_years: number;
  monthly_payment: number;
  total_payment: number;
  total_interest: number;
  initial_costs: InitialCosts;
  yearly_plans: YearlyPlan[];
  amortization: any[];
  breakeven_prices: BreakevenYear[];
  tax_saving_first_year: TaxSaving;
  tax_saving_ongoing: TaxSaving;
  gross_yield: number;
  net_yield: number;
  roi: number;
  payback_years: number | null;
}

export interface MarketComparisonStation {
  name: string;
  line: string | null;
  walk_minutes: number;
  daily_passengers: number | null;
  score: number;
}

export interface InternalComparable {
  count: number;
  reliable: boolean;
  avg_price_m2: number | null;
  median_price_m2: number | null;
  min_price_m2: number | null;
  max_price_m2: number | null;
}

export interface InternalRentComparable {
  count: number;
  current_count: number;
  potential_count: number;
  reliable: boolean;
  median_rent_m2: number | null;
  avg_rent_m2: number | null;
  min_rent_m2: number | null;
  max_rent_m2: number | null;
}

export interface MarketComparison {
  property_price_m2: number | null;
  area_sqm: number | null;
  market_avg_price_m2: number | null;
  diff_pct: number | null;
  assessment: "割安" | "相場並み" | "割高" | null;
  total_access_score: number;
  stations: MarketComparisonStation[];
  calculated_at: string;
  data_sources: {
    transaction: string | null;
    internal: string | null;
    internal_rent: string | null;
    station: string;
  };
  internal_comparable: InternalComparable | null;
  internal_rent_comparable: InternalRentComparable | null;
  transaction_summary: {
    count: number;
    avg_price_m2: number;
    min_price_m2: number;
    max_price_m2: number;
    avg_total_price: number;
    period: string;
    samples: {
      unit_price: number;
      total_price: number;
      area: number;
      floor_plan: string | null;
      building_year: number | null;
      period: string | null;
    }[];
  } | null;
}

export interface LoanPreset {
  id: number;
  name: string;
  is_system: boolean;

  // 基本融資条件
  interest_rate: number | null;
  max_loan_years: number | null;
  loan_year_formula: "age_limit" | "building_age_limit" | "fixed" | null;
  loan_year_base: number | null;
  down_payment_ratio: number | null;
  admin_fee_rate: number | null;
  is_default: boolean;

  // 審査条件
  max_building_age: number | null;
  min_area: number | null;
  max_walk_minutes: number | null;
  max_completion_age: number | null;
  allowed_structures: string[] | null;
  allowed_prefectures: string[] | null;
  min_price: number | null;
  max_price: number | null;
  min_yield: number | null;
  requires_new_quake_standard: boolean;

  // メモ
  memo: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * 物件がローンプリセットの審査条件に合致するか判定
 */
export function matchesLoanPreset(property: Property, preset: LoanPreset): { matches: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const currentYear = new Date().getFullYear();

  // 築年数チェック
  if (preset.max_building_age != null && property.builtDate) {
    const builtYearMatch = property.builtDate.match(/(\d{4})/);
    if (builtYearMatch) {
      const age = currentYear - parseInt(builtYearMatch[1]);
      if (age > preset.max_building_age) {
        reasons.push(`築${age}年（上限${preset.max_building_age}年）`);
      }
    }
  }

  // 新耐震基準チェック（1981年6月以降）
  if (preset.requires_new_quake_standard && property.builtDate) {
    const builtYearMatch = property.builtDate.match(/(\d{4})/);
    if (builtYearMatch && parseInt(builtYearMatch[1]) < 1982) {
      reasons.push("旧耐震基準");
    }
  }

  // 面積チェック
  if (preset.min_area != null && property.area != null) {
    if (property.area < preset.min_area) {
      reasons.push(`${property.area}㎡（下限${preset.min_area}㎡）`);
    }
  }

  // 駅徒歩チェック
  if (preset.max_walk_minutes != null && property.walkMinutes != null) {
    if (property.walkMinutes > preset.max_walk_minutes) {
      reasons.push(`徒歩${property.walkMinutes}分（上限${preset.max_walk_minutes}分）`);
    }
  }

  // 構造チェック
  if (preset.allowed_structures && preset.allowed_structures.length > 0 && property.structure) {
    const matched = preset.allowed_structures.some(s => property.structure!.includes(s));
    if (!matched) {
      reasons.push(`${property.structure}（対象外）`);
    }
  }

  // エリアチェック
  if (preset.allowed_prefectures && preset.allowed_prefectures.length > 0 && property.prefecture) {
    if (!preset.allowed_prefectures.includes(property.prefecture)) {
      reasons.push(`${property.prefecture}（対象外エリア）`);
    }
  }

  // 価格チェック（万円）
  if (preset.min_price != null && property.price != null) {
    if (property.price < preset.min_price) {
      reasons.push(`${property.price}万円（下限${preset.min_price}万円）`);
    }
  }
  if (preset.max_price != null && property.price != null) {
    if (property.price > preset.max_price) {
      reasons.push(`${property.price}万円（上限${preset.max_price}万円）`);
    }
  }

  // 利回りチェック
  if (preset.min_yield != null && property.grossYield != null) {
    if (property.grossYield < preset.min_yield) {
      reasons.push(`利回り${property.grossYield.toFixed(1)}%（下限${preset.min_yield}%）`);
    }
  }

  return { matches: reasons.length === 0, reasons };
}

export interface SavedSimulationCreate {
  property_id?: number;
  label: string;
  property_price: number;
  monthly_rent: number;
  management_fee?: number;
  repair_reserve?: number;
  built_year?: number;
  structure?: string;
  bank_name?: string;
  interest_rate?: number;
  loan_years?: number;
  down_payment?: number;
  loan_amount?: number;
  buyer_age?: number;
  monthly_payment?: number;
  monthly_cf?: number;
  annual_cf?: number;
  gross_yield?: number;
  net_yield?: number;
  roi?: number;
  total_payment?: number;
  total_interest?: number;
  initial_costs?: number;
  payback_years?: number;
  result_json?: any;
}

export interface SavedSimulationItem extends SavedSimulationCreate {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface ExitForecast {
  year: number;
  years_ahead: number;
  price_low: number;
  price_mid: number;
  population_multiplier?: number | null;
  price_high: number;
  building_residual_pct: number | null;
  roi_pct: number;
}

export interface ScoreDetail {
  item: string;
  value: string;
  score: number;
  max: number;
}

export interface ScoreCategory {
  label: string;
  score: number;
  max: number;
  details: ScoreDetail[];
}

export interface PropertyScore {
  total: number;
  rank: string;
  comment: string;
  categories: {
    profitability: ScoreCategory;
    location: ScoreCategory;
    asset_quality: ScoreCategory;
    growth: ScoreCategory;
  };
}

export interface RentComparable {
  name: string;
  rent: number;
  area: number;
  rent_m2: number;
  walk_minutes: number | null;
  structure: string | null;
  built_date: string | null;
}

export interface RentAnalysis {
  current_rent: number | null;
  current_rent_m2: number | null;
  area: number | null;
  estimated_rent_m2: number | null;
  estimated_rent: number | null;
  estimated_range: { low: number; high: number } | null;
  assessment: "適正" | "割安" | "割高" | null;
  diff_pct: number | null;
  comparables: RentComparable[];
  comparable_stats: {
    count: number;
    avg_rent_m2: number;
    median_rent_m2: number;
    min_rent_m2: number;
    max_rent_m2: number;
  } | null;
  yield_analysis: {
    gross_yield: number;
    net_yield: number;
    monthly_expenses: number;
    annual_income: number;
    annual_net_income: number;
  } | null;
  estimated_yield: {
    gross_yield: number;
    net_yield: number;
  } | null;
  model_inputs: {
    area: number | null;
    age_years: number | null;
    walk_minutes: number | null;
    structure: string | null;
    daily_passengers: number | null;
  };
}

export interface ExitPrediction {
  current_price: number | null;
  current_year: number;
  built_year: number | null;
  structure: string | null;
  legal_life: number;
  current_building_residual_pct: number | null;
  land_price_trend_pct: number;
  land_price_trend_basis: string | null;
  land_ratio: number;
  liquidity_multiplier: number;
  forecasts: ExitForecast[];
  stations: MarketComparisonStation[];
  num_lines: number;
  population?: {
    pref: string;
    city?: string;
    trend: string;
    change_rate_2040?: number | null;
  } | null;
  assumptions: {
    land_ratio_pct: number;
    building_ratio_pct: number;
    legal_life_years: number;
    price_spread_pct: number;
  };
  calculated_at: string;
  data_sources: {
    land_price: string;
    station: string;
    depreciation: string;
    population?: string;
  };
}

export interface ReinfolibTransaction {
  unit_price: number;
  total_price: number;
  area: number;
  floor_plan: string | null;
  building_year: number | null;
  structure: string | null;
  period: string | null;
  district: string | null;
  municipality: string | null;
  coverage_ratio: string | null;
  floor_area_ratio: string | null;
  city_planning: string | null;
}

export interface ReinfolibTransactions {
  count: number;
  avg_price_m2: number;
  median_price_m2: number;
  min_price_m2: number;
  max_price_m2: number;
  avg_total_price: number;
  samples: ReinfolibTransaction[];
  period: string;
  city_code: string | null;
  source: string;
}

export interface ReinfolibAreaInfo {
  zoning: Record<string, any>[];
  flood_risk: Record<string, any>[];
  landslide_risk: Record<string, any>[];
  land_prices: Record<string, any>[];
  did: Record<string, any>[];
  future_population: Record<string, any>[];
  stations: Record<string, any>[];
  elevation?: { elevation_m: number | null; source: string };
  facilities?: {
    facilities: Record<string, { label: string; count: number; items: { name: string; distance_m: number }[] }>;
    total: number;
    radius_m: number;
    source: string;
  };
  estat?: {
    vacancy_rate?: { rate: number; total_houses: number; vacant_houses: number; year: number } | null;
    crime_stats?: { total_cases: number; prefecture_level: boolean } | null;
    migration?: { transfers_in: number; transfers_out: number; net_migration: number; trend: string } | null;
    source?: string;
  };
  resas?: {
    population?: { data: { year: number; value: number }[]; trend: string } | null;
    fiscal_strength?: { index: number; year: number; rating: string } | null;
    estate_transactions?: { data: { year: number; value: number }[]; trend: string } | null;
    source?: string;
  };
  source: string;
}

export interface CommunityComparable {
  id: number;
  name: string;
  prefecture: string;
  city: string;
  full_address: string;
  price: number | null;
  price_per_sqm: number | null;
  gross_yield: number | null;
  area: number | null;
  structure: string | null;
  built_year: number | null;
  station_name: string | null;
  walk_minutes: number | null;
  created_at: string | null;
}

export interface CommunityMarketStats {
  total_properties: number;
  station_name: string | null;
  prefecture: string | null;
  city: string | null;
  price_stats: { avg: number | null; min: number | null; max: number | null; count: number } | null;
  yield_stats: { avg: number | null; min: number | null; max: number | null } | null;
  area_stats: { avg: number | null; min: number | null; max: number | null } | null;
  area_ranking: { city: string; count: number; avg_price: number | null }[];
  station_ranking: { station: string; count: number }[];
  recent_properties: CommunityComparable[];
}

export interface CommunityComparables {
  total: number;
  comparables: CommunityComparable[];
}
