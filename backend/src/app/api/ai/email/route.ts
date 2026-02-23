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
    const { propertyId } = await request.json();
    if (!propertyId) {
      return NextResponse.json({ error: "物件IDが必要です" }, { status: 400 });
    }

    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId },
    });

    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    if (user.plan === "free" && user.aiUsageCount >= 10) {
      return NextResponse.json(
        { error: "Freeプランの月間AI利用回数（10回）に達しました" },
        { status: 403 }
      );
    }

    const propertyInfo = `
物件名: ${property.name}
所在地: ${property.address || "不明"}
最寄駅: ${property.nearestStation || "不明"} 徒歩${property.walkMinutes || "?"}分
価格: ${property.price ? `${property.price}万円` : "不明"}
間取り: ${property.layout || "不明"}
専有面積: ${property.area ? `${property.area}㎡` : "不明"}
築年月: ${property.builtDate || "不明"}
構造: ${property.structure || "不明"}
階数: ${property.floor || "不明"} / ${property.floors || "不明"}
管理費: ${property.managementFee ? `${property.managementFee}円` : "不明"}
設備: ${Array.isArray(property.equipment) ? (property.equipment as string[]).join("、") : "不明"}
    `.trim();

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `以下の物件情報をもとに、不動産仲介業者がお客様に送る物件紹介メールを作成してください。
丁寧でプロフェッショナルな日本語で書いてください。件名と本文を含めてください。

${propertyInfo}`,
        },
      ],
    });

    const emailText =
      message.content[0].type === "text" ? message.content[0].text : "";

    await prisma.user.update({
      where: { id: userId },
      data: { aiUsageCount: { increment: 1 } },
    });

    return NextResponse.json({ email: emailText });
  } catch {
    return NextResponse.json(
      { error: "メール生成に失敗しました" },
      { status: 500 }
    );
  }
}
