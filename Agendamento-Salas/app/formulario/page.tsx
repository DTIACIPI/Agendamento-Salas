"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { cn, formatDateToISO, API_BASE_URL } from "@/lib/utils"
import Image from "next/image"
import { type Room } from "@/components/room-list"
import type { BookingItem } from "@/app/page"
import { CheckCircle2, Loader2 } from "lucide-react"

// Tipagem para o retorno do n8n
interface PricingData {
  success: boolean
  cnpj_consultado: string
  is_associado: boolean
  porcentagem_tier: number
  porcentagem_cupom: number
  valorTotalGeral: number
  descontoTotalGeral: number
  detalhes: {
    space_name: string
    horas_cobradas: number
    subtotal: number
    taxa_montagem: number
    descontos: number
    total: number
  }[]
}

function FormularioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const cnpj = searchParams.get("cnpj") || ""
  
  const [cartRooms, setCartRooms] = useState<string[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [pricingData, setPricingData] = useState<PricingData | null>(null)
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string
    discount_type: "percentage" | "fixed"
    discount_value: number
    description?: string
  } | null>(null)
  const [assemblyByRoom, setAssemblyByRoom] = useState<Record<string, "none" | "half" | "full">>({})

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [popup, setPopup] = useState<{ type: "success" | "error"; title: string; description: string } | null>(null)
  // Campos pre-preenchidos pelo Supera ficam travados para edicao
  const [lockedFields, setLockedFields] = useState<Set<string>>(new Set())
  // Exibe erros de validacao apos tentativa de submit
  const [showErrors, setShowErrors] = useState(false)

  // Estados do Formulário
  const [formData, setFormData] = useState({
    razaoSocial: "",
    nomeFantasia: "",
    inscricaoEstadual: "",
    cep: "",
    endereco: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "SP",
    nomeResponsavel: "",
    emailResponsavel: "",
    telefoneResponsavel: "",
    cargoResponsavel: "",
    opcaoPagamento: "",
  })

  // Dados de evento por booking (indexado por booking.id)
  interface EventData {
    nomeEvento: string
    finalidadeEvento: string
    participantes: string
    responsavelLocal: string
    contatoLocal: string
    observacoes: string
  }
  const emptyEventData: EventData = {
    nomeEvento: "", finalidadeEvento: "", participantes: "",
    responsavelLocal: "", contatoLocal: "", observacoes: "",
  }
  const [eventDataMap, setEventDataMap] = useState<Record<string, EventData>>({})
  const [activeEventTab, setActiveEventTab] = useState<string>("")

  useEffect(() => {
    // 1. Recupera as salas e horários selecionados
    const savedBooking = sessionStorage.getItem("acipi_booking_state")
    if (savedBooking) {
      try {
        const parsed = JSON.parse(savedBooking)
        if (parsed.cartRooms) setCartRooms(parsed.cartRooms)
        if (parsed.bookings) {
          setBookings(parsed.bookings.map((b: any) => ({
            ...b,
            selectedRange: {
              from: b.selectedRange.from ? new Date(b.selectedRange.from) : undefined,
              to: b.selectedRange.to ? new Date(b.selectedRange.to) : undefined,
            }
          })))
        }
      } catch (err) {
        console.error("Erro ao recuperar estado de booking:", err)
      }
    }

    // 2. Recupera os dados validados do n8n (Empresa + Preços + Infos da Sala)
    const savedPrep = sessionStorage.getItem("acipi_checkout_prep")
    if (savedPrep) {
      try {
        const parsedPrep = JSON.parse(savedPrep)
        
        // 🔥 RECUPERA AS SALAS SEM PRECISAR DE OUTRO FETCH 🔥
        if (parsedPrep.selectedRoomsData) {
          setRooms(parsedPrep.selectedRoomsData)
        }

        if (parsedPrep.pricing && parsedPrep.pricing.success) {
          setPricingData(parsedPrep.pricing)
        }

        if (parsedPrep.appliedCoupon) {
          setAppliedCoupon(parsedPrep.appliedCoupon)
        }

        if (parsedPrep.assemblyByRoom) {
          setAssemblyByRoom(parsedPrep.assemblyByRoom)
        }

        if (parsedPrep.company) {
          let c = parsedPrep.company;
          if (Array.isArray(c)) c = c[0]; 
          if (c && c.data) c = c.data;
          if (Array.isArray(c)) c = c[0];
          if (c && c.json) c = c.json;
          
          if (c) {
            let rawEmail = c.email || c.e_mail || "";
            if (rawEmail.includes(",")) rawEmail = rawEmail.split(",")[0].trim();

            let finalEndereco = c.endereco || c.logradouro || "";
            let finalNumero = c.numero || "";
            let finalCep = c.cep || "";
            let finalBairro = c.bairro || "";

            if ((!finalNumero || !finalCep) && finalEndereco) {
              const cepRegex = /\b\d{5}-?\d{3}\b/;
              const cepMatch = finalEndereco.match(cepRegex);
              if (cepMatch && !finalCep) {
                finalCep = cepMatch[0];
                finalEndereco = finalEndereco.replace(cepRegex, "").replace(/cep\s*:?/i, "").trim();
              }

              if (finalEndereco.includes(",")) {
                const parts = finalEndereco.split(",");
                finalEndereco = parts[0].trim(); 
                const resto = parts.slice(1).join(",").trim();
                
                const numMatch = resto.match(/\d+[a-zA-Z]?|S\/?N/i); 
                if (numMatch && !finalNumero) {
                  finalNumero = numMatch[0];
                }

                const bairroMatch = resto.split("-");
                if (bairroMatch.length > 1 && !finalBairro) {
                   finalBairro = bairroMatch[1].trim();
                }
              }
            }

            finalEndereco = finalEndereco.replace(/[-,\s]+$/, "").trim();

            const superaFields: Record<string, string> = {
              razaoSocial: c.razaoSocial || c.razao_social || "",
              nomeFantasia: c.nomeFantasia || c.nome_fantasia || "",
              inscricaoEstadual: c.inscricaoEstadual || c.inscricao_estadual || "",
              cep: finalCep,
              endereco: finalEndereco,
              numero: finalNumero,
              bairro: finalBairro,
              complemento: c.complemento || "",
              cidade: c.cidade || "",
              estado: c.uf || c.estado || "",
              nomeResponsavel: c.responsavel || "",
              emailResponsavel: rawEmail,
              telefoneResponsavel: c.telefone || c.celular || "",
            }

            // Trava para edicao apenas os campos que vieram preenchidos
            const locked = new Set<string>()
            for (const [key, val] of Object.entries(superaFields)) {
              if (val.trim()) locked.add(key)
            }
            setLockedFields(locked)

            setFormData(prev => ({ ...prev, ...superaFields }))
          }
        }
      } catch (err) {
        console.error("Erro ao recuperar dados da empresa/preço:", err)
      }
    }

    setIsHydrated(true)
  }, [])

  // Inicializar eventDataMap quando bookings carregam
  useEffect(() => {
    if (bookings.length === 0) return
    setEventDataMap(prev => {
      const next = { ...prev }
      for (const b of bookings) {
        if (!next[b.id]) next[b.id] = { ...emptyEventData }
      }
      return next
    })
    // Definir aba ativa como o primeiro booking
    setActiveEventTab(prev => prev || bookings[0]?.id || "")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings])

  const maskPhone = (v: string) => {
    let d = v.replace(/\D/g, "").slice(0, 11)
    if (d.length <= 2) return d.replace(/^(\d{0,2})/, "($1")
    if (d.length <= 7) return d.replace(/^(\d{2})(\d{0,5})/, "($1) $2")
    return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3")
  }

  const maskCep = (v: string) => {
    let d = v.replace(/\D/g, "").slice(0, 8)
    if (d.length <= 5) return d
    return d.replace(/^(\d{5})(\d{0,3})/, "$1-$2")
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (lockedFields.has(name)) return

    if (name === "telefoneResponsavel") {
      setFormData(prev => ({ ...prev, [name]: maskPhone(value) }))
      return
    }
    if (name === "cep") {
      setFormData(prev => ({ ...prev, [name]: maskCep(value) }))
      return
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  }

  // Handler para campos de evento por booking
  const handleEventChange = (bookingId: string, name: keyof EventData, value: string) => {
    setEventDataMap(prev => ({
      ...prev,
      [bookingId]: {
        ...(prev[bookingId] || emptyEventData),
        [name]: name === "contatoLocal" ? maskPhone(value)
               : name === "participantes" ? value.replace(/\D/g, "")
               : value,
      },
    }))
  }

  const isValidEmail = (email: string) => {
    if (!email) return true // vazio nao invalida (obrigatoriedade é checada separadamente)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const requiredFields: { key: keyof typeof formData; label: string }[] = [
    { key: "razaoSocial", label: "Razão Social" },
    { key: "cep", label: "CEP" },
    { key: "endereco", label: "Endereço" },
    { key: "numero", label: "Nº" },
    { key: "bairro", label: "Bairro" },
    { key: "cidade", label: "Cidade" },
    { key: "nomeResponsavel", label: "Nome do Responsável" },
    { key: "emailResponsavel", label: "E-mail do Responsável" },
    { key: "telefoneResponsavel", label: "Telefone do Responsável" },
    { key: "cargoResponsavel", label: "Cargo" },
    { key: "opcaoPagamento", label: "Opção de Pagamento" },
  ]

  const requiredEventFields: { key: keyof EventData; label: string }[] = [
    { key: "nomeEvento", label: "Nome do Evento" },
    { key: "finalidadeEvento", label: "Finalidade do Evento" },
    { key: "responsavelLocal", label: "Responsável no dia do evento" },
    { key: "contatoLocal", label: "Contato do Responsável no dia" },
  ]

  const isLocked = (name: string) => lockedFields.has(name)
  const isFieldRequired = (name: string) => requiredFields.some(f => f.key === name)
  const hasError = (name: string) => showErrors && isFieldRequired(name) && !formData[name as keyof typeof formData]?.trim()
  const hasEventError = (bookingId: string, name: keyof EventData) => {
    if (!showErrors) return false
    if (!requiredEventFields.some(f => f.key === name)) return false
    return !(eventDataMap[bookingId]?.[name]?.trim())
  }
  const inputClass = (name: string) => {
    if (isLocked(name)) return "w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm"
    const errorBorder = hasError(name) ? "border-red-400 ring-1 ring-red-200" : "border-gray-300"
    return `w-full rounded-md border ${errorBorder} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm`
  }

  const cartBookings = bookings.filter(b => cartRooms.includes(b.roomId))

  const allEventsValid = cartBookings.every(b => {
    const ed = eventDataMap[b.id]
    if (!ed) return false
    return requiredEventFields.every(f => ed[f.key]?.trim() !== "")
  })

  const isFormValid = requiredFields.every(f => formData[f.key].trim() !== "") && isValidEmail(formData.emailResponsavel) && allEventsValid

  const handleFinalize = async () => {
    const missing = requiredFields.filter(f => formData[f.key].trim() === "")
    // Checar campos de evento obrigatórios por booking
    const missingEvents: string[] = []
    for (const b of cartBookings) {
      const ed = eventDataMap[b.id]
      const roomName = rooms.find(r => r.id === b.roomId)?.name || "Sala"
      for (const f of requiredEventFields) {
        if (!ed?.[f.key]?.trim()) {
          missingEvents.push(`${f.label} (${roomName})`)
        }
      }
    }
    if (missing.length > 0 || missingEvents.length > 0) {
      setShowErrors(true)
      setPopup({
        type: "error",
        title: "Preencha todos os campos obrigatórios",
        description: [...missing.map(f => f.label), ...missingEvents].join(", "),
      })
      return
    }

    setIsSubmitting(true)

    const requests = cartBookings.map(item => {
      const roomName = rooms.find(r => r.id === item.roomId)?.name || ""
      const roomPricingDetail = pricingData?.detalhes.find(d => d.space_name === roomName)

      // Usar valores já calculados pela API quando disponíveis
      const itemSubtotal = roomPricingDetail?.subtotal ?? item.price
      const itemDesconto = roomPricingDetail?.descontos ?? 0
      const itemTaxaMontagem = roomPricingDetail?.taxa_montagem ?? 0
      const subtotalAposDescontoItem = itemSubtotal - itemDesconto

      // Cupom aplica APENAS sobre subtotal das horas, NUNCA sobre taxa_montagem
      let itemCouponDiscount = 0
      if (appliedCoupon) {
        if (appliedCoupon.discount_type === "percentage") {
          itemCouponDiscount = subtotalAposDescontoItem * (appliedCoupon.discount_value / 100)
        } else {
          // Fixo: proporcional ao peso deste item no total de horas
          const totalSubtotalHoras = cartBookings.reduce((sum, b) => {
            const rn = rooms.find(r => r.id === b.roomId)?.name || ""
            const rd = pricingData?.detalhes.find(d => d.space_name === rn)
            return sum + (rd ? rd.subtotal - rd.descontos : b.price)
          }, 0)
          const proportion = totalSubtotalHoras > 0 ? subtotalAposDescontoItem / totalSubtotalHoras : 0
          itemCouponDiscount = Math.min(appliedCoupon.discount_value * proportion, subtotalAposDescontoItem)
        }
      }

      const finalAmount = subtotalAposDescontoItem - itemCouponDiscount + itemTaxaMontagem

      const payload = {
        company: {
          cnpj: cnpj.replace(/\D/g, ""),
          razao_social: formData.razaoSocial,
          inscricao_estadual: formData.inscricaoEstadual,
          cep: formData.cep.replace(/\D/g, ""),
          endereco: formData.endereco,
        },
        user: {
          name: formData.nomeResponsavel,
          email: formData.emailResponsavel,
          phone: formData.telefoneResponsavel.replace(/\D/g, ""),
          role: formData.cargoResponsavel,
        },
        booking: {
          booking_type: "Locação Cliente",
          space_id: item.roomId,
          space_name: roomName,
          date: item.selectedRange.from ? formatDateToISO(item.selectedRange.from) : "",
          startTime: item.startTime,
          endTime: item.endTime,
          requires_assembly: (assemblyByRoom[item.roomId] || "none") !== "none" ? assemblyByRoom[item.roomId] : null,
          event_name: eventDataMap[item.id]?.nomeEvento || "",
          event_purpose: eventDataMap[item.id]?.finalidadeEvento || "",
          estimated_attendees: eventDataMap[item.id]?.participantes ? parseInt(eventDataMap[item.id].participantes) : null,
          onsite_contact_name: eventDataMap[item.id]?.responsavelLocal || "",
          onsite_contact_phone: (eventDataMap[item.id]?.contatoLocal || "").replace(/\D/g, ""),
          payment_method: formData.opcaoPagamento,
          total_amount: finalAmount,
          coupon_code: appliedCoupon?.code || null,
          coupon_discount: itemCouponDiscount > 0 ? itemCouponDiscount : null,
        },
      }

      return fetch(`${API_BASE_URL}/webhook/api/public/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
    })

    try {
      const responses = await Promise.all(requests)
      const allOk = responses.every(res => res.ok)

      if (allOk) {
        sessionStorage.removeItem("acipi_booking_state")
        sessionStorage.removeItem("acipi_checkout_prep")
        setPopup({
          type: "success",
          title: "Reserva(s) enviada(s) com sucesso!",
          description: "Você será redirecionado para a página inicial.",
        })
        setTimeout(() => router.push("/"), 2500)
      } else {
        setPopup({
          type: "error",
          title: "Erro ao enviar uma ou mais reservas",
          description: "Verifique os dados e tente novamente.",
        })
        setIsSubmitting(false)
      }
    } catch {
      setPopup({
        type: "error",
        title: "Erro de conexão",
        description: "Verifique sua internet e tente novamente.",
      })
      setIsSubmitting(false)
    }
  }

  const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  // Subtotal = soma dos subtotais (horas) de cada sala
  // Taxa de montagem fica fora do cálculo de cupom
  const subtotalHoras = pricingData?.detalhes.reduce((sum, d) => sum + d.subtotal, 0) ?? 0
  const totalTaxaMontagem = pricingData?.detalhes.reduce((sum, d) => sum + (d.taxa_montagem || 0), 0) ?? 0
  const descontoAssociado = pricingData?.descontoTotalGeral ?? 0
  const subtotalAposDesconto = subtotalHoras - descontoAssociado

  // Cupom aplica APENAS sobre subtotal das horas, NUNCA sobre taxa_montagem
  const valorDescontoCupom = appliedCoupon
    ? appliedCoupon.discount_type === "percentage"
      ? subtotalAposDesconto * (appliedCoupon.discount_value / 100)
      : Math.min(appliedCoupon.discount_value, subtotalAposDesconto)
    : 0
  const valorFinalComCupom = subtotalAposDesconto - valorDescontoCupom + totalTaxaMontagem

  return (
    <main className="mx-auto w-full max-w-[1920px] flex-1 px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-2">
        <button 
          onClick={() => router.back()} 
          className="text-sm font-medium text-primary hover:underline inline-block w-fit cursor-pointer"
        >
          &larr; Voltar
        </button>
        <h2 className="text-2xl font-bold tracking-tight text-[#384050]">
          Formulário de Contrato
        </h2>
        <p className="text-sm text-muted-foreground">
          Preencha os dados abaixo para elaborar o contrato de locação.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Coluna da Esquerda: Resumo da Reserva */}
        <div className="order-2 lg:order-1 lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3">Resumo da Seleção</h3>
            
            {!isHydrated ? (
              <div className="text-sm text-muted-foreground">Carregando detalhes...</div>
            ) : cartRooms.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma sala selecionada.</div>
            ) : (
              <div className="flex flex-col gap-6">
                {cartRooms.map(roomId => {
                  const room = rooms.find(r => r.id === roomId)
                  const roomBookings = cartBookings.filter(b => b.roomId === roomId)
                  if (!room || roomBookings.length === 0) return null

                  const roomPricing = pricingData?.detalhes.find(d => d.space_name === room.name)
                  
                  return (
                    <div key={roomId} className="flex flex-col gap-3">
                      <div className="relative w-full h-36 rounded-lg overflow-hidden border bg-gray-50">
                        <Image 
                          src={room.image} 
                          alt={room.name} 
                          fill 
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-[#384050] text-base">{room.name}</span>
                        <div className="flex flex-col gap-2 mt-2">
                          {roomBookings.map(b => (
                            <div key={b.id} className="flex flex-col bg-slate-50 p-2.5 rounded-md border gap-1">
                              <span className="text-sm font-semibold text-[#384050]">
                                {b.selectedRange.from?.toLocaleDateString("pt-BR")}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Das {b.startTime} às {b.endTime}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Subtotal da Sala Específica */}
                        {roomPricing ? (
                          <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Valor das Horas ({roomPricing.horas_cobradas}h)</span>
                              <span>{formatMoney(roomPricing.subtotal)}</span>
                            </div>
                            {roomPricing.descontos > 0 && (
                              <div className="flex justify-between text-xs text-green-600 font-medium">
                                <span>Desconto Associado</span>
                                <span>-{formatMoney(roomPricing.descontos)}</span>
                              </div>
                            )}
                            {roomPricing.taxa_montagem > 0 && (
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Taxa de Montagem</span>
                                <span>{formatMoney(roomPricing.taxa_montagem)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-[#384050] border-t pt-1.5 mt-1">
                              <span>Total da Sala</span>
                              <span>{formatMoney(roomPricing.total)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Estimativa ({roomBookings.length} reserva{roomBookings.length > 1 ? 's' : ''})</span>
                              <span>{formatMoney(roomBookings.reduce((sum, b) => sum + (b.price || 0), 0))}</span>
                            </div>
                            <div className="flex justify-between text-sm font-bold text-[#384050] border-t pt-1.5 mt-1">
                              <span>Total da Sala</span>
                              <span>{formatMoney(roomBookings.reduce((sum, b) => sum + (b.price || 0), 0))}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {/* Painel Financeiro Final */}
                {pricingData ? (
                  <div className="border-t-2 border-dashed pt-5 mt-2 flex flex-col gap-3">
                    {pricingData.is_associado && pricingData.porcentagem_tier > 0 && (
                      <div className="flex items-start gap-2 bg-green-50 text-green-800 p-3 rounded-md border border-green-200">
                        <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                        <div className="flex flex-col text-sm">
                          <span className="font-bold">Desconto de {pricingData.porcentagem_tier}% aplicado!</span>
                          <span className="text-xs opacity-90">Empresa associada à ACIPI.</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Valor das Horas</span>
                        <span>{formatMoney(subtotalHoras)}</span>
                      </div>
                      {descontoAssociado > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Desconto Associado</span>
                          <span>-{formatMoney(descontoAssociado)}</span>
                        </div>
                      )}
                      {appliedCoupon && valorDescontoCupom > 0 && (
                        <div className="flex justify-between items-center text-sm text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-100 font-medium">
                          <span>Cupom ({appliedCoupon.code})</span>
                          <span>-{formatMoney(valorDescontoCupom)}</span>
                        </div>
                      )}
                      {totalTaxaMontagem > 0 && (
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Taxa de Montagem</span>
                          <span>{formatMoney(totalTaxaMontagem)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-end border-t pt-3 mt-1">
                        <span className="text-base font-bold text-[#384050]">Valor Final</span>
                        <span className="text-2xl font-black text-primary leading-none">
                          {formatMoney(valorFinalComCupom)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-t-2 border-dashed pt-5 mt-2 flex flex-col gap-3">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Estimativa Total</span>
                        <span>{formatMoney(cartBookings.reduce((sum, b) => sum + (b.price || 0), 0))}</span>
                      </div>
                      <div className="flex justify-between items-end border-t pt-3 mt-1">
                        <span className="text-base font-bold text-[#384050]">Total Estimado</span>
                        <span className="text-2xl font-black text-primary leading-none">
                          {formatMoney(cartBookings.reduce((sum, b) => sum + (b.price || 0), 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Formulário Completo */}
        <div className="order-1 lg:order-2 lg:col-span-8 flex flex-col gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Dados Cadastrais</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Razão social</label>
                <input name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} readOnly={isLocked("razaoSocial")} type="text" placeholder="Nome da empresa" className={inputClass("razaoSocial")} />
                {hasError("razaoSocial") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome fantasia</label>
                <input name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} readOnly={isLocked("nomeFantasia")} type="text" placeholder="Nome fantasia" className={inputClass("nomeFantasia")} />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">CNPJ</label>
                <input type="text" value={cnpj} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Inscrição estadual</label>
                <input name="inscricaoEstadual" value={formData.inscricaoEstadual} onChange={handleChange} readOnly={isLocked("inscricaoEstadual")} type="text" placeholder="Isento" className={inputClass("inscricaoEstadual")} />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">CEP</label>
                <input name="cep" value={formData.cep} onChange={handleChange} readOnly={isLocked("cep")} type="text" inputMode="numeric" placeholder="00000-000" maxLength={9} className={inputClass("cep")} />
                {hasError("cep") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Endereço</label>
                <input name="endereco" value={formData.endereco} onChange={handleChange} readOnly={isLocked("endereco")} type="text" placeholder="Rua, Avenida..." className={inputClass("endereco")} />
                {hasError("endereco") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nº</label>
                <input name="numero" value={formData.numero} onChange={handleChange} readOnly={isLocked("numero")} type="text" placeholder="Nº" className={inputClass("numero")} />
                {hasError("numero") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Complemento</label>
                <input name="complemento" value={formData.complemento} onChange={handleChange} readOnly={isLocked("complemento")} type="text" placeholder="Sala, Andar..." className={inputClass("complemento")} />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Bairro</label>
                <input name="bairro" value={formData.bairro} onChange={handleChange} readOnly={isLocked("bairro")} type="text" placeholder="Bairro" className={inputClass("bairro")} />
                {hasError("bairro") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Cidade</label>
                <input name="cidade" value={formData.cidade} onChange={handleChange} readOnly={isLocked("cidade")} type="text" placeholder="Cidade" className={inputClass("cidade")} />
                {hasError("cidade") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Estado</label>
                {isLocked("estado") ? (
                  <input name="estado" value={formData.estado} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
                ) : (
                  <select name="estado" value={formData.estado} onChange={handleChange} className={inputClass("estado")}>
                    <option value="">Selecione...</option>
                    <option value="AC">AC</option>
                    <option value="AL">AL</option>
                    <option value="AP">AP</option>
                    <option value="AM">AM</option>
                    <option value="BA">BA</option>
                    <option value="CE">CE</option>
                    <option value="DF">DF</option>
                    <option value="ES">ES</option>
                    <option value="GO">GO</option>
                    <option value="MA">MA</option>
                    <option value="MT">MT</option>
                    <option value="MS">MS</option>
                    <option value="MG">MG</option>
                    <option value="PA">PA</option>
                    <option value="PB">PB</option>
                    <option value="PR">PR</option>
                    <option value="PE">PE</option>
                    <option value="PI">PI</option>
                    <option value="RJ">RJ</option>
                    <option value="RN">RN</option>
                    <option value="RS">RS</option>
                    <option value="RO">RO</option>
                    <option value="RR">RR</option>
                    <option value="SC">SC</option>
                    <option value="SP">SP</option>
                    <option value="SE">SE</option>
                    <option value="TO">TO</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Dados do Responsável</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome completo do responsável</label>
                <input name="nomeResponsavel" value={formData.nomeResponsavel} onChange={handleChange} readOnly={isLocked("nomeResponsavel")} type="text" placeholder="Nome completo" className={inputClass("nomeResponsavel")} />
                {hasError("nomeResponsavel") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">E-mail do responsável</label>
                <input name="emailResponsavel" value={formData.emailResponsavel} onChange={handleChange} readOnly={isLocked("emailResponsavel")} type="email" placeholder="email@exemplo.com" className={inputClass("emailResponsavel")} />
                {hasError("emailResponsavel") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                {!hasError("emailResponsavel") && formData.emailResponsavel && !isValidEmail(formData.emailResponsavel) && <span className="text-xs text-amber-500 mt-1">E-mail inválido</span>}
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Telefone do responsável</label>
                <input name="telefoneResponsavel" value={formData.telefoneResponsavel} onChange={handleChange} readOnly={isLocked("telefoneResponsavel")} type="tel" inputMode="numeric" placeholder="(00) 00000-0000" maxLength={15} className={inputClass("telefoneResponsavel")} />
                {hasError("telefoneResponsavel") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Cargo</label>
                <input name="cargoResponsavel" value={formData.cargoResponsavel} onChange={handleChange} type="text" placeholder="Ex: Diretor, Gerente..." className={inputClass("cargoResponsavel")} />
                {hasError("cargoResponsavel") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-4">Sobre o Evento</h3>

            {cartBookings.length > 1 && (
              <p className="text-sm text-slate-500 mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Preencha as informacoes do evento para <strong>cada sala selecionada</strong>. Utilize as abas abaixo para alternar entre elas.
              </p>
            )}

            {/* Abas por sala/booking — só mostra se houver mais de 1 */}
            {cartBookings.length > 1 && (
              <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
                {cartBookings.map((b) => {
                  const room = rooms.find(r => r.id === b.roomId)
                  const isActive = activeEventTab === b.id
                  const ed = eventDataMap[b.id]
                  const hasIncomplete = requiredEventFields.some(f => !ed?.[f.key]?.trim())
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setActiveEventTab(b.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors border ${
                        isActive
                          ? "bg-[#184689] text-white border-[#184689]"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span>{room?.name || "Sala"}</span>
                      <span className={`text-[10px] ${isActive ? "text-blue-200" : "text-slate-400"}`}>
                        {b.selectedRange.from?.toLocaleDateString("pt-BR")} {b.startTime}-{b.endTime}
                      </span>
                      {showErrors && hasIncomplete && (
                        <span className={`w-2 h-2 rounded-full ${isActive ? "bg-red-300" : "bg-red-500"}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Campos do evento — renderiza o booking ativo */}
            {cartBookings.map((b) => {
              if (cartBookings.length > 1 && activeEventTab !== b.id) return null
              const room = rooms.find(r => r.id === b.roomId)
              const ed = eventDataMap[b.id] || emptyEventData
              const evInputClass = (name: keyof EventData) => {
                const err = hasEventError(b.id, name)
                const border = err ? "border-red-400 ring-1 ring-red-200" : "border-gray-300"
                return `w-full rounded-md border ${border} px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm`
              }

              return (
                <div key={b.id} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  {/* Info da sala (readonly) */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Sala</label>
                    <input type="text" value={room?.name || ""} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Data</label>
                    <input type="text" value={b.selectedRange.from?.toLocaleDateString("pt-BR") || ""} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
                  </div>
                  <div className="md:col-span-2.5">
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Inicio</label>
                    <input type="text" value={b.startTime} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
                  </div>
                  <div className="md:col-span-2.5">
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">Termino</label>
                    <input type="text" value={b.endTime} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
                  </div>

                  {/* Campos editáveis */}
                  <div className="md:col-span-6">
                    <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome do evento</label>
                    <input type="text" value={ed.nomeEvento} onChange={(e) => handleEventChange(b.id, "nomeEvento", e.target.value)} placeholder="Ex: Workshop de Tecnologia" className={evInputClass("nomeEvento")} />
                    {hasEventError(b.id, "nomeEvento") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div className="md:col-span-6">
                    <label className="block text-sm font-semibold text-[#384050] mb-1.5">Finalidade do evento</label>
                    <input type="text" value={ed.finalidadeEvento} onChange={(e) => handleEventChange(b.id, "finalidadeEvento", e.target.value)} placeholder="Ex: Treinamento, Reunião, Palestra..." className={evInputClass("finalidadeEvento")} />
                    {hasEventError(b.id, "finalidadeEvento") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-semibold text-[#384050] mb-1.5">Participantes</label>
                    <input type="text" inputMode="numeric" value={ed.participantes} onChange={(e) => handleEventChange(b.id, "participantes", e.target.value)} placeholder="Ex: 50" className={evInputClass("participantes")} />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-semibold text-[#384050] mb-1.5">Responsavel no dia</label>
                    <input type="text" value={ed.responsavelLocal} onChange={(e) => handleEventChange(b.id, "responsavelLocal", e.target.value)} placeholder="Nome de quem estará presente" className={evInputClass("responsavelLocal")} />
                    {hasEventError(b.id, "responsavelLocal") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div className="md:col-span-5">
                    <label className="block text-sm font-semibold text-[#384050] mb-1.5">Contato do responsavel</label>
                    <input type="tel" inputMode="numeric" value={ed.contatoLocal} onChange={(e) => handleEventChange(b.id, "contatoLocal", e.target.value)} placeholder="(00) 00000-0000" maxLength={15} className={evInputClass("contatoLocal")} />
                    {hasEventError(b.id, "contatoLocal") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
                  </div>
                  <div className="md:col-span-12">
                    <label className="block text-sm font-semibold text-[#384050] mb-1.5">Informacoes adicionais</label>
                    <textarea value={ed.observacoes} onChange={(e) => handleEventChange(b.id, "observacoes", e.target.value)} rows={2} placeholder="Necessidades especiais, equipamentos extras..." className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm resize-none" />
                  </div>
                </div>
              )
            })}

            {/* Pagamento — global, fora das abas */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4 pt-4 border-t border-slate-100">
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Opcao de pagamento</label>
                <select name="opcaoPagamento" value={formData.opcaoPagamento} onChange={handleChange} className={inputClass("opcaoPagamento")}>
                  <option value="">Selecione...</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="pix">PIX</option>
                </select>
                {hasError("opcaoPagamento") && <span className="text-xs text-red-500 mt-1">Campo obrigatório</span>}
              </div>
            </div>
          </div>

          <div className="flex justify-end pb-20 sm:pb-12 gap-3">
            <button
              onClick={handleFinalize}
              disabled={isSubmitting || !isFormValid}
              className={cn(
                "w-full sm:w-auto rounded-lg bg-primary px-8 py-3 text-base font-bold text-primary-foreground transition-colors shadow-sm flex items-center justify-center gap-2",
                isSubmitting || !isFormValid ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:bg-primary/90"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando Reservas...
                </>
              ) : (
                "Concluir Reserva"
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Popup de Sucesso / Erro */}
      {popup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="animate-scale-in bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-[90vw] flex flex-col items-center gap-4 text-center">
            {popup.type === "success" ? (
              <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#22c55e" strokeWidth="4" className="animate-circle" />
                <path d="M30 52 L44 66 L70 36" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" className="animate-check" />
              </svg>
            ) : (
              <svg className="w-20 h-20" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="45" stroke="#ef4444" strokeWidth="4" className="animate-circle" />
                <line x1="35" y1="35" x2="65" y2="65" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className="animate-x-line" />
                <line x1="65" y1="35" x2="35" y2="65" stroke="#ef4444" strokeWidth="4" strokeLinecap="round" className="animate-x-line" />
              </svg>
            )}
            <h3 className={cn("text-lg font-bold", popup.type === "success" ? "text-green-600" : "text-red-600")}>
              {popup.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{popup.description}</p>
            {popup.type === "error" && (
              <button
                onClick={() => setPopup(null)}
                className="mt-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Entendi
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  )
}

export default function FormularioPage() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <Header />
      <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Carregando formulário...</div>}>
        <FormularioContent />
      </Suspense>
    </div>
  )
}