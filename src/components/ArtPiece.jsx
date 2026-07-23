import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function ArtPiece({ position, title, description }) {
  const [hovered, setHovered] = useState(false)
  const setActiveArt = useStore((state) => state.setActiveArt)

  return (
    <group position={position}>
      {/* El cuadro físico (un plano para simular el lienzo) */}
      <mesh 
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          // Enviamos los datos a la interfaz 2D fuera del canvas
          setActiveArt({ title, description })
        }}
        onPointerOut={(e) => {
          setHovered(false)
          // Ocultamos la interfaz 2D
          setActiveArt(null)
        }}
        castShadow
      >
        <planeGeometry args={[1.5, 2]} />
        <meshStandardMaterial color={hovered ? "#4a4a4a" : "#2a2a2a"} />
      </mesh>
    </group>
  )
}
