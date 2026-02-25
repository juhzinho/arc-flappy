"use client"

import { useRef, useEffect, useCallback, useState } from "react"

interface GameCanvasProps {
  isPaused: boolean
  onScoreChange: (score: number) => void
  onLifeLost: (lives: number) => void
  onGameOver: (finalScore: number) => void
  onPhaseChange?: (phase: number) => void
}

// ─── Constants ───────────────────────────────────────────────────
const GRAVITY = 0.35
const FLAP_FORCE = -7
const MAX_LIVES = 5
const BIRD_SIZE = 28
const BULLET_SPEED = 10
const BOSS_BULLET_SPEED = 4.5

// ─── Sound Effects (Web Audio API) ──────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null
  private initialized = false

  init() {
    if (this.initialized) return
    try {
      this.ctx = new AudioContext()
      this.initialized = true
    } catch { /* silent fail */ }
  }

  private play(freq: number, type: OscillatorType, duration: number, vol = 0.15) {
    if (!this.ctx) return
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime)
    gain.gain.setValueAtTime(vol, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start()
    osc.stop(this.ctx.currentTime + duration)
  }

  shoot() { this.play(880, "square", 0.08, 0.1) }
  flap() { this.play(440, "sine", 0.06, 0.08) }
  hit() { this.play(150, "sawtooth", 0.2, 0.15) }
  kill() { this.play(600, "square", 0.12, 0.12); setTimeout(() => this.play(900, "square", 0.1, 0.1), 60) }
  bossHit() { this.play(200, "triangle", 0.15, 0.12) }
  bossDie() {
    this.play(300, "square", 0.3, 0.2)
    setTimeout(() => this.play(500, "square", 0.2, 0.18), 100)
    setTimeout(() => this.play(800, "square", 0.3, 0.15), 200)
    setTimeout(() => this.play(1200, "sine", 0.4, 0.12), 350)
  }
  pickup() { this.play(660, "sine", 0.1, 0.1); setTimeout(() => this.play(880, "sine", 0.1, 0.1), 60) }
  phaseComplete() {
    this.play(523, "square", 0.15, 0.12)
    setTimeout(() => this.play(659, "square", 0.15, 0.12), 100)
    setTimeout(() => this.play(784, "square", 0.15, 0.12), 200)
    setTimeout(() => this.play(1047, "square", 0.3, 0.15), 300)
  }
  gameOver() {
    this.play(400, "sawtooth", 0.3, 0.15)
    setTimeout(() => this.play(300, "sawtooth", 0.3, 0.15), 200)
    setTimeout(() => this.play(200, "sawtooth", 0.5, 0.12), 400)
  }
  bossAppear() {
    this.play(100, "sawtooth", 0.5, 0.18)
    setTimeout(() => this.play(80, "sawtooth", 0.5, 0.15), 300)
    setTimeout(() => this.play(120, "square", 0.4, 0.12), 600)
  }
  meteorImpact() { this.play(80, "sawtooth", 0.3, 0.2) }
  freeze() { this.play(2000, "sine", 0.3, 0.08); this.play(2500, "sine", 0.2, 0.06) }
  laser() { this.play(1500, "sawtooth", 0.15, 0.1) }
  fire() { 
    if (!this.ctx) return
    const bufferSize = this.ctx.sampleRate * 0.15
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1
    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer
    const gain = this.ctx.createGain()
    gain.gain.setValueAtTime(0.08, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15)
    noise.connect(gain)
    gain.connect(this.ctx.destination)
    noise.start()
  }
  summon() {
    this.play(150, "square", 0.2, 0.1)
    setTimeout(() => this.play(200, "square", 0.15, 0.1), 100)
    setTimeout(() => this.play(250, "triangle", 0.15, 0.08), 200)
  }
  obstaclePass() { this.play(520, "sine", 0.06, 0.06) }
}

const sfx = new SoundEngine()

// Phase config: each phase has different speeds and spawn rates
function getPhaseConfig(phase: number) {
  const base = Math.min(phase, 10)
  return {
    scrollSpeed: 2 + base * 0.3,
    obstacleSpawnRate: Math.max(2000 - base * 100, 900),
    // Mais corações: começa em ~9s e vai até ~3,5s, dinamizado também pela vida atual
    heartSpawnRate: Math.max(9000 - base * 600, 3500),
    monsterSpawnRate: Math.max(3000 - base * 150, 1200),
    monstersPerSpawn: Math.min(1 + Math.floor(base / 3), 3),
    monsterHp: 1 + Math.floor(base / 2),
    // Points needed to trigger boss = 100 * 2^(phase-1)
    bossScoreThreshold: 100 * Math.pow(2, phase - 1),
  }
}

// ─── Boss definitions (10 unique bosses with UNIQUE POWERS) ─────
const BOSS_DEFS = [
  { name: "FIRE LORD",       color: "#ff4422", hp: 40,   attackType: "fire",       attackRate: 1100, speed: 1.3, size: 65 },
  { name: "FROST WYRM",      color: "#44ccff", hp: 65,   attackType: "ice",        attackRate: 900,  speed: 1.2, size: 70 },
  { name: "LASER SENTINEL",  color: "#ff00ff", hp: 90,   attackType: "laser",      attackRate: 700,  speed: 1.5, size: 62 },
  { name: "METEOR TITAN",    color: "#ff8800", hp: 130,  attackType: "meteor",     attackRate: 1200, speed: 1.1, size: 82 },
  { name: "SWARM QUEEN",     color: "#88ff00", hp: 170,  attackType: "summon",     attackRate: 1600, speed: 1.4, size: 70 },
  { name: "INFERNO DRAGON",  color: "#ff2200", hp: 230,  attackType: "fire+laser", attackRate: 550,  speed: 1.7, size: 76 },
  { name: "BLIZZARD KING",   color: "#00eeff", hp: 300,  attackType: "ice+meteor", attackRate: 450,  speed: 1.4, size: 80 },
  { name: "VOID SUMMONER",   color: "#aa00ff", hp: 400,  attackType: "summon+laser", attackRate: 380, speed: 1.8, size: 74 },
  { name: "CHAOS EMPEROR",   color: "#ff0066", hp: 550,  attackType: "all",        attackRate: 280,  speed: 2.2, size: 85 },
  { name: "DARK OVERLORD",   color: "#ff0000", hp: 1200, attackType: "ultimate",   attackRate: 150,  speed: 2.8, size: 95 },
]

// ─── Interfaces ──────────────────────────────────────────────────
interface Bird { x: number; y: number; velocity: number }
interface Bullet { x: number; y: number; dx: number; dy: number }
interface Monster { x: number; y: number; hp: number; maxHp: number; speed: number; sinOffset: number; type: number }
interface Obstacle { x: number; gapY: number; gapH: number; width: number; passed: boolean }
interface HeartPickup { x: number; y: number; speed: number }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
interface Star { x: number; y: number; size: number; brightness: number; twinkleSpeed: number }
interface Boss {
  x: number; y: number; hp: number; maxHp: number; name: string; color: string
  speed: number; size: number; attackType: string; attackRate: number
  lastAttack: number; dir: number; enraged: boolean; angle: number
  laserCharging: number; laserFiring: number; laserY: number
}
interface BossBullet {
  x: number; y: number; dx: number; dy: number; color: string
  type: "normal" | "fire" | "ice" | "meteor" | "laser_orb"
  size: number; trail?: boolean
}
interface SummonedMinion {
  x: number; y: number; hp: number; speed: number; sinOffset: number
  lastShot: number; shotRate: number
}
interface Meteor {
  x: number; y: number; dx: number; dy: number; size: number; rotation: number
}

