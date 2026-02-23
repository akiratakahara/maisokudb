import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserIdFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const layout = searchParams.get("layout");
  const minArea = searchParams.get("minArea");
  const maxArea = searchParams.get("maxArea");
  const maxAge = searchParams.get("maxAge");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  try {
    const where: Record<string, unknown> = { userId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
      ];
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) (where.price as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.price as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    if (layout) {
      where.layout = { contains: layout, mode: "insensitive" };
    }

    if (minArea || maxArea) {
      where.area = {};
      if (minArea) (where.area as Record<string, unknown>).gte = parseFloat(minArea);
      if (maxArea) (where.area as Record<string, unknown>).lte = parseFloat(maxArea);
    }

    if (maxAge) {
      const cutoffYear = new Date().getFullYear() - parseInt(maxAge);
      where.builtDate = { gte: `${cutoffYear}` };
    }

    const allowedSortFields = ["price", "area", "builtDate", "createdAt"];
    const orderField = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const order = sortOrder === "asc" ? "asc" : "desc";

    const properties = await prisma.property.findMany({
      where: where as never,
      orderBy: { [orderField]: order },
    });

    return NextResponse.json({ properties });
  } catch {
    return NextResponse.json(
      { error: "物件一覧の取得に失敗しました" },
      { status: 500 }
    );
  }
}

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

    if (user.plan === "free") {
      const count = await prisma.property.count({ where: { userId } });
      if (count >= 50) {
        return NextResponse.json(
          { error: "Freeプランの物件保存上限（50件）に達しました。Proプランにアップグレードしてください" },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const property = await prisma.property.create({
      data: {
        userId,
        name: body.name || "無題の物件",
        address: body.address,
        nearestStation: body.nearestStation,
        walkMinutes: body.walkMinutes ? parseInt(body.walkMinutes) : null,
        price: body.price ? parseFloat(body.price) : null,
        managementFee: body.managementFee ? parseFloat(body.managementFee) : null,
        repairReserve: body.repairReserve ? parseFloat(body.repairReserve) : null,
        deposit: body.deposit ? parseFloat(body.deposit) : null,
        keyMoney: body.keyMoney ? parseFloat(body.keyMoney) : null,
        layout: body.layout,
        area: body.area ? parseFloat(body.area) : null,
        balconyArea: body.balconyArea ? parseFloat(body.balconyArea) : null,
        builtDate: body.builtDate,
        structure: body.structure,
        floors: body.floors,
        floor: body.floor,
        equipment: body.equipment || [],
        transactionType: body.transactionType,
        managementCompany: body.managementCompany,
        contactInfo: body.contactInfo,
        notes: body.notes,
        pdfUrl: body.pdfUrl,
      },
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "物件の登録に失敗しました" },
      { status: 500 }
    );
  }
}
