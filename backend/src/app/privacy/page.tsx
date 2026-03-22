import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー - MaisokuDB",
};

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-8">プライバシーポリシー</h1>
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-slate-300 leading-relaxed">
          <p>
            MaisokuDB（以下「本アプリ」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本アプリが収集する情報とその利用方法について説明します。
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              1. 収集する情報
            </h2>
            <p>本アプリでは、以下の情報を収集します。</p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong className="text-white">アカウント情報：</strong>
                メールアドレス、パスワード（暗号化して保存）
              </li>
              <li>
                <strong className="text-white">物件データ：</strong>
                ユーザーが登録した不動産物件の情報（価格、面積、利回り等）
              </li>
              <li>
                <strong className="text-white">アップロードファイル：</strong>
                物件資料（PDF、画像）のデータ
              </li>
              <li>
                <strong className="text-white">利用情報：</strong>
                アプリの利用状況に関する匿名化されたデータ
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              2. 情報の利用目的
            </h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>本アプリのサービス提供・運営</li>
              <li>物件情報のAI自動抽出機能の提供</li>
              <li>収益シミュレーション・物件比較機能の提供</li>
              <li>アプリの品質向上・不具合の修正</li>
              <li>ユーザーサポートへの対応</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              3. 第三者提供
            </h2>
            <p>
              本アプリは、法令に基づく場合を除き、ユーザーの同意なく個人情報を第三者に提供することはありません。ただし、以下の外部サービスを利用しています。
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-3">
              <li>
                <strong className="text-white">Google Gemini API：</strong>
                物件資料のAI解析のため、アップロードされた画像・PDFデータを送信します
              </li>
              <li>
                <strong className="text-white">Cloudinary：</strong>
                画像ファイルの保存のために利用します
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              4. データの保管
            </h2>
            <p>
              ユーザーデータは暗号化された通信（HTTPS）を通じて安全に保管されます。パスワードはハッシュ化して保存し、平文では保存しません。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              5. データの削除
            </h2>
            <p>
              ユーザーはいつでもアカウントの削除を要請できます。アカウント削除時には、関連するすべての個人データを削除します。削除のご要望は、アプリ内の設定画面またはサポート窓口までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              6. Apple標準規約の準拠
            </h2>
            <p>
              本アプリはAppleの標準エンドユーザー使用許諾契約（EULA）に準拠しています。App
              Storeで配信されるアプリとして、Appleのプライバシーガイドラインに従います。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              7. ポリシーの変更
            </h2>
            <p>
              本ポリシーは、必要に応じて改訂されることがあります。重要な変更がある場合は、アプリ内で通知します。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-3">
              8. お問い合わせ
            </h2>
            <p>
              プライバシーに関するお問い合わせは、アプリ内のサポート窓口までご連絡ください。
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
