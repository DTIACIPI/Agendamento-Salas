export async function uploadImageToSupabase(file: File): Promise<string | null> {
  try {
    const form = new FormData()
    form.append("file", file)
    const res = await fetch("/api/upload", { method: "POST", body: form })
    if (!res.ok) return null
    const data = await res.json()
    return data.url ?? null
  } catch (error) {
    console.error("Erro no upload local:", error)
    return null
  }
}
