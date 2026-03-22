import puppeteer from "puppeteer";

const WIDTH = 1200;
const HEIGHT = 675;

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 2 });

  await page.goto("http://localhost:3000", { waitUntil: "networkidle0" });

  const positions = await page.evaluate(() => {
    const getTop = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.getBoundingClientRect().top + window.scrollY : 0;
    };
    return {
      dataTop: getTop("#data"),
      screensTop: getTop("#screens"),
      pageHeight: document.body.scrollHeight,
    };
  });

  // 1枚目: ヒーロー + 数字バナー
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: "x_post_1.png" });
  console.log("✅ 1/4: ヒーロー + 数字バナー");

  // 2枚目: 公的データ6カード一覧
  await page.evaluate((y) => window.scrollTo(0, y), positions.dataTop + 200);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "x_post_2.png" });
  console.log("✅ 2/4: 公的データ6カード");

  // 3枚目: 物件分析 × 公的データ モック
  await page.evaluate((y) => window.scrollTo(0, y), positions.screensTop + 80);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "x_post_3.png" });
  console.log("✅ 3/4: 物件分析モック");

  // 4枚目: 出口予測モック
  await page.evaluate((y) => window.scrollTo(0, y), positions.screensTop + 600);
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: "x_post_4.png" });
  console.log("✅ 4/4: 出口予測モック");

  await browser.close();
  console.log("\n📁 4枚の画像を生成しました！");
}

main().catch(console.error);
