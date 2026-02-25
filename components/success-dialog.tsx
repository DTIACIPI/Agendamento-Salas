"use client"

import { CheckCircle2, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

interface SuccessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomName: string
  date: Date | undefined
  startTime: string
  endTime: string
  total: number
}

export function SuccessDialog({
  open,
  onOpenChange,
  roomName,
  date,
  startTime,
  endTime,
  total,
}: SuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="size-8 text-success" />
          </div>
          <DialogTitle className="mt-2 text-xl text-foreground">
            {"Pr\u00e9-agendamento confirmado!"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {"Sua reserva foi pr\u00e9-agendada com sucesso. Para finalizar, preencha o formul\u00e1rio abaixo."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-secondary/30 p-4">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{"Espa\u00e7o"}</span>
              <span className="font-medium text-foreground">{roomName}</span>
            </div>
            {date && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data</span>
                <span className="font-medium text-foreground">
                  {date.toLocaleDateString("pt-BR")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{"Hor\u00e1rio"}</span>
              <span className="font-medium text-foreground">
                {startTime} &ndash; {endTime}
              </span>
            </div>
            <Separator className="my-1" />
            <div className="flex justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-lg font-bold text-primary">
                R$ {total.toFixed(2).replace(".", ",")}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            size="lg"
            className="w-full gap-2 text-base"
            asChild
          >
            <a
              href="https://1doc.com.br"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="size-4" />
              {"Preencher formul\u00e1rio 1Doc"}
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
