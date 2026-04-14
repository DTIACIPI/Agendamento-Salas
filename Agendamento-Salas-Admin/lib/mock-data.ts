import type { Client, Coupon, Contract } from "./types"

export const initialClients: Client[] = [
  {
    cnpj: "43.344.555/0001-22",
    name: "Unimed Piracicaba",
    plano: "Plano Saude Ouro",
    lucro: "35%",
    email: "eventos@unimedpiracicaba.com.br",
    phone: "(19) 3434-0000",
    totalBookings: 12,
    totalSpent: "R$ 38.500,00",
    associado: true,
    meses: 48,
  },
  {
    cnpj: "12.345.678/0001-99",
    name: "Drogal Farmaceutica",
    plano: "N/A",
    lucro: "20%",
    email: "rh@drogal.com.br",
    phone: "(19) 3422-1111",
    totalBookings: 5,
    totalSpent: "R$ 4.250,00",
    associado: true,
    meses: 14,
  },
]

export const initialCoupons: Coupon[] = [
  { id: 1, code: "ACIPITECH10", type: "percentage", value: 10, maxUses: 100, currentUses: 45, validUntil: "2026-12-31", active: true },
  { id: 2, code: "BEMVINDO50", type: "fixed", value: 50, maxUses: "", currentUses: 312, validUntil: "", active: true },
  { id: 3, code: "INVERNO20", type: "percentage", value: 20, maxUses: 50, currentUses: 50, validUntil: "2026-08-30", active: false },
]

export const initialContracts: Contract[] = [
  { id: "CTR-2026-001", bookingId: "REQ-2026-003", company: "Caterpillar Brasil", date: "09/04/2026", status: "Enviado para Assinatura" },
  { id: "CTR-2026-002", bookingId: "REQ-2026-002", company: "Drogal Farmaceutica", date: "05/04/2026", status: "Assinado" },
]

export const ALL_AMENITIES = [
  "Wi-Fi",
  "Ar Condicionado",
  "Projetor",
  "TV/Monitor",
  "Quadro Branco",
  "Sistema de Som",
  "Cafe/Copa",
  "Videoconferencia",
  "Estacionamento",
]
