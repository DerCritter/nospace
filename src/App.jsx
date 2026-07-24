import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { Sky, Environment, Clouds, Cloud, GradientTexture } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { Info } from 'lucide-react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import Gallery from './components/Gallery'
import CinematicLighting from './components/CinematicLighting'
import HUD from './components/HUD'
import { useStore } from './store/useStore'
import { useControls, Leva, button } from 'leva'

function DynamicBackground({ colorHex }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.background = new THREE.Color(colorHex)
  }, [colorHex, scene])
  return null
}

import Loader from './components/Loader'

function App() {
  const activeArt = useStore((state) => state.activeArt)

  // 1. Cargar configuración guardada (si existe) del LocalStorage SOLO al inicializar
  const [savedConfig] = useState(() => JSON.parse(localStorage.getItem('gallery-lighting') || '{}'))

  const lighting = useControls('Ajustes Visuales', {
    ambient: { value: savedConfig.ambient ?? 0.7, min: 0, max: 2, step: 0.05, label: 'Luz Ambiente' },
    ambientColor: { value: savedConfig.ambientColor ?? '#ffd0a9', label: 'Color Amb.' },
    skyIntensity: { value: savedConfig.skyIntensity ?? 0.4, min: 0, max: 5, step: 0.1, label: 'Fuerza HDRI' },
    skyColorTop: { value: savedConfig.skyColorTop ?? '#765e5e', label: 'Cielo (Arriba)' },
    skyColorBottom: { value: savedConfig.skyColorBottom ?? '#ffd1d1', label: 'Cielo (Horizonte)' },
    skyBrightness: { value: savedConfig.skyBrightness ?? 0.6, min: 0, max: 5, step: 0.1, label: 'Brillo Cielo' },
    starCount: { value: savedConfig.starCount ?? 9700, min: 100, max: 20000, step: 100, label: 'Cant. Estrellas' },
    starFactor: { value: savedConfig.starFactor ?? 6, min: 0.1, max: 10, step: 0.1, label: 'Tam. Estrellas' },
    starSpeed: { value: savedConfig.starSpeed ?? 7.9, min: 0, max: 10, step: 0.1, label: 'Veloc. Estrellas' },
    sun: { value: savedConfig.sun ?? 1.4, min: 0, max: 5, step: 0.1, label: 'Fuerza Sol' },
    sunColor: { value: savedConfig.sunColor ?? '#f8e5d8', label: 'Color Sol' },
    sunAzimuth: { value: savedConfig.sunAzimuth ?? 148, min: 0, max: 360, step: 1, label: 'Ángulo Sol (Azimut)' },
    sunElevation: { value: savedConfig.sunElevation ?? 24, min: 0, max: 90, step: 1, label: 'Altura Sol' },
    spotIntensity: { value: savedConfig.spotIntensity ?? 37, min: 0, max: 100, step: 1, label: 'Fuerza Foco' },
    spotColor: { value: savedConfig.spotColor ?? '#f8eede', label: 'Color Foco' },
    spotAngle: { value: savedConfig.spotAngle ?? 0.6, min: 0.1, max: 1.5, step: 0.05, label: 'Apertura Foco' },
    spotPenumbra: { value: savedConfig.spotPenumbra ?? 0.8, min: 0, max: 1, step: 0.05, label: 'Suavidad Foco' },
    bloomIntensity: { value: savedConfig.bloomIntensity ?? 0.5, min: 0, max: 5, step: 0.1, label: 'Fuerza Bloom' },
    bloomThreshold: { value: savedConfig.bloomThreshold ?? 1.0, min: 0, max: 2, step: 0.05, label: 'Límite Bloom' },
    waterColor: { value: savedConfig.waterColor ?? '#e7f3ff', label: 'Color Agua' },
    waterSpeed: { value: savedConfig.waterSpeed ?? 1.3, min: 0, max: 2, step: 0.1, label: 'Velocidad Agua' },
    waterDistortion: { value: savedConfig.waterDistortion ?? 2.1, min: 0, max: 10, step: 0.1, label: 'Olas Agua' },
    camOffsetX: { value: savedConfig.camOffsetX ?? -5, min: -5, max: 5, step: 0.1, label: 'Cámara X' },
    camOffsetY: { value: savedConfig.camOffsetY ?? 0, min: 0, max: 5, step: 0.1, label: 'Cámara Y' },
    camOffsetZ: { value: savedConfig.camOffsetZ ?? 5, min: -5, max: 5, step: 0.1, label: 'Cámara Z' },
    camLookAtX: { value: savedConfig.camLookAtX ?? 2, min: -5, max: 5, step: 0.1, label: 'Encuadre Obj X' },
    walkLens: { value: savedConfig.walkLens ?? 24, min: 12, max: 100, step: 1, label: 'Lente Paseo (mm)' },
    inspectLens: { value: savedConfig.inspectLens ?? 35, min: 24, max: 200, step: 1, label: 'Lente Inspect (mm)' },
    dofFocalLength: { value: savedConfig.dofFocalLength ?? 0.108, min: 0, max: 0.2, step: 0.001, label: 'Prof. Lente (DOF)' },
    dofBokehScale: { value: savedConfig.dofBokehScale ?? 0, min: 0, max: 20, step: 0.1, label: 'Difuminado (DOF)' },
    'Copiar Ajustes': button(() => {
      const data = localStorage.getItem('gallery-lighting')
      navigator.clipboard.writeText(data)
      console.log('Ajustes exportados:', JSON.parse(data))
      alert('¡Configuración copiada al portapapeles! Puedes pegarla en tus notas o enviármela por el chat para fijarla como la configuración por defecto.')
    })
  })

  // 3. Guardar automáticamente cada vez que el usuario mueva un control
  useEffect(() => {
    localStorage.setItem('gallery-lighting', JSON.stringify(lighting))
  }, [lighting])

  // 4. Atajo de teclado "T" para ocultar/mostrar el panel de herramientas
  const [levaHidden, setLevaHidden] = useState(true)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar que se active si el usuario está escribiendo en algún input dentro del panel
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      
      if (e.key.toLowerCase() === 't') {
        setLevaHidden(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <Loader />
      {/* Panel de control de gráficos (Flotante) */}
      <Leva hidden={levaHidden} theme={{ sizes: { rootWidth: '350px', controlWidth: '160px' }, colors: { highlight1: '#ffffff', highlight2: '#444444', elevation2: '#1a1a1a', elevation3: '#2a2a2a' } }} />

      {/* HUD 2D OVERLAY (Panel Lateral de Inspección) */}
      <HUD />

      <div className="instructions">
        Haz clic para caminar • ESC para ajustar los gráficos • W A S D para moverte
      </div>
      
      <div id="canvas-container" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
        <Canvas shadows camera={{ position: [0, 1.6, 5], fov: 60 }}>
          
          {/* Iluminación Dinámica controlada por Leva y animada por clicks */}
          <CinematicLighting lighting={lighting} />
          
          <Suspense fallback={null}>
            <Physics>
              <Gallery lighting={lighting} />
            </Physics>
          </Suspense>

          {/* Post-Procesado: Efectos Cinematográficos controlados por Leva */}
          <EffectComposer disableNormalPass>
            <Bloom 
              luminanceThreshold={lighting.bloomThreshold} 
              mipmapBlur 
              intensity={lighting.bloomIntensity} 
            />
            {/* DOF siempre montado (desmontar crashea el pipeline de postprocessing).
                Se desactiva poniendo bokehScale a 0 cuando no hay obra seleccionada. */}
            <DepthOfField
              target={activeArt 
                ? [
                    activeArt.position[0] + (lighting.camLookAtX ?? 0.8), 
                    activeArt.position[1] + (lighting.camOffsetY ?? 1.6), 
                    activeArt.position[2]
                  ]
                : [0, 0, 0]
              }
              focalLength={activeArt ? lighting.dofFocalLength : 0}
              bokehScale={activeArt ? lighting.dofBokehScale : 0}
              height={480}
            />
          </EffectComposer>
        </Canvas>
      </div>
    </>
  )
}

export default App
