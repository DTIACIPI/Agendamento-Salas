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

export type BookingStatus = "Pre-reserva" | "Confirmada" | "Cancelada" | "Pendente" | "Concluída" | "Perdida"

export type BookingType = "Locação Cliente" | "Cessão" | "Curso" | "Uso Interno"

// Item da listagem /api/bookings
export interface BookingListItem {
  id: string
  event_name: string
  status: BookingStatus
  total_amount: number | string
  company_name: string
  event_date: string | null
  booking_type?: BookingType | string | null
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
  event_end_time?: string
  slot_event_name?: string
  slot_event_purpose?: string
  slot_attendees?: number | null
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
  booking_type?: BookingType | string | null
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

// Valor base + hora extra por turno
export interface ShiftPrice {
  base: number
  extra: number
}

// Estrutura de pricing retornada pelo GET /api/spaces e /api/spaces/:id
export interface RoomPricing {
  weekdays: {
    morning: ShiftPrice
    afternoon: ShiftPrice
    night: ShiftPrice
    min_hours: number
  }
  weekends: {
    morning: ShiftPrice
    afternoon: ShiftPrice
    night: ShiftPrice
    min_hours: number
  }
  assembly: {
    allowed: boolean
    half_price: number
    full_price: number
  }
}

// Sala vinda de /api/spaces (listagem) e /api/spaces/:id (detalhe)
export interface Room {
  id: string
  name: string
  description?: string | null
  floor?: string | null
  inventory?: string | null
  capacity: number
  cleaning_buffer?: number
  image?: string | null
  images?: string[]
  amenities?: string[]
  pricing?: RoomPricing
  is_active?: boolean | number
  available?: boolean | number
  status?: string
}

// Payload flat para POST/PATCH de sala
export interface RoomPayload {
  name: string
  description?: string
  floor: string
  inventory: string
  amenities: string[]
  capacity: number
  cleaning_buffer: number
  status: string
  images: string[]
  // Franquias por tipo de dia
  min_hours_wd?: number
  min_hours_we?: number
  // Pricing por turnos — dias úteis (base + extra)
  price_morning_wd?: number
  extra_hour_morning_wd?: number
  price_afternoon_wd?: number
  extra_hour_afternoon_wd?: number
  price_night_wd?: number
  extra_hour_night_wd?: number
  // Pricing por turnos — fins de semana (base + extra)
  price_morning_we?: number
  extra_hour_morning_we?: number
  price_afternoon_we?: number
  extra_hour_afternoon_we?: number
  price_night_we?: number
  extra_hour_night_we?: number
  // Montagem
  allows_assembly?: boolean
  assembly_half_price?: number
  assembly_full_price?: number
}

// Empresa vinda de /api/companies
export interface Company {
  id: string
  cnpj: string
  razao_social: string
  inscricao_estadual: string | null
  cep: string | null
  endereco: string | null
}

// Paginação retornada pela API de companies
export interface CompanyPagination {
  total_records: number
  current_page: number
  total_pages: number
}

// Reserva no histórico de uma empresa
export interface CompanyBooking {
  id: string
  event_name: string
  status: BookingStatus | string
  total_amount: number | string
  payment_method: string | null
  event_date: string | null
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
  description: string
}

export interface Contract {
  id: string
  bookingId: string
  company: string
  date: string
  status: "Enviado para Assinatura" | "Assinado" | "Aguardando Assinatura"
}

// Evento da Agenda Central (GET /api/agenda)
export interface AgendaEvent {
  id: string
  space_id: string
  space_name: string
  event_name: string
  company_name: string
  status: string
  date: string       // YYYY-MM-DD
  start_time: string       // HH:mm
  end_time: string         // HH:mm (inclui cleaning buffer)
  event_end_time?: string  // HH:mm (horário real do evento)
}

export type TabId = "dashboard" | "reservas" | "agenda" | "salas" | "cupons" | "contratos" | "empresas" | "usuarios" | "config"

// Usuario do sistema (rota /api/users)
export type UserStatus = "active" | "inactive"

export interface User {
  id: string
  name: string
  email: string
  role: "Super Admin" | "Admin"
  is_active: boolean
  created_at?: string
  updated_at?: string
}

// Payload para POST /api/users
export interface UserCreatePayload {
  name: string
  email: string
  role: "Super Admin" | "Admin"
  is_active: boolean
}

// Payload para PATCH /api/users/:id (email nao editavel)
export interface UserUpdatePayload {
  name: string
  role: "Super Admin" | "Admin"
  is_active: boolean
}

export interface SystemSettings {
  open_time: string
  close_time: string
  block_sundays: boolean
  discount_tier1_pct: number
  discount_tier2_pct: number
  discount_tier3_pct: number
}

export interface BookingSlotPayload {
  date: string
  startTime: string
  endTime: string
  slot_event_name: string
  slot_event_purpose: string
  slot_attendees: number | null
}

export interface NewBookingPayload {
  bookings: {
    space_id: string
    booking_type: BookingType
    total_amount: number
    onsite_contact_name: string
    onsite_contact_phone: string
    payment_method: string
    cleaning_buffer: number
    coupon_code?: string | null
    coupon_discount?: number | null
    requires_assembly?: string | null
    slots: BookingSlotPayload[]
  }[]
  company: {
    cnpj: string
    razao_social: string
    inscricao_estadual: string
    cep: string
    endereco: string
  } | null
  user: {
    name: string
    email: string
    phone: string
    role: string
  }
}
