// 🧬 3D digital twin on REAL anatomy: open-anatomy-3d (BodyParts3D + Human Reference Atlas, CC BY 4.0).
// Everything is drawn as a glowing outline (fresnel rim, coloured by the system's health status);
// clicking an organ/system fills it with natural tissue colours and focuses the camera on it.
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Bvh, Html, Line, OrbitControls, useGLTF, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import type { Status } from '../../features/admin/data/parameters'
import { SYSTEMS, type SystemId } from './knowledge'
import type { CardInfo } from './BodyFigure'
import './BodyTwin3D.css'

interface Props {
  statuses: Partial<Record<SystemId, Status>>
  cards: Partial<Record<SystemId, CardInfo>>
  selected: SystemId | null
  onSelect: (id: SystemId) => void
  heartRate?: number
  forecastMode?: boolean
}

const MODEL_URL = '/twin/anatomy-male.glb'
export const ANATOMY_CREDIT =
  'Anatomy: BodyParts3D © DBCLS (CC BY 4.0); Human Reference Atlas, HuBMAP (CC BY 4.0); via open-anatomy-3d (CC BY 4.0)'

const STATUS_HEX: Record<Status | 'none', string> = { ok: '#22d3ee', warning: '#f5b83d', critical: '#ff5a5f', none: '#64748b' }
const SHORT: Record<SystemId, string> = {
  brain: 'Brain · mind',
  eyes: 'Eyes',
  heart: 'Heart',
  lungs: 'Lungs',
  immune: 'Immune',
  metabolism: 'Metabolism',
  muscles: 'Muscles',
  bones: 'Bones',
  radiation: 'Radiation',
}

// ---------------------------------------------------------------------------------------------
// Which model structures belong to which body system of the twin
// ---------------------------------------------------------------------------------------------
const BY_NAME: Record<string, SystemId> = {
  brain: 'brain', brainstem: 'brain', cerebellum: 'brain', pituitary: 'brain', spinal_cord: 'brain', cranial_nerves: 'brain',
  eye_l: 'eyes', eye_r: 'eyes',
  heart: 'heart', coronary_arteries: 'heart',
  lung_l: 'lungs', lung_r: 'lungs', trachea: 'lungs', bronchi: 'lungs', larynx: 'lungs', diaphragm: 'lungs',
  spleen: 'immune', thymus: 'immune',
  liver: 'metabolism', stomach: 'metabolism', small_intestine: 'metabolism', colon: 'metabolism', pancreas: 'metabolism',
  gallbladder: 'metabolism', esophagus: 'metabolism', appendix: 'metabolism', kidney_l: 'metabolism', kidney_r: 'metabolism',
  ureter_l: 'metabolism', ureter_r: 'metabolism', bladder: 'metabolism', adrenal_l: 'metabolism', adrenal_r: 'metabolism',
  skin: 'radiation',
}
/** whole layers of the model (scene root groups) */
const BY_GROUP: Record<string, SystemId> = { skeleton: 'bones', muscles: 'muscles', vessels: 'heart', nerves: 'brain' }
/** bones that would block clicks on organs (skull over brain, ribs over lungs…) are not clickable */
const BLOCKING_BONES = /^(skull|mandible|teeth|ribs_|sternum|spine_|scapula_|clavicle_)/
/** the structure each label points at */
const ANCHOR: Record<SystemId, string> = {
  brain: 'brain', eyes: 'eye_l', heart: 'heart', lungs: 'lung_r', immune: 'spleen', metabolism: 'liver',
  muscles: 'quadriceps_l', bones: 'femur_r', radiation: 'sternum',
}
const SIDE: Record<SystemId, 1 | -1> = { brain: -1, radiation: -1, lungs: -1, metabolism: -1, bones: -1, eyes: 1, heart: 1, immune: 1, muscles: 1 }

type Layer = 'skin' | 'skeleton' | 'muscles' | 'vessels'

