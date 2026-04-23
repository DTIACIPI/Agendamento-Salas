"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  X, Save, Plus, AlignLeft, CreditCard, ImageIcon,
  Loader2, Trash2, ImageOff, Star, Upload, Building2,
  Sun, Sunset, Moon, Clock, Wrench, ToggleLeft, ToggleRight,
  Package, Tag,
} from "lucide-react"
import { toast } from "sonner"
import { API_BASE_URL } from "@/lib/utils"
import { authFetch } from "@/lib/auth/auth-fetch"
import { ALL_AMENITIES } from "@/lib/mock-data"
import { uploadImageToSupabase } from "@/lib/upload"
import type { Room, RoomPayload } from "@/lib/types"

interface RoomModalProps {
  open: boolean
  editingRoom: Room | null
  onClose: () => void
  onSaved: () => void
  isSuperAdmin?: boolean
}

interface ImageEntry {
  type: "url" | "file"
  url: string
  file?: File
}

type TabId = "operacional" | "precificacao"

const FLOOR_OPTIONS = ["Subsolo", "Térreo", "Primeiro Andar"] as const

const INPUT_CLASS = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#184689]"
const LABEL_CLASS = "block text-xs font-bold uppercase text-slate-500 mb-1.5"

function maskCurrency(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (!digits) return ""
  const cents = parseInt(digits, 10)
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function unmaskCurrency(masked: string): number {
  if (!masked) return 0
  const clean = masked.replace(/\./g, "").replace(",", ".")
  return parseFloat(clean) || 0
}

function currencyToDisplay(raw: string): string {
  if (!raw) return ""
  const n = parseFloat(raw)
  if (isNaN(n)) return raw
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function ShiftRow({ icon, label, baseValue, onBaseChange, extraValue, onExtraChange }: {
  icon: React.ReactNode
  label: string
  baseValue: string
  onBaseChange: (v: string) => void
  extraValue: string
  onExtraChange: (v: string) => void
}) {
  return (
    <div className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
      <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {icon} {label}
      </div>
      <input
        type="text"
        inputMode="numeric"
        value={baseValue}
        onChange={(e) => onBaseChange(maskCurrency(e.target.value))}
        className={INPUT_CLASS}
        placeholder="0,00"
      />
      <input
        type="text"
        inputMode="numeric"
        value={extraValue}
        onChange={(e) => onExtraChange(maskCurrency(e.target.value))}
        className={INPUT_CLASS}
        placeholder="0,00"
      />
    </div>
  )
}

export function RoomModal({ open, editingRoom, onClose, onSaved, isSuperAdmin = false }: RoomModalProps) {
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<TabId>("operacional")

  // === Aba 1: Informações Operacionais ===
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [capacity, setCapacity] = useState("")
  const [cleaningBuffer, setCleaningBuffer] = useState("30")
  const [floor, setFloor] = useState("Térreo")
  const [inventory, setInventory] = useState("")
  const [amenities, setAmenities] = useState<string[]>([])
  const [status, setStatus] = useState("Disponível")
  const [imageEntries, setImageEntries] = useState<ImageEntry[]>([])
  const [coverIndex, setCoverIndex] = useState(0)

  // === Aba 2: Precificação (Super Admin only) ===
  // Turnos dias úteis — base
  const [priceMorningWd, setPriceMorningWd] = useState("")
  const [priceAfternoonWd, setPriceAfternoonWd] = useState("")
  const [priceNightWd, setPriceNightWd] = useState("")
  // Turnos dias úteis — extra
  const [extraMorningWd, setExtraMorningWd] = useState("")
  const [extraAfternoonWd, setExtraAfternoonWd] = useState("")
  const [extraNightWd, setExtraNightWd] = useState("")
  // Turnos fins de semana — base
  const [priceMorningWe, setPriceMorningWe] = useState("")
  const [priceAfternoonWe, setPriceAfternoonWe] = useState("")
  const [priceNightWe, setPriceNightWe] = useState("")
  // Turnos fins de semana — extra
  const [extraMorningWe, setExtraMorningWe] = useState("")
  const [extraAfternoonWe, setExtraAfternoonWe] = useState("")
  const [extraNightWe, setExtraNightWe] = useState("")
  // Franquias
  const [minHoursWd, setMinHoursWd] = useState("4")
  const [minHoursWe, setMinHoursWe] = useState("4")
  // Montagem
  const [allowsAssembly, setAllowsAssembly] = useState(false)
  const [assemblyHalfPrice, setAssemblyHalfPrice] = useState("")
  const [assemblyFullPrice, setAssemblyFullPrice] = useState("")

  const [isSaving, setIsSaving] = useState(false)
  const [saveLabel, setSaveLabel] = useState("")

  const resetForm = useCallback(() => {
    setActiveTab("operacional")
    setName("")
    setDescription("")
    setCapacity("")
    setCleaningBuffer("30")
    setFloor("Térreo")
    setInventory("")
    setAmenities([])
    setStatus("Disponível")
    setImageEntries([])
    setCoverIndex(0)
    setPriceMorningWd(""); setPriceAfternoonWd(""); setPriceNightWd("")
    setExtraMorningWd(""); setExtraAfternoonWd(""); setExtraNightWd("")
    setPriceMorningWe(""); setPriceAfternoonWe(""); setPriceNightWe("")
    setExtraMorningWe(""); setExtraAfternoonWe(""); setExtraNightWe("")
    setMinHoursWd("4"); setMinHoursWe("4")
    setAllowsAssembly(false)
    setAssemblyHalfPrice(""); setAssemblyFullPrice("")
    setSaveLabel("")
  }, [])

  // Unflatten: preencher formulário a partir do GET /api/spaces/:id
  const fetchDetail = useCallback(async (id: string, signal?: AbortSignal) => {
    setIsLoadingDetail(true)
    try {
      const res = await authFetch(`${API_BASE_URL}/webhook/977b3245-3a83-43db-97be-cbc2eb07f9dc/api/spaces/${id}`, {
        cache: "no-store",
        signal,
      })
      if (!res.ok) throw new Error("Falha ao buscar detalhes da sala")
      const data = await res.json()
      const d = (Array.isArray(data) ? data[0] : data) as Room

      // Aba 1 — Operacional
      setName(d.name || "")
      setDescription(d.description || "")
      setCapacity(String(d.capacity || ""))
      setCleaningBuffer(String(d.cleaning_buffer ?? 30))
      setFloor(d.floor || "Térreo")
      setInventory(d.inventory || "")
      setAmenities(d.amenities ?? [])

      const isActive = d.is_active ?? d.available
      setStatus(isActive === false ? "Indisponível" : "Disponível")

      // Imagens
      const urls = d.images ?? (d.image ? [d.image] : [])
      setImageEntries(urls.map((u: string) => ({ type: "url" as const, url: u })))
      const coverUrl = d.image || urls[0] || null
      const cIdx = coverUrl ? urls.indexOf(coverUrl) : 0
      setCoverIndex(cIdx >= 0 ? cIdx : 0)

      // Aba 2 — Precificação (unflatten do objeto pricing aninhado)
      const p = d.pricing
      if (p) {
        // Dias úteis
        setPriceMorningWd(currencyToDisplay(String(p.weekdays?.morning?.base ?? "")))
        setExtraMorningWd(currencyToDisplay(String(p.weekdays?.morning?.extra ?? "")))
        setPriceAfternoonWd(currencyToDisplay(String(p.weekdays?.afternoon?.base ?? "")))
        setExtraAfternoonWd(currencyToDisplay(String(p.weekdays?.afternoon?.extra ?? "")))
        setPriceNightWd(currencyToDisplay(String(p.weekdays?.night?.base ?? "")))
        setExtraNightWd(currencyToDisplay(String(p.weekdays?.night?.extra ?? "")))
        setMinHoursWd(String(p.weekdays?.min_hours ?? 4))
        // Fins de semana
        setPriceMorningWe(currencyToDisplay(String(p.weekends?.morning?.base ?? "")))
        setExtraMorningWe(currencyToDisplay(String(p.weekends?.morning?.extra ?? "")))
        setPriceAfternoonWe(currencyToDisplay(String(p.weekends?.afternoon?.base ?? "")))
        setExtraAfternoonWe(currencyToDisplay(String(p.weekends?.afternoon?.extra ?? "")))
        setPriceNightWe(currencyToDisplay(String(p.weekends?.night?.base ?? "")))
        setExtraNightWe(currencyToDisplay(String(p.weekends?.night?.extra ?? "")))
        setMinHoursWe(String(p.weekends?.min_hours ?? 4))
        // Montagem
        setAllowsAssembly(p.assembly?.allowed ?? false)
        setAssemblyHalfPrice(currencyToDisplay(String(p.assembly?.half_price ?? "")))
        setAssemblyFullPrice(currencyToDisplay(String(p.assembly?.full_price ?? "")))
      }
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

  // === Amenities ===
  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    )
  }
  const amenityOptions = Array.from(new Set([...ALL_AMENITIES, ...amenities]))

  // === Image handlers ===
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const newEntries: ImageEntry[] = Array.from(files).map((file) => ({
      type: "file" as const,
      url: URL.createObjectURL(file),
      file,
    }))
    setImageEntries((prev) => [...prev, ...newEntries])
    if (imageEntries.length === 0 && newEntries.length > 0) setCoverIndex(0)
    e.target.value = ""
  }

  const removeImage = (index: number) => {
    setImageEntries((prev) => {
      const entry = prev[index]
      if (entry.type === "file") URL.revokeObjectURL(entry.url)
      return prev.filter((_, i) => i !== index)
    })
    if (index === coverIndex) {
      setCoverIndex(0)
    } else if (index < coverIndex) {
      setCoverIndex((prev) => prev - 1)
    }
  }

  // === Submit (flatten) ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    try {
      // Upload novas imagens
      const filesToUpload = imageEntries.filter((e) => e.type === "file")
      const existingUrls = imageEntries.filter((e) => e.type === "url").map((e) => e.url)

      let uploadedUrls: string[] = []
      if (filesToUpload.length > 0) {
        setSaveLabel("Enviando imagens...")
        const results = await Promise.all(
          filesToUpload.map((entry) => uploadImageToSupabase(entry.file!))
        )
        const failed = results.filter((r) => r === null).length
        if (failed > 0) toast.error(`${failed} imagem(ns) falharam no upload`)
        uploadedUrls = results.filter((r): r is string => r !== null)
      }

      // Montar array final com capa na posição 0
      const allUrls = [...existingUrls, ...uploadedUrls]
      if (coverIndex > 0 && coverIndex < imageEntries.length) {
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

      // Montar payload flat
      setSaveLabel("Salvando sala...")
      const payload: RoomPayload = {
        name,
        description,
        floor,
        inventory,
        amenities,
        capacity: Number(capacity),
        cleaning_buffer: Number(cleaningBuffer),
        status,
        images: allUrls,
      }

      // Super Admin envia campos de preço
      if (isSuperAdmin) {
        // Franquias
        payload.min_hours_wd = Number(minHoursWd)
        payload.min_hours_we = Number(minHoursWe)
        // Dias úteis — base + extra
        payload.price_morning_wd = unmaskCurrency(priceMorningWd)
        payload.extra_hour_morning_wd = unmaskCurrency(extraMorningWd)
        payload.price_afternoon_wd = unmaskCurrency(priceAfternoonWd)
        payload.extra_hour_afternoon_wd = unmaskCurrency(extraAfternoonWd)
        payload.price_night_wd = unmaskCurrency(priceNightWd)
        payload.extra_hour_night_wd = unmaskCurrency(extraNightWd)
        // Fins de semana — base + extra
        payload.price_morning_we = unmaskCurrency(priceMorningWe)
        payload.extra_hour_morning_we = unmaskCurrency(extraMorningWe)
        payload.price_afternoon_we = unmaskCurrency(priceAfternoonWe)
        payload.extra_hour_afternoon_we = unmaskCurrency(extraAfternoonWe)
        payload.price_night_we = unmaskCurrency(priceNightWe)
        payload.extra_hour_night_we = unmaskCurrency(extraNightWe)
        // Montagem
        payload.allows_assembly = allowsAssembly
        if (allowsAssembly) {
          payload.assembly_half_price = unmaskCurrency(assemblyHalfPrice)
          payload.assembly_full_price = unmaskCurrency(assemblyFullPrice)
        }
      }

      const url = editingRoom
        ? `${API_BASE_URL}/webhook/59aa012a-1f02-424f-9ba5-90cea11a1468/api/spaces/${editingRoom.id}`
        : `${API_BASE_URL}/webhook/api/spaces`
      const method = editingRoom ? "PATCH" : "POST"

      const res = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json; charset=utf-8" },
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

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "operacional", label: "Informacoes", icon: <AlignLeft className="w-4 h-4" /> },
    ...(isSuperAdmin
      ? [{ id: "precificacao" as TabId, label: "Precificacao", icon: <CreditCard className="w-4 h-4" /> }]
      : []),
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl relative z-50 flex flex-col animate-in slide-in-from-right duration-300">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex justify-between items-center">
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

            {/* Tabs */}
            <div className="flex gap-1 mt-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                    activeTab === tab.id
                      ? "bg-white text-[#184689] border border-slate-200 border-b-white -mb-px relative z-10"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
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
                {/* ============================================ */}
                {/* ABA 1: INFORMAÇÕES OPERACIONAIS              */}
                {/* ============================================ */}
                {activeTab === "operacional" && (
                  <>
                    {/* Galeria de Imagens */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Galeria de Imagens
                      </h4>

                      {imageEntries.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {imageEntries.map((entry, idx) => (
                            <div key={`${entry.url}-${idx}`} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                              <img src={entry.url} alt="" className="w-full h-full object-cover" />
                              {entry.type === "file" && (
                                <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                  NOVA
                                </div>
                              )}
                              {coverIndex === idx && (
                                <div className="absolute top-2 left-2 bg-[#184689] text-white text-[10px] font-bold px-2 py-0.5 rounded">
                                  CAPA
                                </div>
                              )}
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

                    {/* Informações Básicas */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <AlignLeft className="w-4 h-4" /> Informacoes Basicas
                      </h4>
                      <div>
                        <label className={LABEL_CLASS}>Nome do Espaco</label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className={INPUT_CLASS}
                          placeholder="Ex: Sala de Reunioes 2"
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>Descricao</label>
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={2}
                          className={`${INPUT_CLASS} resize-none`}
                          placeholder="Descricao do espaco..."
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={LABEL_CLASS}>Capacidade Maxima (Pessoas)</label>
                          <input
                            type="number"
                            required
                            value={capacity}
                            onChange={(e) => setCapacity(e.target.value)}
                            className={INPUT_CLASS}
                            placeholder="Ex: 20"
                          />
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Tempo de Limpeza (min)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            value={cleaningBuffer}
                            onChange={(e) => setCleaningBuffer(e.target.value)}
                            className={INPUT_CLASS}
                            placeholder="Ex: 30"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={LABEL_CLASS}>
                            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Andar</span>
                          </label>
                          <select
                            value={floor}
                            onChange={(e) => setFloor(e.target.value)}
                            className={INPUT_CLASS}
                          >
                            {FLOOR_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={LABEL_CLASS}>Status</label>
                          <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className={INPUT_CLASS}
                          >
                            <option value="Disponível">Disponivel</option>
                            <option value="Indisponível">Indisponivel / Manutencao</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Comodidades (Amenities) */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Comodidades
                      </h4>
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

                    {/* Inventário */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <Package className="w-4 h-4" /> Inventario
                      </h4>
                      <div>
                        <label className={LABEL_CLASS}>Equipamentos e Infraestrutura</label>
                        <textarea
                          value={inventory}
                          onChange={(e) => setInventory(e.target.value)}
                          rows={4}
                          className={`${INPUT_CLASS} resize-none`}
                          placeholder="Ex: 1 Projetor Epson, 50 Cadeiras, 1 Mesa de Som, 2 Microfones..."
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* ============================================ */}
                {/* ABA 2: PRECIFICAÇÃO (Super Admin only)       */}
                {/* ============================================ */}
                {activeTab === "precificacao" && isSuperAdmin && (
                  <>
                    {/* Turnos — Dias Úteis */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Dias Uteis (Seg-Sex)
                      </h4>

                      {/* Header da grid */}
                      <div className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Turno</div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Valor Base (R$)</div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Hora Extra (R$)</div>
                      </div>

                      <ShiftRow
                        icon={<Sun className="w-4 h-4 text-amber-500" />}
                        label="Manha"
                        baseValue={priceMorningWd} onBaseChange={setPriceMorningWd}
                        extraValue={extraMorningWd} onExtraChange={setExtraMorningWd}
                      />
                      <ShiftRow
                        icon={<Sunset className="w-4 h-4 text-orange-500" />}
                        label="Tarde"
                        baseValue={priceAfternoonWd} onBaseChange={setPriceAfternoonWd}
                        extraValue={extraAfternoonWd} onExtraChange={setExtraAfternoonWd}
                      />
                      <ShiftRow
                        icon={<Moon className="w-4 h-4 text-indigo-500" />}
                        label="Noite"
                        baseValue={priceNightWd} onBaseChange={setPriceNightWd}
                        extraValue={extraNightWd} onExtraChange={setExtraNightWd}
                      />

                      {/* Franquia */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Clock className="w-4 h-4 text-slate-400" /> Franquia
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              value={minHoursWd}
                              onChange={(e) => setMinHoursWd(e.target.value)}
                              className={INPUT_CLASS}
                              placeholder="4"
                            />
                          </div>
                          <div className="text-xs text-slate-400 pl-1">horas incluidas</div>
                        </div>
                      </div>
                    </div>

                    {/* Turnos — Fins de Semana */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <CreditCard className="w-4 h-4" /> Fins de Semana (Sab-Dom)
                      </h4>

                      {/* Header da grid */}
                      <div className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
                        <div className="text-[10px] font-bold uppercase text-slate-400">Turno</div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Valor Base (R$)</div>
                        <div className="text-[10px] font-bold uppercase text-slate-400">Hora Extra (R$)</div>
                      </div>

                      <ShiftRow
                        icon={<Sun className="w-4 h-4 text-amber-500" />}
                        label="Manha"
                        baseValue={priceMorningWe} onBaseChange={setPriceMorningWe}
                        extraValue={extraMorningWe} onExtraChange={setExtraMorningWe}
                      />
                      <ShiftRow
                        icon={<Sunset className="w-4 h-4 text-orange-500" />}
                        label="Tarde"
                        baseValue={priceAfternoonWe} onBaseChange={setPriceAfternoonWe}
                        extraValue={extraAfternoonWe} onExtraChange={setExtraAfternoonWe}
                      />
                      <ShiftRow
                        icon={<Moon className="w-4 h-4 text-indigo-500" />}
                        label="Noite"
                        baseValue={priceNightWe} onBaseChange={setPriceNightWe}
                        extraValue={extraNightWe} onExtraChange={setExtraNightWe}
                      />

                      {/* Franquia */}
                      <div className="pt-3 border-t border-slate-100">
                        <div className="grid grid-cols-[120px_1fr_1fr] gap-3 items-center">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
                            <Clock className="w-4 h-4 text-slate-400" /> Franquia
                          </div>
                          <div>
                            <input
                              type="number"
                              min="1"
                              value={minHoursWe}
                              onChange={(e) => setMinHoursWe(e.target.value)}
                              className={INPUT_CLASS}
                              placeholder="4"
                            />
                          </div>
                          <div className="text-xs text-slate-400 pl-1">horas incluidas</div>
                        </div>
                      </div>
                    </div>

                    {/* Montagem */}
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 mb-2 border-b pb-2 flex items-center gap-2">
                        <Wrench className="w-4 h-4" /> Montagem
                      </h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Permitir Taxa de Montagem</p>
                          <p className="text-xs text-slate-500">Habilite para cobrar montagem/desmontagem do espaco.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAllowsAssembly((prev) => !prev)}
                          className="shrink-0"
                        >
                          {allowsAssembly ? (
                            <ToggleRight className="w-10 h-10 text-[#184689]" />
                          ) : (
                            <ToggleLeft className="w-10 h-10 text-slate-300" />
                          )}
                        </button>
                      </div>

                      {allowsAssembly && (
                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                          <div>
                            <label className={LABEL_CLASS}>Meio Periodo (R$)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={assemblyHalfPrice}
                              onChange={(e) => setAssemblyHalfPrice(maskCurrency(e.target.value))}
                              className={INPUT_CLASS}
                              placeholder="0,00"
                            />
                          </div>
                          <div>
                            <label className={LABEL_CLASS}>Periodo Completo (R$)</label>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={assemblyFullPrice}
                              onChange={(e) => setAssemblyFullPrice(maskCurrency(e.target.value))}
                              className={INPUT_CLASS}
                              placeholder="0,00"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
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
                  <Save className="w-4 h-4" /> Salvar Alteracoes
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
