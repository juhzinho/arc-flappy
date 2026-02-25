"use client"

import { ArcadeButton } from "@/components/arcade/arcade-button"
import { TxStatus, type TxState } from "@/components/arcade/tx-status"
import { Trophy, Award } from "lucide-react"

interface GameOverScreenProps {
  score: number
  bestScore: number
  txState: TxState
  txHash?: string
  explorerUrl?: string
  txErrorMessage?: string
  onSubmitScore: () => void
  onMintBadge: () => void
  onPlayAgain: () => void
  onHome: () => void
}

export function GameOverScreen({
  score,
  bestScore,
  txState,
  txHash,
  explorerUrl,
  txErrorMessage,
  onSubmitScore,
  onMintBadge,
  onPlayAgain,
  onHome,
}: GameOverScreenProps) {
  const canMintBadge = score >= 100
  const isNewBest = score >= bestScore && score > 0

  return (
    <main className="arcade-scanline flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-8">
      {/* Game Over Title */}
      <h1 className="neon-text-pink animate-flicker text-center text-2xl leading-relaxed md:text-3xl">
        GAME OVER
      </h1>

      {/* Score Display */}
      <div className="neon-border-cyan w-full max-w-xs rounded border-2 bg-card p-6">
        <div className="flex flex-col items-center gap-4">
          {/* Final Score */}
          <div className="flex flex-col items-center gap-1">
            <Trophy className="h-6 w-6 text-neon-yellow" />
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
              Score Final
            </span>
            <span className="neon-text-green text-3xl">{score}</span>
          </div>

          {/* Divider */}
          <div className="h-px w-full bg-border" />

          {/* Best Score */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[8px] uppercase tracking-wider text-muted-foreground">
              Melhor Score
            </span>
            <span className="text-lg text-neon-yellow">{bestScore}</span>
          </div>

          {isNewBest && (
            <span className="animate-neon-pulse text-[9px] uppercase text-neon-pink">
              Novo Recorde!
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex w-full max-w-xs flex-col items-center gap-3">
        <ArcadeButton
          variant="cyan"
          size="md"
          onClick={onSubmitScore}
          disabled={txState === "signing" || txState === "sending"}
          className="w-full"
        >
          Submit Score
        </ArcadeButton>

        {canMintBadge && (
          <ArcadeButton
            variant="yellow"
            size="md"
            onClick={onMintBadge}
            disabled={txState === "signing" || txState === "sending"}
            className="flex w-full items-center justify-center gap-2"
          >
            <Award className="h-3.5 w-3.5" />
            Mint Badge
          </ArcadeButton>
        )}

        <div className="h-px w-full bg-border" />

        <ArcadeButton variant="green" size="md" onClick={onPlayAgain} className="w-full">
          Play Again
        </ArcadeButton>

        <ArcadeButton variant="pink" size="sm" onClick={onHome}>
          Home
        </ArcadeButton>
      </div>

      {/* Transaction Status */}
      <div className="w-full max-w-xs">
        <TxStatus
          state={txState}
          txHash={txHash}
          explorerUrl={explorerUrl}
          errorMessage={txErrorMessage}
        />
      </div>

      {canMintBadge && (
        <p className="text-center text-[7px] text-muted-foreground">
          Score {">="} 100: voce pode mintar um badge exclusivo!
        </p>
      )}
    </main>
  )
}
