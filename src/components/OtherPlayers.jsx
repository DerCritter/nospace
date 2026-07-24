import { useStore } from '../store/useStore'
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function PlayerAvatar({ player }) {
  const groupRef = useRef()
  const headRef = useRef()

  // Interpolación suave para compensar el lag de red (Client-side prediction)
  useFrame((state, delta) => {
    if (!groupRef.current || !player) return
    const safeDelta = Math.min(delta, 0.05)

    // Lerp de Posición (X, Y, Z)
    groupRef.current.position.lerp(
      new THREE.Vector3(...player.position),
      safeDelta * 10
    )

    // Slerp de Rotación
    const pitch = player.rotation[0]
    const yaw = player.rotation[1]

    // El cuerpo solo gira en el eje Y (Yaw)
    const targetBodyQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
    groupRef.current.quaternion.slerp(targetBodyQuat, safeDelta * 12)

    // La cabeza mira arriba/abajo (Pitch) independientemente
    if (headRef.current) {
      const targetHeadQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch)
      headRef.current.quaternion.slerp(targetHeadQuat, safeDelta * 15)
    }
  })

  return (
    // position={player.position} asegura que si el jugador entra nuevo, no aparezca en [0,0,0] y luego vuele
    // lerp se encarga después
    <group ref={groupRef} position={player.position}>
      {/* Cuerpo (El centro del RigidBody en Rapier está a 0.8 metros del suelo) */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.3, 1, 4, 16]} />
        <meshStandardMaterial color="#00ffcc" roughness={0.2} metalness={0.8} />
      </mesh>
      
      {/* Cabeza */}
      <group ref={headRef} position={[0, 0.7, 0]}>
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        {/* Visor (para saber a dónde miran) */}
        <mesh position={[0, 0.05, -0.22]}>
          <boxGeometry args={[0.3, 0.1, 0.1]} />
          <meshStandardMaterial color="black" roughness={0.1} metalness={0.9} />
        </mesh>
      </group>
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
