"use client"

import { AlertTriangle, CalendarSearch, Phone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface UnavailableStateProps {
  onSelectOther: () => void
}

export function UnavailableState({ onSelectOther }: UnavailableStateProps) {
  return (
    <Card className="border-warning/30 bg-warning/5">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-warning/15">
          <AlertTriangle className="size-6 text-warning-foreground" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground">
            {"Espa\u00e7o indispon\u00edvel"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {"Este espa\u00e7o n\u00e3o est\u00e1 dispon\u00edvel para loca\u00e7\u00e3o no momento. Tente outra data ou entre em contato com nosso atendimento."}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="gap-2"
            onClick={onSelectOther}
          >
            <CalendarSearch className="size-4" />
            {"Selecionar outra data/espa\u00e7o"}
          </Button>
          <Button
            className="gap-2 bg-success text-success-foreground hover:bg-success/90"
            asChild
          >
            <a
              href="https://wa.me/5519999999999"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Phone className="size-4" />
              Falar com atendente
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
