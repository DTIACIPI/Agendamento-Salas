export interface CompanyData {
  razaoSocial: string
  nomeFantasia: string
  cnpj: string
  ie: string
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
}

export interface ResponsavelData {
  nome: string
  email: string
  telefone: string
  cargo: string
}

export interface EventoData {
  nome: string
  finalidade: string
  participantes: number
  responsavelDia: string
  contatoDia: string
  pagamento: string
  infoAdicional: string
}

export interface FinanceiroData {
  valorBase: string
  descontoAssociado: string
  cupom: string
  descontoCupom: string
}

export interface Booking {
  id: string
  company: string
  room: string
  date: string
  time: string
  value: string
  status: "Pendente" | "Confirmada" | "Cancelada"
  contract: "Pendente" | "Assinado" | "Enviado para Assinatura" | "Aguardando Assinatura"
  companyData: CompanyData
  responsavelData: ResponsavelData
  eventoData: EventoData
  financeiroData: FinanceiroData
}

export interface Room {
  id: number
  name: string
  capacity: number
  priceDay: string
  priceWeekend: string
  minHours: number
  minHoursWeekend: number
  status: "Disponivel" | "Manutencao"
  img: string
  amenities: string[]
}

export interface Client {
  cnpj: string
  name: string
  plano: string
  lucro: string
  email: string
  phone: string
  totalBookings: number
  totalSpent: string
  associado: boolean
  meses: number
}

export interface Coupon {
  id: number
  code: string
  type: "percentage" | "fixed"
  value: number
  maxUses: number | ""
  currentUses: number
  validUntil: string
  active: boolean
}

export interface Contract {
  id: string
  bookingId: string
  company: string
  date: string
  status: "Enviado para Assinatura" | "Assinado" | "Aguardando Assinatura"
}

export type TabId = "dashboard" | "reservas" | "agenda" | "salas" | "cupons" | "contratos" | "clientes" | "config"
