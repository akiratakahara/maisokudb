import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("password123", 12);

  const user = await prisma.user.upsert({
    where: { email: "demo@maisoku.jp" },
    update: {},
    create: {
      email: "demo@maisoku.jp",
      password: hashedPassword,
      name: "デモユーザー",
      plan: "free",
    },
  });

  const properties = [
    {
      name: "グランドメゾン代々木上原",
      address: "東京都渋谷区上原2丁目",
      nearestStation: "代々木上原駅",
      walkMinutes: 5,
      price: 6980,
      managementFee: 15800,
      repairReserve: 12400,
      deposit: null,
      keyMoney: null,
      layout: "2LDK",
      area: 65.4,
      balconyArea: 8.2,
      builtDate: "2018年3月",
      structure: "RC造",
      floors: "地上14階建",
      floor: "10階",
      equipment: ["エアコン", "オートロック", "宅配BOX", "浴室乾燥機", "ディスポーザー"],
      transactionType: "媒介",
      managementCompany: "三井不動産レジデンシャルサービス",
      contactInfo: "03-1234-5678",
      notes: "角部屋、南向き、眺望良好",
    },
    {
      name: "パークシティ武蔵小杉",
      address: "神奈川県川崎市中原区新丸子東3丁目",
      nearestStation: "武蔵小杉駅",
      walkMinutes: 3,
      price: 5480,
      managementFee: 18200,
      repairReserve: 14600,
      deposit: null,
      keyMoney: null,
      layout: "3LDK",
      area: 72.8,
      balconyArea: 12.5,
      builtDate: "2015年8月",
      structure: "RC造",
      floors: "地上53階建",
      floor: "32階",
      equipment: ["エアコン", "オートロック", "宅配BOX", "床暖房", "食洗機", "ジム"],
      transactionType: "専任媒介",
      managementCompany: "三井不動産レジデンシャルサービス",
      contactInfo: "044-9876-5432",
      notes: "タワーマンション、コンシェルジュ付き",
    },
    {
      name: "ライオンズマンション中野坂上",
      address: "東京都中野区本町2丁目",
      nearestStation: "中野坂上駅",
      walkMinutes: 7,
      price: 3280,
      managementFee: 11200,
      repairReserve: 8800,
      deposit: null,
      keyMoney: null,
      layout: "1LDK",
      area: 42.3,
      balconyArea: 5.1,
      builtDate: "2002年11月",
      structure: "SRC造",
      floors: "地上11階建",
      floor: "6階",
      equipment: ["エアコン", "オートロック", "モニター付きインターホン"],
      transactionType: "一般媒介",
      managementCompany: "大京アステージ",
      contactInfo: "03-5555-1234",
      notes: "リノベーション済み、ペット可（小型犬）",
    },
    {
      name: "サンクタス目黒",
      address: "東京都目黒区目黒3丁目",
      nearestStation: "目黒駅",
      walkMinutes: 10,
      price: 4580,
      managementFee: 13500,
      repairReserve: 10200,
      deposit: null,
      keyMoney: null,
      layout: "2LDK",
      area: 55.6,
      balconyArea: 6.8,
      builtDate: "2010年5月",
      structure: "RC造",
      floors: "地上7階建",
      floor: "4階",
      equipment: ["エアコン", "オートロック", "宅配BOX", "浴室乾燥機"],
      transactionType: "媒介",
      managementCompany: "東急コミュニティー",
      contactInfo: "03-7777-8888",
      notes: "閑静な住宅街、買い物便利",
    },
    {
      name: "ブリリアタワー池袋",
      address: "東京都豊島区南池袋2丁目",
      nearestStation: "池袋駅",
      walkMinutes: 4,
      price: 8900,
      managementFee: 22400,
      repairReserve: 18600,
      deposit: null,
      keyMoney: null,
      layout: "3LDK",
      area: 85.2,
      balconyArea: 15.3,
      builtDate: "2020年1月",
      structure: "RC造",
      floors: "地上49階建",
      floor: "38階",
      equipment: ["エアコン", "オートロック", "宅配BOX", "床暖房", "食洗機", "ディスポーザー", "コンシェルジュ", "スカイラウンジ"],
      transactionType: "専任媒介",
      managementCompany: "東京建物アメニティサポート",
      contactInfo: "03-3333-4444",
      notes: "最上階付近、360度パノラマビュー",
    },
  ];

  for (const prop of properties) {
    await prisma.property.create({
      data: {
        userId: user.id,
        ...prop,
      },
    });
  }

  console.log("シードデータを作成しました");
  console.log(`ユーザー: ${user.email}`);
  console.log(`物件数: ${properties.length}件`);
}

main()
  .catch((e) => {
    console.error("シード実行エラー:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
