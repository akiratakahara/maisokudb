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
    area: building.total_area_sqm ? Number(building.total_area_sqm) : null,
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
      const areaSqm = building.total_area ? Number(building.total_area) : (item.land?.area_sqm ? Number(item.land.area_sqm) : null);
      if (item.price && areaSqm && areaSqm > 0) return Math.round(Number(item.price) / areaSqm);
      return null;
    })(),
    population: item.population ?? null,
    investmentStatus: item.investment_status ?? null,
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

  return {
    name: body.name || "無題の物件",
    property_type: "区分マンション",
    prefecture: body.prefecture || undefined,
    city: body.city || undefined,
    full_address: body.address || undefined,
    price: price ? price * 10000 : undefined,
    investment_status: body.investmentStatus || undefined,
    building: {
      structure: body.structure || undefined,
      layout: body.layout || undefined,
      total_area_sqm: area,
      balcony_area_sqm: balconyArea,
      built_year: builtYearMatch ? parseInt(builtYearMatch[1]) : undefined,
      built_month: builtMonthMatch ? parseInt(builtMonthMatch[2]) : undefined,
      floors_above: floorsMatch ? parseInt(floorsMatch[1]) : undefined,
    },
    accesses: body.nearestStation ? [{
      station_name: body.nearestStation,
      walk_minutes: walkMinutes,
    }] : [],
    notes: {
      prefecture: body.prefecture || undefined,
      city: body.city || undefined,
      station_daily_passengers: body.stationDailyPassengers ?? undefined,
      station_lines: body.stationLines ?? undefined,
      gross_yield: toNum(body.grossYield),
      monthly_rent: toNum(body.monthlyRent),
      management_fee: toNum(body.managementFee),
      repair_reserve: toNum(body.repairReserve),
      other_monthly_expenses: toNum(body.otherMonthlyExpenses),
      total_units: toNum(body.totalUnits),
      layout: body.layout || undefined,
      structure: body.structure || undefined,
      floors: body.floors || undefined,
      floor: body.floor || undefined,
      balcony_area: balconyArea,
      equipment: body.equipment,
      transaction_type: body.transactionType || undefined,
      sublease: body.sublease ?? undefined,
      sublease_detail: body.subleaseDetail || undefined,
      management_company: body.managementCompany || undefined,
      contact_info: body.contactInfo || undefined,
      text: body.notes || undefined,
      local_pdf_path: body.pdfUrl || undefined,
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

  // 相場比較
  getMarketComparison: (propertyId: string) =>
    request<MarketComparison>(`/api/v1/analysis/market-comparison/${propertyId}`),

  // 出口予測
  getExitPrediction: (propertyId: string) =>
    request<ExitPrediction>(`/api/v1/analysis/exit-prediction/${propertyId}`),

  // Health
  health: () => request<{ status: string }>("/health"),
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

export interface ExitForecast {
  year: number;
  years_ahead: number;
  price_low: number;
  price_mid: number;
  price_high: number;
  building_residual_pct: number | null;
  roi_pct: number;
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
  };
}