interface GameState {
  bird: Bird
  bullets: Bullet[]
  monsters: Monster[]
  obstacles: Obstacle[]
  hearts: HeartPickup[]
  particles: Particle[]
  stars: Star[]
  boss: Boss | null
  bossBullets: BossBullet[]
  summonedMinions: SummonedMinion[]
  meteors: Meteor[]
  score: number
  phaseScore: number // score earned in current obstacle phase
  lives: number
  phase: number
  inBossFight: boolean
  bossDefeated: boolean
  phaseTransition: number
  lastObstacleSpawn: number
  lastHeartSpawn: number
  invincible: number
  isRunning: boolean
  animationId: number
  canvasW: number
  canvasH: number
  frozen: number // freeze debuff timer
  bossWarning: number // warning before boss appears
  lastMonsterSpawn: number // timer for mini monster spawns in obstacle phase
}

export function GameCanvas({ isPaused, onScoreChange, onLifeLost, onGameOver, onPhaseChange }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<GameState | null>(null)
  const isPausedRef = useRef(isPaused)
  const [ready, setReady] = useState(false)

  useEffect(() => { isPausedRef.current = isPaused }, [isPaused])

  // ─── Create stars ─────────────────────────────────────────────
  const createStars = useCallback((w: number, h: number): Star[] => {
    return Array.from({ length: 60 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.85,
      size: 0.5 + Math.random() * 2,
      brightness: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.01 + Math.random() * 0.03,
    }))
  }, [])

  // ─── Spawn particles ──────────────────────────────────────────
  const spawnParticles = useCallback((g: GameState, x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      g.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1, color,
        size: Math.random() * 3 + 1,
      })
    }
  }, [])

  // ─── Damage player ────────────────────────────────────────────
  const damagePlayer = useCallback((g: GameState) => {
    if (g.invincible > 0) return
    g.lives--
    onLifeLost(g.lives)
    sfx.hit()
    spawnParticles(g, g.bird.x, g.bird.y, "#ff4444", 12)
    if (g.lives <= 0) {
      g.isRunning = false
      spawnParticles(g, g.bird.x, g.bird.y, "#ffcc00", 20)
      sfx.gameOver()
      onGameOver(g.score)
      return
    }
    g.bird.y = g.canvasH / 2
    g.bird.velocity = 0
    g.invincible = 90
  }, [onLifeLost, onGameOver, spawnParticles])

  // ─── Spawn boss ───────────────────────────────────────────────
  const spawnBoss = useCallback((g: GameState) => {
    const def = BOSS_DEFS[Math.min(g.phase - 1, 9)]
    sfx.bossAppear()
    g.boss = {
      x: g.canvasW - def.size - 20,
      y: g.canvasH / 2 - def.size / 2,
      hp: def.hp, maxHp: def.hp,
      name: def.name, color: def.color,
      speed: def.speed, size: def.size,
      attackType: def.attackType,
      attackRate: def.attackRate,
      lastAttack: Date.now(),
      dir: 1, enraged: false, angle: 0,
      laserCharging: 0, laserFiring: 0, laserY: 0,
    }
    g.bossBullets = []
    g.summonedMinions = []
    g.meteors = []
    g.monsters = []
    g.inBossFight = true
    g.obstacles = []
    g.bossWarning = 0
  }, [])

  // ─── Flap ─────────────────────────────────────────────────────
  const flap = useCallback(() => {
    const g = gameRef.current
    if (!g || !g.isRunning || isPausedRef.current) return
    g.bird.velocity = FLAP_FORCE
    sfx.flap()
  }, [])

  // ─── Shoot (5 shots per second = 200ms cooldown) ──────────────
  const lastShotTimeRef = useRef(0)
  const SHOT_COOLDOWN = 200 // ms between shots (5 per second)
  const shoot = useCallback(() => {
    const g = gameRef.current
    if (!g || !g.isRunning || isPausedRef.current) return
    if (g.frozen > 0) return // can't shoot while frozen
    const now = Date.now()
    if (now - lastShotTimeRef.current < SHOT_COOLDOWN) return
    lastShotTimeRef.current = now
    g.bullets.push({ x: g.bird.x + BIRD_SIZE, y: g.bird.y + BIRD_SIZE / 2, dx: BULLET_SPEED, dy: 0 })
    spawnParticles(g, g.bird.x + BIRD_SIZE, g.bird.y + BIRD_SIZE / 2, "#ff00aa", 3)
    sfx.shoot()
  }, [spawnParticles])

  // ─── Keyboard: SPACE = auto-shoot, ArrowUp = jump ────────────
  const autoFireRef = useRef<ReturnType<typeof setInterval> | null>(null)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        sfx.init()
        shoot()
        // Start auto-fire interval if not already running
        if (!autoFireRef.current) {
          autoFireRef.current = setInterval(() => { shoot() }, SHOT_COOLDOWN)
        }
      }
      if (e.code === "ArrowUp") {
        e.preventDefault()
        sfx.init()
        flap()
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        if (autoFireRef.current) {
          clearInterval(autoFireRef.current)
          autoFireRef.current = null
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
      if (autoFireRef.current) clearInterval(autoFireRef.current)
    }
  }, [flap, shoot])

  // ─── Expose flap/shoot to parent ──────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement as HTMLElement & { __flap?: () => void; __shoot?: () => void }
    if (parent) { parent.__flap = flap; parent.__shoot = shoot }
  }, [flap, shoot])

  // ═══ MAIN GAME LOOP ═══════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    sfx.init()

    const resize = () => {
      const p = canvas.parentElement
      if (!p) return
      const r = p.getBoundingClientRect()
      canvas.width = r.width
      canvas.height = r.height
      if (gameRef.current) {
        gameRef.current.canvasW = r.width
        gameRef.current.canvasH = r.height
      }
    }
    resize()

    const W = canvas.width
    const H = canvas.height

    // Init game state
    const g: GameState = {
      bird: { x: 80, y: H / 2, velocity: 0 },
      bullets: [], monsters: [], obstacles: [], hearts: [],
      particles: [], stars: createStars(W, H),
      boss: null, bossBullets: [], summonedMinions: [], meteors: [],
      score: 0, phaseScore: 0, lives: MAX_LIVES, phase: 1,
      inBossFight: false, bossDefeated: false,
      phaseTransition: 0,
      lastObstacleSpawn: Date.now(),
      lastHeartSpawn: Date.now(), invincible: 60,
      isRunning: true, animationId: 0, canvasW: W, canvasH: H,
      frozen: 0, bossWarning: 0, lastMonsterSpawn: Date.now(),
    }
    gameRef.current = g
    onPhaseChange?.(1)
    setReady(true)

    // ─── Draw helpers ─────────────────────────────────────────
    const drawSky = () => {
      // Night sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, "#050520")
      grad.addColorStop(0.4, "#0a0a35")
      grad.addColorStop(0.7, "#0d1040")
      grad.addColorStop(1, "#1a1a2e")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // Stars
      g.stars.forEach(s => {
        const twinkle = Math.sin(Date.now() * s.twinkleSpeed) * 0.3 + 0.7
        ctx.globalAlpha = s.brightness * twinkle
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(s.x, s.y, s.size, s.size)
      })
      ctx.globalAlpha = 1

      // Moon
      ctx.save()
      ctx.beginPath()
      ctx.arc(W - 80, 60, 25, 0, Math.PI * 2)
      const moonGrad = ctx.createRadialGradient(W - 85, 55, 5, W - 80, 60, 25)
      moonGrad.addColorStop(0, "#f0f0f0")
      moonGrad.addColorStop(0.7, "#c0c0d0")
      moonGrad.addColorStop(1, "rgba(150,150,180,0)")
      ctx.fillStyle = moonGrad
      ctx.fill()
      ctx.shadowColor = "rgba(200,200,255,0.3)"
      ctx.shadowBlur = 30
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.restore()

      // Ground (dark)
      ctx.fillStyle = "#1a1a2e"
      ctx.fillRect(0, H - 40, W, 40)
      ctx.fillStyle = "rgba(100,100,180,0.2)"
      ctx.fillRect(0, H - 40, W, 2)
    }

    const drawBird = () => {
      const b = g.bird
      if (g.invincible > 0 && Math.floor(g.invincible / 4) % 2 !== 0) return

      ctx.save()
      ctx.translate(b.x + BIRD_SIZE / 2, b.y + BIRD_SIZE / 2)
      const rot = Math.min(Math.max(b.velocity * 3, -30), 60) * (Math.PI / 180)
      ctx.rotate(rot)

      // Body (golden bird)
      ctx.fillStyle = "#ffd700"
      ctx.fillRect(-BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE)

      // Belly
      ctx.fillStyle = "#fff3b0"
      ctx.fillRect(-BIRD_SIZE / 2 + 4, 2, BIRD_SIZE - 8, BIRD_SIZE / 2 - 4)

      // Eye
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(BIRD_SIZE / 2 - 10, -BIRD_SIZE / 2 + 4, 7, 7)
      ctx.fillStyle = "#000000"
      ctx.fillRect(BIRD_SIZE / 2 - 7, -BIRD_SIZE / 2 + 5, 4, 4)

      // Beak
      ctx.fillStyle = "#ff6644"
      ctx.fillRect(BIRD_SIZE / 2 - 2, 0, 8, 5)

      // Wing
      const wingY = Math.sin(Date.now() / 80) * 2
      ctx.fillStyle = "#e6b800"
      ctx.fillRect(-BIRD_SIZE / 2 - 2, wingY - 2, 8, 10)

      // Frozen effect
      if (g.frozen > 0) {
        ctx.globalAlpha = 0.5
        ctx.fillStyle = "#88ddff"
        ctx.fillRect(-BIRD_SIZE / 2 - 2, -BIRD_SIZE / 2 - 2, BIRD_SIZE + 4, BIRD_SIZE + 4)
        ctx.globalAlpha = 1
      }

      ctx.restore()
    }

    const drawMonster = (m: Monster) => {
      const colors = ["#cc2244", "#8844cc", "#cc6600", "#44aacc", "#cc44aa"]
      const c = colors[m.type % colors.length]

      ctx.save()
      ctx.translate(m.x, m.y)

      ctx.fillStyle = c
      ctx.fillRect(0, 0, 28, 28)
      ctx.fillStyle = "#000000"
      ctx.fillRect(4, 4, 20, 20)
      ctx.fillStyle = c
      ctx.fillRect(6, 6, 16, 12)

      ctx.fillStyle = "#ffffff"
      ctx.fillRect(8, 8, 4, 4)
      ctx.fillRect(16, 8, 4, 4)

      ctx.fillStyle = "#ff0000"
      ctx.fillRect(9, 9, 2, 2)
      ctx.fillRect(17, 9, 2, 2)

      if (m.maxHp > 1) {
        const hpW = 28
        const hpRatio = m.hp / m.maxHp
        ctx.fillStyle = "#333333"
        ctx.fillRect(0, -6, hpW, 3)
        ctx.fillStyle = hpRatio > 0.5 ? "#00ff88" : hpRatio > 0.25 ? "#ffcc00" : "#ff2244"
        ctx.fillRect(0, -6, hpW * hpRatio, 3)
      }

      ctx.restore()
    }

    const drawObstacle = (o: Obstacle) => {
      // Dark metallic pipes
      ctx.fillStyle = "#2a2a4a"
      ctx.fillRect(o.x, 0, o.width, o.gapY)
      ctx.fillStyle = "#1a1a3a"
      ctx.fillRect(o.x + 3, 0, o.width - 6, o.gapY)
      ctx.fillStyle = "#3a3a6a"
      ctx.fillRect(o.x - 4, o.gapY - 12, o.width + 8, 12)

      const bottomY = o.gapY + o.gapH
      ctx.fillStyle = "#2a2a4a"
      ctx.fillRect(o.x, bottomY, o.width, H - bottomY)
      ctx.fillStyle = "#1a1a3a"
      ctx.fillRect(o.x + 3, bottomY, o.width - 6, H - bottomY)
      ctx.fillStyle = "#3a3a6a"
      ctx.fillRect(o.x - 4, bottomY, o.width + 8, 12)

      // Neon trim
      ctx.fillStyle = "rgba(0, 204, 255, 0.3)"
      ctx.fillRect(o.x - 4, o.gapY - 12, o.width + 8, 2)
      ctx.fillRect(o.x - 4, bottomY + 10, o.width + 8, 2)
    }

    const drawHeart = (h: HeartPickup) => {
      ctx.fillStyle = "#ff4466"
      const s = 4
      const px = h.x; const py = h.y
      ctx.fillRect(px + s, py, s, s)
      ctx.fillRect(px + 2 * s, py, s, s)
      ctx.fillRect(px + 4 * s, py, s, s)
      ctx.fillRect(px + 5 * s, py, s, s)
      ctx.fillRect(px, py + s, s * 7, s)
      ctx.fillRect(px, py + 2 * s, s * 7, s)
      ctx.fillRect(px + s, py + 3 * s, s * 5, s)
      ctx.fillRect(px + 2 * s, py + 4 * s, s * 3, s)
      ctx.fillRect(px + 3 * s, py + 5 * s, s, s)

      ctx.shadowColor = "#ff4466"
      ctx.shadowBlur = 8
      ctx.fillRect(px + 3 * s, py + 2 * s, s, s)
      ctx.shadowBlur = 0
    }

    const drawBullet = (b: Bullet) => {
      ctx.fillStyle = "#ff00aa"
      ctx.shadowColor = "#ff00aa"
      ctx.shadowBlur = 6
      ctx.fillRect(b.x, b.y - 2, 10, 4)
      ctx.shadowBlur = 0
    }

    const drawBoss = (boss: Boss) => {
      ctx.save()
      ctx.translate(boss.x, boss.y)

      const s = boss.size
      const enraged = boss.enraged

      // Glow
      ctx.shadowColor = enraged ? "#ff0000" : boss.color
      ctx.shadowBlur = enraged ? 25 : 12

      // Body
      ctx.fillStyle = boss.color
      ctx.fillRect(0, 0, s, s)

      // Inner dark
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(4, 4, s - 8, s - 8)

      // Pulsing inner color
      const pulse = Math.sin(Date.now() / 200) * 0.3 + 0.5
      ctx.globalAlpha = pulse
      ctx.fillStyle = enraged ? "#ff0000" : boss.color
      ctx.fillRect(6, 6, s - 12, s - 12)
      ctx.globalAlpha = 1

      // Eyes (glowing)
      const eyeSize = Math.floor(s / 7)
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(s * 0.15, s * 0.2, eyeSize * 2, eyeSize * 1.5)
      ctx.fillRect(s * 0.55, s * 0.2, eyeSize * 2, eyeSize * 1.5)

      // Pupils (follow player)
      ctx.fillStyle = enraged ? "#ff0000" : "#ff4444"
      ctx.fillRect(s * 0.18, s * 0.23, eyeSize, eyeSize)
      ctx.fillRect(s * 0.58, s * 0.23, eyeSize, eyeSize)

      // Mouth
      if (enraged) {
        ctx.fillStyle = "#ff0000"
        ctx.fillRect(s * 0.15, s * 0.6, s * 0.7, eyeSize * 1.5)
        // Fangs
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(s * 0.2, s * 0.6, eyeSize, eyeSize * 2)
        ctx.fillRect(s * 0.4, s * 0.6, eyeSize, eyeSize * 2.5)
        ctx.fillRect(s * 0.6, s * 0.6, eyeSize, eyeSize * 2)
      } else {
        ctx.fillStyle = "#ff2244"
        ctx.fillRect(s * 0.25, s * 0.6, s * 0.5, eyeSize)
      }

      ctx.shadowBlur = 0

      // HP bar (wider, more visible)
      const barW = s + 30
      const hpRatio = boss.hp / boss.maxHp
      ctx.fillStyle = "#222222"
      ctx.fillRect(-15, -20, barW, 8)
      ctx.fillStyle = hpRatio > 0.5 ? "#00ff88" : hpRatio > 0.2 ? "#ffcc00" : "#ff2244"
      ctx.fillRect(-15, -20, barW * hpRatio, 8)
      ctx.strokeStyle = "#ffffff"
      ctx.lineWidth = 1
      ctx.strokeRect(-15, -20, barW, 8)

      // Boss name
      ctx.fillStyle = enraged ? "#ff0000" : "#ffffff"
      ctx.font = "bold 9px monospace"
      ctx.textAlign = "center"
      ctx.fillText(boss.name + (enraged ? " ENRAGED!" : ""), s / 2, -28)

      // Laser charging indicator
      if (boss.laserCharging > 0) {
        ctx.globalAlpha = boss.laserCharging / 60
        ctx.fillStyle = "#ff0000"
        ctx.fillRect(0, s * 0.4, s, 4)
        ctx.globalAlpha = 1
      }

      ctx.restore()

      // Laser beam
      if (boss.laserFiring > 0) {
        const laserAlpha = Math.min(boss.laserFiring / 10, 1)
        ctx.save()
        ctx.globalAlpha = laserAlpha
        // Core beam
        ctx.fillStyle = "#ff0000"
        ctx.fillRect(0, boss.laserY - 4, boss.x, 8)
        // Outer glow
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)"
        ctx.fillRect(0, boss.laserY - 12, boss.x, 24)
        // White core
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
        ctx.fillRect(0, boss.laserY - 1, boss.x, 2)
        ctx.globalAlpha = 1
        ctx.restore()
      }
    }

    const drawBossBullet = (b: BossBullet) => {
      ctx.save()
      if (b.type === "fire") {
        // Fire projectile: orange/red flickering
        const flicker = Math.sin(Date.now() / 50) * 0.3 + 0.7
        ctx.globalAlpha = flicker
        ctx.fillStyle = "#ff4400"
        ctx.shadowColor = "#ff6600"
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
        ctx.fill()
        // Inner bright
        ctx.fillStyle = "#ffcc00"
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size * 0.5, 0, Math.PI * 2)
        ctx.fill()
      } else if (b.type === "ice") {
        // Ice: blue crystal
        ctx.fillStyle = "#88ddff"
        ctx.shadowColor = "#00ccff"
        ctx.shadowBlur = 8
        // Diamond shape
        ctx.beginPath()
        ctx.moveTo(b.x, b.y - b.size)
        ctx.lineTo(b.x + b.size, b.y)
        ctx.lineTo(b.x, b.y + b.size)
        ctx.lineTo(b.x - b.size, b.y)
        ctx.closePath()
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size * 0.3, 0, Math.PI * 2)
        ctx.fill()
      } else if (b.type === "laser_orb") {
        ctx.fillStyle = "#ff00ff"
        ctx.shadowColor = "#ff00ff"
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size * 0.4, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = b.color
        ctx.shadowColor = b.color
        ctx.shadowBlur = 6
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
      ctx.restore()
    }

    const drawMeteor = (m: Meteor) => {
      ctx.save()
      ctx.translate(m.x, m.y)
      ctx.rotate(m.rotation)

      // Meteor body
      ctx.fillStyle = "#ff6600"
      ctx.shadowColor = "#ff4400"
      ctx.shadowBlur = 15
      ctx.fillRect(-m.size / 2, -m.size / 2, m.size, m.size)

      // Inner hot core
      ctx.fillStyle = "#ffcc00"
      ctx.fillRect(-m.size / 4, -m.size / 4, m.size / 2, m.size / 2)

      // Crust
      ctx.fillStyle = "#883300"
      ctx.fillRect(-m.size / 2, -m.size / 2, m.size / 4, m.size / 4)
      ctx.fillRect(m.size / 4, m.size / 4, m.size / 4, m.size / 4)

      ctx.shadowBlur = 0
      ctx.restore()

      // Trail
      ctx.globalAlpha = 0.4
      ctx.fillStyle = "#ff4400"
      ctx.beginPath()
      ctx.arc(m.x - m.dx * 3, m.y - m.dy * 3, m.size * 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#ff8800"
      ctx.beginPath()
      ctx.arc(m.x - m.dx * 6, m.y - m.dy * 6, m.size * 0.2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 1
    }

    const drawSummonedMinion = (m: SummonedMinion) => {
      ctx.save()
      ctx.translate(m.x, m.y)

      // Shadowy minion
      ctx.fillStyle = "#6600aa"
      ctx.shadowColor = "#aa00ff"
      ctx.shadowBlur = 8
      ctx.fillRect(0, 0, 22, 22)
      ctx.fillStyle = "#220044"
      ctx.fillRect(3, 3, 16, 16)

      // Eyes
      ctx.fillStyle = "#ff00ff"
      ctx.fillRect(5, 6, 4, 4)
      ctx.fillRect(13, 6, 4, 4)

      ctx.shadowBlur = 0
      ctx.restore()
    }

    const drawParticles = () => {
      g.particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(p.x, p.y, p.size, p.size)
      })
      ctx.globalAlpha = 1
    }

    const drawPhaseTransition = () => {
      if (g.phaseTransition <= 0) return
      const alpha = Math.min(g.phaseTransition / 60, 1)
      ctx.globalAlpha = alpha * 0.7
      ctx.fillStyle = "#000000"
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = alpha
      ctx.fillStyle = "#00ff88"
      ctx.font = "bold 20px 'Press Start 2P', monospace"
      ctx.textAlign = "center"
      if (g.bossDefeated) {
        ctx.fillText(`FASE ${g.phase} COMPLETA!`, W / 2, H / 2 - 20)
        ctx.font = "12px 'Press Start 2P', monospace"
        ctx.fillStyle = "#ffcc00"
        ctx.fillText(`Preparando fase ${g.phase + 1}...`, W / 2, H / 2 + 20)
      } else {
        ctx.fillText(`FASE ${g.phase}`, W / 2, H / 2 - 20)
        ctx.font = "10px 'Press Start 2P', monospace"
        ctx.fillStyle = "#ff00aa"
        const bossName = BOSS_DEFS[Math.min(g.phase - 1, 9)].name
        ctx.fillText(`BOSS: ${bossName}`, W / 2, H / 2 + 10)
        ctx.fillStyle = "#ffcc00"
        ctx.font = "8px 'Press Start 2P', monospace"
        const needed = getPhaseConfig(g.phase).bossScoreThreshold
        ctx.fillText(`Precisa de ${needed} pontos`, W / 2, H / 2 + 35)
      }
      ctx.globalAlpha = 1
      ctx.textAlign = "left"
    }

    const drawBossWarning = () => {
      if (g.bossWarning <= 0) return
      const alpha = Math.sin(g.bossWarning / 5) * 0.5 + 0.5
      ctx.globalAlpha = alpha * 0.3
      ctx.fillStyle = "#ff0000"
      ctx.fillRect(0, 0, W, H)
      ctx.globalAlpha = alpha
      ctx.fillStyle = "#ff0000"
      ctx.font = "bold 16px 'Press Start 2P', monospace"
      ctx.textAlign = "center"
      ctx.fillText("WARNING: BOSS INCOMING!", W / 2, H / 2)
      ctx.globalAlpha = 1
      ctx.textAlign = "left"
    }

    const drawHUD = () => {
      // Phase score progress (only during obstacle phase)
      if (!g.inBossFight && !g.bossDefeated) {
        const needed = getPhaseConfig(g.phase).bossScoreThreshold
        const progress = Math.min(g.phaseScore / needed, 1)
        const barW = 120
        const barH = 8
        const bx = W / 2 - barW / 2
        const by = 8

        ctx.fillStyle = "rgba(0,0,0,0.5)"
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2)
        ctx.fillStyle = "#333"
        ctx.fillRect(bx, by, barW, barH)
        ctx.fillStyle = progress >= 1 ? "#ff4400" : "#00ff88"
        ctx.fillRect(bx, by, barW * progress, barH)

        ctx.fillStyle = "#ffffff"
        ctx.font = "6px monospace"
        ctx.textAlign = "center"
        ctx.fillText(`${g.phaseScore}/${needed} pts`, W / 2, by + barH + 10)
        ctx.textAlign = "left"
      }
    }

    // ─── Boss attack patterns ────────────────────────────────
    const bossAttack = (boss: Boss, dt: number) => {
      const now = Date.now()
      const rate = boss.enraged ? boss.attackRate * 0.5 : boss.attackRate
      if (now - boss.lastAttack < rate) return
      boss.lastAttack = now

      const bx = boss.x
      const by = boss.y + boss.size / 2
      const c = boss.enraged ? "#ff0000" : boss.color

      const types = boss.attackType.split("+")
      const attackChoice = types[Math.floor(Math.random() * types.length)]

      switch (attackChoice) {
        case "fire": {
          sfx.fire()
          // Fire spread: multiple fire projectiles
          const count = boss.enraged ? 7 : 5
          for (let i = 0; i < count; i++) {
            const angle = -Math.PI + (i / (count - 1)) * Math.PI * 0.6 + (Math.random() - 0.5) * 0.2
            g.bossBullets.push({
              x: bx, y: by,
              dx: Math.cos(angle) * BOSS_BULLET_SPEED * 1.1,
              dy: Math.sin(angle) * BOSS_BULLET_SPEED * 0.8,
              color: "#ff4400", type: "fire", size: 6,
            })
          }
          break
        }
        case "ice": {
          sfx.freeze()
          // Ice crystals that slow the player
          for (let i = -3; i <= 3; i++) {
            g.bossBullets.push({
              x: bx, y: by,
              dx: -BOSS_BULLET_SPEED * 1.2,
              dy: i * 1.8,
              color: "#88ddff", type: "ice", size: 7,
            })
          }
          // Wave pattern
          for (let i = 0; i < 4; i++) {
            const a = boss.angle + (i / 4) * Math.PI * 2
            g.bossBullets.push({
              x: bx, y: by,
              dx: Math.cos(a) * BOSS_BULLET_SPEED,
              dy: Math.sin(a) * BOSS_BULLET_SPEED,
              color: "#00eeff", type: "ice", size: 5,
            })
          }
          boss.angle += 0.4
          break
        }
        case "laser": {
          sfx.laser()
          // Laser: charging then fires a beam
          if (boss.laserCharging <= 0 && boss.laserFiring <= 0) {
            boss.laserCharging = 60
            boss.laserY = by
          }
          // Also shoot tracking orbs
          const dx = g.bird.x - bx
          const dy = g.bird.y - by
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          g.bossBullets.push({
            x: bx, y: by,
            dx: (dx / dist) * BOSS_BULLET_SPEED * 1.3,
            dy: (dy / dist) * BOSS_BULLET_SPEED * 1.3,
            color: "#ff00ff", type: "laser_orb", size: 5,
          })
          break
        }
        case "meteor": {
          sfx.meteorImpact()
          // Meteors rain from top
          const meteorCount = boss.enraged ? 6 : 4
          for (let i = 0; i < meteorCount; i++) {
            setTimeout(() => {
              if (!g.isRunning) return
              g.meteors.push({
                x: Math.random() * W * 0.8,
                y: -30 - Math.random() * 60,
                dx: -1 + Math.random() * -2,
                dy: 3 + Math.random() * 2,
                size: 18 + Math.random() * 12,
                rotation: Math.random() * Math.PI * 2,
              })
            }, i * 300)
          }
          break
        }
        case "summon": {
          sfx.summon()
          // Summon minions
          const minionCount = boss.enraged ? 4 : 2
          for (let i = 0; i < minionCount; i++) {
            g.summonedMinions.push({
              x: bx - 30,
              y: 40 + Math.random() * (H - 120),
              hp: 3,
              speed: 1 + Math.random() * 0.5,
              sinOffset: Math.random() * Math.PI * 2,
              lastShot: Date.now(),
              shotRate: 2000 + Math.random() * 1000,
            })
          }
          // Also shoot
          g.bossBullets.push({
            x: bx, y: by,
            dx: -BOSS_BULLET_SPEED,
            dy: 0,
            color: c, type: "normal", size: 5,
          })
          break
        }
        case "all": {
          // CHAOS EMPEROR: uses all powers aggressively
          sfx.fire()
          const isEnragedAll = boss.enraged
          // Fire burst (bigger spiral)
          const allFireCount = isEnragedAll ? 10 : 7
          for (let i = 0; i < allFireCount; i++) {
            const a = (i / allFireCount) * Math.PI * 2 + boss.angle
            g.bossBullets.push({
              x: bx, y: by,
              dx: Math.cos(a) * BOSS_BULLET_SPEED * 1.2,
              dy: Math.sin(a) * BOSS_BULLET_SPEED * 1.2,
              color: "#ff4400", type: "fire", size: 6,
            })
          }
          // Ice wall
          const allIceCount = isEnragedAll ? 5 : 3
          for (let i = -allIceCount; i <= allIceCount; i++) {
            g.bossBullets.push({
              x: bx, y: by,
              dx: -BOSS_BULLET_SPEED * 1.3,
              dy: i * 1.8,
              color: "#88ddff", type: "ice", size: 6,
            })
          }
          // Multiple homing orbs
          const allHomingCount = isEnragedAll ? 4 : 2
          for (let h = 0; h < allHomingCount; h++) {
            const dx2 = g.bird.x - bx; const dy2 = g.bird.y - by
            const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1
            const spread = (h - allHomingCount / 2) * 0.3
            g.bossBullets.push({
              x: bx, y: by,
              dx: (dx2 / d2) * BOSS_BULLET_SPEED * 1.3 + Math.cos(spread) * 0.5,
              dy: (dy2 / d2) * BOSS_BULLET_SPEED * 1.3 + Math.sin(spread) * 0.5,
              color: "#ff00ff", type: "laser_orb", size: 5,
            })
          }
          // More meteors
          const allMeteorCount = isEnragedAll ? 6 : 4
          for (let i = 0; i < allMeteorCount; i++) {
            setTimeout(() => {
              if (!g.isRunning) return
              g.meteors.push({
                x: Math.random() * W * 0.8,
                y: -30,
                dx: -1.5 - Math.random(),
                dy: 3.5 + Math.random() * 1.5,
                size: 20 + Math.random() * 12,
                rotation: Math.random() * Math.PI * 2,
              })
            }, i * 150)
          }
          // Summon minions too
          if (isEnragedAll && g.summonedMinions.length < 6) {
            sfx.summon()
            for (let i = 0; i < 2; i++) {
              g.summonedMinions.push({
                x: bx - 30,
                y: 40 + Math.random() * (H - 120),
                hp: 4,
                speed: 1.5 + Math.random() * 0.5,
                sinOffset: Math.random() * Math.PI * 2,
                lastShot: Date.now(),
                shotRate: 1200,
              })
            }
          }
          boss.angle += isEnragedAll ? 0.45 : 0.35
          break
        }
        case "ultimate": {
          // DARK OVERLORD: nearly impossible - all powers massively amplified
          sfx.fire()
          sfx.laser()
          const isEnragedUlt = boss.enraged

          // Double spiral fire (16 projectiles in 2 offset spirals)
          const fireCount = isEnragedUlt ? 20 : 14
          for (let i = 0; i < fireCount; i++) {
            const a = (i / fireCount) * Math.PI * 2 + boss.angle
            g.bossBullets.push({
              x: bx, y: by,
              dx: Math.cos(a) * BOSS_BULLET_SPEED * (isEnragedUlt ? 1.6 : 1.3),
              dy: Math.sin(a) * BOSS_BULLET_SPEED * (isEnragedUlt ? 1.6 : 1.3),
              color: "#ff2200", type: "fire", size: 7,
            })
          }
          // Second spiral offset
          for (let i = 0; i < (isEnragedUlt ? 12 : 8); i++) {
            const a = (i / 8) * Math.PI * 2 + boss.angle + Math.PI / 8
            g.bossBullets.push({
              x: bx, y: by,
              dx: Math.cos(a) * BOSS_BULLET_SPEED * 0.9,
              dy: Math.sin(a) * BOSS_BULLET_SPEED * 0.9,
              color: "#ff8800", type: "fire", size: 5,
            })
          }

          // Dense ice wall (covers almost entire screen height)
          const iceCount = isEnragedUlt ? 10 : 7
          for (let i = -iceCount; i <= iceCount; i++) {
            g.bossBullets.push({
              x: bx, y: by,
              dx: -BOSS_BULLET_SPEED * (isEnragedUlt ? 1.6 : 1.4),
              dy: i * (isEnragedUlt ? 1.2 : 1.5),
              color: "#00eeff", type: "ice", size: 6,
            })
          }

          // Multiple homing lasers that track the player
          const homingCount = isEnragedUlt ? 6 : 4
          for (let i = 0; i < homingCount; i++) {
            const a = Math.atan2(g.bird.y - by, g.bird.x - bx) + (i - homingCount / 2) * 0.25
            g.bossBullets.push({
              x: bx, y: by,
              dx: Math.cos(a) * BOSS_BULLET_SPEED * (isEnragedUlt ? 1.8 : 1.5),
              dy: Math.sin(a) * BOSS_BULLET_SPEED * (isEnragedUlt ? 1.8 : 1.5),
              color: "#ff00ff", type: "laser_orb", size: 6,
            })
          }

          // Massive meteor storm
          const meteorCount = isEnragedUlt ? 10 : 7
          for (let i = 0; i < meteorCount; i++) {
            setTimeout(() => {
              if (!g.isRunning) return
              g.meteors.push({
                x: Math.random() * W * 0.9,
                y: -40 - Math.random() * 80,
                dx: -2 - Math.random() * 2,
                dy: 4 + Math.random() * 3,
                size: 24 + Math.random() * 18,
                rotation: Math.random() * Math.PI * 2,
              })
            }, i * 100)
          }

          // Constant minion summon (up to 10 at once!)
          const maxMinions = isEnragedUlt ? 10 : 8
          if (g.summonedMinions.length < maxMinions) {
            sfx.summon()
            const spawnCount = isEnragedUlt ? 4 : 3
            for (let i = 0; i < spawnCount; i++) {
              g.summonedMinions.push({
                x: bx - 40 - Math.random() * 60,
                y: 40 + Math.random() * (H - 120),
                hp: isEnragedUlt ? 6 : 5,
                speed: 1.8 + Math.random() * 0.8,
                sinOffset: Math.random() * Math.PI * 2,
                lastShot: Date.now(),
                shotRate: isEnragedUlt ? 800 : 1100,
              })
            }
          }

          // Laser beam (faster charge)
          if (boss.laserCharging <= 0 && boss.laserFiring <= 0) {
            boss.laserCharging = isEnragedUlt ? 25 : 35
            boss.laserY = by
          }

          // Random scatter bullets to fill gaps
          const scatterCount = isEnragedUlt ? 8 : 5
          for (let i = 0; i < scatterCount; i++) {
            const randAngle = Math.random() * Math.PI * 2
            g.bossBullets.push({
              x: bx - Math.random() * 40, y: by + (Math.random() - 0.5) * boss.size,
              dx: Math.cos(randAngle) * BOSS_BULLET_SPEED * (0.8 + Math.random() * 0.6),
              dy: Math.sin(randAngle) * BOSS_BULLET_SPEED * (0.8 + Math.random() * 0.6),
              color: "#ff0044", type: "normal", size: 5,
            })
          }

          boss.angle += isEnragedUlt ? 0.4 : 0.3
          break
        }
      }
    }

    // ─── Update loop ─────────────────────────────────────────
    let lastTime = performance.now()

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 2.5)
      lastTime = time

      if (!g.isRunning) return

      // Always draw even if paused
      drawSky()
      g.obstacles.forEach(drawObstacle)
      g.hearts.forEach(drawHeart)
      g.monsters.forEach(drawMonster)
      g.summonedMinions.forEach(drawSummonedMinion)
      g.meteors.forEach(drawMeteor)
      g.bullets.forEach(drawBullet)
      if (g.boss) drawBoss(g.boss)
      g.bossBullets.forEach(drawBossBullet)
      drawParticles()
      drawBird()
      drawHUD()
      drawPhaseTransition()
      drawBossWarning()

      if (isPausedRef.current) {
        g.animationId = requestAnimationFrame(loop)
        return
      }

      // Phase transition timer
      if (g.phaseTransition > 0) {
        g.phaseTransition -= dt
        if (g.phaseTransition <= 0 && g.bossDefeated) {
          // Advance to next phase
          g.phase = Math.min(g.phase + 1, 10)
          g.phaseScore = 0
          g.inBossFight = false
          g.bossDefeated = false
          g.boss = null
          g.bossBullets = []
          g.summonedMinions = []
          g.meteors = []
          g.monsters = []
          g.obstacles = []
          g.lastObstacleSpawn = Date.now()
          g.lastMonsterSpawn = Date.now()
          onPhaseChange?.(g.phase)
          g.phaseTransition = 90
        }
        g.animationId = requestAnimationFrame(loop)
        return
      }

      // Boss warning timer
      if (g.bossWarning > 0) {
        g.bossWarning -= dt
        if (g.bossWarning <= 0) {
          spawnBoss(g)
        }
        g.animationId = requestAnimationFrame(loop)
        return
      }

      const cfg = getPhaseConfig(g.phase)

      // ─── Update frozen timer ───────────────────────────────
      if (g.frozen > 0) g.frozen -= dt

      // ─── Update bird ──────────��────────────────────────────
      const gravMult = g.frozen > 0 ? 1.5 : 1
      g.bird.velocity += GRAVITY * dt * gravMult
      g.bird.y += g.bird.velocity * dt

      if (g.invincible > 0) g.invincible -= dt

      // Floor/ceiling
      if (g.bird.y + BIRD_SIZE > H - 40 || g.bird.y < 0) {
        if (g.invincible <= 0) {
          damagePlayer(g)
        } else {
          g.bird.y = Math.max(0, Math.min(g.bird.y, H - 40 - BIRD_SIZE))
          g.bird.velocity = 0
        }
      }

      const now = Date.now()

      if (!g.inBossFight) {
        // ─── Spawn obstacles ─────────────────────────────────
        if (now - g.lastObstacleSpawn > cfg.obstacleSpawnRate) {
          const gapH = Math.max(140 - g.phase * 5, 100)
          const gapY = 60 + Math.random() * (H - 140 - gapH)
          g.obstacles.push({ x: W + 10, gapY, gapH, width: 50, passed: false })
          g.lastObstacleSpawn = now
        }

        // ─── Spawn hearts ────────────────────────────────────
        // Quando está com pouca vida, os corações aparecem mais rápido
        let heartRate = cfg.heartSpawnRate
        if (g.lives <= 2) {
          heartRate *= 0.4
        } else if (g.lives === 3) {
          heartRate *= 0.7
        }

        if (now - g.lastHeartSpawn > heartRate && g.lives < MAX_LIVES) {
          g.hearts.push({ x: W + 10, y: 60 + Math.random() * (H - 160), speed: cfg.scrollSpeed * 0.8 })
          g.lastHeartSpawn = now
        }

        // ─── Spawn mini monsters ─────────────────────────────
        if (now - g.lastMonsterSpawn > cfg.monsterSpawnRate) {
          for (let i = 0; i < cfg.monstersPerSpawn; i++) {
            g.monsters.push({
              x: W + 10 + i * 40,
              y: 50 + Math.random() * (H - 150),
              hp: cfg.monsterHp,
              maxHp: cfg.monsterHp,
              speed: cfg.scrollSpeed * (0.6 + Math.random() * 0.4),
              sinOffset: Math.random() * Math.PI * 2,
              type: Math.floor(Math.random() * 5),
            })
          }
          g.lastMonsterSpawn = now
        }

        // ─── Check if reached boss threshold ─────────────────
        if (g.phaseScore >= cfg.bossScoreThreshold && !g.bossDefeated && g.bossWarning <= 0) {
          g.bossWarning = 90 // Show warning for ~1.5 seconds
        }
      }

      // ─── Update obstacles ──────────────────────────────────
      g.obstacles.forEach(o => { o.x -= cfg.scrollSpeed * dt })
      // Obstacle collision
      g.obstacles.forEach(o => {
        if (g.invincible <= 0 &&
          g.bird.x + BIRD_SIZE > o.x && g.bird.x < o.x + o.width &&
          (g.bird.y < o.gapY || g.bird.y + BIRD_SIZE > o.gapY + o.gapH)) {
          damagePlayer(g)
        }
        // Score for passing obstacle
        if (!o.passed && o.x + o.width < g.bird.x) {
          o.passed = true
          g.score += 10
          g.phaseScore += 10
          onScoreChange(g.score)
          sfx.obstaclePass()
        }
      })
      g.obstacles = g.obstacles.filter(o => o.x + o.width > -20)

      // ─── Update mini monsters ──────────────────────────────
      g.monsters.forEach(m => {
        m.x -= m.speed * dt
        m.y += Math.sin(Date.now() / 500 + m.sinOffset) * 0.8 * dt

        // Monster-bird collision
        if (g.invincible <= 0 &&
          g.bird.x + BIRD_SIZE > m.x && g.bird.x < m.x + 28 &&
          g.bird.y + BIRD_SIZE > m.y && g.bird.y < m.y + 28) {
          damagePlayer(g)
          m.hp = 0
          spawnParticles(g, m.x + 14, m.y + 14, "#ff4444", 8)
        }
      })
      g.monsters = g.monsters.filter(m => m.hp > 0 && m.x > -30)

      // ─── Update hearts ─────────────────────────────────────
      g.hearts.forEach(h => { h.x -= h.speed * dt })
      g.hearts = g.hearts.filter(h => {
        if (g.bird.x + BIRD_SIZE > h.x && g.bird.x < h.x + 28 &&
          g.bird.y + BIRD_SIZE > h.y && g.bird.y < h.y + 24) {
          if (g.lives < MAX_LIVES) {
            g.lives++
            onLifeLost(g.lives)
            spawnParticles(g, h.x, h.y, "#ff4466", 10)
            sfx.pickup()
          }
          return false
        }
        return h.x > -30
      })

      // ─── Update player bullets ─────────────────────────────
      g.bullets.forEach(b => { b.x += b.dx * dt; b.y += b.dy * dt })
      // Bullet-monster collision
      g.bullets.forEach(b => {
        g.monsters.forEach(m => {
          if (b.x > m.x && b.x < m.x + 28 && b.y > m.y && b.y < m.y + 28) {
            m.hp--
            spawnParticles(g, b.x, b.y, "#00ccff", 5)
            b.x = W + 200
            if (m.hp <= 0) {
              g.score += 5
              g.phaseScore += 5
              onScoreChange(g.score)
              spawnParticles(g, m.x, m.y, "#ffcc00", 10)
              sfx.kill()
            }
          }
        })
        // Bullet-summonedMinion collision
        g.summonedMinions.forEach(m => {
          if (b.x > m.x && b.x < m.x + 22 && b.y > m.y && b.y < m.y + 22) {
            m.hp--
            spawnParticles(g, b.x, b.y, "#aa00ff", 4)
            b.x = W + 200
            if (m.hp <= 0) {
              g.score += 15
              onScoreChange(g.score)
              spawnParticles(g, m.x, m.y, "#ff00ff", 10)
              sfx.kill()
            }
          }
        })
        // Bullet-boss collision
        if (g.boss && b.x > g.boss.x && b.x < g.boss.x + g.boss.size &&
          b.y > g.boss.y && b.y < g.boss.y + g.boss.size) {
          g.boss.hp--
          spawnParticles(g, b.x, b.y, g.boss.color, 6)
          sfx.bossHit()
          b.x = W + 200
          // DARK OVERLORD enrages at 50% HP, others at 30%
          const enrageThreshold = g.phase >= 10 ? 0.5 : 0.3
          if (g.boss.hp <= g.boss.maxHp * enrageThreshold && !g.boss.enraged) {
            g.boss.enraged = true
            // DARK OVERLORD gets much faster when enraged
            g.boss.speed *= g.phase >= 10 ? 2.5 : 1.8
            g.boss.attackRate = Math.max(g.boss.attackRate * (g.phase >= 10 ? 0.3 : 0.5), 80)
          }
          if (g.boss.hp <= 0) {
            // Boss defeated
            g.score += 200 * g.phase
            onScoreChange(g.score)
            spawnParticles(g, g.boss.x + g.boss.size / 2, g.boss.y + g.boss.size / 2, "#ffcc00", 40)
            spawnParticles(g, g.boss.x + g.boss.size / 2, g.boss.y + g.boss.size / 2, g.boss.color, 30)
            spawnParticles(g, g.boss.x + g.boss.size / 2, g.boss.y + g.boss.size / 2, "#ffffff", 20)
            sfx.bossDie()
            sfx.phaseComplete()
            g.bossDefeated = true
            g.inBossFight = false
            g.summonedMinions = []
            g.meteors = []

            if (g.phase >= 10) {
              g.isRunning = false
              g.score += 1000
              onScoreChange(g.score)
              onGameOver(g.score)
              return
            }
            g.phaseTransition = 120
          }
        }
      })
      g.bullets = g.bullets.filter(b => b.x < W + 50)
      g.summonedMinions = g.summonedMinions.filter(m => m.hp > 0 && m.x > -30)

      // ─── Update boss ───────────��───────────────────────────
      if (g.boss && g.inBossFight) {
        const boss = g.boss
        // Movement: bounce up and down
        boss.y += boss.speed * boss.dir * dt
        if (boss.y < 20 || boss.y + boss.size > H - 60) boss.dir *= -1

        // Enraged: aggressive side movement (DARK OVERLORD is chaotic)
        if (boss.enraged) {
          const isOverlord = boss.attackType === "ultimate"
          const lateralIntensity = isOverlord ? 3.5 : 1.5
          const lateralSpeed = isOverlord ? 120 : 200
          boss.x += Math.sin(Date.now() / lateralSpeed) * lateralIntensity * dt
          if (isOverlord) {
            // Additional erratic movement for DARK OVERLORD
            boss.x += Math.cos(Date.now() / 80) * 2.0 * dt
            boss.y += Math.cos(Date.now() / 150) * 2.0 * dt
          }
          boss.x = Math.max(W * 0.35, Math.min(boss.x, W - boss.size - 10))
        }

        // Laser charging/firing
        if (boss.laserCharging > 0) {
          boss.laserCharging -= dt
          boss.laserY = boss.y + boss.size * 0.4
          if (boss.laserCharging <= 0) {
            boss.laserFiring = 30
            sfx.laser()
          }
        }
        if (boss.laserFiring > 0) {
          boss.laserFiring -= dt
          // DARK OVERLORD laser is wider and lasts longer
          const isOverlord = boss.attackType === "ultimate"
          const laserHalfWidth = isOverlord ? (boss.enraged ? 24 : 18) : 12
          // Laser damages player
          if (g.invincible <= 0 &&
            g.bird.y + BIRD_SIZE > boss.laserY - laserHalfWidth &&
            g.bird.y < boss.laserY + laserHalfWidth &&
            g.bird.x < boss.x) {
            damagePlayer(g)
          }
        }

        bossAttack(boss, dt)

        // Boss body collision
        if (g.invincible <= 0 &&
          g.bird.x + BIRD_SIZE > boss.x && g.bird.x < boss.x + boss.size &&
          g.bird.y + BIRD_SIZE > boss.y && g.bird.y < boss.y + boss.size) {
          damagePlayer(g)
        }
      }

      // ─── Update summoned minions ───────────────────────────
      g.summonedMinions.forEach(m => {
        m.x -= m.speed * dt
        m.y += Math.sin(Date.now() / 400 + m.sinOffset) * 1.2 * dt

        // Minion shoots at player
        if (now - m.lastShot > m.shotRate) {
          m.lastShot = now
          const dx = g.bird.x - m.x
          const dy = g.bird.y - m.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          g.bossBullets.push({
            x: m.x, y: m.y + 11,
            dx: (dx / dist) * 3,
            dy: (dy / dist) * 3,
            color: "#aa00ff", type: "normal", size: 4,
          })
        }

        // Minion-bird collision
        if (g.invincible <= 0 &&
          g.bird.x + BIRD_SIZE > m.x && g.bird.x < m.x + 22 &&
          g.bird.y + BIRD_SIZE > m.y && g.bird.y < m.y + 22) {
          damagePlayer(g)
          m.hp = 0
        }
      })

      // ─── Update meteors ────────────────────────────────────
      g.meteors.forEach(m => {
        m.x += m.dx * dt
        m.y += m.dy * dt
        m.rotation += 0.05 * dt

        // Meteor-bird collision
        if (g.invincible <= 0 &&
          Math.abs(m.x - (g.bird.x + BIRD_SIZE / 2)) < m.size / 2 + BIRD_SIZE / 2 &&
          Math.abs(m.y - (g.bird.y + BIRD_SIZE / 2)) < m.size / 2 + BIRD_SIZE / 2) {
          damagePlayer(g)
          spawnParticles(g, m.x, m.y, "#ff6600", 15)
          sfx.meteorImpact()
          m.y = H + 100 // remove
        }
      })
      g.meteors = g.meteors.filter(m => m.y < H + 50 && m.x > -50)

      // ─── Update boss bullets ───────────────────────────────
      g.bossBullets.forEach(b => { b.x += b.dx * dt; b.y += b.dy * dt })
      g.bossBullets = g.bossBullets.filter(b => {
        if (g.invincible <= 0 &&
          Math.abs(b.x - (g.bird.x + BIRD_SIZE / 2)) < b.size + BIRD_SIZE / 2 &&
          Math.abs(b.y - (g.bird.y + BIRD_SIZE / 2)) < b.size + BIRD_SIZE / 2) {
          // Ice bullets freeze the player
          if (b.type === "ice") {
            g.frozen = 60 // ~1 second of slow
            sfx.freeze()
          }
          damagePlayer(g)
          return false
        }
        return b.x > -20 && b.x < W + 20 && b.y > -20 && b.y < H + 20
      })

      // ─── Update particles ──────────────────────────────────
      g.particles.forEach(p => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= 0.025 * dt
      })
      g.particles = g.particles.filter(p => p.life > 0)

      // ─── Score for surviving (slower) ──────────────────────
      if (!g.inBossFight && Math.random() < 0.015 * dt) {
        g.score++
        g.phaseScore++
        onScoreChange(g.score)
      }

      g.animationId = requestAnimationFrame(loop)
    }

    g.animationId = requestAnimationFrame(loop)

    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    return () => {
      cancelAnimationFrame(g.animationId)
      ro.disconnect()
    }
  }, [createStars, spawnParticles, damagePlayer, spawnBoss, onScoreChange, onLifeLost, onGameOver, onPhaseChange])

  return (
    <div
      className="relative h-full w-full cursor-pointer"
      onClick={() => { sfx.init(); flap() }}
      onTouchStart={(e) => { e.preventDefault(); sfx.init(); flap() }}
      role="button"
      tabIndex={0}
      aria-label="Toque para voar"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050520]">
          <span className="text-[9px] text-foreground">Carregando...</span>
        </div>
      )}
    </div>
  )
}
