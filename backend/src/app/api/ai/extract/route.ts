import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    if (user.plan === "free" && user.aiUsageCount >= 10) {
      return NextResponse.json(
        { error: "Freeプランの月間AI利用回数（10回）に達しました。Proプランにアップグレードしてください" },
        { status: 403 }
      );
    }

    const { pdfBase64 } = await request.json();
    if (!pdfBase64) {
      return NextResponse.json({ error: "PDFデータが必要です" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: `このマイソク（物件概要書）PDFから以下の物件情報をJSON形式で抽出してください。
値が見つからない場合はnullとしてください。

{
  "name": "物件名",
  "address": "所在地",
  "nearestStation": "最寄駅名",
  "walkMinutes": 徒歩分数(数値),
  "price": 価格(万円単位の数値),
  "managementFee": 管理費(円単位の数値),
  "repairReserve": 修繕積立金(円単位の数値),
  "deposit": 敷金(円単位の数値),
  "keyMoney": 礼金(円単位の数値),
  "layout": "間取り(例: 2LDK)",
  "area": 専有面積(㎡の数値),
  "balconyArea": バルコニー面積(㎡の数値),
  "builtDate": "築年月(例: 2005年3月)",
  "structure": "構造(例: RC造)",
  "floors": "建物階数(例: 地上10階建)",
  "floor": "所在階(例: 5階)",
  "equipment": ["設備1", "設備2"],
  "transactionType": "取引態様(例: 媒介)",
  "managementCompany": "管理会社名",
  "contactInfo": "連絡先",
  "notes": "備考"
}

JSONのみを出力してください。説明文は不要です。`,
            },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI抽出結果のパースに失敗しました" },
        { status: 500 }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);

    await prisma.user.update({
      where: { id: userId },
      data: { aiUsageCount: { increment: 1 } },
    });

    return NextResponse.json({ extracted });
  } catch {
    return NextResponse.json(
      { error: "AI抽出に失敗しました" },
      { status: 500 }
    );
  }
}
