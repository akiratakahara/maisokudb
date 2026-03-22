import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 - MaisokuDB",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="text-2xl font-bold gradient-text">
            MaisokuDB
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-8">利用規約</h1>
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">
          <p>
            本利用規約（以下「本規約」）は、MaisokuDB（以下「本アプリ」）の利用に関する条件を定めるものです。ユーザーは本アプリを利用することにより、本規約に同意したものとみなされます。
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. サービス内容
            </h2>
            <p>
              本アプリは、不動産投資の情報管理・分析を支援するサービスです。以下の機能を提供します。
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>物件情報の登録・管理</li>
              <li>物件資料（マイソク）のAI自動読み取り</li>
              <li>収益シミュレーション</li>
              <li>物件比較・分析</li>
              <li>出口予測・空室リスクシミュレーション</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. 免責事項
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                本アプリが提供するシミュレーション結果、AI抽出データ、出口予測等は参考情報であり、投資の成果を保証するものではありません。
              </li>
              <li>
                不動産投資に関する最終的な判断は、ユーザー自身の責任において行ってください。
              </li>
              <li>
                AI読み取り機能による抽出結果には誤りが含まれる可能性があります。必ず原本と照合の上でご利用ください。
              </li>
              <li>
                本アプリの利用に起因するいかなる損害についても、運営者は責任を負いません。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. 禁止事項
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>法令または公序良俗に反する行為</li>
              <li>本アプリの運営を妨害する行為</li>
              <li>他のユーザーの個人情報を不正に取得する行為</li>
              <li>リバースエンジニアリング、不正アクセスその他システムへの攻撃</li>
              <li>本アプリを商業的に再配布する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. アカウント
            </h2>
            <p>
              ユーザーは、自身のアカウント情報を適切に管理する責任を負います。アカウントの不正使用による損害について、運営者は責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. サービスの変更・停止
            </h2>
            <p>
              運営者は、事前の通知なくサービスの内容を変更、または一時的もしくは永久に停止することができます。これによりユーザーに生じた損害について、運営者は責任を負いません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Apple標準EULA
            </h2>
            <p>
              本アプリはApp Storeを通じて配信されており、Appleの
              <a
                href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                標準エンドユーザー使用許諾契約（EULA）
              </a>
              が適用されます。本規約とApple標準EULAの間に矛盾がある場合は、Apple標準EULAが優先されます。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. 準拠法・管轄
            </h2>
            <p>
              本規約の解釈および適用は、日本法に準拠します。本アプリに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. 規約の変更
            </h2>
            <p>
              運営者は、必要に応じて本規約を改訂できるものとします。重要な変更がある場合は、アプリ内で通知します。改訂後も本アプリを利用した場合、変更後の規約に同意したものとみなします。
            </p>
          </section>

          <p className="text-slate-500 text-sm mt-12">
            最終更新日：2026年3月10日
          </p>
        </div>
      </main>

      <footer className="border-t border-slate-800 py-8 px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between text-sm text-slate-500">
          <span>&copy; {new Date().getFullYear()} MaisokuDB</span>
          <Link href="/" className="hover:text-white transition-colors">
            トップへ戻る
          </Link>
        </div>
      </footer>
    </div>
  );
}
