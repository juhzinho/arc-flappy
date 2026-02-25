"use client"

import { useRef, useCallback } from "react"
import { ArcadeButton } from "@/components/arcade/arcade-button"
import { GameCanvas } from "@/components/arcade/game-canvas"
import { Heart, Pause } from "lucide-react"

interface PlayingScreenProps {
  score: number
  bestScore: number
  lives: number
  phase: number
  maxLives?: number
  isPaused: boolean
  onScoreChange: (score: number) => void
  onLifeLost: (lives: number) => void
  onGameOver: (finalScore: number) => void
  onPhaseChange: (phase: number) => void
  onPause: () => void
  onResume: () => void
  onQuit: () => void
}

export function PlayingScreen({
  score,
  bestScore,
  lives,
  phase,
  maxLives = 5,
  isPaused,
  onScoreChange,
  onLifeLost,
  onGameOver,
  onPhaseChange,
  onPause,
  onResume,
  onQuit,
}: PlayingScreenProps) {
  const gameContainerRef = useRef<HTMLDivElement>(null)

  const handleFlap = useCallback(() => {
    const container = gameContainerRef.current
    if (container) {
      const fn = (container as HTMLDivElement & { __flap?: () => void }).__flap
      fn?.()
    }
  }, [])

  const handleShoot = useCallback(() => {
    const container = gameContainerRef.current
    if (container) {
      const fn = (container as HTMLDivElement & { __shoot?: () => void }).__shoot
      fn?.()
    }
  }, [])

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-2 py-4">
      <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[#1a1a3a] bg-[#050518]/95 shadow-xl">
        {/* HUD Header */}
        <header className="flex items-center justify-between border-b-2 border-[#1a1a3a] bg-[#0a0a20]/90 px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
            <span className="text-[6px] uppercase tracking-wider text-[#8888cc]">
              Fase
            </span>
            <span className="text-[10px] text-neon-cyan">{phase}/10</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[6px] uppercase tracking-wider text-[#8888cc]">
              Score
            </span>
            <span className="text-sm text-neon-green">{score}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[6px] uppercase tracking-wider text-[#8888cc]">
              Best
            </span>
            <span className="text-[10px] text-neon-yellow">{bestScore}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxLives }).map((_, i) => (
            <Heart
              key={i}
              className={`h-4 w-4 ${
                i < lives
                  ? "fill-neon-pink text-neon-pink"
                  : "text-muted-foreground"
              }`}
            />
          ))}
        </div>

        <button
          onClick={onPause}
          className="cursor-pointer rounded border border-[#3a3a6a] bg-[#1a1a3a]/50 p-1.5 text-[#8888cc] transition-colors hover:border-neon-cyan hover:text-neon-cyan"
          aria-label="Pausar"
        >
          <Pause className="h-4 w-4" />
        </button>
        </header>

        {/* Game Canvas */}
        <div className="relative flex-1 min-h-[420px] max-h-[720px]" ref={gameContainerRef}>
          <GameCanvas
            isPaused={isPaused}
            onScoreChange={onScoreChange}
            onLifeLost={onLifeLost}
            onGameOver={onGameOver}
            onPhaseChange={onPhaseChange}
          />

          {/* Pause Overlay */}
          {isPaused && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-6">
                <h2 className="neon-text-cyan text-xl">PAUSED</h2>
                <div className="flex flex-col items-center gap-3">
                  <ArcadeButton variant="green" size="md" onClick={onResume}>
                    Continuar
                  </ArcadeButton>
                  <ArcadeButton variant="pink" size="sm" onClick={onQuit}>
                    Sair
                  </ArcadeButton>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Controls */}
        <footer className="flex items-center justify-center gap-6 border-t-2 border-border px-4 py-4">
          <ArcadeButton variant="green" size="lg" onClick={() => { handleFlap() }}>
            JUMP
          </ArcadeButton>
          <ArcadeButton variant="pink" size="lg" onClick={() => { handleShoot() }}>
            SHOOT
          </ArcadeButton>
          <div className="hidden md:flex flex-col items-center gap-1">
            <span className="text-[6px] text-muted-foreground">SPACE = Shoot</span>
            <span className="text-[6px] text-muted-foreground">UP = Jump</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
