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

export type BookingStatus = "Pre-reserva" | "Confirmada" | "Cancelada" | "Pendente"

// Item da listagem /api/bookings
export interface BookingListItem {
  id: string
  event_name: string
  status: BookingStatus
  total_amount: number | string
  company_name: string
  event_date: string | null
}

// Resposta paginada de /api/bookings
export interface BookingListResponse {
  data: BookingListItem[]
  total: number
}

// Slot retornado em /api/bookings/:id
export interface BookingSlot {
  booking_date: string
  start_time: string
  end_time: string
}

// Dossiê completo /api/bookings/:id — resposta flat vinda da API
export interface BookingDetail {
  id: string
  company_id: string
  user_id: string
  event_name: string
  event_purpose: string | null
  estimated_attendees: number | null
  onsite_contact_name: string | null
  onsite_contact_phone: string | null
  payment_method: string | null
  total_amount: string
  status: BookingStatus | string
  calendar_id: string | null
  created_at: string
  updated_at: string
  coupon_code: string | null
  coupon_discount_amount: string | null
  cnpj: string
  razao_social: string
  inscricao_estadual: string | null
  cep: string | null
  endereco: string | null
  user_name: string
  user_email: string
  user_phone: string | null
  horarios_reservados: BookingSlot[]
}

export interface PricePeriod {
  startHour: number
  endHour: number
  price: number
}

// Sala vinda de /api/spaces (listagem — campos resumidos)
export interface Room {
  id: string
  name: string
  description?: string | null
  capacity: number
  image: string | null
  amenities: string[]
  pricePeriodsWeekday: PricePeriod[]
  pricePeriodsSaturday: PricePeriod[]
  available: boolean
  // Campos flat da API (usados no CRUD)
  min_hours_weekday?: number
  min_hours_weekend?: number
  price_per_hour_weekday?: number
  price_per_hour_weekend?: number
  status?: string
}

// Detalhe completo da sala vinda de /api/spaces/:id
export interface RoomDetail {
  id: string
  name: string
  description: string | null
  capacity: number
  image: string | null
  images: string[]
  infrastructure: string[]
  amenities?: string[]
  available: boolean | number
  min_hours_weekday: number
  min_hours_weekend: number
  price_per_hour_weekday: number
  price_per_hour_weekend: number
  status: string
  pricePeriodsWeekday?: PricePeriod[]
  pricePeriodsSaturday?: PricePeriod[]
}

// Payload para POST/PATCH de sala
export interface RoomPayload {
  name: string
  description: string
  capacity: number
  min_hours_weekday: number
  min_hours_weekend: number
  price_per_hour_weekday: number
  price_per_hour_weekend: number
  status: string
  images: string[]
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

// Cupom vindo de /api/coupons
export interface Coupon {
  id: string
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  max_uses: number | null
  current_uses: number
  valid_until: string | null
  is_active: boolean
}

// Payload para POST/PATCH de cupom
export interface CouponPayload {
  code: string
  discount_type: "percentage" | "fixed"
  discount_value: number
  max_uses: number | null
  valid_until: string | null
  is_active: boolean
}

export interface Contract {
  id: string
  bookingId: string
  company: string
  date: string
  status: "Enviado para Assinatura" | "Assinado" | "Aguardando Assinatura"
}

export type TabId = "dashboard" | "reservas" | "agenda" | "salas" | "cupons" | "contratos" | "clientes" | "config"

export interface SystemSettings {
  open_time: string
  close_time: string
  cleaning_buffer: number
  block_sundays: boolean
  discount_tier1_pct: number
  discount_tier2_pct: number
  discount_tier3_pct: number
}