/** natural tissue colours used when a system is selected (filled) */
function tissueColor(name: string, group: string): string {
  if (group === 'skeleton') return name === 'teeth' ? '#f5f0e1' : '#e9dfc7'
  if (group === 'muscles') return '#b4443a'
  if (group === 'vessels') return name.startsWith('vein') || name.startsWith('vena') ? '#3b5bdb' : '#d62f2f'
  if (group === 'nerves') return '#f2d16b'
  if (name === 'skin') return '#e0b38f'
  if (name.startsWith('brain') || name === 'cerebellum' || name === 'pituitary') return '#e9a9b0'
  if (name.startsWith('eye')) return '#f1f5f9'
  if (name === 'heart') return '#c9302c'
  if (name === 'coronary_arteries') return '#e03131'
  if (name.startsWith('lung')) return '#ef9a9a'
  if (name === 'liver') return '#8f2f24'
  if (name === 'spleen') return '#7b2d4b'
  if (name === 'gallbladder') return '#4f8a3a'
  if (name.startsWith('kidney')) return '#a33b2d'
  if (name === 'thymus' || name === 'pancreas' || name.startsWith('adrenal')) return '#e7b36a'
  if (name === 'small_intestine' || name === 'colon' || name === 'appendix') return '#e3a196'
  if (name === 'stomach' || name === 'esophagus') return '#e08c86'
  if (name === 'trachea' || name === 'bronchi' || name === 'larynx') return '#d9c3b5'
  if (name === 'diaphragm') return '#b4443a'
  return '#d8a59a'
}

// ---------------------------------------------------------------------------------------------
// Outline (fresnel rim) material
// ---------------------------------------------------------------------------------------------
const rimVertex = /* glsl */ `
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = normalize(-mv.xyz);
    vY = (modelMatrix * vec4(position, 1.0)).y;
    gl_Position = projectionMatrix * mv;
  }`
const rimFragment = /* glsl */ `
  uniform vec3 uColor; uniform float uStrength; uniform float uScan; uniform float uBase;
  varying vec3 vN; varying vec3 vV; varying float vY;
  void main() {
    float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.6);
    float scan = smoothstep(0.03, 0.0, abs(vY - uScan));
    float a = (f * 0.9 + uBase + scan * 0.35) * uStrength;
    gl_FragColor = vec4(uColor * (0.5 + f * 1.4 + scan), a);
  }`

