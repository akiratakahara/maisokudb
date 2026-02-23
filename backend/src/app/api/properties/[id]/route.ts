import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const property = await prisma.property.findFirst({
      where: { id, userId },
    });

    if (!property) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    return NextResponse.json({ property });
  } catch {
    return NextResponse.json(
      { error: "物件の取得に失敗しました" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.property.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    const body = await request.json();
    const property = await prisma.property.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address,
        nearestStation: body.nearestStation,
        walkMinutes: body.walkMinutes !== undefined ? (body.walkMinutes ? parseInt(body.walkMinutes) : null) : undefined,
        price: body.price !== undefined ? (body.price ? parseFloat(body.price) : null) : undefined,
        managementFee: body.managementFee !== undefined ? (body.managementFee ? parseFloat(body.managementFee) : null) : undefined,
        repairReserve: body.repairReserve !== undefined ? (body.repairReserve ? parseFloat(body.repairReserve) : null) : undefined,
        deposit: body.deposit !== undefined ? (body.deposit ? parseFloat(body.deposit) : null) : undefined,
        keyMoney: body.keyMoney !== undefined ? (body.keyMoney ? parseFloat(body.keyMoney) : null) : undefined,
        layout: body.layout,
        area: body.area !== undefined ? (body.area ? parseFloat(body.area) : null) : undefined,
        balconyArea: body.balconyArea !== undefined ? (body.balconyArea ? parseFloat(body.balconyArea) : null) : undefined,
        builtDate: body.builtDate,
        structure: body.structure,
        floors: body.floors,
        floor: body.floor,
        equipment: body.equipment,
        transactionType: body.transactionType,
        managementCompany: body.managementCompany,
        contactInfo: body.contactInfo,
        notes: body.notes,
        pdfUrl: body.pdfUrl,
      },
    });

    return NextResponse.json({ property });
  } catch {
    return NextResponse.json(
      { error: "物件の更新に失敗しました" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.property.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return NextResponse.json({ error: "物件が見つかりません" }, { status: 404 });
    }

    await prisma.property.delete({ where: { id } });

    return NextResponse.json({ message: "物件を削除しました" });
  } catch {
    return NextResponse.json(
      { error: "物件の削除に失敗しました" },
      { status: 500 }
    );
  }
}
