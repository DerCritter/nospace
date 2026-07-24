import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export default function Loader() {
  const { active, progress } = useProgress()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    // Si ya no está cargando y el progreso es 100%, ocultar tras un delay más largo (4500ms)
    // para dar tiempo a que los shaders de WebGL compilen y el motor de físicas estabilice.
    if (!active && progress === 100) {
      const t = setTimeout(() => setVisible(false), 4500)
      return () => clearTimeout(t)
    }
  }, [active, progress])

  if (!visible) return null

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: '#020205', // Fondo negro abisal
      zIndex: 99999, // Por encima de TODO
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      fontFamily: '"Space Mono", monospace',
      transition: 'opacity 0.8s ease-in-out',
      opacity: (active || progress < 100) ? 1 : 0,
      pointerEvents: (active || progress < 100) ? 'auto' : 'none'
    }}>
      {/* Título Brutalista */}
      <div style={{
        fontSize: '4rem',
        fontWeight: 'bold',
        letterSpacing: '12px',
        textTransform: 'uppercase',
        marginBottom: '40px',
        color: '#ccff00',
        textShadow: '4px 4px 0px rgba(0, 0, 0, 1)'
      }}>
        NOSPACE
      </div>
      
      {/* Barra de Progreso (Estética Rave/Tech) */}
      <div style={{
        width: '300px',
        height: '6px',
        border: '1px solid #ccff00',
        padding: '2px',
        background: '#000',
        boxShadow: '4px 4px 0px rgba(0,0,0,1)'
      }}>
        <div style={{
          height: '100%',
          width: `${progress}%`,
          background: '#ccff00',
          transition: 'width 0.2s ease-out'
        }} />
      </div>
      
      {/* Texto de estado */}
      <div style={{
        marginTop: '25px',
        fontSize: '12px',
        fontWeight: '700',
        color: '#fff',
        letterSpacing: '4px'
      }}>
        {Math.round(progress)}% // INITIALIZING NEURAL LINK
      </div>
    </div>
  )
}
