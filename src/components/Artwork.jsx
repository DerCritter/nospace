import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, Html } from '@react-three/drei'
import { useStore } from '../store/useStore'

export default function Artwork({ position, url = '/models/pieces/piece_1.glb', artData }) {
  const groupRef = useRef()
  const modelRef = useRef()
  const { scene } = useGLTF(url)
  const setActiveArt = useStore((state) => state.setActiveArt)
  const activeArt = useStore((state) => state.activeArt)
  const [hovered, setHovered] = useState(false)

  useFrame((state, delta) => {
    // Solo rotamos el modelo 3D, no el contenedor principal
    if (modelRef.current) {
      modelRef.current.rotation.y += delta * 0.5
    }
    // El contenedor principal (incluyendo el hitbox y el texto) solo flota suavemente
    if (groupRef.current) {
      const floatOffset = Math.sin(state.clock.elapsedTime * 2) * 0.1
      groupRef.current.position.y = position[1] + floatOffset
    }
  })

  return (
    <group 
      ref={groupRef}
      position={position}
    >
      {/* Hitbox masivo en forma de cilindro para crear un 'radio de interacción' gigante alrededor de la obra */}
      <mesh
        position={[0, -1.5, 0]} // Bajado agresivamente para que hunda en el suelo y asegure cubrir la base
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (!activeArt) setActiveArt({ ...artData, position })
        }}
      >
        {/* Altura de 6 metros para que, sin importar donde esté el anclaje, cubra TODO */}
        <cylinderGeometry args={[2.5, 2.5, 6, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* Label "INTERACT" — flat, no rota, estilo tipográfico brutalist/rave de la web */}
      {hovered && !activeArt && (
        <Html
          position={[1.2, 0.2, 0]} // Bajado a la altura de los ojos / cerca de la escultura real
          center
          distanceFactor={6}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: '"Space Mono", monospace',
            fontSize: '12px',
            fontWeight: '700',
            color: '#000',
            background: '#ccff00', // Verde ácido
            padding: '6px 12px',
            border: '1px solid #000',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            userSelect: 'none',
            boxShadow: '4px 4px 0px rgba(0,0,0,1)', // Sombra dura brutalista
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              background: '#000',
            }} />
            INTERACT
          </div>
        </Html>
      )}

      {/* Modelo 3D de la obra (este es el único que rota) */}
      <group ref={modelRef}>
        <primitive object={scene.clone()} />
      </group>
    </group>
  )
}
