"use client"

import { useCallback } from "react"
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi"
import type { TxState } from "@/components/arcade/tx-status"
import {
  SCORE_CONTRACT_ABI,
  SCORE_CONTRACT_ADDRESS,
  BADGE_CONTRACT_ABI,
  BADGE_CONTRACT_ADDRESS,
} from "@/lib/arc-contracts"
import { arcTestnet } from "@/lib/wagmi"

interface UseGameTransactionsResult {
  txState: TxState
  txHash?: string
  submitScore: (score: number) => Promise<void>
  mintBadge: () => Promise<void>
}

export function useGameTransactions(score: number): UseGameTransactionsResult {
  const { data: hash, isPending, isError, error, writeContract } = useWriteContract()

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  })

  let txState: TxState = "idle"
  if (isPending) txState = "signing"
  else if (hash && isConfirming) txState = "sending"
  else if (hash && isSuccess) txState = "confirmed"
  else if (isError) txState = "error"

  const submitScore = useCallback(
    async (finalScore: number) => {
      if (!SCORE_CONTRACT_ADDRESS || SCORE_CONTRACT_ABI.length === 0) {
        console.warn("SCORE_CONTRACT_ADDRESS / ABI não configurados. Simulando submit off-chain.")
        return
      }

      writeContract({
        address: SCORE_CONTRACT_ADDRESS,
        abi: SCORE_CONTRACT_ABI,
        functionName: "submitScore",
        args: [BigInt(finalScore)],
        chainId: arcTestnet.id,
      })
    },
    [writeContract],
  )

  const mintBadge = useCallback(async () => {
    if (!BADGE_CONTRACT_ADDRESS || BADGE_CONTRACT_ABI.length === 0) {
      console.warn("BADGE_CONTRACT_ADDRESS / ABI não configurados. Simulando mint off-chain.")
      return
    }

    writeContract({
      address: BADGE_CONTRACT_ADDRESS,
      abi: BADGE_CONTRACT_ABI,
      functionName: "mintBadge",
      args: [],
      chainId: arcTestnet.id,
    })
  }, [writeContract])

  return {
    txState,
    txHash: hash,
    submitScore,
    mintBadge,
  }
}

