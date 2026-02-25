"use client"

import { useEffect, useState } from "react"

interface StarData {
  id: number
  top: string
  left: string
  size: number
  opacity: number
  twinkleDelay: number
  twinkleDuration: number
}

interface ShootingStarData {
  id: number
  top: string
  left: string
  delay: number
  duration: number
}

export function SkyBackground() {
  const [stars, setStars] = useState<StarData[]>([])
  const [shootingStars, setShootingStars] = useState<ShootingStarData[]>([])

  useEffect(() => {
    const generatedStars: StarData[] = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      top: `${Math.random() * 85}%`,
      left: `${Math.random() * 100}%`,
      size: 1 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.7,
      twinkleDelay: Math.random() * 5,
      twinkleDuration: 2 + Math.random() * 3,
    }))
    setStars(generatedStars)

    const generatedShooting: ShootingStarData[] = Array.from({ length: 3 }, (_, i) => ({
      id: i,
      top: `${5 + Math.random() * 40}%`,
      left: `${Math.random() * 60}%`,
      delay: i * 8 + Math.random() * 5,
      duration: 1.5 + Math.random() * 1,
    }))
    setShootingStars(generatedShooting)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Moon */}
      <div
        className="absolute rounded-full"
        style={{
          top: "6%",
          right: "12%",
          width: 60,
          height: 60,
          background: "radial-gradient(circle at 35% 35%, #f0f0f0 0%, #d4d4d4 40%, #a0a0a0 70%, rgba(160,160,160,0) 100%)",
          boxShadow: "0 0 40px 15px rgba(200, 200, 255, 0.15), 0 0 80px 30px rgba(200, 200, 255, 0.08)",
        }}
      />

      {/* Stars */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            backgroundColor: "#ffffff",
            opacity: s.opacity,
            animation: `twinkle ${s.twinkleDuration}s ease-in-out ${s.twinkleDelay}s infinite`,
          }}
        />
      ))}

      {/* Shooting stars */}
      {shootingStars.map((ss) => (
        <div
          key={`shooting-${ss.id}`}
          className="absolute"
          style={{
            top: ss.top,
            left: ss.left,
            width: 2,
            height: 2,
            backgroundColor: "#ffffff",
            borderRadius: "50%",
            boxShadow: "0 0 4px 1px rgba(255,255,255,0.6)",
            animation: `shooting-star ${ss.duration}s ease-in ${ss.delay}s infinite`,
          }}
        />
      ))}

      {/* Dark ground at the very bottom */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 60,
          background: "linear-gradient(180deg, #1a1a2e 0%, #0d0d1a 100%)",
        }}
      >
        <div
          className="absolute left-0 right-0 top-0"
          style={{
            height: 2,
            background: "rgba(100, 100, 180, 0.3)",
          }}
        />
      </div>
    </div>
  )
}
