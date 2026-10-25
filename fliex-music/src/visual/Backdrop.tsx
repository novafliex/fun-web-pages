/* Fliex Music — Generative Cosmic Signal（V1.5 生成式视觉装置）
   三层结构（全部围绕既有黑白深空语言）：
   Layer A 背景粒子场：基准图/自定义图 + 稀疏闪烁星点（可关）
   Layer B 主视觉粒子天体：透视投影球面点云 + 近邻连线 + 内壳 + 柔和边缘辉光，
          低频→呼吸，高频→枢纽辉光；不再是实心黑色半球
   Layer C 信号流场：连续向量场驱动的流动线条（独立画布 + 尾迹衰减），
          中频→流速；可关闭、强度可调
   参数全部来自 Customize（prefsRef 实时读取），动画失败不影响音频。 */

import { useEffect, useRef } from 'react'
import { engine } from '../audio/AudioEngine'
import { useApp } from '../app/PlayerProvider'
import backdropUrl from '../assets/musicback.webp'

/* 基准图（1672×941）中静态星球的几何比例 */
const IMG_W = 1672
const IMG_H = 941
const PLANET_CX = 0.329
const PLANET_CY = 1.18
const PLANET_R = 0.614

const ROTATE_SECONDS = 110
const TAU = Math.PI * 2
const FOV = 3.4
const STAR_COUNTS = { low: 22, mid: 46, high: 84 } as const
/* 十字闪光星（一闪一闪的亮星）数量 */
const SPARKLE_COUNTS = { low: 6, mid: 11, high: 18 } as const
const SPHERE_COUNTS = { low: 48, mid: 74, high: 100 } as const
const FLOW_COUNTS = { low: 22, mid: 38, high: 60 } as const
const NEIGHBORS = 2 // V1.5：连线只连最近邻，点云为主、线为辅

/* 斐波那契球面节点 + 近邻连线 */
function buildSphere(count: number) {
  const nodes: Array<[number, number, number]> = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const th = golden * i
    nodes.push([Math.cos(th) * rad, y, Math.sin(th) * rad])
  }
  const edges: Array<[number, number]> = []
  const seen = new Set<string>()
  nodes.forEach((a, i) => {
    const near = nodes
      .map((b, j) => ({ j, d: i === j ? Infinity : (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2 }))
      .sort((p, q) => p.d - q.d)
      .slice(0, NEIGHBORS)
    for (const { j } of near) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([i, j])
      }
    }
  })
  const jitter = edges.map((_, i) => {
    const x = Math.sin(i * 127.1) * 43758.5453
    return x - Math.floor(x)
  })
  return { nodes, edges, jitter }
}

const SPHERES = new Map<number, ReturnType<typeof buildSphere>>()
const getSphere = (count: number) => {
  let s = SPHERES.get(count)
  if (!s) {
    s = buildSphere(count)
    SPHERES.set(count, s)
  }
  return s
}

interface Star {
  x: number
  y: number
  size: number
  alpha: number
  phase: number
  speed: number
}

/* 十字闪光星：位置固定，周期性明暗（一闪一闪） */
interface Sparkle {
  x: number
  y: number
  size: number
  phase: number
  speed: number
}

/* 流场：连续的三角函数混合向量场（时间连续，不逐帧随机） */
const flowAngle = (x: number, y: number, t: number): number =>
  Math.sin(x * 0.0016 + t * 0.00021) * 1.35 +
  Math.cos(y * 0.0012 - t * 0.00016) * 1.35 +
  Math.sin((x + y) * 0.0007 + t * 0.00011) * 0.8