function rimMaterial(color: string, strength: number, base: number) {
  return new THREE.ShaderMaterial({
    vertexShader: rimVertex,
    fragmentShader: rimFragment,
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength }, uScan: { value: 0 }, uBase: { value: base } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
}

interface PartInfo {
  mesh: THREE.Mesh
  name: string
  group: string
  system: SystemId | null
  clickable: boolean
  fill: THREE.MeshStandardMaterial
}

// ---------------------------------------------------------------------------------------------
// The anatomy model
// ---------------------------------------------------------------------------------------------
function Anatomy({
  statuses,
  selected,
  hover,
  layers,
  forecastMode,
  heartRate,
  onSelect,
  onHover,
  onAnchors,
}: {
  statuses: Partial<Record<SystemId, Status>>
  selected: SystemId | null
  hover: SystemId | null
  layers: Record<Layer, boolean>
  forecastMode: boolean
  heartRate: number
  onSelect: (id: SystemId) => void
  onHover: (id: SystemId | null) => void
  onAnchors: (a: Partial<Record<SystemId, THREE.Vector3>>) => void
}) {
  const { scene } = useGLTF(MODEL_URL, false, true)
  const model = useMemo(() => scene.clone(true), [scene])
  const camera = useThree((s) => s.camera)

  // classify every mesh once
  const parts = useMemo(() => {
    const out: PartInfo[] = []
    model.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      const mesh = o as THREE.Mesh
      let name = mesh.name
      let n: THREE.Object3D | null = mesh
      while (n && !BY_NAME[n.name] && !BY_GROUP[n.name] && n.parent && n.parent !== model) {
        if (!name && n.name) name = n.name
        n = n.parent
      }
      const own = n?.name ?? ''
      name = BY_NAME[own] ? own : name || own
      let group = ''
      for (let p: THREE.Object3D | null = mesh; p; p = p.parent) if (['skin', 'skeleton', 'muscles', 'organs', 'vessels', 'nerves'].includes(p.name)) group = p.name
      const system = BY_NAME[name] ?? BY_GROUP[group] ?? null
      const clickable = system !== null && system !== 'radiation' && !(group === 'skeleton' && BLOCKING_BONES.test(name))
      const color = tissueColor(name, group)
      out.push({
        mesh,
        name,
        group,
        system,
        clickable,
        fill: new THREE.MeshStandardMaterial({
          color,
          roughness: 0.5,
          metalness: 0.05,
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.12,
          transparent: name === 'skin',
          opacity: name === 'skin' ? 0.25 : 1,
          depthWrite: name !== 'skin',
        }),
      })
      mesh.userData.system = system
      mesh.userData.clickable = clickable
    })
    return out
  }, [model])

  // label anchors (centre of the anchor structure)
  useEffect(() => {
    const anchors: Partial<Record<SystemId, THREE.Vector3>> = {}
    model.updateMatrixWorld(true)
    for (const s of SYSTEMS) {
      const node = model.getObjectByName(ANCHOR[s.id])
      if (node) {
        const c = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3())
        if (s.id === 'radiation') c.z += 0.12
        anchors[s.id] = c
      }
    }
    onAnchors(anchors)
    camera.layers.enable(1)
  }, [model, onAnchors, camera])

  // rim materials per (status × emphasis)
  const rims = useMemo(() => {
    const cache = new Map<string, THREE.ShaderMaterial>()
    return (color: string, strength: number, base: number) => {
      const key = `${color}-${strength}-${base}`
      if (!cache.has(key)) cache.set(key, rimMaterial(color, strength, base))
      return cache.get(key)!
    }
  }, [])
  const pulsing = useRef<THREE.ShaderMaterial[]>([])

  // apply visibility + materials whenever state changes
  useEffect(() => {
    pulsing.current = []
    const neutral = forecastMode ? '#c084fc' : '#38bdf8'
    for (const p of parts) {
      const sys = p.system
      const isSel = sys !== null && sys === selected
      const isHover = sys !== null && sys === hover
      const layerOn =
        p.group === 'skin' ? layers.skin : p.group === 'skeleton' ? layers.skeleton : p.group === 'muscles' ? layers.muscles : p.group === 'vessels' ? layers.vessels : true
      p.mesh.visible = layerOn || isSel
      if (!p.mesh.visible) {
        p.mesh.layers.set(1)
        continue
      }
      p.mesh.layers.set(p.clickable ? 0 : 1)

      if (isSel && p.name !== 'skin') {
        p.mesh.material = p.fill
        p.mesh.renderOrder = 2
        continue
      }
      const st: Status | 'none' = sys ? statuses[sys] ?? 'none' : 'none'
      const tracked = sys !== null && st !== 'none'
      const color = p.name === 'skin' ? neutral : tracked ? STATUS_HEX[st] : neutral
      const strength = p.name === 'skin' ? (isSel ? 0.6 : 0.32) : isHover ? 1.5 : st === 'critical' ? 1.25 : st === 'warning' ? 1.0 : p.group === 'organs' ? 0.75 : 0.42
      const base = p.group === 'organs' || p.group === 'nerves' ? 0.06 : 0.02
      const mat = rims(color, strength, base)
      if (st === 'critical' && !isHover) pulsing.current.push(mat)
      p.mesh.material = mat
      p.mesh.renderOrder = 1
    }
  }, [parts, statuses, selected, hover, layers, forecastMode, rims])

  // animation: scan line, critical pulse, heart beat, breathing
  const heart = useMemo(() => model.getObjectByName('heart'), [model])
  const lungs = useMemo(() => ['lung_l', 'lung_r'].map((n) => model.getObjectByName(n)).filter(Boolean) as THREE.Object3D[], [model])
  const base = useMemo(() => ({ heart: heart?.scale.clone(), lungs: lungs.map((l) => l.scale.clone()) }), [heart, lungs])
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const scan = 0.05 + ((t * 0.28) % 1) * 1.8
    for (const p of parts) {
      const m = p.mesh.material as THREE.ShaderMaterial
      if (m.uniforms?.uScan) m.uniforms.uScan.value = scan
    }
    const pulse = 1.0 + 0.6 * Math.abs(Math.sin(t * 3))
    for (const m of pulsing.current) m.uniforms.uStrength.value = pulse
    if (heart && base.heart) {
      const phase = (t * heartRate) / 60
      heart.scale.copy(base.heart).multiplyScalar(1 + Math.exp(-((phase % 1) * 9)) * 0.08)
    }
    lungs.forEach((l, i) => l.scale.copy(base.lungs[i]).multiplyScalar(1 + Math.sin(t * 1.3) * 0.02))
  })

  return (
    <primitive
      object={model}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        const sys = e.object.userData.system as SystemId | null
        if (!sys || !e.object.userData.clickable) return
        e.stopPropagation()
        onSelect(sys)
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        const sys = e.object.userData.clickable ? (e.object.userData.system as SystemId | null) : null
        e.stopPropagation()
        onHover(sys)
        document.body.style.cursor = sys ? 'pointer' : ''
      }}
      onPointerOut={() => {
        onHover(null)
        document.body.style.cursor = ''
      }}
    />
  )
}

