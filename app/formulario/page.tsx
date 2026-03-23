"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { cn } from "@/lib/utils"
import Image from "next/image"
import { ROOMS } from "@/components/room-list"
import type { BookingItem } from "@/app/page"

function FormularioContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const cnpj = searchParams.get("cnpj") || ""
  
  const [cartRooms, setCartRooms] = useState<string[]>([])
  const [bookings, setBookings] = useState<BookingItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const saved = sessionStorage.getItem("acipi_booking_state")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
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
        console.error("Erro ao recuperar estado:", err)
      }
    }
    setIsHydrated(true)
  }, [])

  const handleFinalize = () => {
    // Aqui você pode adicionar a lógica de envio (API) do formulário
    sessionStorage.removeItem("acipi_booking_state")
    alert("Reserva enviada com sucesso!")
    router.push("/")
  }

  const cartBookings = bookings.filter(b => cartRooms.includes(b.roomId))
  const total = cartBookings.reduce((sum, b) => sum + b.price, 0)

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
        <div className="lg:col-span-3 lg:sticky lg:top-24 flex flex-col gap-4">
          <div className="bg-white p-5 rounded-xl border shadow-sm flex flex-col gap-5">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3">Resumo da Seleção</h3>
            
            {!isHydrated ? (
              <div className="text-sm text-muted-foreground">Carregando detalhes...</div>
            ) : cartRooms.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma sala selecionada.</div>
            ) : (
              <div className="flex flex-col gap-6">
                {cartRooms.map(roomId => {
                  const room = ROOMS.find(r => r.id === roomId)
                  const roomBookings = cartBookings.filter(b => b.roomId === roomId)
                  if (!room || roomBookings.length === 0) return null
                  
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
                              <div className="flex justify-between items-start">
                                <span className="text-sm font-semibold text-[#384050]">
                                  {b.selectedRange.from?.toLocaleDateString("pt-BR")}
                                </span>
                                <span className="text-sm font-bold text-[#384050]">
                                  R$ {b.price.toFixed(2).replace(".", ",")}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Das {b.startTime} às {b.endTime}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="border-t pt-4 flex flex-col gap-1">
                  <div className="flex justify-between items-center text-sm font-medium text-muted-foreground">
                    <span>Subtotal</span>
                    <span>R$ {total.toFixed(2).replace(".", ",")}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-primary mt-1">
                    <span>Total com desconto (Assoc.)</span>
                    <span>R$ {(total * 0.9).toFixed(2).replace(".", ",")}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Coluna da Direita: Formulário Completo */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          {/* Dados Cadastrais */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Dados Cadastrais</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Razão social</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome fantasia</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">CNPJ</label>
                <input type="text" value={cnpj} readOnly className="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Inscrição estadual</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">CEP</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Endereço</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nº</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-5">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Complemento</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Bairro</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Cidade</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-4">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Estado</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm">
                  <option value="">Selecione...</option>
                  <option value="SP">São Paulo</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dados do Responsável */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Dados do Responsável</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome completo do responsável</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">E-mail do responsável</label>
                <input type="email" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Telefone do responsável</label>
                <input type="tel" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Cargo</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
            </div>
          </div>

          {/* Sobre o Evento */}
          <div className="bg-white p-6 rounded-xl border shadow-sm">
            <h3 className="text-lg font-bold text-[#184689] border-b pb-3 mb-5">Sobre o Evento</h3>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Nome do evento</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Finalidade do evento</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
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
                <input type="number" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-8">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Responsável no dia do evento</label>
                <input type="text" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Contato do responsável</label>
                <input type="tel" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm" />
              </div>
              <div className="md:col-span-6">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Opção de pagamento</label>
                <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm">
                  <option value="">Selecione...</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="cartao_credito">Cartão de Crédito</option>
                  <option value="pix">PIX</option>
                </select>
              </div>
              <div className="md:col-span-12">
                <label className="block text-sm font-semibold text-[#384050] mb-1.5">Informações adicionais do evento</label>
                <textarea rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors bg-white shadow-sm resize-none"></textarea>
              </div>
            </div>
          </div>

          <div className="flex justify-end pb-12 gap-3">
            <button
              onClick={handleFinalize}
              className={cn(
                "w-full sm:w-auto rounded-lg bg-primary px-8 py-3 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90 cursor-pointer shadow-sm"
              )}
            >
              Concluir Reserva
            </button>
          </div>
        </div>
      </div>
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