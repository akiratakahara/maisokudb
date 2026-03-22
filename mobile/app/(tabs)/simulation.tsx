import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, router } from "expo-router";
import { theme } from "@/constants/Colors";
import { useSubscription } from "@/lib/subscription-context";
import { useAuth } from "@/lib/auth-context";
import {
  api,
  BankComparisonItem,
  CompareRequest,
  SimulationRequest,
  SimulationResult,
  SavedSimulationCreate,
} from "@/lib/api";
import { loadInvestorProfile } from "./settings";

// ---------- Helpers ----------

const formatYen = (n: number) => `\u00a5${Math.round(n).toLocaleString()}`;
const formatPercent = (n: number) => `${(n * 100).toFixed(2)}%`;
const formatManYen = (n: number) => `${(n / 10000).toFixed(0)}万円`;

const STRUCTURE_OPTIONS = [
  { label: "RC (鉄筋コンクリート)", value: "RC" },
  { label: "SRC (鉄骨鉄筋コンクリート)", value: "SRC" },
  { label: "S (鉄骨)", value: "S" },
  { label: "W (木造)", value: "W" },
  { label: "LS (軽量鉄骨)", value: "LS" },
];

type ScreenState = "input" | "compare" | "detail";

// ---------- Component ----------

export default function SimulationScreen() {
  const { isPro } = useSubscription();
  const params = useLocalSearchParams<{
    property_id?: string;
    property_price?: string;
    monthly_rent?: string;
    management_fee?: string;
    repair_reserve?: string;
    other_monthly_expenses?: string;
    built_year?: string;
    structure?: string;
    exclusive_area?: string;
    total_units?: string;
  }>();

  // Screen state
  const [screenState, setScreenState] = useState<ScreenState>("input");
  const [loading, setLoading] = useState(false);

  // Input form state
  const [propertyPrice, setPropertyPrice] = useState("17800000");
  const [monthlyRent, setMonthlyRent] = useState("95000");
  const [managementFee, setManagementFee] = useState("8000");
  const [repairReserve, setRepairReserve] = useState("5000");
  const [otherMonthlyExpenses, setOtherMonthlyExpenses] = useState("0");
  const [builtYear, setBuiltYear] = useState("2000");
  const [structure, setStructure] = useState("RC");
  const [exclusiveArea, setExclusiveArea] = useState("25");
  const [totalUnits, setTotalUnits] = useState("30");
  const [buyerAge, setBuyerAge] = useState("35");
  const [annualIncome, setAnnualIncome] = useState("5000000");
  const [structurePickerOpen, setStructurePickerOpen] = useState(false);
  const [outstandingDebt, setOutstandingDebt] = useState("0");
  const [isListedCompany, setIsListedCompany] = useState(false);
  const [numDependents, setNumDependents] = useState("0");
  const [propertyTax, setPropertyTax] = useState("100000");
  const [fireInsurance, setFireInsurance] = useState("");
  const [acquisitionTax, setAcquisitionTax] = useState("");
  const [costsExpanded, setCostsExpanded] = useState(false);

  // プロフィールからデフォルト値を読み込み
  useEffect(() => {
    loadInvestorProfile().then((profile) => {
      if (profile) {
        if (profile.age) setBuyerAge(profile.age);
        if (profile.annualIncome) setAnnualIncome(String(parseInt(profile.annualIncome, 10) * 10000));
        if (profile.outstandingDebt) setOutstandingDebt(profile.outstandingDebt);
        setIsListedCompany(profile.isListedCompany);
        if (profile.dependents) setNumDependents(profile.dependents);
      }
    });
  }, []);

  // 物件詳細からのパラメータを反映
  useEffect(() => {
    if (params.property_price) setPropertyPrice(params.property_price);
    if (params.monthly_rent && params.monthly_rent !== "0") setMonthlyRent(params.monthly_rent);
    if (params.management_fee) setManagementFee(params.management_fee);
    if (params.repair_reserve) setRepairReserve(params.repair_reserve);
    if (params.other_monthly_expenses) setOtherMonthlyExpenses(params.other_monthly_expenses);
    if (params.built_year) setBuiltYear(params.built_year);
    if (params.structure) {
      // "RC造" → "RC" に変換
      const s = params.structure.replace(/造$/, "");
      setStructure(s);
    }
    if (params.exclusive_area) setExclusiveArea(params.exclusive_area);
    if (params.total_units) setTotalUnits(params.total_units);
  }, [params.property_price]);

  // Compare result state
  const [compareResults, setCompareResults] = useState<BankComparisonItem[]>(
    []
  );
  const [compareGrossYield, setCompareGrossYield] = useState(0);
  const [compareNetYield, setCompareNetYield] = useState(0);

  // Detail result state
  const [simulationResult, setSimulationResult] =
    useState<SimulationResult | null>(null);
  const [selectedBankName, setSelectedBankName] = useState("");

  // ---------- Actions ----------

  async function handleCompare() {
    const price = parseFloat(propertyPrice);
    const rent = parseFloat(monthlyRent);
    const mgmt = parseFloat(managementFee);
    const repair = parseFloat(repairReserve);
    const otherExp = parseFloat(otherMonthlyExpenses) || 0;
    const built = parseInt(builtYear, 10);
    const area = parseFloat(exclusiveArea);
    const units = parseInt(totalUnits, 10);
    const age = parseInt(buyerAge, 10);
    const income = parseFloat(annualIncome);

    if (
      isNaN(price) ||
      isNaN(rent) ||
      isNaN(mgmt) ||
      isNaN(repair) ||
      isNaN(built) ||
      isNaN(area) ||
      isNaN(units) ||
      isNaN(age) ||
      isNaN(income)
    ) {
      Alert.alert("入力エラー", "すべての項目を正しく入力してください");
      return;
    }

    setLoading(true);
    try {
      const body: CompareRequest = {
        property_price: price,
        monthly_rent: rent,
        management_fee: mgmt,
        repair_reserve: repair,
        other_expenses: otherExp,
        rental_management_fee: 0,
        built_year: built,
        structure,
        exclusive_area: area,
        total_units: units,
        buyer_age: age,
        annual_income: income,
        outstanding_debt: parseInt(outstandingDebt, 10) || 0,
        is_listed_company: isListedCompany,
        dependents: parseInt(numDependents, 10) || 0,
      };

      const results = await api.compareBanks(body);
      setCompareResults(results);

      // Calculate yields from input values
      const rent12 = rent * 12;
      const expenseAnnual = (mgmt + repair + otherExp) * 12;
      setCompareGrossYield(price > 0 ? rent12 / price : 0);
      setCompareNetYield(price > 0 ? (rent12 - expenseAnnual) / price : 0);

      setScreenState("compare");
    } catch (err: any) {
      Alert.alert("エラー", err.message || "銀行比較に失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectBank(bankItem: BankComparisonItem) {
    if (!bankItem.is_eligible) return;

    setLoading(true);
    setSelectedBankName(bankItem.bank_name);
    try {
      // We need to find the bank_id. We'll fetch banks list and match by name.
      const banks = await api.getBanks();
      const bankName = bankItem.bank_name;
      const matchedBank =
        banks.find((b) => b.display_name === bankName) ||
        banks.find((b) => b.name === bankName) ||
        banks.find((b) => (b.display_name || b.name).includes(bankName)) ||
        banks.find((b) => bankName.includes(b.display_name || b.name));

      if (!matchedBank) {
        Alert.alert("エラー", `「${bankName}」の銀行情報が見つかりませんでした`);
        setLoading(false);
        return;
      }

      const simReq: SimulationRequest = {
        property_price: parseFloat(propertyPrice),
        monthly_rent: parseFloat(monthlyRent),
        management_fee: parseFloat(managementFee),
        repair_reserve: parseFloat(repairReserve),
        other_expenses: parseFloat(otherMonthlyExpenses) || 0,
        rental_management_fee: 0,
        built_year: parseInt(builtYear, 10),
        structure,
        exclusive_area: parseFloat(exclusiveArea),
        total_units: parseInt(totalUnits, 10),
        bank_id: matchedBank.id,
        down_payment: bankItem.down_payment,
        buyer_age: parseInt(buyerAge, 10),
        annual_income: parseFloat(annualIncome),
        simulation_years: 10,
      };
      if (propertyTax) simReq.property_tax = parseInt(propertyTax, 10);
      if (fireInsurance) simReq.fire_insurance = parseInt(fireInsurance, 10);
      if (acquisitionTax) simReq.acquisition_tax = parseInt(acquisitionTax, 10);

      const result = await api.calculateSimulation(simReq);

      setSimulationResult(result);
      setScreenState("detail");
    } catch (err: any) {
      Alert.alert("エラー", err.message || "シミュレーションに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSimulation() {
    if (!simulationResult) return;
    const r = simulationResult;
    const price = parseFloat(propertyPrice);
    const rent = parseFloat(monthlyRent);

    const annualCf = r.yearly_plans.length > 1
      ? r.yearly_plans[1].annual_balance
      : r.yearly_plans[0]?.annual_balance ?? 0;
    const monthlyCf = Math.round(annualCf / 12);

    const label = `${selectedBankName} @ ${formatManYen(price)}`;

    const body: SavedSimulationCreate = {
      property_id: params.property_id ? parseInt(params.property_id, 10) : undefined,
      label,
      property_price: price,
      monthly_rent: rent,
      management_fee: parseFloat(managementFee) || 0,
      repair_reserve: parseFloat(repairReserve) || 0,
      built_year: parseInt(builtYear, 10) || undefined,
      structure: structure || undefined,
      bank_name: selectedBankName,
      interest_rate: r.interest_rate,
      loan_years: r.loan_years,
      down_payment: r.down_payment,
      loan_amount: r.loan_amount,
      buyer_age: parseInt(buyerAge, 10) || undefined,
      monthly_payment: r.monthly_payment,
      monthly_cf: monthlyCf,
      annual_cf: annualCf,
      gross_yield: r.gross_yield,
      net_yield: r.net_yield,
      roi: r.roi,
      total_payment: r.total_payment,
      total_interest: r.total_interest,
      initial_costs: r.initial_costs.total,
      payback_years: r.payback_years ?? undefined,
      result_json: r,
    };

    try {
      await api.saveSimulation(body);
      Alert.alert("保存完了", "シミュレーション結果を保存しました");
    } catch (err: any) {
      Alert.alert("エラー", err.message || "保存に失敗しました");
    }
  }

  // ---------- Render: Input Form ----------

  function renderInputForm() {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Property Info Section */}
        <Text style={styles.sectionHeader}>物件情報</Text>
        <View style={styles.card}>
          <InputRow
            label="物件価格（円）"
            value={propertyPrice}
            onChange={setPropertyPrice}
            keyboardType="numeric"
          />
          <InputRow
            label="月額賃料（円）"
            value={monthlyRent}
            onChange={setMonthlyRent}
            keyboardType="numeric"
          />
          <InputRow
            label="管理費（円/月）"
            value={managementFee}
            onChange={setManagementFee}
            keyboardType="numeric"
          />
          <InputRow
            label="修繕積立金（円/月）"
            value={repairReserve}
            onChange={setRepairReserve}
            keyboardType="numeric"
          />
          <InputRow
            label="その他月額費用（円/月）"
            value={otherMonthlyExpenses}
            onChange={setOtherMonthlyExpenses}
            keyboardType="numeric"
          />
          <InputRow
            label="築年（西暦）"
            value={builtYear}
            onChange={setBuiltYear}
            keyboardType="numeric"
          />

          {/* Structure Picker */}
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>構造</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setStructurePickerOpen(!structurePickerOpen)}
            >
              <Text style={styles.pickerButtonText}>
                {STRUCTURE_OPTIONS.find((o) => o.value === structure)?.label ||
                  structure}
              </Text>
              <FontAwesome
                name={structurePickerOpen ? "caret-up" : "caret-down"}
                size={14}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
          {structurePickerOpen && (
            <View style={styles.pickerDropdown}>
              {STRUCTURE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.pickerOption,
                    structure === opt.value && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setStructure(opt.value);
                    setStructurePickerOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      structure === opt.value && styles.pickerOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <InputRow
            label="専有面積（㎡）"
            value={exclusiveArea}
            onChange={setExclusiveArea}
            keyboardType="numeric"
          />
          <InputRow
            label="総戸数"
            value={totalUnits}
            onChange={setTotalUnits}
            keyboardType="numeric"
          />
        </View>

        {/* Customer Info Section */}
        <Text style={styles.sectionHeader}>投資家情報</Text>
        <View style={styles.card}>
          <InputRow
            label="年齢"
            value={buyerAge}
            onChange={setBuyerAge}
            keyboardType="numeric"
          />
          <InputRow
            label="年収（円）"
            value={annualIncome}
            onChange={setAnnualIncome}
            keyboardType="numeric"
          />
          <InputRow
            label="残債総額（万円）"
            value={outstandingDebt}
            onChange={setOutstandingDebt}
            keyboardType="numeric"
          />
          <InputRow
            label="扶養家族（人）"
            value={numDependents}
            onChange={setNumDependents}
            keyboardType="numeric"
          />
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>上場企業勤務</Text>
            <TouchableOpacity
              style={[styles.pickerButton, isListedCompany && styles.listedActive]}
              onPress={() => setIsListedCompany(!isListedCompany)}
            >
              <Text style={[styles.pickerButtonText, isListedCompany && styles.listedActiveText]}>
                {isListedCompany ? "はい" : "いいえ"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.profileNote}>
            設定画面で保存したプロフィールが自動入力されます
          </Text>
        </View>

        {/* Costs Section (collapsible) */}
        <TouchableOpacity
          style={styles.costsToggle}
          onPress={() => setCostsExpanded(!costsExpanded)}
        >
          <Text style={[styles.sectionHeader, { marginTop: 0, marginBottom: 0 }]}>諸費用</Text>
          <FontAwesome
            name={costsExpanded ? "caret-up" : "caret-down"}
            size={16}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
        {costsExpanded && (
          <View style={styles.card}>
            <InputRow
              label="固定資産税（年額・円）"
              value={propertyTax}
              onChange={setPropertyTax}
              keyboardType="numeric"
            />
            <InputRow
              label="火災保険（円）※空欄で自動計算"
              value={fireInsurance}
              onChange={setFireInsurance}
              keyboardType="numeric"
            />
            <InputRow
              label="不動産取得税（円）※空欄で自動計算"
              value={acquisitionTax}
              onChange={setAcquisitionTax}
              keyboardType="numeric"
            />
          </View>
        )}

        {/* Compare Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleCompare}
          activeOpacity={0.7}
        >
          <FontAwesome
            name="calculator"
            size={16}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.primaryButtonText}>銀行を比較する</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ---------- Render: Compare Results ----------

  function renderCompareResults() {
    const eligibleBanks = compareResults.filter((b) => b.is_eligible);
    const ineligibleBanks = compareResults.filter((b) => !b.is_eligible);
    const sortedResults = [...eligibleBanks, ...ineligibleBanks];

    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.compareHeader}>
          <View style={styles.yieldRow}>
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>表面利回り</Text>
              <Text style={styles.yieldValue}>
                {formatPercent(compareGrossYield)}
              </Text>
            </View>
            <View style={styles.yieldDivider} />
            <View style={styles.yieldItem}>
              <Text style={styles.yieldLabel}>実質利回り</Text>
              <Text style={styles.yieldValue}>
                {formatPercent(compareNetYield)}
              </Text>
            </View>
          </View>
          <Text style={styles.compareSubtext}>
            {eligibleBanks.length}行が融資可能 / 全{compareResults.length}行
          </Text>
        </View>

        {/* 免責注意書き */}
        <View style={styles.disclaimerBox}>
          <FontAwesome name="info-circle" size={13} color={theme.textMuted} />
          <Text style={styles.disclaimerText}>
            金融機関名はカテゴリ別の仮名で表示しています。
            この結果は一般的な融資基準に基づく参考情報であり、実際の審査結果を保証するものではありません。
            詳細は各金融機関にお問い合わせください。
          </Text>
        </View>

        {/* Bank List */}
        <FlatList
          data={sortedResults}
          keyExtractor={(item, index) => `${item.bank_name}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => renderBankCard(item)}
          ListFooterComponent={<View style={{ height: 20 }} />}
        />

        {/* Back Button */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setScreenState("input")}
          >
            <FontAwesome
              name="arrow-left"
              size={14}
              color={theme.text}
              style={{ marginRight: 8 }}
            />
            <Text style={styles.secondaryButtonText}>条件を変更する</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderBankCard(item: BankComparisonItem) {
    const isEligible = item.is_eligible;
    const monthlyCf = Math.round(item.annual_balance / 12);
    const cfColor = monthlyCf >= 0 ? theme.accent : "#EF4444";

    return (
      <TouchableOpacity
        style={[styles.bankCard, !isEligible && styles.bankCardIneligible]}
        activeOpacity={isEligible ? 0.7 : 1}
        onPress={() => isEligible && handleSelectBank(item)}
        disabled={!isEligible}
      >
        {/* Bank Name Row */}
        <View style={styles.bankCardHeader}>
          <Text
            style={[
              styles.bankName,
              !isEligible && styles.bankNameIneligible,
            ]}
            numberOfLines={1}
          >
            {item.bank_name}
          </Text>
          {isEligible ? (
            <View style={styles.eligibleBadge}>
              <Text style={styles.eligibleBadgeText}>融資可能</Text>
            </View>
          ) : (
            <View style={styles.ineligibleBadge}>
              <Text style={styles.ineligibleBadgeText}>不可</Text>
            </View>
          )}
        </View>

        {isEligible ? (
          <>
            {/* Monthly Cashflow */}
            <Text style={[styles.cashflowAmount, { color: cfColor }]}>
              {formatYen(monthlyCf)}
              <Text style={styles.cashflowUnit}>/月</Text>
            </Text>

            {/* Details Grid */}
            <View style={styles.bankDetailGrid}>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>金利</Text>
                <Text style={styles.bankDetailValue}>
                  {formatPercent(item.interest_rate)}
                </Text>
              </View>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>融資期間</Text>
                <Text style={styles.bankDetailValue}>
                  {item.loan_years}年
                </Text>
              </View>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>月額返済</Text>
                <Text style={styles.bankDetailValue}>
                  {formatYen(item.monthly_payment)}
                </Text>
              </View>
              <View style={styles.bankDetailItem}>
                <Text style={styles.bankDetailLabel}>事務手数料</Text>
                <Text style={styles.bankDetailValue}>
                  {formatYen(item.admin_fee)}
                </Text>
              </View>
            </View>

            {/* Tap hint */}
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>
                タップして詳細シミュレーション
              </Text>
              <FontAwesome
                name="chevron-right"
                size={10}
                color={theme.textMuted}
              />
            </View>
          </>
        ) : (
          <Text style={styles.ineligibleReason}>
            {item.ineligible_reason || "融資条件を満たしていません"}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // ---------- Render: Detail Result ----------

  function renderDetailResult() {
    if (!simulationResult) return null;
    const r = simulationResult;

    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bank Name Header */}
        <View style={styles.detailHeader}>
          <FontAwesome name="bank" size={16} color={theme.accent} />
          <Text style={styles.detailHeaderText}>{selectedBankName}</Text>
        </View>

        {/* Summary Card */}
        <Text style={styles.sectionHeader}>サマリー</Text>
        <View style={styles.card}>
          <View style={styles.summaryGrid}>
            <SummaryItem
              label="表面利回り"
              value={`${r.gross_yield.toFixed(2)}%`}
              accent
            />
            <SummaryItem
              label="実質利回り"
              value={`${r.net_yield.toFixed(2)}%`}
              accent
            />
            {(() => {
              const annualCf = r.yearly_plans.length > 1
                ? r.yearly_plans[1].annual_balance
                : r.yearly_plans[0]?.annual_balance ?? 0;
              const monthlyCf = Math.round(annualCf / 12);
              return (
                <>
                  <SummaryItem
                    label="月間CF"
                    value={formatYen(monthlyCf)}
                    positive={monthlyCf >= 0}
                    negative={monthlyCf < 0}
                  />
                  <SummaryItem
                    label="年間CF"
                    value={formatYen(annualCf)}
                    positive={annualCf >= 0}
                    negative={annualCf < 0}
                  />
                </>
              );
            })()}
          </View>
        </View>

        {/* Loan Info */}
        <Text style={styles.sectionHeader}>ローン情報</Text>
        <View style={styles.card}>
          <DetailRow label="借入額" value={formatYen(r.loan_amount)} />
          <DetailRow label="融資期間" value={`${r.loan_years}年`} />
          <DetailRow label="金利" value={formatPercent(r.interest_rate)} />
          <DetailRow label="月額返済" value={formatYen(r.monthly_payment)} />
          <DetailRow label="総返済額" value={formatYen(r.total_payment)} />
          <DetailRow
            label="総利息"
            value={formatYen(r.total_interest)}
            last
          />
        </View>

        {/* Initial Costs */}
        <Text style={styles.sectionHeader}>購入時費用</Text>
        <View style={styles.card}>
          <DetailRow
            label="頭金"
            value={formatYen(r.down_payment)}
          />
          <DetailRow
            label="仲介手数料"
            value={formatYen(r.initial_costs.brokerage_fee)}
          />
          <DetailRow
            label="事務手数料"
            value={formatYen(r.initial_costs.admin_fee)}
          />
          <DetailRow
            label="印紙税"
            value={formatYen(r.initial_costs.stamp_duty_total)}
          />
          <DetailRow
            label="登記費用"
            value={formatYen(r.initial_costs.registration_fee)}
          />
          <DetailRow
            label="火災保険"
            value={formatYen(r.initial_costs.fire_insurance)}
          />
          <DetailRow
            label="不動産取得税"
            value={formatYen(r.initial_costs.acquisition_tax)}
          />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>合計</Text>
            <Text style={styles.totalValue}>
              {formatYen(r.initial_costs.total)}
            </Text>
          </View>
        </View>

        {/* 10-Year Plan Table */}
        <Text style={styles.sectionHeader}>10年間収支計画</Text>
        <View style={styles.card}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
          >
            <View>
              {/* Table Header */}
              <View style={styles.tableHeaderRow}>
                <View style={styles.tableLabelCell}>
                  <Text style={styles.tableHeaderText}>項目</Text>
                </View>
                {r.yearly_plans.slice(0, 10).map((yp) => (
                  <View key={yp.year} style={styles.tableValueCell}>
                    <Text style={styles.tableHeaderText}>{yp.year}年目</Text>
                  </View>
                ))}
              </View>

              {/* Table Rows */}
              {[
                {
                  label: "収入",
                  key: "annual_rent" as const,
                },
                {
                  label: "管理費",
                  key: "management_fee" as const,
                },
                {
                  label: "修繕積立金",
                  key: "repair_reserve" as const,
                },
                {
                  label: "ローン返済",
                  key: "loan_payment" as const,
                },
                {
                  label: "固定資産税",
                  key: "property_tax" as const,
                },
                {
                  label: "その他",
                  key: "other_expenses" as const,
                },
                {
                  label: "購入時費用",
                  key: "initial_costs" as const,
                },
                {
                  label: "合計支出",
                  key: "total_expenses" as const,
                },
                {
                  label: "年間収支",
                  key: "annual_balance" as const,
                },
                {
                  label: "通算収支",
                  key: "cumulative_balance" as const,
                },
              ].map((row, rowIndex) => (
                <View
                  key={row.key}
                  style={[
                    styles.tableRow,
                    rowIndex % 2 === 0 && styles.tableRowAlt,
                  ]}
                >
                  <View style={styles.tableLabelCell}>
                    <Text style={styles.tableLabelText}>{row.label}</Text>
                  </View>
                  {r.yearly_plans.slice(0, 10).map((yp) => {
                    const val = yp[row.key];
                    const isBalance =
                      row.key === "annual_balance" ||
                      row.key === "cumulative_balance";
                    return (
                      <View key={yp.year} style={styles.tableValueCell}>
                        <Text
                          style={[
                            styles.tableValueText,
                            isBalance && val >= 0 && styles.textPositive,
                            isBalance && val < 0 && styles.textNegative,
                          ]}
                        >
                          {formatManYen(val)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Breakeven Prices */}
        <Text style={styles.sectionHeader}>損しない売却価格</Text>
        <View style={styles.card}>
          {r.breakeven_prices.map((bp, i) => {
            const profitColor =
              bp.profit_at_purchase_price >= 0 ? theme.success : "#EF4444";
            return (
              <View
                key={bp.year}
                style={[
                  styles.breakevenRow,
                  i < r.breakeven_prices.length - 1 &&
                    styles.breakevenRowBorder,
                ]}
              >
                <View style={styles.breakevenYearCol}>
                  <Text style={styles.breakevenYear}>{bp.year}年目</Text>
                </View>
                <View style={styles.breakevenDataCol}>
                  <Text style={styles.breakevenLabel}>損益分岐価格</Text>
                  <Text style={styles.breakevenPrice}>
                    {formatYen(bp.breakeven_price)}
                  </Text>
                </View>
                <View style={styles.breakevenDataCol}>
                  <Text style={styles.breakevenLabel}>購入価格での損益</Text>
                  <Text style={[styles.breakevenProfit, { color: profitColor }]}>
                    {formatYen(bp.profit_at_purchase_price)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Tax Saving */}
        <Text style={styles.sectionHeader}>節税効果</Text>
        <View style={styles.card}>
          <View style={styles.taxGrid}>
            <View style={styles.taxColumn}>
              <Text style={styles.taxColumnTitle}>初年度</Text>
              <DetailRow
                label="不動産所得"
                value={formatManYen(r.tax_saving_first_year.real_estate_income)}
              />
              <DetailRow
                label="購入前の税額"
                value={`${r.tax_saving_first_year.tax_before_manyen.toFixed(1)}万円`}
              />
              <DetailRow
                label="購入後の税額"
                value={`${r.tax_saving_first_year.tax_after_manyen.toFixed(1)}万円`}
              />
              <View style={styles.taxSavingHighlight}>
                <Text style={styles.taxSavingLabel}>節税額</Text>
                <Text style={styles.taxSavingValue}>
                  {formatYen(r.tax_saving_first_year.tax_saving_yen)}
                </Text>
              </View>
            </View>

            <View style={styles.taxDivider} />

            <View style={styles.taxColumn}>
              <Text style={styles.taxColumnTitle}>2年目以降</Text>
              <DetailRow
                label="不動産所得"
                value={formatManYen(r.tax_saving_ongoing.real_estate_income)}
              />
              <DetailRow
                label="購入前の税額"
                value={`${r.tax_saving_ongoing.tax_before_manyen.toFixed(1)}万円`}
              />
              <DetailRow
                label="購入後の税額"
                value={`${r.tax_saving_ongoing.tax_after_manyen.toFixed(1)}万円`}
              />
              <View style={styles.taxSavingHighlight}>
                <Text style={styles.taxSavingLabel}>節税額</Text>
                <Text style={styles.taxSavingValue}>
                  {formatYen(r.tax_saving_ongoing.tax_saving_yen)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSaveSimulation}
        >
          <FontAwesome
            name="floppy-o"
            size={14}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.primaryButtonText}>この結果を保存</Text>
        </TouchableOpacity>

        {/* Back Button */}
        <TouchableOpacity
          style={[styles.secondaryButton, { marginTop: 8 }]}
          onPress={() => {
            setSimulationResult(null);
            setScreenState("compare");
          }}
        >
          <FontAwesome
            name="arrow-left"
            size={14}
            color={theme.text}
            style={{ marginRight: 8 }}
          />
          <Text style={styles.secondaryButtonText}>銀行比較に戻る</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    );
  }

  // ---------- Main Render ----------

  const { user } = useAuth();

  if (user && user.plan === "free") {
    return (
      <View style={styles.gateContainer}>
        <FontAwesome name="lock" size={48} color={theme.accent} />
        <Text style={styles.gateTitle}>Proプラン限定機能</Text>
        <Text style={styles.gateDesc}>
          収益シミュレーションはProプランでご利用いただけます。{"\n"}
          16行の銀行融資審査・キャッシュフロー計算・節税効果を確認できます。
        </Text>
        <TouchableOpacity
          style={styles.gateButton}
          onPress={() => router.push("/(tabs)/settings")}
        >
          <Text style={styles.gateButtonText}>Proにアップグレード（¥1,480/月）</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={styles.loadingText}>計算中...</Text>
      </View>
    );
  }

  // Pro限定機能チェック
  if (!isPro) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: "center", alignItems: "center", padding: 32 }}>
        <FontAwesome name="lock" size={48} color={theme.textMuted} />
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "bold", marginTop: 16, marginBottom: 8 }}>Pro限定機能</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 22 }}>
          収益シミュレーションはProプランで{"\n"}利用できます。{"\n"}16行の銀行融資条件で一括比較。
        </Text>
        <TouchableOpacity
          style={{ backgroundColor: theme.accent, borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 }}
          onPress={() => router.push("/paywall" as any)}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "bold" }}>Proプランを見る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {screenState === "input" && renderInputForm()}
      {screenState === "compare" && renderCompareResults()}
      {screenState === "detail" && renderDetailResult()}
    </KeyboardAvoidingView>
  );
}

// ---------- Sub-Components ----------

function InputRow({
  label,
  value,
  onChange,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  keyboardType?: "default" | "numeric" | "email-address";
}) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholderTextColor={theme.textMuted}
        selectionColor={theme.accent}
      />
    </View>
  );
}

function SummaryItem({
  label,
  value,
  accent,
  positive,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  let valueColor = theme.text;
  if (accent) valueColor = theme.accent;
  if (positive) valueColor = theme.success;
  if (negative) valueColor = "#EF4444";

  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  gateContainer: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  gateTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: theme.text,
    marginTop: 8,
  },
  gateDesc: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  gateButton: {
    backgroundColor: theme.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  gateButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },

  // Section Headers
  costsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
    marginBottom: 10,
    marginTop: 20,
  },

  // Cards
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },

  // Input Form
  inputRow: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    color: theme.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: theme.text,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pickerButtonText: {
    fontSize: 15,
    color: theme.text,
  },
  pickerDropdown: {
    backgroundColor: theme.bgInput,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: -8,
    marginBottom: 14,
    overflow: "hidden",
  },
  pickerOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  pickerOptionActive: {
    backgroundColor: "rgba(232, 68, 58, 0.1)",
  },
  pickerOptionText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  pickerOptionTextActive: {
    color: theme.accent,
    fontWeight: "bold",
  },

  // Buttons
  primaryButton: {
    flexDirection: "row",
    backgroundColor: theme.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    flexDirection: "row",
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 16,
  },
  secondaryButtonText: {
    color: theme.text,
    fontSize: 15,
  },

  // Compare Header
  compareHeader: {
    backgroundColor: theme.bgCard,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  yieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  yieldItem: {
    alignItems: "center",
    flex: 1,
  },
  yieldDivider: {
    width: 1,
    height: 36,
    backgroundColor: theme.border,
    marginHorizontal: 16,
  },
  yieldLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  yieldValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: theme.accent,
  },
  compareSubtext: {
    textAlign: "center",
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },

  // Bank Card
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  bankCard: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.border,
  },
  bankCardIneligible: {
    opacity: 0.5,
  },
  bankCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bankName: {
    fontSize: 15,
    fontWeight: "bold",
    color: theme.text,
    flex: 1,
    marginRight: 8,
  },
  bankNameIneligible: {
    color: theme.textMuted,
  },
  eligibleBadge: {
    backgroundColor: "rgba(76, 175, 80, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  eligibleBadgeText: {
    fontSize: 11,
    color: theme.success,
    fontWeight: "bold",
  },
  ineligibleBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ineligibleBadgeText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "bold",
  },
  cashflowAmount: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  cashflowUnit: {
    fontSize: 14,
    fontWeight: "normal",
  },
  bankDetailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  bankDetailItem: {
    width: "48%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  bankDetailLabel: {
    fontSize: 12,
    color: theme.textMuted,
  },
  bankDetailValue: {
    fontSize: 12,
    color: theme.text,
    fontWeight: "500",
  },
  ineligibleReason: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 4,
  },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  tapHintText: {
    fontSize: 11,
    color: theme.textMuted,
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.bg,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },

  // Detail Header
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.bgCard,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  detailHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: theme.text,
  },

  // Summary Grid
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryItem: {
    width: "50%",
    paddingVertical: 10,
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "bold",
  },

  // Detail Rows
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  detailRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    color: theme.text,
    fontWeight: "500",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: theme.border,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.accent,
  },

  // Table
  tableScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 0,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderBottomColor: theme.border,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  tableRowAlt: {
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  tableLabelCell: {
    width: 90,
    padding: 8,
    justifyContent: "center",
  },
  tableValueCell: {
    width: 90,
    padding: 8,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "bold",
    color: theme.text,
  },
  tableLabelText: {
    fontSize: 11,
    color: theme.textSecondary,
  },
  tableValueText: {
    fontSize: 11,
    color: theme.text,
  },
  textPositive: {
    color: theme.success,
    fontWeight: "bold",
  },
  textNegative: {
    color: "#EF4444",
    fontWeight: "bold",
  },

  // Breakeven
  breakevenRow: {
    flexDirection: "row",
    paddingVertical: 12,
    alignItems: "center",
  },
  breakevenRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  breakevenYearCol: {
    width: 60,
  },
  breakevenYear: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.text,
  },
  breakevenDataCol: {
    flex: 1,
    paddingHorizontal: 8,
  },
  breakevenLabel: {
    fontSize: 10,
    color: theme.textMuted,
    marginBottom: 2,
  },
  breakevenPrice: {
    fontSize: 13,
    color: theme.text,
    fontWeight: "500",
  },
  breakevenProfit: {
    fontSize: 13,
    fontWeight: "bold",
  },

  // Tax Saving
  taxGrid: {
    flexDirection: "row",
  },
  taxColumn: {
    flex: 1,
  },
  taxColumnTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: theme.accent,
    marginBottom: 10,
    textAlign: "center",
  },
  taxDivider: {
    width: 1,
    backgroundColor: theme.border,
    marginHorizontal: 12,
  },
  taxSavingHighlight: {
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    alignItems: "center",
  },
  taxSavingLabel: {
    fontSize: 11,
    color: theme.success,
    marginBottom: 4,
  },
  taxSavingValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: theme.success,
  },
  // Profile & Disclaimer
  profileNote: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 4,
  },
  listedActive: {
    backgroundColor: "rgba(232, 68, 58, 0.1)",
    borderColor: theme.accent,
  },
  listedActiveText: {
    color: theme.accent,
    fontWeight: "bold",
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: theme.textMuted,
    lineHeight: 16,
  },
});
