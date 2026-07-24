import { useStore } from '../store/useStore'
import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useGLTF, useAnimations } from '@react-three/drei'
import { SkeletonUtils } from 'three-stdlib'

function PlayerAvatar({ player }) {
  const groupRef = useRef()
  const { scene, animations } = useGLTF('/RobotExpressive.glb')
  
  // Clonar el modelo para que varios jugadores puedan usar el mismo GLB sin parpadear
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const { actions } = useAnimations(animations, groupRef)

  // Iniciar en pose de descanso
  useEffect(() => {
    if (actions && actions['Idle']) {
      actions['Idle'].play()
    }
  }, [actions])

  const lastNetworkPos = useRef(new THREE.Vector3(...player.position))
  const isMoving = useRef(false)
  const idleTimer = useRef(0)

  // Interpolación suave para compensar el lag de red (Client-side prediction)
  useFrame((state, delta) => {
    if (!groupRef.current || !player) return
    const safeDelta = Math.min(delta, 0.05)

    // Lerp de Posición visual
    const targetPos = new THREE.Vector3(...player.position)
    groupRef.current.position.lerp(targetPos, safeDelta * 10)

    // Detectar si el jugador se está moviendo realmente (viendo si la red actualiza la posición)
    const networkDist = lastNetworkPos.current.distanceTo(targetPos)
    if (networkDist > 0.005) {
      isMoving.current = true
      idleTimer.current = 0
      lastNetworkPos.current.copy(targetPos)
    } else {
      idleTimer.current += safeDelta
      if (idleTimer.current > 0.15) { // Si pasan 150ms sin moverse, se considera quieto
        isMoving.current = false
      }
    }
    
    // Crossfade (transición suave) entre animaciones reales del modelo 3D
    if (actions) {
      if (isMoving.current) { 
        if (actions['Walking'] && !actions['Walking'].isRunning()) {
          actions['Walking'].reset().fadeIn(0.2).play()
          if (actions['Idle']) actions['Idle'].fadeOut(0.2)
        }
      } else { 
        if (actions['Idle'] && !actions['Idle'].isRunning()) {
          actions['Idle'].reset().fadeIn(0.2).play()
          if (actions['Walking']) actions['Walking'].fadeOut(0.2)
        }
      }
    }

    // Slerp de Rotación
    const yaw = player.rotation[1]
    // Giramos el cuerpo en el eje Y
    const targetBodyQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    groupRef.current.quaternion.slerp(targetBodyQuat, safeDelta * 12)
  })

  return (
    <group ref={groupRef} position={player.position}>
      {/* El modelo RobotExpressive es bastante grande, lo escalamos y lo bajamos al suelo (-0.8) */}
      <primitive object={clone} position={[0, -0.8, 0]} scale={0.4} />
    </group>
  )
}

export default function OtherPlayers() {
  const players = useStore((state) => state.players)
  
  return (
    <>
      {Object.values(players).map((p) => (
        <PlayerAvatar key={p.id} player={p} />
      ))}
    </>
  )
}

useGLTF.preload('/RobotExpressive.glb')