export function Backdrop() {
  const { preferences, bgImageUrl } = useApp()
  const fxRef = useRef<HTMLCanvasElement>(null)
  const flowRef = useRef<HTMLCanvasElement>(null)
  const prefsRef = useRef(preferences)
  prefsRef.current = preferences

  const imageSrc =
    preferences.bgSource === 'image' && bgImageUrl
      ? bgImageUrl
      : preferences.bgSource === 'original'
        ? backdropUrl
        : null

  const starSeed = preferences.starDensity

  useEffect(() => {
    const canvas = fxRef.current
    const flowCanvas = flowRef.current
    if (!canvas || !flowCanvas) return
    const ctx = canvas.getContext('2d')
    const fctx = flowCanvas.getContext('2d')
    if (!ctx || !fctx) return
    const prefs = prefsRef.current
    const moving = prefs.planetMotion && !prefs.reduceMotion
    const sphere = getSphere(SPHERE_COUNTS[prefs.planetDensity] * (prefs.motionQuality === 'low' ? 0.62 : 1))
    let raf = 0
    let w = 0
    let h = 0
    let bands = { low: 0, mid: 0, high: 0 }
    let stars: Star[] = []
    let sparkles: Sparkle[] = []
    const pointerTarget = { x: 0, y: 0 }
    const parallax = { x: 0, y: 0 }

    const onPointerMove = (e: PointerEvent) => {
      if (!prefsRef.current.parallax || prefsRef.current.reduceMotion) return
      pointerTarget.x = (e.clientX / window.innerWidth) * 2 - 1
      pointerTarget.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onPointerMove)

    const makeStars = () => {
      const qualityScale = prefsRef.current.motionQuality === 'low' ? 0.55 : 1
      stars = Array.from({ length: Math.round(STAR_COUNTS[prefsRef.current.starDensity] * qualityScale) }, () => ({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1 + 0.4,
        alpha: Math.random() * 0.14 + 0.05,
        phase: Math.random() * TAU,
        speed: Math.random() * 0.5 + 0.25,
      }))
      // 十字闪光星：避开左下角星球区域，散布在天空中
      sparkles = Array.from({ length: Math.round(SPARKLE_COUNTS[prefsRef.current.starDensity] * qualityScale) }, () => {
        let x = Math.random()
        let y = Math.random() * 0.82
        // 落进星球圆盘区域时重新取位
        const geo = planetGeometry()
        const dx = x * w - geo.cx
        const dy = y * h - geo.cy
        if (Math.hypot(dx, dy) < geo.r * 0.92) {
          x = Math.min(0.92, Math.max(0.04, geo.cx / w + (x - geo.cx / w) * -1))
        }
        return { x, y, size: 3 + Math.random() * 5, phase: Math.random() * TAU, speed: 0.5 + Math.random() * 1.1 }
      })
    }

    /* 流场粒子：生命期内沿向量场漂移，画布以低透明度衰减形成尾迹。
       生命期较短（2-4s），避免长时间直线划痕感 */
    type FlowP = { x: number; y: number; life: number; speed: number }
    let flow: FlowP[] = []
    const spawnFlow = (p?: FlowP): FlowP => {
      const nearSphere = Math.random() < 0.55
      const { cx, cy, r } = lastGeo
      let x: number
      let y: number
      if (nearSphere && r > 0) {
        const angle = Math.random() * TAU
        const dist = r * (0.7 + Math.random() * 1.5)
        x = cx + Math.cos(angle) * dist
        y = cy + Math.sin(angle) * dist * 0.6
      } else {
        x = Math.random() * w
        y = Math.random() * h
      }
      const np: FlowP = { x, y, life: 120 + Math.random() * 160, speed: 0.45 + Math.random() * 0.7 }
      return np ?? p!
    }
    let lastGeo = { cx: 0, cy: 0, r: 0 }

    /* 流星：偶尔划过的亮头渐隐尾迹（斜向下，随机方向），只在动态模式出现 */
    type Meteor = { x: number; y: number; vx: number; vy: number; ttl: number; life: number; len: number }
    let meteors: Meteor[] = []
    let nextMeteorAt = 2_500

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      flowCanvas.width = Math.round(w * dpr)
      flowCanvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      makeStars()
      // 重置流场画布与粒子（先取星球几何，让粒子偏向装置周边）
      fctx.clearRect(0, 0, w, h)
      lastGeo = planetGeometry()
      const fc = prefsRef.current.flowVisible ? FLOW_COUNTS[prefsRef.current.starDensity] * (prefsRef.current.motionQuality === 'low' ? 0.5 : 1) : 0
      flow = Array.from({ length: Math.round(fc) }, () => spawnFlow())
      if (!moving) draw(9_000)
    }

    const planetGeometry = () => {
      const scale = Math.max(w / IMG_W, h / IMG_H)
      const drawnW = IMG_W * scale
      const drawnH = IMG_H * scale
      const offX = (w - drawnW) / 2
      const offY = (h - drawnH) / 2
      const p = prefsRef.current
      return {
        cx: offX + PLANET_CX * drawnW + (p.planetOffsetX / 100) * w,
        cy: offY + PLANET_CY * drawnH + (p.planetOffsetY / 100) * h,
        r: PLANET_R * drawnH * p.planetScale,
      }
    }

    const drawFlow = (t: number, respawnAll = false) => {
      const p = prefsRef.current
      if (!p.flowVisible || p.flowIntensity <= 0.02) return
      // 尾迹衰减：用 destination-out 擦除已有 alpha（画布保持透明，背景图透出），
      // 不能用暗色矩形填充——透明画布上会累积成不透明遮罩盖住整个背景
      fctx.globalCompositeOperation = 'destination-out'
      fctx.fillStyle = 'rgba(0,0,0,0.06)'
      fctx.fillRect(0, 0, w, h)
      fctx.globalCompositeOperation = 'source-over'
      const speedMul = (1 + bands.mid * 1.1) * (moving ? 1 : 0.25)
      const alpha = Math.min(0.5, 0.3 * p.flowIntensity * p.planetBrightness * (0.75 + bands.mid * 0.6))
      fctx.globalCompositeOperation = 'lighter'
      fctx.lineWidth = 0.7
      fctx.strokeStyle = `rgba(168,178,196,${alpha})`
      fctx.beginPath()
      for (const particle of flow) {
        const angle = flowAngle(particle.x, particle.y, t)
        const nx = particle.x + Math.cos(angle) * particle.speed * speedMul
        const ny = particle.y + Math.sin(angle) * particle.speed * speedMul * 0.72
        fctx.moveTo(particle.x, particle.y)
        fctx.lineTo(nx, ny)
        particle.x = nx
        particle.y = ny
        particle.life -= 1
        if (respawnAll || particle.life <= 0 || particle.x < -30 || particle.x > w + 30 || particle.y < -30 || particle.y > h + 30) {
          Object.assign(particle, spawnFlow(particle))
        }
      }
      fctx.stroke()
      fctx.globalCompositeOperation = 'source-over'
    }

    /* 静态模式：每个粒子走完整路径，画成一条连续微光折线（不做衰减动画） */
    const drawFlowStatic = () => {
      const p = prefsRef.current
      if (!p.flowVisible || p.flowIntensity <= 0.02) return
      const alpha = Math.min(0.22, 0.1 * p.flowIntensity * p.planetBrightness)
      fctx.clearRect(0, 0, w, h)
      fctx.lineWidth = 0.65
      for (const particle of flow) {
        fctx.strokeStyle = `rgba(200,208,222,${alpha * (0.5 + Math.random() * 0.5)})`
        fctx.beginPath()
        fctx.moveTo(particle.x, particle.y)
        let x = particle.x
        let y = particle.y
        for (let step = 0; step < 150; step++) {
          const angle = flowAngle(x, y, 9_000)
          x += Math.cos(angle) * particle.speed
          y += Math.sin(angle) * particle.speed * 0.72
          fctx.lineTo(x, y)
        }
        fctx.stroke()
      }
    }

    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const p = prefsRef.current
      parallax.x += (pointerTarget.x - parallax.x) * 0.04
      parallax.y += (pointerTarget.y - parallax.y) * 0.04
      const geo = planetGeometry()
      const cx = geo.cx + parallax.x * 14
      const cy = geo.cy + parallax.y * 10
      lastGeo = { cx, cy, r: geo.r }
      const r = geo.r
      const reactive = p.audioReactive && !p.reduceMotion
      bands = reactive ? engine.sampleBands() : { low: 0, mid: 0, high: 0 }
      const level = bands.low
      const breath = 1 + level * 0.02
      const R = r * breath
      const A = (base: number) => Math.min(1, base * p.planetBrightness)

      // ── Layer A：稀疏闪烁星点 + 十字闪光星（一闪一闪） ──
      if (p.bgTexture) {
        const sec = t / 1000
        for (const s of stars) {
          const twinkle = moving ? Math.sin(sec * s.speed + s.phase) * 0.5 + 0.5 : 0.6
          ctx.globalAlpha = s.alpha * (0.4 + twinkle * 0.6) * p.planetBrightness
          ctx.fillStyle = '#e8ecf1'
          ctx.fillRect(s.x * w, s.y * h, s.size, s.size)
        }
        ctx.globalAlpha = 1

        for (const s of sparkles) {
          // 一闪一闪：慢速正弦脉动，高峰时十字亮芒展开、低谷时收敛成小点
          const twinkle = moving ? Math.sin(sec * s.speed * TAU * 0.18 + s.phase) * 0.5 + 0.5 : 0.55
          const size = s.size * (0.55 + twinkle * 0.7)
          const x = s.x * w
          const y = s.y * h
          const alpha = (0.2 + twinkle * 0.65) * p.planetBrightness * (0.85 + bands.high * 0.35)
          ctx.save()
          ctx.shadowColor = 'rgba(236,240,246,0.9)'
          ctx.shadowBlur = 3 + twinkle * 5
          ctx.strokeStyle = `rgba(238,242,248,${alpha})`
          ctx.lineWidth = 0.9
          ctx.beginPath()
          ctx.moveTo(x - size, y); ctx.lineTo(x + size, y)
          ctx.moveTo(x, y - size); ctx.lineTo(x, y + size)
          ctx.stroke()
          ctx.fillStyle = `rgba(246,248,252,${Math.min(1, alpha + 0.15)})`
          ctx.beginPath(); ctx.arc(x, y, 0.9, 0, TAU); ctx.fill()
          ctx.restore()
        }
      }

      // ── 羽化遮罩盘：仅当底图是基准图时盖住静态星球 ──
      if (p.bgSource === 'original') {
        const mask = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R * 1.02)
        mask.addColorStop(0, 'rgba(6,7,10,1)')
        mask.addColorStop(0.86, 'rgba(6,7,10,0.96)')
        mask.addColorStop(1, 'rgba(6,7,10,0)')
        ctx.fillStyle = mask
        ctx.beginPath()
        ctx.arc(cx, cy, R * 1.02, 0, TAU)
        ctx.fill()
      }

      const rot = moving ? (t / 1000 / ROTATE_SECONDS) * TAU * p.planetSpeed : 0.8
      const tilt = -0.1

      if (p.planetVisible) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(tilt)

        // 球面微光底（很弱，只为给点云一个空间依托，不做实体感）
        const body = ctx.createRadialGradient(-R * 0.3, -R * 0.45, 0, 0, 0, R)
        body.addColorStop(0, `rgba(30,38,50,${A(0.4)})`)
        body.addColorStop(0.5, `rgba(13,17,25,${A(0.36)})`)
        body.addColorStop(1, 'rgba(7,9,13,0.9)')
        ctx.fillStyle = body
        ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill()

        // 透视投影
        const project = (nx: number, ny: number, nz: number, rotAngle: number, radius: number) => {
          const x = nx * Math.cos(rotAngle) - nz * Math.sin(rotAngle)
          const z = nx * Math.sin(rotAngle) + nz * Math.cos(rotAngle)
          const k = FOV / (FOV - z)
          return { x: x * k * radius, y: ny * k * radius, z, k, front: z > 0 }
        }

        // 内壳（0.8R 暗层纵深）
        const inner = getSphere(Math.max(18, Math.round(sphere.nodes.length * 0.5)))
        const IR = R * 0.8
        const innerPts = inner.nodes.map(([nx, ny, nz]) => project(nx, ny, nz, rot * 1.28, IR))
        ctx.lineWidth = 0.55
        inner.edges.forEach(([i, j], e) => {
          const a0 = innerPts[i], b0 = innerPts[j]
          const jit = inner.jitter[e]
          const a = a0.front && b0.front ? 0.06 + jit * 0.05 : 0.03
          ctx.strokeStyle = `rgba(232,236,241,${A(a)})`
          ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y); ctx.stroke()
        })

        // 主壳点云
        const pts = sphere.nodes.map(([nx, ny, nz]) => project(nx, ny, nz, rot, R))

        ctx.lineWidth = 0.6
        ctx.strokeStyle = `rgba(232,236,241,${A(0.07)})`
        for (const lat of [-0.9, -0.68, -0.45, -0.22, 0.02, 0.26, 0.5, 0.74, 0.92]) {
          const rr = R * Math.sqrt(Math.max(0, 1 - lat * lat))
          ctx.beginPath(); ctx.ellipse(0, R * lat, rr, rr * 0.2, 0, 0, TAU); ctx.stroke()
        }

        // 近邻连线（点云为辅的细线）
        ctx.lineWidth = 0.65
        sphere.edges.forEach(([i, j], e) => {
          const a0 = pts[i], b0 = pts[j]
          const jit = sphere.jitter[e]
          const a = a0.front && b0.front ? 0.13 + jit * 0.13 + bands.high * 0.08 : 0.05
          ctx.strokeStyle = `rgba(232,236,241,${A(a)})`
          ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y); ctx.stroke()
        })

        // 节点点云（远近分明，少量枢纽高光受高频驱动）
        pts.forEach((pt, i) => {
          if (pt.front) {
            if (i % 5 === 0) {
              ctx.save()
              ctx.shadowColor = 'rgba(240,243,247,0.9)'
              ctx.shadowBlur = 4 + bands.high * 12
              ctx.fillStyle = `rgba(246,248,250,${A(0.75 + bands.high * 0.3)})`
              ctx.beginPath(); ctx.arc(pt.x, pt.y, 2 * pt.k, 0, TAU); ctx.fill()
              ctx.restore()
            } else {
              ctx.fillStyle = `rgba(236,240,245,${A(0.5 + bands.high * 0.2)})`
              ctx.beginPath(); ctx.arc(pt.x, pt.y, 1.4 * pt.k, 0, TAU); ctx.fill()
            }
          } else {
            ctx.fillStyle = `rgba(232,236,241,${A(0.13)})`
            ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(0.6, 0.95 * pt.k), 0, TAU); ctx.fill()
          }
        })

        // 边缘：柔和的多层微光，不再画生硬亮弧
        for (const [rr, aa, blur] of [[R, 0.12, 8], [R + 2, 0.07, 14], [R + 5, 0.04, 22]] as const) {
          ctx.save()
          ctx.shadowColor = 'rgba(240,243,247,0.7)'
          ctx.shadowBlur = blur + bands.high * 10
          ctx.strokeStyle = `rgba(240,243,247,${A(aa + bands.low * 0.06)})`
          ctx.lineWidth = 1
          ctx.beginPath(); ctx.arc(0, 0, rr, -Math.PI * 0.78, -Math.PI * 0.12); ctx.stroke()
          ctx.restore()
        }
        ctx.strokeStyle = `rgba(232,236,241,${A(0.08)})`
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.arc(0, 0, R + 18, 0, TAU); ctx.stroke()

        // 左上局部高光晕
        const spec = ctx.createRadialGradient(-R * 0.34, -R * 0.5, 0, -R * 0.34, -R * 0.5, R * 0.85)
        spec.addColorStop(0, `rgba(236,240,245,${A(0.08 + bands.low * 0.04)})`)
        spec.addColorStop(1, 'rgba(236,240,245,0)')
        ctx.fillStyle = spec
        ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill()

        ctx.restore()
      }

      // 星轨、彗尾与信号点
      if (p.orbitVisible) {
        ctx.save()
        ctx.translate(cx, cy - R * 0.06)
        ctx.rotate(-0.24)
        const oRx = R * 1.9
        const oRy = R * 0.4
        const oa = moving ? (t / 1000 / 52) * TAU * p.planetSpeed + 2.4 : 2.4
        const dx = Math.cos(oa) * oRx
        const dy = Math.sin(oa) * oRy
        if (dy < -10) {
          // 彗尾：信号点身后沿椭圆渐隐的弧段
          const tail = 0.4
          const segs = 7
          for (let s = 0; s < segs; s++) {
            const a1 = oa - (tail * s) / segs
            const a2 = oa - (tail * (s + 1)) / segs
            ctx.strokeStyle = `rgba(240,243,247,${A(0.42 * (1 - s / segs) * (0.55 + bands.mid * 0.6))})`
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.ellipse(0, 0, oRx, oRy, 0, a2, a1); ctx.stroke()
          }
          ctx.fillStyle = `rgba(240,243,247,${A(0.6 + bands.mid * 0.3)})`
          ctx.shadowColor = 'rgba(232,236,241,0.8)'
          ctx.shadowBlur = 4 + bands.mid * 8
          ctx.beginPath(); ctx.arc(dx, dy, 1.8, 0, TAU); ctx.fill()
          ctx.shadowBlur = 0
        }
        ctx.restore()
      }

      // ── 流星：亮头 + 渐隐尾迹，随机斜掠后消失 ──
      if (moving) {
        if (t > nextMeteorAt) {
          nextMeteorAt = t + 4_500 + Math.random() * 6_000
          const angle = (Math.random() < 0.5 ? Math.PI * 0.78 : Math.PI * 0.22) + (Math.random() - 0.5) * 0.3
          const speed = 0.5 + Math.random() * 0.45 // px/ms
          meteors.push({
            x: w * 0.08 + Math.random() * w * 0.8,
            y: 24 + Math.random() * h * 0.34,
            vx: Math.cos(angle) * speed,
            vy: Math.abs(Math.sin(angle)) * speed,
            ttl: 950 + Math.random() * 550,
            life: 0,
            len: 90 + Math.random() * 90,
          })
        }
        meteors = meteors.filter(m => m.life < m.ttl)
        for (const m of meteors) {
          m.life += 16
          const envelope = Math.sin(Math.PI * Math.min(1, m.life / m.ttl))
          const tailLen = Math.min(m.len, m.life * 0.55) // 尾迹随飞行变长
          const tx = m.x - m.vx * tailLen
          const ty = m.y - m.vy * tailLen
          const grad = ctx.createLinearGradient(m.x, m.y, tx, ty)
          grad.addColorStop(0, `rgba(246,248,251,${A(0.85 * envelope)})`)
          grad.addColorStop(1, 'rgba(246,248,251,0)')
          ctx.save()
          ctx.strokeStyle = grad
          ctx.lineWidth = 1.3
          ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke()
          ctx.shadowColor = 'rgba(240,243,247,0.9)'
          ctx.shadowBlur = 5
          ctx.fillStyle = `rgba(250,252,254,${A(0.9 * envelope)})`
          ctx.beginPath(); ctx.arc(m.x, m.y, 1.6, 0, TAU); ctx.fill()
          ctx.restore()
        }
      }
    }

    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      drawFlow(t)
      draw(t)
    }

    resize()
    window.addEventListener('resize', resize)
    if (moving) {
      raf = requestAnimationFrame(frame)
    } else {
      // 静态模式：流场画成整条微光折线 + 天体静态帧
      drawFlowStatic()
      draw(9_000)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
    }
  }, [
    preferences.planetMotion,
    preferences.reduceMotion,
    preferences.planetDensity,
    preferences.motionQuality,
    preferences.starDensity,
    preferences.bgSource,
    preferences.flowVisible,
    preferences.flowIntensity,
    starSeed,
  ])

  return (
    <>
      {imageSrc ? (
        <div className="backdrop-media" aria-hidden="true">
          <img
            src={imageSrc}
            alt=""
            style={{
              objectFit: preferences.bgFit,
              objectPosition: `${preferences.bgFocusX}% ${preferences.bgFocusY}%`,
              transform: `scale(${preferences.bgScale * (1 + preferences.bgBlur * 0.004)})`,
              filter: preferences.bgBlur > 0 ? `blur(${preferences.bgBlur}px)` : undefined,
            }}
            draggable={false}
          />
        </div>
      ) : (
        <div className="backdrop-plain" aria-hidden="true" />
      )}
      {(preferences.bgDim > 0 || preferences.bgTint === 'cold') && (
        <div
          className="backdrop-overlay"
          aria-hidden="true"
          style={{
            background:
              preferences.bgTint === 'cold'
                ? `linear-gradient(180deg, rgba(28,42,60,${0.12 + preferences.bgDim / 100 * 0.4}), rgba(6,10,16,${preferences.bgDim / 100}))`
                : `rgba(4,5,7,${preferences.bgDim / 100})`,
          }}
        />
      )}
      <canvas ref={flowRef} className="backdrop-flow" aria-hidden="true" />
      <canvas ref={fxRef} className="backdrop-fx" aria-hidden="true" />
      {preferences.grainOpacity > 0 && <div className="backdrop-grain" aria-hidden="true" />}
    </>
  )
}
