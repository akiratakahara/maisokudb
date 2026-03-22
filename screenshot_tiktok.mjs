import puppeteer from "puppeteer";

const WIDTH = 1080;
const HEIGHT = 1920;

const pages = [
  {
    file: "tiktok_1.png",
    label: "ヒーロー",
    html: `
      <div style="width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(160deg,#0f172a 0%,#1a2744 50%,#0f172a 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 60px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#f8fafc;text-align:center;">
        <div style="font-size:28px;font-weight:700;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:40px;letter-spacing:4px;">MaisokuDB</div>
        <div style="font-size:64px;font-weight:800;line-height:1.3;margin-bottom:24px;">不動産投資の分析を<br><span style="background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">公的データで裏付ける</span></div>
        <div style="font-size:28px;color:#94a3b8;line-height:1.7;margin-bottom:60px;">マイソクをAIで自動読み取り<br>6種類の公的データと自動連携</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;width:100%;">
          <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:48px;font-weight:800;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">6種類</div>
            <div style="font-size:20px;color:#94a3b8;margin-top:8px;">公的データ連携</div>
          </div>
          <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:48px;font-weight:800;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">26,000+</div>
            <div style="font-size:20px;color:#94a3b8;margin-top:8px;">地価調査地点</div>
          </div>
          <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:48px;font-weight:800;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">5,000+</div>
            <div style="font-size:20px;color:#94a3b8;margin-top:8px;">鉄道駅データ</div>
          </div>
          <div style="background:rgba(30,41,59,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:48px;font-weight:800;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">2050年</div>
            <div style="font-size:20px;color:#94a3b8;margin-top:8px;">まで人口推計</div>
          </div>
        </div>
      </div>`,
  },
  {
    file: "tiktok_2.png",
    label: "公的データ6種",
    html: `
      <div style="width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(160deg,#0f172a 0%,#1a2744 50%,#0f172a 100%);display:flex;flex-direction:column;padding:80px 50px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#f8fafc;box-sizing:border-box;">
        <div style="text-align:center;margin-bottom:50px;">
          <div style="font-size:18px;color:#3b82f6;letter-spacing:3px;margin-bottom:16px;font-weight:600;">GOVERNMENT OPEN DATA</div>
          <div style="font-size:46px;font-weight:800;line-height:1.3;">6種類の公的データを<br>自動連携</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:18px;flex:1;">
          ${[
            { color: "#10b981", code: "L02", name: "都道府県地価調査", desc: "全国26,000+地点の基準地価格", src: "国土交通省" },
            { color: "#3b82f6", code: "A16", name: "人口集中地区（DID）", desc: "人口密度・世帯数データ", src: "総務省" },
            { color: "#8b5cf6", code: "N02", name: "鉄道駅・路線データ", desc: "全国5,000+駅の位置・路線情報", src: "国土数値情報" },
            { color: "#f97316", code: "S12", name: "駅別乗降客数", desc: "1日あたりの乗降客数", src: "国土数値情報" },
            { color: "#ef4444", code: "IPSS", name: "将来人口推計", desc: "市区町村別 2020→2050年予測", src: "社人研" },
            { color: "#06b6d4", code: "耐用", name: "法定耐用年数・償却率", desc: "構造別の減価償却テーブル", src: "国税庁" },
          ].map((d) => `
            <div style="display:flex;align-items:center;gap:18px;background:rgba(30,41,59,0.7);border:1px solid rgba(51,65,85,0.5);border-radius:16px;padding:22px 24px;">
              <div style="width:52px;height:52px;border-radius:12px;background:${d.color};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;flex-shrink:0;">${d.code}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:22px;font-weight:700;">${d.name}</div>
                <div style="font-size:16px;color:#94a3b8;margin-top:4px;">${d.desc}</div>
              </div>
              <div style="font-size:13px;color:#64748b;flex-shrink:0;text-align:right;">${d.src}</div>
            </div>
          `).join("")}
        </div>
        <div style="text-align:center;margin-top:40px;">
          <div style="font-size:24px;font-weight:700;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">MaisokuDB</div>
        </div>
      </div>`,
  },
  {
    file: "tiktok_3.png",
    label: "分析画面",
    html: `
      <div style="width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(160deg,#0f172a 0%,#1a2744 50%,#0f172a 100%);display:flex;flex-direction:column;padding:80px 50px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#f8fafc;box-sizing:border-box;">
        <div style="text-align:center;margin-bottom:50px;">
          <div style="font-size:18px;color:#10b981;letter-spacing:3px;margin-bottom:16px;font-weight:600;">ANALYSIS</div>
          <div style="font-size:44px;font-weight:800;">物件分析 × 公的データ</div>
          <div style="font-size:22px;color:#94a3b8;margin-top:12px;">位置情報から自動マッチング</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:24px;flex:1;">
          <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:16px;color:#10b981;margin-bottom:16px;font-weight:600;">📍 地価公示データ（L02-25）</div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <div style="font-size:15px;color:#64748b;margin-bottom:8px;">周辺基準地価</div>
                <div style="font-size:44px;font-weight:800;">¥385,000<span style="font-size:18px;color:#64748b;font-weight:400;">/㎡</span></div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:15px;color:#64748b;margin-bottom:8px;">5年トレンド</div>
                <div style="font-size:36px;font-weight:800;color:#10b981;">+2.3%/年</div>
              </div>
            </div>
          </div>
          <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:16px;color:#3b82f6;margin-bottom:16px;font-weight:600;">🏘 DID 人口集中地区（A16-20）</div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <div style="font-size:15px;color:#64748b;margin-bottom:8px;">DID判定</div>
                <div style="font-size:44px;font-weight:800;color:#3b82f6;">DID内 ✓</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:15px;color:#64748b;margin-bottom:8px;">人口密度</div>
                <div style="font-size:36px;font-weight:800;">8,420<span style="font-size:16px;color:#64748b;">/k㎡</span></div>
              </div>
            </div>
          </div>
          <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;">
            <div style="font-size:16px;color:#8b5cf6;margin-bottom:16px;font-weight:600;">🚃 最寄駅データ（N02-20 / S12-24）</div>
            <div style="display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <div style="font-size:15px;color:#64748b;margin-bottom:8px;">最寄駅</div>
                <div style="font-size:44px;font-weight:800;">武蔵小杉</div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:15px;color:#64748b;margin-bottom:8px;">1日乗降客数</div>
                <div style="font-size:36px;font-weight:800;color:#8b5cf6;">142,350人</div>
              </div>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:40px;">
          <div style="font-size:22px;color:#64748b;">手入力ゼロ。すべて自動取得。</div>
          <div style="font-size:24px;font-weight:700;margin-top:16px;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">MaisokuDB</div>
        </div>
      </div>`,
  },
  {
    file: "tiktok_4.png",
    label: "出口予測",
    html: `
      <div style="width:${WIDTH}px;height:${HEIGHT}px;background:linear-gradient(160deg,#0f172a 0%,#1a2744 50%,#0f172a 100%);display:flex;flex-direction:column;padding:80px 50px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#f8fafc;box-sizing:border-box;">
        <div style="text-align:center;margin-bottom:50px;">
          <div style="font-size:18px;color:#ef4444;letter-spacing:3px;margin-bottom:16px;font-weight:600;">EXIT PREDICTION</div>
          <div style="font-size:44px;font-weight:800;">人口推計 × 出口予測</div>
          <div style="font-size:22px;color:#94a3b8;margin-top:12px;">20年後の売却価格を定量予測</div>
        </div>
        <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;margin-bottom:24px;">
          <div style="font-size:16px;color:#ef4444;margin-bottom:20px;font-weight:600;">📈 人口推計（IPSS 2020→2050）</div>
          <div style="display:flex;align-items:flex-end;gap:10px;height:160px;margin-bottom:16px;">
            ${[
              { y: 2020, v: 100, c: "#10b981" },
              { y: 2025, v: 98, c: "#10b981" },
              { y: 2030, v: 96, c: "#10b981" },
              { y: 2035, v: 93, c: "#eab308" },
              { y: 2040, v: 89, c: "#eab308" },
              { y: 2045, v: 84, c: "#ef4444" },
              { y: 2050, v: 78, c: "#ef4444" },
            ].map((d) => `
              <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;">
                <div style="font-size:13px;color:#94a3b8;">${d.v}%</div>
                <div style="width:100%;background:${d.c};border-radius:6px 6px 0 0;height:${d.v * 1.4}px;"></div>
                <div style="font-size:12px;color:#64748b;">${d.y}</div>
              </div>
            `).join("")}
          </div>
          <div style="display:flex;justify-content:space-between;font-size:17px;">
            <span style="color:#94a3b8;">川崎市中原区</span>
            <span style="color:#eab308;font-weight:700;">2050年: -22%</span>
          </div>
        </div>
        <div style="background:rgba(15,23,42,0.8);border:1px solid rgba(51,65,85,0.5);border-radius:20px;padding:32px;flex:1;">
          <div style="font-size:16px;color:#f97316;margin-bottom:28px;font-weight:600;">🏠 売却価格予測（3シナリオ）</div>
          <div style="display:flex;flex-direction:column;gap:32px;">
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:baseline;">
                <span style="font-size:20px;color:#94a3b8;">楽観シナリオ</span>
                <span style="font-size:36px;font-weight:800;color:#10b981;">3,850万円</span>
              </div>
              <div style="height:12px;background:#1e293b;border-radius:99px;"><div style="height:100%;width:85%;background:#10b981;border-radius:99px;"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:baseline;">
                <span style="font-size:20px;color:#94a3b8;">基本シナリオ</span>
                <span style="font-size:36px;font-weight:800;color:#3b82f6;">3,200万円</span>
              </div>
              <div style="height:12px;background:#1e293b;border-radius:99px;"><div style="height:100%;width:70%;background:#3b82f6;border-radius:99px;"></div></div>
            </div>
            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:10px;align-items:baseline;">
                <span style="font-size:20px;color:#94a3b8;">悲観シナリオ</span>
                <span style="font-size:36px;font-weight:800;color:#ef4444;">2,550万円</span>
              </div>
              <div style="height:12px;background:#1e293b;border-radius:99px;"><div style="height:100%;width:55%;background:#ef4444;border-radius:99px;"></div></div>
            </div>
          </div>
        </div>
        <div style="text-align:center;margin-top:40px;">
          <div style="font-size:24px;font-weight:700;background:linear-gradient(90deg,#3b82f6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">MaisokuDB</div>
          <div style="font-size:18px;color:#64748b;margin-top:8px;">App Storeで公開中</div>
        </div>
      </div>`,
  },
];

async function main() {
  const browser = await puppeteer.launch({ headless: true });

  for (const p of pages) {
    const pg = await browser.newPage();
    await pg.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });
    await pg.setContent(`<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;">${p.html}</body></html>`, { waitUntil: "networkidle0" });
    await pg.screenshot({ path: p.file });
    await pg.close();
    console.log(`✅ ${p.file} (${p.label})`);
  }

  await browser.close();
  console.log("\n📁 TikTok用 4枚の画像を生成しました！");
}

main().catch(console.error);
