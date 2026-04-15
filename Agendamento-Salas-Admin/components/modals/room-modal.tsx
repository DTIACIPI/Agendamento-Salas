"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X, Save, Plus, AlignLeft, CreditCard, Tag, ImageIcon,
  Loader2, Trash2, ImageOff, Star, Upload,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/utils"
import { ALL_AMENITIES } from "@/lib/mock-data"
import { uploadImageToSupabase } from "@/lib/upload"
import type { Room, RoomDetail, RoomPayload } from "@/lib/types"

interface RoomModalProps {
  open: boolean
  editingRoom: Room | null
  onClose: () => void
  onSaved: () => void
}

// Representa uma imagem no formulário: URL existente ou File novo
interface ImageEntry {
  type: "url" | "file"
  url: string       // URL pública (existente) ou objectURL (preview do file)
  file?: File       // Só existe quando type === "file"
}

export function RoomModal({ open, editingRoom, onClose, onSaved }: RoomModalProps) {
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [status, setStatus] = useState("Disponível")
  const [weekdayPrice, setWeekdayPrice] = useState("")
  const [minHoursWeekday, setMinHoursWeekday] = useState("2")
  const [saturdayPrice, setSaturdayPrice] = useState("")
  const [minHoursSaturday, setMinHoursSaturday] = useState("4")
  const [cleaningBuffer, setCleaningBuffer] = useState("30")
  const [amenities, setAmenities] = useState<string[]>([])
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([])
  const [coverIndex, setCoverIndex] = useState(0)

  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("")

  // Reset form
  const resetForm = useCallback(() => {
    setName("")
    setDescription("")
    setCapacity("")
    setStatus("Disponível")
    setWeekdayPrice("")
    setMinHoursWeekday("2")
    setSaturdayPrice("")
    setMinHoursSaturday("4")
    setCleaningBuffer("30")
    setAmenities([])
    setImageEntries([])
    setCoverIndex(0)
    setSaveLabel("")
  }, [])

  // Fetch detail when editing
  const fetchDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsLoadingDetail(true)
    try {
      const res = await fetch(`${API_BASE_URL}/webhook/977b3245-3a83-43db-97be-cbc2eb07f9dc/api/spaces/${id}`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar detalhes da sala")
      const data = await res.json()
      // API sempre retorna wrapped em []
      const d = (Array.isArray(data) ? data[0] : data) as RoomDetail

      // Populate form
      setName(d.name || "")
      setDescription(d.description || "")
      setCapacity(String(d.capacity || ""))
      setStatus(d.status || (d.available === 1 || d.available === true ? "Disponível" : "Indisponível"))

      // Preços — pode vir flat ou dentro de pricePeriodsWeekday
      const wPrice = d.price_per_hour_weekday ?? d.pricePeriodsWeekday?.[0]?.price ?? ""
      const sPrice = d.price_per_hour_weekend ?? d.pricePeriodsSaturday?.[0]?.price ?? ""
      setWeekdayPrice(String(wPrice))
      setSaturdayPrice(String(sPrice))
      setMinHoursWeekday(String(d.min_hours_weekday ?? 2))
      setMinHoursSaturday(String(d.min_hours_weekend ?? 4))
      setCleaningBuffer(String(d.cleaning_buffer ?? 30))

      setAmenities(d.infrastructure ?? d.amenities ?? [])

      // Imagens — montar ImageEntry[] a partir das URLs existentes
      const urls = d.images ?? (d.image ? [d.image] : [])
      setImageEntries(urls.map((u: string) => ({ type: "url" as const, url: u })))
      // A capa é a image principal ou a primeira
      const coverUrl = d.image || urls[0] || null
      const cIdx = coverUrl ? urls.indexOf(coverUrl) : 0
      setCoverIndex(cIdx >= 0 ? cIdx : 0)
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar detalhes da sala:", error)
      toast.error("Erro ao carregar detalhes da sala")
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    if (editingRoom) {
      const controller = new AbortController()
      fetchDetail(editingRoom.id, controller.signal)
      return () => controller.abort()
    } else {
      resetForm()
    }
  }, [open, editingRoom, fetchDetail, resetForm])

  // Cleanup objectURLs on unmount
  useEffect(() => {
    return () => {
      imageEntries.forEach((e) => {
        if (e.type === "file") URL.revokeObjectURL(e.url)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    )
  }

  // Adicionar imagens via file input
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newEntries: ImageEntry[] = Array.from(files).map((file) => ({
      type: "file" as const,
      url: URL.createObjectURL(file),
      file,
    }))
    setImageEntries((prev) => [...prev, ...newEntries])
    // Se não tinha capa, definir a primeira
    if (imageEntries.length === 0 && newEntries.length > 0) {
      setCoverIndex(0)
    }
    // Reset input para permitir selecionar o mesmo arquivo
    e.target.value = ""
  }

  const removeImage = (index: number) => {
    setImageEntries((prev) => {
      const entry = prev[index]
      if (entry.type === "file") URL.revokeObjectURL(entry.url)
      const next = prev.filter((_, i) => i !== index)
      return next
    })
    // Ajustar coverIndex
    if (index === coverIndex) {
      setCoverIndex(0)
    } else if (index < coverIndex) {
      setCoverIndex((prev) => prev - 1)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Step 1: Upload novas imagens (type === "file") para o Supabase
      const filesToUpload = imageEntries.filter((e) => e.type === "file")
      const existingUrls = imageEntries.filter((e) => e.type === "url").map((e) => e.url)

      let uploadedUrls: string[] = []
      if (filesToUpload.length > 0) {
        setSaveLabel("Enviando imagens...")
        const results = await Promise.all(
          filesToUpload.map((entry) => uploadImageToSupabase(entry.file!))
        )
        const failed = results.filter((r) => r === null).length
        if (failed > 0) {
          toast.error(`${failed} imagem(ns) falharam no upload`)
        }
        uploadedUrls = results.filter((r): r is string => r !== null)
      }

      // Montar array final de imagens: capa primeiro
      const allUrls = [...existingUrls, ...uploadedUrls]
      // Reordenar para a capa ficar na posição 0
      if (coverIndex > 0 && coverIndex < imageEntries.length) {
        // Pegar a URL da capa do estado original
        const coverEntry = imageEntries[coverIndex]
        const coverUrl = coverEntry.type === "url"
          ? coverEntry.url
          : uploadedUrls[filesToUpload.indexOf(coverEntry)] ?? coverEntry.url
        const idx = allUrls.indexOf(coverUrl)
        if (idx > 0) {
          allUrls.splice(idx, 1)
          allUrls.unshift(coverUrl)
        }
      }

      // Step 2: Montar payload
      setSaveLabel("Salvando sala...")
      const payload: RoomPayload = {
        name,
        description,
        capacity: Number(capacity),
        min_hours_weekday: Number(minHoursWeekday),
        min_hours_weekend: Number(minHoursSaturday),
        price_per_hour_weekday: Number(weekdayPrice),
        price_per_hour_weekend: Number(saturdayPrice),
        cleaning_buffer: Number(cleaningBuffer),
        status,
        images: allUrls,
      }

      // Step 3: POST ou PATCH
      const url = editingRoom
        ? `${API_BASE_URL}/webhook/59aa012a-1f02-424f-9ba5-90cea11a1468/api/spaces/${editingRoom.id}`
        : `${API_BASE_URL}/webhook/api/spaces`
      const method = editingRoom ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => "")
        throw new Error(errorBody || "Falha ao salvar sala")
      }

      toast.success(editingRoom ? "Sala atualizada com sucesso!" : "Sala criada com sucesso!")
      onSaved()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar sala:", error)
      toast.error("Erro ao salvar sala. Tente novamente.")
    } finally {
      setIsSaving(false)
      setSaveLabel("")
    }
  }

  if (!open) return null

  // Lista de amenidades: unir as conhecidas com as vindas da API
  const amenityOptions = Array.from(new Set([...ALL_AMENITIES, ...amenities]))

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl relative z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
            <div>
              <h3 className="text-xl font-bold text-slate-800">
                {editingRoom ? `Editando: ${editingRoom.name}` : "Cadastrar Nova Sala"}
              </h3>
              <p className="text-sm text-slate-500">Preencha as informacoes do espaco.</p>
            </div>
            <button type="button" onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
            {isLoadingDetail ? (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="h-5 w-40 bg-slate-200 rounded mb-4" />
                    <div className="space-y-3">
                      <div className="h-9 bg-slate-100 rounded" />
                      <div className="h-9 bg-slate-100 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* Imagens */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> Galeria de Imagens
                  </h4>

                  {imageEntries.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {imageEntries.map((entry, idx) => (
                        <div key={`${entry.url}-${idx}`} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img src={entry.url} alt="" className="w-full h-full object-cover" />
                          {/* Badge de tipo */}
                          {entry.type === "file" && (
                            <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              NOVA
                            </div>
                          )}
                          {/* Cover badge */}
                          {coverIndex === idx && (
                            <div className="absolute top-2 left-2 bg-[#184689] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              CAPA
                            </div>
                          )}
                          {/* Overlay actions */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            {coverIndex !== idx && (
                              <button
                                type="button"
                                onClick={() => setCoverIndex(idx)}
                                title="Definir como capa"
                                className="p-2 bg-white rounded-full text-amber-500 hover:bg-amber-50 shadow-sm"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(idx)}
                              title="Remover imagem"
                              className="p-2 bg-white rounded-full text-red-500 hover:bg-red-50 shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                      <ImageOff className="w-8 h-8 mb-2" />
                      <p className="text-sm">Nenhuma imagem cadastrada</p>
                    </div>
                  )}

                  {/* Upload de arquivos */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFilesSelected}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium border-2 border-dashed border-slate-300 text-slate-600 rounded-lg hover:border-[#184689] hover:text-[#184689] transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Selecionar Imagens
                  </button>
                </div>

                {/* Info Basica */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                    <AlignLeft className="w-4 h-4" /> Informacoes Basicas
                  </h4>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Nome do Espaco
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                      placeholder="Ex: Sala de Reunioes 2"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Descricao
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689] resize-none"
                      placeholder="Descricao do espaco..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                        Capacidade Maxima (Pessoas)
                      </label>
                      <input
                        type="number"
                        required
                        value={capacity}
                        onChange={(e) => setCapacity(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                        placeholder="Ex: 20"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                        Tempo de Limpeza (min)
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        value={cleaningBuffer}
                        onChange={(e) => setCleaningBuffer(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                        placeholder="Ex: 30"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                        Status
                      </label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                      >
                        <option value="Disponível">Disponivel</option>
                        <option value="Indisponível">Indisponivel / Manutencao</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Precificacao */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" /> Precificacao
                  </h4>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-sm font-bold text-slate-800">Dias de Semana (Seg-Sex)</p>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                          Preco por Hora (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={weekdayPrice}
                          onChange={(e) => setWeekdayPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                          placeholder="Ex: 150.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                          Minimo de Horas
                        </label>
                        <input
                          type="number"
                          required
                          value={minHoursWeekday}
                          onChange={(e) => setMinHoursWeekday(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                        />
                      </div>
                    </div>
                    <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-100">
                      <p className="text-sm font-bold text-slate-800">Finais de Semana (Sab)</p>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                          Preco por Hora (R$)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={saturdayPrice}
                          onChange={(e) => setSaturdayPrice(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                          placeholder="Ex: 200.00"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5">
                          Minimo de Horas
                        </label>
                        <input
                          type="number"
                          required
                          value={minHoursSaturday}
                          onChange={(e) => setMinHoursSaturday(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Infraestrutura */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" /> Infraestrutura
                  </h4>
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
                      Amenidades
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {amenityOptions.map((item) => (
                        <label
                          key={item}
                          className={`flex items-center gap-2 text-sm px-3 py-2 rounded cursor-pointer border transition-colors ${
                            amenities.includes(item)
                              ? "bg-blue-50 border-blue-200 text-[#184689] font-medium"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={amenities.includes(item)}
                            onChange={() => toggleAmenity(item)}
                            className="rounded text-[#184689] focus:ring-[#184689]"
                          />{" "}
                          {item}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingDetail}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-[#184689] text-white hover:bg-[#113262] rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {saveLabel || "Salvando..."}
                </>
              ) : editingRoom ? (
                <>
                  <Save className="w-4 h-4" /> Salvar Regras
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" /> Criar Sala
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
