"use client"

import { ArcadeButton } from "@/components/arcade/arcade-button"
import { RefreshCw, Trophy } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  address: string
  score: number
}

interface LeaderboardScreenProps {
  entries: LeaderboardEntry[]
  isLoading: boolean
  onRefresh: () => void
  onHome: () => void
}

function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function LeaderboardScreen({
  entries,
  isLoading,
  onRefresh,
  onHome,
}: LeaderboardScreenProps) {
  return (
    <main className="arcade-scanline flex min-h-dvh flex-col items-center gap-8 px-4 py-8">
      {/* Title */}
      <div className="flex items-center gap-3 pt-4">
        <Trophy className="h-6 w-6 text-neon-yellow" />
        <h1 className="neon-text-cyan text-xl leading-relaxed md:text-2xl">
          TOP 20
        </h1>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <ArcadeButton
          variant="cyan"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </ArcadeButton>
        <ArcadeButton variant="pink" size="sm" onClick={onHome}>
          Home
        </ArcadeButton>
      </div>

      {/* Table */}
      <div className="neon-border-cyan w-full max-w-lg overflow-hidden rounded border-2 bg-card">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_1fr_80px] border-b border-border px-4 py-3">
          <span className="text-[8px] uppercase tracking-wider text-neon-cyan">
            Rank
          </span>
          <span className="text-[8px] uppercase tracking-wider text-neon-cyan">
            Address
          </span>
          <span className="text-right text-[8px] uppercase tracking-wider text-neon-cyan">
            Score
          </span>
        </div>

        {/* Table Body */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex gap-1">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-2 w-2 animate-neon-pulse bg-neon-cyan"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12">
            <span className="text-[9px] text-muted-foreground">
              Nenhum score registrado ainda
            </span>
            <span className="text-[7px] text-muted-foreground">
              Jogue e submita seu score para aparecer no TOP 20!
            </span>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div
                key={entry.rank}
                className="grid grid-cols-[60px_1fr_80px] items-center px-4 py-3 transition-colors hover:bg-secondary/50"
              >
                {/* Rank */}
                <span
                  className={`text-[10px] ${
                    entry.rank === 1
                      ? "neon-text-green"
                      : entry.rank === 2
                        ? "text-neon-yellow"
                        : entry.rank === 3
                          ? "text-neon-pink"
                          : "text-muted-foreground"
                  }`}
                >
                  #{entry.rank}
                </span>

                {/* Address */}
                <span className="font-mono text-[9px] text-foreground">
                  {shortenAddress(entry.address)}
                </span>

                {/* Score */}
                <span className="text-right text-[10px] text-neon-green">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-[7px] text-muted-foreground">
        Somente os 20 melhores scores aparecem no ranking
      </p>
    </main>
  )
}
