"use client"

import Image from "next/image"
import { ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  cartCount?: number
  onCartClick?: () => void
}

export function Header({ cartCount = 0, onCartClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b bg-card">
      <div className="mx-auto flex max-w-[1920px] items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative size-12 shrink-0">
            <Image
              src="/images/acipi_logo.jpg"
              alt="ACIPI Logo"
              fill
              className="object-contain"
              sizes="48px"
              priority
            />
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight text-[#384050]">ACIPI</h1>
            <p className="text-xs text-muted-foreground leading-tight">
              {"Associa\u00e7\u00e3o Comercial e Industrial de Piracicaba"}
            </p>
          </div>
        </div>

        {onCartClick && (
          <Button
            className="relative gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            size="sm"
            onClick={onCartClick}
          >
            <ClipboardList className="size-4" />
            <span className="hidden sm:inline">Salas Selecionadas</span>
            <span className="sm:hidden">Salas</span>
            
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-card">
                {cartCount}
              </span>
            )}
          </Button>
        )}
      </div>
    </header>
  )
}
