"use client"

import { ArcadeButton } from "@/components/arcade/arcade-button"
import { WalletStatusCard } from "@/components/arcade/wallet-status-card"
import { Github, ExternalLink } from "lucide-react"
import { useAccount, useChainId } from "wagmi"
import { arcTestnet } from "@/lib/wagmi"

interface HomeScreenProps {
  onPlay: () => void
  onLeaderboard: () => void
}

const socialLinks = [
  {
    label: "Explorer",
    href: "https://testnet.arcscan.app/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
      </svg>
    ),
    color: "text-[#005577] hover:text-[#003344]",
  },
  {
    label: "Twitter",
    href: "https://x.com/VictoChain",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "text-[#1a1a1a] hover:text-[#005577]",
  },
  {
    label: "GitHub",
    href: "https://github.com/juhzinho",
    icon: <Github className="h-4 w-4" />,
    color: "text-[#1a1a1a] hover:text-[#005533]",
  },
  {
    label: "Faucet",
    href: "https://faucet.circle.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
        <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8zm0 18c-3.35 0-6-2.57-6-6.2 0-2.34 1.95-5.44 6-9.14 4.05 3.7 6 6.79 6 9.14 0 3.63-2.65 6.2-6 6.2z" />
      </svg>
    ),
    color: "text-[#886600] hover:text-[#664400]",
  },
  {
    label: "ARC NETWORK",
    href: "https://www.arc.network/",
    icon: <ExternalLink className="h-4 w-4" />,
    color: "text-[#005533] hover:text-[#003322]",
  },
]

export function HomeScreen({ onPlay, onLeaderboard }: HomeScreenProps) {
  const { isConnected } = useAccount()
  const chainId = useChainId()
  const isCorrectNetwork = isConnected && chainId === arcTestnet.id
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-8">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-[rgba(100,100,180,0.3)] bg-[rgba(10,10,30,0.7)] px-8 py-10 shadow-xl backdrop-blur-md">
      {/* Title */}
      <div className="flex flex-col items-center gap-2">
        <h1 className="neon-text-green animate-flicker text-center text-2xl leading-relaxed md:text-4xl">
          ARCADE
        </h1>
        <h2 className="neon-text-pink text-center text-lg leading-relaxed md:text-2xl">
          FLAPPY
        </h2>
      </div>

      {/* Decorative pixel bird */}
      <div className="flex items-center gap-1" aria-hidden="true">
        <div className="h-3 w-3 bg-neon-yellow" />
        <div className="h-4 w-4 bg-neon-green" />
        <div className="h-3 w-3 bg-neon-cyan" />
        <div className="h-2 w-2 bg-neon-pink" />
      </div>

      {/* Wallet Status */}
      <div className="w-full max-w-xs">
        <WalletStatusCard />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center gap-4">
        <ArcadeButton
          variant="green"
          size="lg"
          onClick={onPlay}
          disabled={!isConnected || !isCorrectNetwork}
        >
          PLAY
        </ArcadeButton>

        <ArcadeButton variant="cyan" size="sm" onClick={onLeaderboard}>
          Leaderboard
        </ArcadeButton>
      </div>

      {/* Social Links */}
      <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="Links externos">
        {socialLinks.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-1.5 rounded-lg border border-[rgba(100,100,180,0.3)] bg-[rgba(20,20,50,0.5)] px-3 py-2 text-[7px] uppercase tracking-wider text-[#aaaacc] shadow-sm backdrop-blur-sm transition-all duration-200 hover:bg-[rgba(30,30,70,0.7)] hover:text-[#ccccff]`}
            title={link.label}
          >
            {link.icon}
            <span className="hidden sm:inline">{link.label}</span>
          </a>
        ))}
      </nav>

      {/* Footer hint */}
      {!isConnected && (
        <p className="animate-neon-pulse text-center text-[8px] text-muted-foreground">
          Conecte sua wallet para jogar
        </p>
      )}
      {isConnected && !isCorrectNetwork && (
        <p className="text-center text-[8px] text-destructive">
          Troque para Arc Testnet para continuar
        </p>
      )}
      </div>
    </main>
  )
}
