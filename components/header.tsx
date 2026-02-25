"use client"

import { Phone, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary">
            <Building2 className="size-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-foreground">ACIPI</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              {"Associa\u00e7\u00e3o Comercial e Industrial de Piracicaba"}
            </p>
          </div>
        </div>

        <Button
          className="gap-2 bg-success text-success-foreground hover:bg-success/90"
          size="sm"
          asChild
        >
          <a
            href="https://wa.me/5519999999999"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Phone className="size-4" />
            <span className="hidden sm:inline">Falar com atendente</span>
            <span className="sm:hidden">Atendimento</span>
          </a>
        </Button>
      </div>
    </header>
  )
}
