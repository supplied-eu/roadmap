import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // TODO: store file, parse if CSV/XLSX, return data
  return NextResponse.json({
    name: file.name,
    size: file.size,
    type: file.type,
    message: "Upload endpoint ready",
  });
}
