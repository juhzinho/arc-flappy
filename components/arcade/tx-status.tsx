"use client"

import { Loader2, CheckCircle2, XCircle, ExternalLink, Pen } from "lucide-react"

export type TxState = "idle" | "signing" | "sending" | "confirmed" | "error"

interface TxStatusProps {
  state: TxState
  txHash?: string
  explorerUrl?: string
  errorMessage?: string
}

const stateConfig: Record<
  TxState,
  { label: string; icon: React.ReactNode; colorClass: string }
> = {
  idle: {
    label: "Aguardando",
    icon: null,
    colorClass: "text-muted-foreground",
  },
  signing: {
    label: "Assinando...",
    icon: <Pen className="h-3.5 w-3.5 animate-pulse" />,
    colorClass: "text-neon-yellow",
  },
  sending: {
    label: "Enviando...",
    icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    colorClass: "text-neon-cyan",
  },
  confirmed: {
    label: "Confirmada!",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    colorClass: "text-neon-green",
  },
  error: {
    label: "Erro",
    icon: <XCircle className="h-3.5 w-3.5" />,
    colorClass: "text-destructive",
  },
}

export function TxStatus({ state, txHash, explorerUrl, errorMessage }: TxStatusProps) {
  if (state === "idle") return null

  const config = stateConfig[state]

  return (
    <div className="neon-border-cyan rounded border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className={config.colorClass}>{config.icon}</span>
        <span className={`text-[9px] uppercase tracking-wider ${config.colorClass}`}>
          {config.label}
        </span>
      </div>

      {txHash && (
        <div className="mt-2 flex items-center gap-2">
          <span className="font-mono text-[8px] text-muted-foreground">
            TX: {txHash.slice(0, 10)}...{txHash.slice(-6)}
          </span>
          {explorerUrl && (
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neon-cyan transition-opacity hover:opacity-80"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="sr-only">Ver no explorer</span>
            </a>
          )}
        </div>
      )}

      {state === "error" && errorMessage && (
        <p className="mt-2 text-[8px] text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}
