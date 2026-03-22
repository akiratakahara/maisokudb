import Link from "next/link";

const features = [
  {
    icon: "📄",
    title: "AI自動読み取り",
    description:
      "マイソクPDF・画像をアップロードするだけで、物件名・価格・利回り・面積などをAIが自動抽出。手入力の手間を大幅削減。",
  },
  {
    icon: "🏢",
    title: "物件データベース",
    description:
      "登録した物件を一覧管理。価格・利回り・面積・間取りなどで検索・フィルタ・ソート。投資ステータスも管理可能。",
  },
  {
    icon: "📊",
    title: "収益シミュレーション",
    description:
      "銀行16行の融資条件を内蔵。ローン返済・キャッシュフロー・税引後利回りを瞬時に計算。複数条件の比較も簡単。",
  },
  {
    icon: "🔀",
    title: "物件比較",
    description:
      "気になる物件を並べて比較。散布図やレーダーチャートで可視化し、投資判断をサポート。",
  },
  {
    icon: "📈",
    title: "出口予測",
    description:
      "公示地価トレンド・人口推計・建物減価から、5〜30年後の売却価格を複数シナリオで予測。",
  },
  {
    icon: "🔒",
    title: "安全なデータ管理",
    description:
      "クラウド上に安全に保存。いつでもどこでもアクセス可能。あなた専用のデータベースとして活用できます。",
  },
];

const publicDataSources = [
  {
    code: "L02-25",
    name: "都道府県地価調査",
    source: "国土交通省",
    description: "全国の基準地価格データ。物件周辺の地価トレンド分析・出口予測に活用",
    volume: "約26,000地点",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    code: "A16-20",
    name: "人口集中地区（DID）",
    source: "総務省 国勢調査",
    description: "人口集中地区の境界・人口密度データ。物件の立地評価に活用",
    volume: "全国メッシュ",
    color: "from-blue-500 to-blue-600",
  },
  {
    code: "N02-20",
    name: "鉄道駅・路線データ",
    source: "国土数値情報",
    description: "全国5,000超の駅位置・路線・乗降客数。アクセス評価に活用",
    volume: "5,000+駅",
    color: "from-violet-500 to-violet-600",
  },
  {
    code: "S12-24",
    name: "駅別乗降客数",
    source: "国土数値情報",
    description: "駅ごとの1日あたり乗降客数。賃貸需要・空室リスクの推定に活用",
    volume: "全国対応",
    color: "from-orange-500 to-orange-600",
  },
  {
    code: "IPSS",
    name: "将来人口推計",
    source: "国立社会保障・人口問題研究所",
    description: "市区町村別の2020→2050年人口予測。長期的な賃貸需要・資産価値の見通しに活用",
    volume: "2050年まで",
    color: "from-rose-500 to-rose-600",
  },
  {
    code: "減価償却",
    name: "法定耐用年数・償却率",
    source: "国税庁",
    description: "構造別の耐用年数・減価償却率テーブル。建物残存価値の計算に活用",
    volume: "全構造対応",
    color: "from-cyan-500 to-cyan-600",
  },
];