// ---------------------------------------------------------------------------------------------
// Platform, labels, camera
// ---------------------------------------------------------------------------------------------
function Platform({ color }: { color: string }) {
  const spin = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y += dt * 0.35
  })
  const ring = (r: number, w: number, opacity: number, arcs = 1, key = '') =>
    Array.from({ length: arcs }, (_, i) => (
      <mesh key={`${key}${r}-${i}`} rotation={[-Math.PI / 2, 0, (i / arcs) * Math.PI * 2]} layers={1}>
        <ringGeometry args={[r, r + w, 96, 1, 0, arcs === 1 ? Math.PI * 2 : (Math.PI * 2) / arcs - 0.25]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    ))
  return (
    <group position={[0, 0.003, 0]}>
      {ring(0.34, 0.01, 0.85)}
      {ring(0.6, 0.005, 0.4)}
      {ring(0.85, 0.003, 0.22)}
      <mesh rotation={[-Math.PI / 2, 0, 0]} layers={1}>
        <circleGeometry args={[0.34, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <group ref={spin}>
        {ring(0.44, 0.025, 0.5, 3, 'a')}
        {ring(0.7, 0.01, 0.3, 6, 'b')}
      </group>
    </group>
  )
}

function Labels({
  anchors,
  statuses,
  cards,
  selected,
  hover,
  onSelect,
  onHover,
}: {
  anchors: Partial<Record<SystemId, THREE.Vector3>>
  statuses: Partial<Record<SystemId, Status>>
  cards: Partial<Record<SystemId, CardInfo>>
  selected: SystemId | null
  hover: SystemId | null
  onSelect: (id: SystemId) => void
  onHover: (id: SystemId | null) => void
}) {
  // spread labels vertically on each side so they never overlap
  const placed = useMemo(() => {
    const out: Partial<Record<SystemId, [number, number, number]>> = {}
    for (const side of [-1, 1] as const) {
      const ids = SYSTEMS.map((s) => s.id).filter((id) => SIDE[id] === side && anchors[id]).sort((a, b) => anchors[b]!.y - anchors[a]!.y)
      let lastY = Infinity
      for (const id of ids) {
        const a = anchors[id]!
        const y = Math.min(a.y, lastY - 0.17)
        lastY = y
        out[id] = [side * 0.5, y, 0]
      }
    }
    return out
  }, [anchors])

  return (
    <group>
      {SYSTEMS.map((s) => {
        const a = anchors[s.id]
        const to = placed[s.id]
        if (!a || !to) return null
        const st: Status | 'none' = statuses[s.id] ?? 'none'
        const on = selected === s.id || hover === s.id
        const info = cards[s.id]
        return (
          <group key={s.id}>
            <Line points={[a.toArray(), to]} color={STATUS_HEX[st]} lineWidth={on ? 1.6 : 0.8} transparent opacity={on ? 0.95 : 0.4} />
            <Html position={to} center zIndexRange={[20, 0]}>
              <button
                className={`t3d-label t3d-label--${st} ${on ? 't3d-label--active' : ''}`}
                onClick={() => onSelect(s.id)}
                onMouseEnter={() => onHover(s.id)}
                onMouseLeave={() => onHover(null)}
              >
                <span className="t3d-label__name">
                  {s.icon} {SHORT[s.id]}
                </span>
                {info ? (
                  <span className="t3d-label__value">
                    {info.value}
                    <small>{info.unit}</small>
                  </span>
                ) : (
                  <span className="t3d-label__value t3d-label__value--none">—</span>
                )}
              </button>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

const HOME = { pos: new THREE.Vector3(0, 1.0, 2.75), target: new THREE.Vector3(0, 0.9, 0) }

/** smoothly moves the orbit target to the selected organ (and back on reset) */
function CameraRig({ focus, resetKey }: { focus: THREE.Vector3 | null; resetKey: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.Camera; controls: { target: THREE.Vector3; update: () => void } | null }
  const goal = useRef(HOME.target.clone())
  const resetting = useRef(0)
  useEffect(() => {
    // move toward the organ, but keep most of the body in view
    goal.current = focus
      ? new THREE.Vector3(focus.x * 0.4, HOME.target.y + (focus.y - HOME.target.y) * 0.45, focus.z * 0.3)
      : HOME.target.clone()
  }, [focus])
  useEffect(() => {
    if (resetKey) resetting.current = 60
  }, [resetKey])
  useFrame(() => {
    if (!controls) return
    controls.target.lerp(goal.current, 0.06)
    if (resetting.current > 0) {
      camera.position.lerp(HOME.pos, 0.12)
      resetting.current--
    }
    controls.update()
  })
  return null
}

function Loader() {
  const { progress } = useProgress()
  return (
    <Html center>
      <div className="t3d-loading">
        Loading anatomical atlas… {progress.toFixed(0)}%
        <small>BodyParts3D · Human Reference Atlas</small>
      </div>
    </Html>
  )
}

// ---------------------------------------------------------------------------------------------
export default function BodyTwin3D({ statuses, cards, selected, onSelect, heartRate = 64, forecastMode = false }: Props) {
  const [hover, setHover] = useState<SystemId | null>(null)
  const [autoRotate, setAutoRotate] = useState(true)
  const [anchors, setAnchors] = useState<Partial<Record<SystemId, THREE.Vector3>>>({})
  const [layers, setLayers] = useState<Record<Layer, boolean>>({ skin: true, skeleton: true, muscles: false, vessels: false })
  const [showLabels, setShowLabels] = useState(true)
  const [resetKey, setResetKey] = useState(0)
  const color = forecastMode ? '#c084fc' : '#22d3ee'
  // the camera only follows organs the user clicked (not the automatic initial selection)
  const [focusId, setFocusId] = useState<SystemId | null>(null)
  const focus = focusId && focusId === selected ? anchors[focusId] ?? null : null
  const pick = (id: SystemId) => {
    setAutoRotate(false)
    setFocusId(id)
    onSelect(id)
  }

  const toggle = (l: Layer) => setLayers((x) => ({ ...x, [l]: !x[l] }))

  return (
    <div className={`t3d ${forecastMode ? 't3d--forecast' : ''}`}>
      <div className="t3d__stage">
      <Canvas camera={{ position: HOME.pos.toArray(), fov: 32, near: 0.05, far: 50 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[1.5, 2.5, 2.5]} intensity={2.2} />
        <directionalLight position={[-2, 1.5, -1.5]} intensity={0.8} color={color} />
        <Suspense fallback={<Loader />}>
          <Bvh firstHitOnly>
            <Anatomy
              statuses={statuses}
              selected={selected}
              hover={hover}
              layers={layers}
              forecastMode={forecastMode}
              heartRate={heartRate}
              onSelect={pick}
              onHover={setHover}
              onAnchors={setAnchors}
            />
          </Bvh>
          {showLabels && (
            <Labels
              anchors={anchors}
              statuses={statuses}
              cards={cards}
              selected={selected}
              hover={hover}
              onSelect={pick}
              onHover={setHover}
            />
          )}
        </Suspense>
        <Platform color={color} />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={0.7}
          maxDistance={5}
          minPolarAngle={0.25}
          maxPolarAngle={1.8}
          autoRotate={autoRotate}
          autoRotateSpeed={0.6}
          onStart={() => setAutoRotate(false)}
        />
        <CameraRig focus={focus} resetKey={resetKey} />
      </Canvas>
      </div>

      <div className="t3d__layers">
        {(['skin', 'skeleton', 'muscles', 'vessels'] as Layer[]).map((l) => (
          <button key={l} className={`t3d__btn ${layers[l] ? 't3d__btn--on' : ''}`} onClick={() => toggle(l)}>
            {l === 'skin' ? 'Body' : l === 'skeleton' ? 'Skeleton' : l === 'muscles' ? 'Muscles' : 'Vessels'}
          </button>
        ))}
        <button className={`t3d__btn ${showLabels ? 't3d__btn--on' : ''}`} onClick={() => setShowLabels((s) => !s)}>
          Labels
        </button>
      </div>

      <div className="t3d__hud">
        <button className={`t3d__btn ${autoRotate ? 't3d__btn--on' : ''}`} onClick={() => setAutoRotate((a) => !a)}>
          ⟳ Auto-rotate
        </button>
        <button
          className="t3d__btn"
          onClick={() => {
            setResetKey((k) => k + 1)
            setFocusId(null)
            setAutoRotate(true)
          }}
        >
          ⌖ Reset view
        </button>
        <span>Drag to rotate · scroll to zoom · click an organ</span>
      </div>
      <div className="t3d__credit" title={ANATOMY_CREDIT}>
        {ANATOMY_CREDIT}
      </div>
    </div>
  )
}

useGLTF.preload(MODEL_URL, false, true)
