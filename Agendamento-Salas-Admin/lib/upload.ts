import { getSupabase } from "./supabase"

const BUCKET = "spaces"

/**
 * Faz upload de um File para o Supabase Storage (bucket "spaces")
 * e retorna a URL pública. Retorna null em caso de erro.
 */
export async function uploadImageToSupabase(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() ?? "jpg"
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`
  const path = `rooms/${uniqueName}`

  const supabase = getSupabase()

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    console.error("Erro no upload para Supabase:", error.message)
    return null
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
