// frontend/src/components/RadiantMetropolis.jsx
import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, Billboard } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

function Building({ position = [0, 0, 0], args = [2, 10, 2], materialRef }) {
  const [w, h, d] = args
  const pos = [position[0], position[1] + h / 2, position[2]]
  return (
    <mesh position={pos}>
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#C0C0C0"
        emissive="#00FFFF"
        emissiveIntensity={0.12}
        metalness={0.2}
        roughness={0.6}
      />
      {/** 커스텀 픽셀화 셰이더 사용 시 아래로 교체
       * <shaderMaterial attach="material" {...pixelationShader} />
       */}
    </mesh>
  )
}

function PixelParticles({
  count = 200,
  origin,
  position, // 호환 prop: position 전달 시 origin으로 사용
  spread = [1.5, 0.5, 1.5],
  gravity = -3.2,
  baseSpeed = 1.1,
  color = '#00FFFF',
}) {
  const ref = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorObj = useMemo(() => new THREE.Color(color), [color])
  const spawn = origin || position || [0, 0, 0]

  const { positions, velocities, life, ttl, sizes, rotations } = useMemo(() => {
    const pos = new Array(count)
    const vel = new Array(count)
    const lf = new Float32Array(count)
    const timeToLive = new Float32Array(count)
    const sz = new Float32Array(count)
    const rot = new Array(count)
    for (let i = 0; i < count; i++) {
      pos[i] = new THREE.Vector3(
        spawn[0] + (Math.random() - 0.5) * spread[0],
        spawn[1] + Math.random() * spread[1],
        spawn[2] + (Math.random() - 0.5) * spread[2]
      )
      vel[i] = new THREE.Vector3(
        (Math.random() - 0.5) * baseSpeed,
        Math.random() * baseSpeed * 1.2 + 0.4,
        (Math.random() - 0.5) * baseSpeed
      )
      lf[i] = Math.random() * 0.5
      timeToLive[i] = 1.2 + Math.random() * 1.6
      sz[i] = 0.06 + Math.random() * 0.12
      rot[i] = new THREE.Euler(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      )
    }
    return { positions: pos, velocities: vel, life: lf, ttl: timeToLive, sizes: sz, rotations: rot }
  }, [count, spawn, spread, baseSpeed])

  useFrame((_, delta) => {
    if (!ref.current) return
    for (let i = 0; i < count; i++) {
      velocities[i].y += gravity * delta * 0.5
      positions[i].addScaledVector(velocities[i], delta)

      life[i] += delta
      const t = life[i] / ttl[i]
      const scale = sizes[i] * THREE.MathUtils.lerp(1.0, 0.15, t)
      rotations[i].x += 0.8 * delta
      rotations[i].y += 0.6 * delta

      dummy.position.copy(positions[i])
      dummy.rotation.copy(rotations[i])
      dummy.scale.setScalar(scale)
      dummy.updateMatrix()
      ref.current.setMatrixAt(i, dummy.matrix)

      if (t >= 1) {
        positions[i].set(
          spawn[0] + (Math.random() - 0.5) * spread[0],
          spawn[1] + Math.random() * spread[1],
          spawn[2] + (Math.random() - 0.5) * spread[2]
        )
        velocities[i].set(
          (Math.random() - 0.5) * baseSpeed,
          Math.random() * baseSpeed * 1.2 + 0.4,
          (Math.random() - 0.5) * baseSpeed
        )
        life[i] = 0
        ttl[i] = 1.2 + Math.random() * 1.6
      }
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={ref} args={[null, null, count]} position={spawn}>
      <boxGeometry args={[0.1, 0.1, 0.1]} />
      <meshStandardMaterial color={colorObj} emissive={colorObj} emissiveIntensity={0.6} />
    </instancedMesh>
  )
}

function Sun({ color = '#ff2df2', radius = 10, opacity = 0.6, position = [0, 10, -140] }) {
  // 카메라를 향하는 빌보드 형태의 네온 태양
  return (
    <Billboard position={position} follow lockX={false} lockY={false} lockZ={false}> 
      <mesh>
        <circleGeometry args={[radius, 128]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
    </Billboard>
  )
}

function Scene() {
  const materialRef = useRef()

  // Synthwave 지평선: Z-방향으로 먼 곳에 스카이라인 밴드 형성
  const rand = (min, max) => Math.random() * (max - min) + min
  const buildings = useMemo(() => {
    const arr = []
    const count = 90
    for (let i = 0; i < count; i++) {
      const x = rand(-60, 60)              // 좌우로 펼쳐진 스카이라인
      const z = rand(-140, -80)            // 지평선 근처에 배치
      const w = rand(1.2, 3.8)
      const h = rand(8, 40)                // 다양한 높이
      const d = rand(1.2, 4.2)
      arr.push({ id: i, position: [x, 0, z], size: [w, h, d] })
    }
    return arr
  }, [])

  return (
    <>
      <OrbitControls 
        makeDefault 
        enablePan={false}
        target={[0, 6, -100]}
        minDistance={10} 
        maxDistance={80}
        maxPolarAngle={Math.PI * 0.55}
      />

      {/* Synthwave 톤 조명 */}
      <ambientLight intensity={0.06} color="#ffeaff" />
      <directionalLight position={[10, 15, 12]} intensity={0.25} color="#b388ff" />

      {/* 지평선의 태양 */}
      <Sun />

      {/* 바닥 그리드: 지평선으로 사라지도록 페이드 */}
      <Grid
        args={[400, 400]}
        cellSize={4}
        cellThickness={0.8}
        sectionSize={16}
        sectionThickness={1.2}
        sectionColor="#ff2df2"
        cellColor="#00e5ff"
        fadeDistance={180}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0, 0]}
      />

      {/* 도시 빌딩들 */}
      {buildings.map((b) => (
        <Building key={b.id} position={b.position} args={b.size} materialRef={materialRef} />
      ))}

      {/* 지평선 먼 곳의 공기 중 파편/먼지 효과 (절제) */}
      <PixelParticles count={160} position={[0, 0.0, -100]} spread={[120, 8, 30]} baseSpeed={0.6} gravity={-1.2} />

      {/* 포스트프로세싱 (빛 번짐) */}
      <EffectComposer>
        <Bloom intensity={1.5} luminanceThreshold={0.5} luminanceSmoothing={0.9} />
      </EffectComposer>
    </>
  )
}

export default function RadiantMetropolis() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        // Synthwave 하늘 그라디언트 (배경)
        background: 'linear-gradient(180deg, #0b002b 0%, #240046 55%, #3a0ca3 100%)',
      }}
    >
      <Canvas
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        camera={{ position: [0, 6, 22], fov: 60 }}
        style={{ background: 'transparent' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.0
        }}
      >
        {/* 안개로 지평선 페이드 */}
        <fog attach="fog" args={[new THREE.Color('#14002e'), 40, 220]} />
        <Scene />
      </Canvas>
    </div>
  )
}