const steps = [
  {
    step: "01",
    title: "マイソクを撮影・アップロード",
    description: "物件資料（PDF・画像）をアプリに読み込むだけ。",
  },
  {
    step: "02",
    title: "AIが物件情報を自動抽出",
    description: "価格・利回り・面積・構造など、主要データを瞬時に解析。",
  },
  {
    step: "03",
    title: "公的データと自動連携",
    description:
      "物件の位置情報から、周辺地価・DID・最寄駅・人口推計を自動取得。",
  },
  {
    step: "04",
    title: "シミュレーション・比較で判断",
    description:
      "収益計算、物件比較、出口予測。データに基づいた投資判断を。",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0f172a]/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold gradient-text">MaisokuDB</span>
          </div>
          <nav className="hidden sm:flex items-center gap-8 text-sm text-slate-400">
            <a href="#data" className="hover:text-white transition-colors">
              データ
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              機能
            </a>
            <a href="#screens" className="hover:text-white transition-colors">
              画面
            </a>
            <Link href="/privacy" className="hover:text-white transition-colors">
              プライバシー
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              利用規約
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-8 text-sm text-blue-400">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            国土数値情報・公示地価・人口推計データ連携
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 leading-tight">
            不動産投資の分析を
            <br />
            <span className="gradient-text">公的データで裏付ける</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            マイソクをAIで自動読み取り。地価公示・DID・人口推計・駅乗降客数など
            <strong className="text-slate-200">6種類の公的データ</strong>
            を自動連携し、データドリブンな投資判断をポケットに。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="inline-flex items-center justify-center gap-2 bg-white text-black font-semibold px-8 py-4 rounded-xl hover:bg-slate-200 transition-colors text-lg"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              App Store で入手
            </a>
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600/20 to-cyan-600/20 rounded-3xl p-8 sm:p-12 border border-slate-700/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  6種類
                </div>
                <div className="text-slate-400 text-sm">公的データ連携</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  26,000+
                </div>
                <div className="text-slate-400 text-sm">地価調査地点</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  5,000+
                </div>
                <div className="text-slate-400 text-sm">鉄道駅データ</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl font-bold gradient-text mb-1">
                  2050年
                </div>
                <div className="text-slate-400 text-sm">まで人口推計</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Data Section */}
      <section id="data" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4">
            <span className="text-sm font-mono text-blue-400 tracking-wider uppercase">
              Government Open Data
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            6種類の公的データを自動連携
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-2xl mx-auto">
            国土交通省・総務省・国税庁などの公的オープンデータを大量に取り込み、
            物件の位置情報から自動でマッチング。個人では収集困難なデータを瞬時に活用。
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {publicDataSources.map((d) => (
              <div
                key={d.code}
                className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/40 transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${d.color} text-white text-xs font-bold font-mono`}
                  >
                    {d.code.length > 4 ? d.code.slice(0, 4) : d.code}
                  </span>
                  <div>
                    <div className="font-semibold text-white text-sm">
                      {d.name}
                    </div>
                    <div className="text-xs text-slate-500">{d.source}</div>
                  </div>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                  {d.description}
                </p>
                <div className="text-xs font-mono text-slate-500 bg-slate-900/50 rounded-lg px-3 py-1.5 inline-block">
                  {d.volume}
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-slate-500 text-sm mt-10">
            データ出典：国土数値情報（国土交通省）、国勢調査（総務省）、将来推計人口（国立社会保障・人口問題研究所）、法定耐用年数（国税庁）
          </p>
        </div>
      </section>

      {/* Analysis Screens */}
      <section id="screens" className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            データが導く投資判断
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">
            公的データを統合した分析画面で、感覚ではなくエビデンスに基づいた判断を
          </p>

          {/* Screen 1: Property Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20 items-center">
            <div>
              <span className="text-sm font-mono text-emerald-400 mb-2 block">
                ANALYSIS
              </span>
              <h3 className="text-2xl font-bold mb-4">
                物件分析 × 公的データ
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                物件を登録すると、位置情報から自動で周辺の地価公示データ・DID（人口集中地区）情報・最寄駅の乗降客数を取得。
                物件単体の情報だけでなく、エリアのマクロデータと組み合わせた多角的な分析が可能です。
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-300">
                    周辺地価の5年・10年トレンドを自動算出
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-300">
                    DID内/外の判定で人口密度・世帯数を表示
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-300">
                    最寄駅の1日乗降客数から賃貸需要を推定
                  </span>
                </li>
              </ul>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 font-mono text-sm">
              <div className="text-slate-500 text-xs mb-4">
                ■ 公的データ分析結果
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="text-emerald-400 text-xs mb-2">
                    📍 地価公示データ（L02-25）
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">周辺基準地価</span>
                      <div className="text-white text-lg">
                        ¥385,000
                        <span className="text-slate-500 text-xs">/㎡</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-500">5年トレンド</span>
                      <div className="text-emerald-400 text-lg">+2.3%/年</div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="text-blue-400 text-xs mb-2">
                    🏘 DID（人口集中地区）（A16-20）
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">DID判定</span>
                      <div className="text-blue-400 text-lg">DID内 ✓</div>
                    </div>
                    <div>
                      <span className="text-slate-500">人口密度</span>
                      <div className="text-white text-lg">
                        8,420
                        <span className="text-slate-500 text-xs">人/k㎡</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="text-violet-400 text-xs mb-2">
                    🚃 最寄駅データ（N02-20 / S12-24）
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500">最寄駅</span>
                      <div className="text-white text-lg">武蔵小杉</div>
                    </div>
                    <div>
                      <span className="text-slate-500">1日乗降客数</span>
                      <div className="text-violet-400 text-lg">142,350人</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Screen 2: Exit Prediction */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 font-mono text-sm">
              <div className="text-slate-500 text-xs mb-4">
                ■ 出口予測シミュレーション
              </div>
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="text-rose-400 text-xs mb-3">
                    📈 人口推計（IPSS 2020→2050）
                  </div>
                  <div className="flex items-end gap-1 h-16 mb-2">
                    {[100, 98, 96, 93, 89, 84, 78].map((v, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className={`w-full rounded-sm ${v >= 95 ? "bg-emerald-500" : v >= 85 ? "bg-yellow-500" : "bg-rose-500"}`}
                          style={{ height: `${v * 0.6}%` }}
                        />
                        <span className="text-[9px] text-slate-600">
                          {2020 + i * 5}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">川崎市中原区</span>
                    <span className="text-yellow-400">2050年: -22%</span>
                  </div>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-4">
                  <div className="text-orange-400 text-xs mb-3">
                    🏠 売却価格予測（3シナリオ）
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">楽観シナリオ</span>
                      <span className="text-emerald-400 text-base">
                        3,850万円
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: "85%" }} />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">基本シナリオ</span>
                      <span className="text-blue-400 text-base">
                        3,200万円
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: "70%" }} />
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">悲観シナリオ</span>
                      <span className="text-rose-400 text-base">
                        2,550万円
                      </span>
                    </div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5">
                      <div className="bg-rose-500 h-1.5 rounded-full" style={{ width: "55%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-sm font-mono text-rose-400 mb-2 block">
                EXIT PREDICTION
              </span>
              <h3 className="text-2xl font-bold mb-4">
                人口推計 × 出口予測
              </h3>
              <p className="text-slate-400 leading-relaxed mb-6">
                国立社会保障・人口問題研究所の市区町村別将来人口推計と、公示地価のトレンドデータを組み合わせ、
                5〜30年後の売却価格を3シナリオで予測。長期保有のリスクを定量的に把握できます。
              </p>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-300">
                    人口減少率→賃貸需要変動を自動反映
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-300">
                    土地価格（地価トレンド）+ 建物残存（減価償却）を分離計算
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-slate-300">
                    楽観・基本・悲観の3シナリオで意思決定を支援
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4">
            主な機能
          </h2>
          <p className="text-slate-400 text-center mb-16 max-w-xl mx-auto">
            不動産投資の情報収集から分析・意思決定まで、ワンストップでサポート
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {f.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-center mb-16">
            かんたん4ステップ
          </h2>
          <div className="space-y-10">
            {steps.map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="shrink-0 w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-lg">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {s.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-slate-900/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            不動産投資をデータで制する
          </h2>
          <p className="text-slate-400 mb-10 text-lg">
            6種類の公的データと融合した分析で、感覚ではなくエビデンスに基づいた投資判断を。
          </p>
          <a
            href="#"
            className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-8 py-4 rounded-xl hover:bg-blue-700 transition-colors text-lg"
          >
            無料でダウンロード
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-slate-500 text-sm">
            &copy; {new Date().getFullYear()} MaisokuDB. All rights reserved.
          </div>
          <nav className="flex gap-6 text-sm text-slate-400">
            <Link
              href="/privacy"
              className="hover:text-white transition-colors"
            >
              プライバシーポリシー
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              利用規約
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
