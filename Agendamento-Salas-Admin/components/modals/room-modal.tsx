"use client"

import { useState, useEffect, useCallback } from "react"
import {
  X, Save, Plus, AlignLeft, CreditCard, Tag, ImageIcon, Loader2, Trash2, ImageOff, Star,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/utils"
import type { Room } from "@/lib/types"

const DETAIL_BASE = `${API_BASE_URL}/webhook/977b3245-3a83-43db-97be-cbc2eb07f9dc/api/spaces`

interface RoomDetail extends Omit<Room, "available"> {
  available: boolean | number
  images: string[]
  infrastructure: string[]
  description: string | null
}

interface RoomModalProps {
  open: boolean
  editingRoom: Room | null
  onClose: () => void
  onSaved: () => void
}

export function RoomModal({ open, editingRoom, onClose, onSaved }: RoomModalProps) {
  const [detail, setDetail] = useState<RoomDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [available, setAvailable] = useState("true")
  const [weekdayPrice, setWeekdayPrice] = useState("")
  const [minHoursWeekday, setMinHoursWeekday] = useState("2")
  const [saturdayPrice, setSaturdayPrice] = useState("")
  const [minHoursSaturday, setMinHoursSaturday] = useState("4")
  const [amenities, setAmenities] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [newImageUrl, setNewImageUrl] = useState("")

  const [isSaving, setIsSaving] = useState(false)

  // Fetch detail when editing
  const fetchDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsLoadingDetail(true)
    try {
      const res = await fetch(`${DETAIL_BASE}/${id}`, { cache: "no-store", signal })
      if (!res.ok) throw new Error("Falha ao buscar detalhes da sala")
      const data = await res.json()
      const d = (Array.isArray(data) ? data[0] : data) as RoomDetail
      setDetail(d)

      // Populate form
      setName(d.name || "")
      setDescription(d.description || "")
      setCapacity(String(d.capacity || ""))
      setAvailable(d.available === 1 || d.available === true ? "true" : "false")
      setWeekdayPrice(String(d.pricePeriodsWeekday?.[0]?.price ?? ""))
      setMinHoursWeekday(String(d.minHoursWeekday ?? 2))
      setSaturdayPrice(String(d.pricePeriodsSaturday?.[0]?.price ?? ""))
      setMinHoursSaturday(String(d.minHoursSaturday ?? 4))
      setAmenities(d.infrastructure ?? d.amenities ?? [])
      setImages(d.images ?? (d.image ? [d.image] : []))
      setCoverImage(d.image || (d.images?.[0] ?? null))
    } catch (error) {
      if ((error as Error).name === "AbortError") return
      console.error("Erro ao carregar detalhes da sala:", error)
      toast.error("Erro ao carregar detalhes da sala")
    } finally {
      setIsLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    if (!open) {
      setDetail(null)
      return
    }
    if (editingRoom) {
      const controller = new AbortController()
      fetchDetail(editingRoom.id, controller.signal)
      return () => controller.abort()
    } else {
      // Reset for new room
      setDetail(null)
      setName("")
      setDescription("")
      setCapacity("")
      setAvailable("true")
      setWeekdayPrice("")
      setMinHoursWeekday("2")
      setSaturdayPrice("")
      setMinHoursSaturday("4")
      setAmenities([])
      setImages([])
      setCoverImage(null)
    }
  }, [open, editingRoom, fetchDetail])

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    )
  }

  const addImage = () => {
    const url = newImageUrl.trim()
    if (!url) return
    if (images.includes(url)) {
      toast.error("Essa imagem ja foi adicionada")
      return
    }
    setImages((prev) => [...prev, url])
    if (!coverImage) setCoverImage(url)
    setNewImageUrl("")
  }

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img !== url))
    if (coverImage === url) {
      setCoverImage(images.find((img) => img !== url) ?? null)
    }
  }

  const setCover = (url: string) => {
    setCoverImage(url)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      // TODO: integrate with save API when Bruno provides the endpoint
      toast.success(editingRoom ? "Sala atualizada!" : "Sala criada!")
      onSaved()
      onClose()
    } catch (error) {
      console.error("Erro ao salvar sala:", error)
      toast.error("Erro ao salvar sala")
    } finally {
      setIsSaving(false)
    }
  }

  if (!open) return null

  // All amenities = union of known from API + infrastructure field
  const allAmenities = detail?.infrastructure ?? detail?.amenities ?? editingRoom?.amenities ?? []
  const amenityOptions = Array.from(new Set(allAmenities))

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

                  {images.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {images.map((url) => (
                        <div key={url} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          {/* Cover badge */}
                          {coverImage === url && (
                            <div className="absolute top-2 left-2 bg-[#184689] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                              CAPA
                            </div>
                          )}
                          {/* Overlay actions */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                            {coverImage !== url && (
                              <button
                                type="button"
                                onClick={() => setCover(url)}
                                title="Definir como capa"
                                className="p-2 bg-white rounded-full text-amber-500 hover:bg-amber-50 shadow-sm"
                              >
                                <Star className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => removeImage(url)}
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

                  {/* Add image by URL */}
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Cole a URL da imagem (https://...)"
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                    />
                    <button
                      type="button"
                      onClick={addImage}
                      disabled={!newImageUrl.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-[#184689] text-white rounded-lg hover:bg-[#113262] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
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
                        Status
                      </label>
                      <select
                        value={available}
                        onChange={(e) => setAvailable(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
                      >
                        <option value="true">Disponivel</option>
                        <option value="false">Indisponivel / Manutencao</option>
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
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving || isLoadingDetail}
              className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-[#184689] text-white hover:bg-[#113262] rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingRoom ? <Save className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {editingRoom ? "Salvar Regras" : "Criar Sala"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
