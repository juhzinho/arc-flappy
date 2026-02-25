"use client"

import { useEffect, useRef } from "react"
import { ArcadeButton } from "./arcade-button"
import { Wallet, Wifi, WifiOff } from "lucide-react"
import { useAccount, useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi"
import { arcTestnet } from "@/lib/wagmi"

interface WalletStatusCardProps {
  networkName?: string
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function WalletStatusCard({ networkName = "Arc Testnet" }: WalletStatusCardProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()
  const { switchChain, isPending: isSwitching } = useSwitchChain()

  const isCorrectNetwork = isConnected && chainId === arcTestnet.id

  const primaryConnector = connectors[0]

  // Tenta trocar automaticamente para Arc Testnet assim que conectar (uma vez)
  const alreadyTriedAutoSwitch = useRef(false)

  useEffect(() => {
    if (!isConnected) {
      alreadyTriedAutoSwitch.current = false
      return
    }
    if (!alreadyTriedAutoSwitch.current && chainId !== arcTestnet.id) {
      alreadyTriedAutoSwitch.current = true
      switchChain({ chainId: arcTestnet.id }).catch(() => {
        // Se o usuário recusar, não forçamos de novo automaticamente
      })
    }
  }, [isConnected, chainId, switchChain])

  return (
    <div className="neon-border-cyan rounded border-2 bg-card p-4">
      <div className="flex items-center gap-3">
        <Wallet className="h-5 w-5 text-neon-cyan" />
        <span className="text-[10px] uppercase tracking-wider text-neon-cyan">
          Wallet
        </span>
      </div>

      {isConnected && address ? (
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-neon-green animate-neon-pulse" />
            <span className="font-mono text-[9px] text-foreground">
              {shortenAddress(address)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isCorrectNetwork ? (
              <>
                <Wifi className="h-3.5 w-3.5 text-neon-green" />
                <span className="text-[8px] text-neon-green">{networkName} OK</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
                <span className="text-[8px] text-destructive">Trocar para {networkName}</span>
              </>
            )}
          </div>

          <ArcadeButton
            variant="pink"
            size="sm"
            onClick={() => disconnect()}
            disabled={isPending || isSwitching}
          >
            Disconnect
          </ArcadeButton>
        </div>
      ) : (
        <div className="mt-3">
          <ArcadeButton
            variant="cyan"
            size="sm"
            onClick={() =>
              primaryConnector &&
              connect({
                connector: primaryConnector,
                chainId: arcTestnet.id, // já pede Arc Testnet na conexão
              })
            }
            disabled={!primaryConnector || isPending}
          >
            {isPending ? "Connecting..." : "Connect Wallet"}
          </ArcadeButton>
        </div>
      )}
      {isConnected && !isCorrectNetwork && (
        <div className="mt-3">
          <ArcadeButton
            variant="cyan"
            size="sm"
            onClick={() => switchChain({ chainId: arcTestnet.id })}
            disabled={isSwitching}
          >
            {isSwitching ? "Trocando..." : `Trocar para ${networkName}`}
          </ArcadeButton>
        </div>
      )}
    </div>
  )
}
