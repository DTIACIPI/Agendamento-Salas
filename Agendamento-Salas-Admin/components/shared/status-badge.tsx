import { CheckCircle2, XCircle, Clock } from "lucide-react"

const statusStyles: Record<string, string> = {
  "Confirmada": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Assinado": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Pendente": "bg-amber-100 text-amber-700 border-amber-200",
  "Aguardando Assinatura": "bg-blue-100 text-blue-700 border-blue-200",
  "Enviado para Assinatura": "bg-blue-100 text-blue-700 border-blue-200",
  "Cancelada": "bg-slate-100 text-slate-600 border-slate-200",
}

export function StatusBadge({ status }: { status: string }) {
  const Icon = status.includes("Confirmada") || status.includes("Assinado")
    ? CheckCircle2
    : status.includes("Cancelada")
      ? XCircle
      : Clock

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[status] || "bg-slate-100"}`}>
      <Icon className="w-3.5 h-3.5" /> {status}
    </span>
  )
}
