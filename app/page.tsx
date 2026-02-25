"use client"

import { useState, useCallback } from "react"
import { useAccount, useChainId } from "wagmi"
import { arcTestnet } from "@/lib/wagmi"
import { HomeScreen } from "@/components/screens/home-screen"
import { PlayingScreen } from "@/components/screens/playing-screen"
import { GameOverScreen } from "@/components/screens/game-over-screen"
import { LeaderboardScreen } from "@/components/screens/leaderboard-screen"
import type { TxState } from "@/components/arcade/tx-status"
import { useGameTransactions } from "@/hooks/use-game-transactions"

type Screen = "home" | "playing" | "gameover" | "leaderboard"

// Leaderboard: starts empty, only stores top 20 in memory
const MAX_LEADERBOARD = 20

export default function Page() {
  const [screen, setScreen] = useState<Screen>("home")
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const isCorrectNetwork = isConnected && chainId === arcTestnet.id

  // Game state
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [lives, setLives] = useState(5)
  const [phase, setPhase] = useState(1)
  const [isPaused, setIsPaused] = useState(false)

  // Transaction state (UI)
  const [txState, setTxState] = useState<TxState>("idle")
  const [txHash, setTxHash] = useState<string | undefined>(undefined)

  // Hook de transações on-chain (pronto para usar contratos reais)
  const {
    txState: onChainTxState,
    txHash: onChainTxHash,
    submitScore,
    mintBadge,
  } = useGameTransactions(score)

  // Leaderboard state - starts empty, top 20 only
  const [leaderboard, setLeaderboard] = useState<{ rank: number; address: string; score: number }[]>([])
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false)

  const handlePlay = useCallback(() => {
    setScore(0)
    setLives(5)
    setPhase(1)
    setScreen("playing")
    setIsPaused(false)
  }, [])

  const handleScoreChange = useCallback((newScore: number) => {
    setScore(newScore)
    setBestScore((prev) => Math.max(prev, newScore))
  }, [])

  const handleLifeLost = useCallback((remainingLives: number) => {
    setLives(remainingLives)
  }, [])

  const handlePhaseChange = useCallback((newPhase: number) => {
    setPhase(newPhase)
  }, [])

  const handleGameOverFromCanvas = useCallback((finalScore: number) => {
    setScore(finalScore)
    setBestScore((prev) => Math.max(prev, finalScore))
    setScreen("gameover")
  }, [])

  // Add score to leaderboard (top 20 only)
  const addToLeaderboard = useCallback((playerScore: number) => {
    if (playerScore <= 0) return
    setLeaderboard(prev => {
      const newEntry = {
        rank: 0,
        address: address ?? "0x0000000000000000000000000000000000000000",
        score: playerScore,
      }
      const updated = [...prev, newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_LEADERBOARD)
        .map((entry, idx) => ({ ...entry, rank: idx + 1 }))
      return updated
    })
  }, [address])

  const handlePause = useCallback(() => {
    setIsPaused(true)
  }, [])

  const handleResume = useCallback(() => {
    setIsPaused(false)
  }, [])

  const handleQuit = useCallback(() => {
    setIsPaused(false)
    setScreen("home")
  }, [])

  const handleSubmitScore = useCallback(() => {
    // Atualiza UI com estado on-chain quando existir hash
    if (onChainTxHash) {
      setTxState(onChainTxState)
      setTxHash(onChainTxHash)
      return
    }

    // Fallback mock + tentativa de chamada on-chain
    setTxState("signing")
    setTimeout(() => setTxState("sending"), 1500)
    setTimeout(() => {
      setTxState("confirmed")
      addToLeaderboard(score)
    }, 3500)

    submitScore(score).catch((err) => {
      console.error("Erro ao enviar score on-chain:", err)
    })
  }, [addToLeaderboard, onChainTxHash, onChainTxState, score, submitScore])

  const handleMintBadge = useCallback(() => {
    if (onChainTxHash) {
      setTxState(onChainTxState)
      setTxHash(onChainTxHash)
      return
    }

    setTxState("signing")
    setTimeout(() => setTxState("sending"), 1500)
    setTimeout(() => setTxState("confirmed"), 3500)

    mintBadge().catch((err) => {
      console.error("Erro ao mintar badge on-chain:", err)
    })
  }, [mintBadge, onChainTxHash, onChainTxState])

  const handlePlayAgain = useCallback(() => {
    setTxState("idle")
    setScore(0)
    setLives(5)
    setPhase(1)
    setScreen("playing")
    setIsPaused(false)
  }, [])

  const handleHome = useCallback(() => {
    setTxState("idle")
    setScreen("home")
  }, [])

  const handleLeaderboard = useCallback(() => {
    setScreen("leaderboard")
  }, [])

  const handleRefreshLeaderboard = useCallback(() => {
    setIsLoadingLeaderboard(true)
    setTimeout(() => setIsLoadingLeaderboard(false), 1500)
  }, [])

  switch (screen) {
    case "home":
      return (
        <HomeScreen
          onPlay={handlePlay}
          onLeaderboard={handleLeaderboard}
        />
      )
    case "playing":
      return (
        <PlayingScreen
          score={score}
          bestScore={bestScore}
          lives={lives}
          phase={phase}
          isPaused={isPaused}
          onScoreChange={handleScoreChange}
          onLifeLost={handleLifeLost}
          onGameOver={handleGameOverFromCanvas}
          onPhaseChange={handlePhaseChange}
          onPause={handlePause}
          onResume={handleResume}
          onQuit={handleQuit}
        />
      )
    case "gameover":
      return (
        <GameOverScreen
          score={score}
          bestScore={bestScore}
          txState={txState}
          txHash={txHash}
          explorerUrl={txHash ? `https://explorer.arc.dev/tx/${txHash}` : undefined}
          txErrorMessage={txState === "error" ? "Transaction failed" : undefined}
          onSubmitScore={handleSubmitScore}
          onMintBadge={handleMintBadge}
          onPlayAgain={handlePlayAgain}
          onHome={handleHome}
        />
      )
    case "leaderboard":
      return (
        <LeaderboardScreen
          entries={leaderboard}
          isLoading={isLoadingLeaderboard}
          onRefresh={handleRefreshLeaderboard}
          onHome={handleHome}
        />
      )
  }
}
