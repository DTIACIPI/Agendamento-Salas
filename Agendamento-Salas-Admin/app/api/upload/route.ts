import { NextRequest, NextResponse } from "next/server"
import { writeFile } from "fs/promises"
import { join } from "path"

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 })
  }

  const ext = file.name.split(".").pop() ?? "jpg"
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const uploadsDir = join(process.cwd(), "public", "uploads")
  await writeFile(join(uploadsDir, uniqueName), buffer)

  const origin = req.headers.get("origin") || req.nextUrl.origin
  return NextResponse.json({ url: `${origin}/uploads/${uniqueName}` })
}
