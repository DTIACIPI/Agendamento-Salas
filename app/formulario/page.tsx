"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { cn, formatDateToISO } from "@/lib/utils"
import Image from "next/image"
import { type Room } from "@/components/room-list"
import type { BookingItem } from "@/app/page"
import { CheckCircle2, Loader2 } from "lucide-react"

// Tipagem para o retorno do n8n
interface PricingData {
  success: boolean
  cnpj_consultado: string
  is_associado: boolean
  porcentagem_desconto: number
  tempo_associacao: string
  valorTotalGeral: number
  descontoTotalGeral: number
  detalhes: {
    space_name: string
    subtotal: number
    discount: number
    total: number
    quantidade_reservas: number
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

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [popup, setPopup] = useState<{ type: "success" | "error"; title: string; description: string } | null>(null)

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
    nomeEvento: "",
    finalidadeEvento: "",
    numeroParticipantes: "",
    responsavelLocal: "",
    contatoLocal: "",
    opcaoPagamento: "",
    observacoes: "",
  })

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

            setFormData(prev => ({
              ...prev,
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
              telefoneResponsavel: c.telefone || c.celular || ""
            }))
          }
        }
      } catch (err) {
        console.error("Erro ao recuperar dados da empresa/preço:", err)
      }
    }

    setIsHydrated(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
    { key: "nomeEvento", label: "Nome do Evento" },
    { key: "finalidadeEvento", label: "Finalidade do Evento" },
    { key: "numeroParticipantes", label: "Número de Participantes" },
    { key: "responsavelLocal", label: "Responsável no dia do evento" },
    { key: "contatoLocal", label: "Contato do Responsável no dia" },
    { key: "opcaoPagamento", label: "Opção de Pagamento" },
  ]

  const isFormValid = requiredFields.every(f => formData[f.key].trim() !== "")

  const handleFinalize = async () => {
    const missing = requiredFields.filter(f => formData[f.key].trim() === "")
    if (missing.length > 0) {
      setPopup({
        type: "error",
        title: "Preencha todos os campos obrigatórios",
        description: missing.map(f => f.label).join(", "),
      })
      return
    }

    setIsSubmitting(true)

    const discountMultiplier = pricingData?.is_associado && pricingData.porcentagem_desconto > 0
      ? 1 - pricingData.porcentagem_desconto / 100
      : 1

    const requests = cartBookings.map(item => {
      const payload = {
        company: {
          cnpj: cnpj.replace(/[^\d]/g, ""),
          razao_social: formData.razaoSocial,
          inscricao_estadual: formData.inscricaoEstadual,
          cep: formData.cep,
          endereco: formData.endereco,
        },
        user: {
          name: formData.nomeResponsavel,
          email: formData.emailResponsavel,
          phone: formData.telefoneResponsavel,
          role: formData.cargoResponsavel,
        },
        booking: {
          space_id: item.roomId,
          space_name: rooms.find(r => r.id === item.roomId)?.name || "",
          date: item.selectedRange.from ? formatDateToISO(item.selectedRange.from) : "",
          startTime: item.startTime,
          endTime: item.endTime,
          event_name: formData.nomeEvento,
          event_purpose: formData.finalidadeEvento,
          estimated_attendees: parseInt(formData.numeroParticipantes, 10) || 0,
          onsite_contact_name: formData.responsavelLocal,
          onsite_contact_phone: formData.contatoLocal,
          payment_method: formData.opcaoPagamento,
          total_amount: item.price * discountMultiplier,
        },
      }

      return fetch("https://acipiapi.eastus.cloudapp.azure.com/webhook/api/bookings", {
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

  const cartBookings = bookings.filter(b => cartRooms.includes(b.roomId))

  const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

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
                        {roomPricing && (
                          <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-100 flex flex-col gap-1.5">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Subtotal ({roomPricing.quantidade_reservas} reserva{roomPricing.quantidade_reservas > 1 ? 's' : ''})</span>
                              <span>{formatMoney(roomPricing.subtotal)}</span>
                            </div>
                            {roomPricing.discount > 0 && (
                              <div className="flex justify-between text-xs text-green-600 font-medium">
                                <span>Desconto Associado</span>
                                <span>-{formatMoney(roomPricing.discount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-[#384050] border-t pt-1.5 mt-1">
                              <span>Total da Sala</span>
                              <span>{formatMoney(roomPricing.total)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
                
                {/* Painel Financeiro Final */}
                {pricingData && (
                  <div className="border-t-2 border-dashed pt-5 mt-2 flex flex-col gap-3">
                    {pricingData.is_associado && pricingData.porcentagem_desconto > 0 && (
                      <div className="flex items-start gap-2 bg-green-50 text-green-800 p-3 rounded-md border border-green-200">
                        <CheckCircle2 className="size-4 mt-0.5 shrink-0" />
                        <div className="flex flex-col text-sm">
                          <span className="font-bold">Desconto de {pricingData.porcentagem_desconto}% aplicado!</span>
                          <span className="text-xs opacity-90">Empresa associada há {pricingData.tempo_associacao}.</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Valor Original</span>
                        <span>{formatMoney(pricingData.valorTotalGeral + pricingData.descontoTotalGeral)}</span>
                      </div>
                      {pricingData.descontoTotalGeral > 0 && (
                        <div className="flex justify-between text-sm text-green-600 font-medium">
                          <span>Total de Descontos</span>
                          <span>-{formatMoney(pricingData.descontoTotalGeral)}</span>
                        </div>
                      )}
                      <div className="flex justify-between items-end border-t pt-3 mt-1">
                        <span className="text-base font-bold text-[#384050]">Valor Final</span>
                        <span className="text-2xl font-black text-primary leading-none">
                          {formatMoney(pricingData.valorTotalGeral)}
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
                <input name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome fantasia</label>
                <input name="nomeFantasia" value={formData.nomeFantasia} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">CNPJ</label>
                <input type="text" value={cnpj} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Inscrição estadual</label>
                <input name="inscricaoEstadual" value={formData.inscricaoEstadual} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">CEP</label>
                <input name="cep" value={formData.cep} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Endereço</label>
                <input name="endereco" value={formData.endereco} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nº</label>
                <input name="numero" value={formData.numero} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Complemento</label>
                <input name="complemento" value={formData.complemento} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Bairro</label>
                <input name="bairro" value={formData.bairro} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Cidade</label>
                <input name="cidade" value={formData.cidade} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Estado</label>
                <input name="estado" value={formData.estado} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Dados do Responsável</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome completo do responsável</label>
                <input name="nomeResponsavel" value={formData.nomeResponsavel} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">E-mail do responsável</label>
                <input name="emailResponsavel" value={formData.emailResponsavel} onChange={handleChange} type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Telefone do responsável</label>
                <input name="telefoneResponsavel" value={formData.telefoneResponsavel} onChange={handleChange} type="tel" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Cargo</label>
                <input name="cargoResponsavel" value={formData.cargoResponsavel} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Sobre o Evento</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome do evento</label>
                <input name="nomeEvento" value={formData.nomeEvento} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Finalidade do evento</label>
                <input name="finalidadeEvento" value={formData.finalidadeEvento} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Data</label>
                <input 
                  type="text"
                  value={cartBookings.length === 1 && cartBookings[0].selectedRange.from ? cartBookings[0].selectedRange.from.toLocaleDateString("pt-BR") : (cartBookings.length > 1 ? "Múltiplas datas (vide resumo)" : "")}
                  readOnly
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" 
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Horário de início</label>
                <input 
                  type="text"
                  value={cartBookings.length === 1 ? cartBookings[0].startTime : (cartBookings.length > 1 ? "Vários" : "")}
                  readOnly
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" 
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Horário de término</label>
                <input 
                  type="text"
                  value={cartBookings.length === 1 ? cartBookings[0].endTime : (cartBookings.length > 1 ? "Vários" : "")}
                  readOnly
                  className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" 
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Número de participantes</label>
                <input name="numeroParticipantes" value={formData.numeroParticipantes} onChange={handleChange} type="number" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Responsável no dia do evento</label>
                <input name="responsavelLocal" value={formData.responsavelLocal} onChange={handleChange} type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Contato do responsável</label>
                <input name="contatoLocal" value={formData.contatoLocal} onChange={handleChange} type="tel" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Opção de pagamento</label>
                <select name="opcaoPagamento" value={formData.opcaoPagamento} onChange={handleChange} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm">
                  <option value="">Selecione...</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Informações adicionais do evento</label>
                <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm resize-none"></textarea>
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