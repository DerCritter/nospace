import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useState } from 'react'
import { Sky, Environment, Clouds, Cloud, GradientTexture, KeyboardControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing'
import { Info } from 'lucide-react'
import * as THREE from 'three'
import { useThree } from '@react-three/fiber'
import Gallery from './components/Gallery'
import CinematicLighting from './components/CinematicLighting'
import HUD from './components/HUD'
import NetworkManager from './components/NetworkManager'
import OtherPlayers from './components/OtherPlayers'
import { useStore } from './store/useStore'
import { useControls, Leva, button, folder } from 'leva'
import { EcctrlJoystick } from 'ecctrl'

function DynamicBackground({ colorHex }) {
  const { scene } = useThree()
  useEffect(() => {
    scene.background = new THREE.Color(colorHex)
  }, [colorHex, scene])
  return null
}

import Loader from './components/Loader'

const CAMERA_CONFIG = { 
  position: [0, 1.6, 4], 
  fov: 45,
  near: 0.1,
  far: 2000
}

function PostProcessing({ lighting }) {
  const activeArt = useStore((state) => state.activeArt)
  return (
    <EffectComposer disableNormalPass>
      <Bloom 
        luminanceThreshold={lighting.bloomThreshold} 
        radius={0.6}
        intensity={lighting.bloomIntensity} 
      />
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
  )
}

function LevaContainer() {
  const [levaHidden, setLevaHidden] = useState(true)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key.toLowerCase() === 't') {
        setLevaHidden(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Leva 
      hidden={levaHidden} 
      theme={{ sizes: { rootWidth: '350px', controlWidth: '160px' }, colors: { highlight1: '#ffffff', highlight2: '#444444', elevation2: '#1a1a1a', elevation3: '#2a2a2a' } }} 
    />
  )
}

function App() {
  const [savedConfig] = useState(() => JSON.parse(localStorage.getItem('gallery-lighting') || '{}'))

  const lighting = useControls('Visual Settings', {
    ambient: { value: savedConfig.ambient ?? 0.95, min: 0, max: 2, step: 0.05, label: 'Ambient Light' },
    ambientColor: { value: savedConfig.ambientColor ?? '#ffd9bb', label: 'Amb. Color' },
    skyIntensity: { value: savedConfig.skyIntensity ?? 0.5, min: 0, max: 5, step: 0.1, label: 'HDRI Strength' },
    skyColorTop: { value: savedConfig.skyColorTop ?? '#1a2138', label: 'Sky (Top)' },
    skyColorBottom: { value: savedConfig.skyColorBottom ?? '#000000', label: 'Sky (Horizon)' },
    skyBrightness: { value: savedConfig.skyBrightness ?? 2.6, min: 0, max: 5, step: 0.1, label: 'Sky Brightness' },
    starCount: { value: savedConfig.starCount ?? 6300, min: 100, max: 20000, step: 100, label: 'Star Count' },
    starFactor: { value: savedConfig.starFactor ?? 3.8, min: 0.1, max: 10, step: 0.1, label: 'Star Size' },
    starSpeed: { value: savedConfig.starSpeed ?? 7.9, min: 0, max: 10, step: 0.1, label: 'Star Speed' },
    sun: { value: savedConfig.sun ?? 1.3, min: 0, max: 5, step: 0.1, label: 'Sun Strength' },
    sunColor: { value: savedConfig.sunColor ?? '#f8e5d8', label: 'Sun Color' },
    sunAzimuth: { value: savedConfig.sunAzimuth ?? 148, min: 0, max: 360, step: 1, label: 'Sun Angle (Azimuth)' },
    sunElevation: { value: savedConfig.sunElevation ?? 26, min: 0, max: 90, step: 1, label: 'Sun Elevation' },
    spotIntensity: { value: savedConfig.spotIntensity ?? 37, min: 0, max: 100, step: 1, label: 'Spot Strength' },
    spotColor: { value: savedConfig.spotColor ?? '#f8eede', label: 'Spot Color' },
    spotAngle: { value: savedConfig.spotAngle ?? 0.6, min: 0.1, max: 1.5, step: 0.05, label: 'Spot Angle' },
    spotPenumbra: { value: savedConfig.spotPenumbra ?? 0.25, min: 0, max: 1, step: 0.05, label: 'Spot Penumbra' },
    bloomIntensity: { value: savedConfig.bloomIntensity ?? 1.3, min: 0, max: 5, step: 0.1, label: 'Bloom Strength' },
    bloomThreshold: { value: savedConfig.bloomThreshold ?? 0.6, min: 0, max: 2, step: 0.05, label: 'Bloom Threshold' },
    'Water': folder({
      waterColor: { value: savedConfig.waterColor ?? '#e7f3ff', label: 'Water Color' },
      waterSpeed: { value: savedConfig.waterSpeed ?? 3.6, min: 0, max: 5, step: 0.1, label: 'Speed' },
      waterDistortion: { value: savedConfig.waterDistortion ?? 5.2, min: 0, max: 10, step: 0.1, label: 'Wave Strength' },
      waterSize: { value: savedConfig.waterSize ?? 31, min: 1, max: 1000, step: 1, label: 'Wave Density' },
    }),
    camOffsetX: { value: savedConfig.camOffsetX ?? -5, min: -5, max: 5, step: 0.1, label: 'Camera X' },
    camOffsetY: { value: savedConfig.camOffsetY ?? 0, min: 0, max: 5, step: 0.1, label: 'Camera Y' },
    camOffsetZ: { value: savedConfig.camOffsetZ ?? 5, min: -5, max: 5, step: 0.1, label: 'Camera Z' },
    camLookAtX: { value: savedConfig.camLookAtX ?? 2, min: -5, max: 5, step: 0.1, label: 'Object Framing X' },
    walkLens: { value: savedConfig.walkLens ?? 24, min: 12, max: 100, step: 1, label: 'Walk Lens (mm)' },
    inspectLens: { value: savedConfig.inspectLens ?? 35, min: 24, max: 200, step: 1, label: 'Inspect Lens (mm)' },
    dofFocalLength: { value: savedConfig.dofFocalLength ?? 0.108, min: 0, max: 0.2, step: 0.001, label: 'DOF Depth' },
    dofBokehScale: { value: savedConfig.dofBokehScale ?? 0, min: 0, max: 20, step: 0.1, label: 'DOF Blur' },
    'Copy Settings': button(() => {
      const data = localStorage.getItem('gallery-lighting')
      navigator.clipboard.writeText(data)
      console.log('Exported Settings:', JSON.parse(data))
      alert('Settings copied to clipboard!')
    })
  })

  useEffect(() => {
    localStorage.setItem('gallery-lighting', JSON.stringify(lighting))
  }, [lighting])



  const keyboardMap = [
    { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
    { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
    { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
    { name: 'right', keys: ['ArrowRight', 'KeyD'] },
    { name: 'jump', keys: ['Space'] },
    { name: 'run', keys: ['Shift'] },
  ]

  return (
    <>
      <Loader />
      <LevaContainer />
      <HUD />
      <div className="instructions">
        Click to walk • ESC for settings • C for 3rd person • W A S D to move
      </div>
      
      <KeyboardControls map={keyboardMap}>
        <div id="canvas-container" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 0 }}>
          <Canvas shadows camera={CAMERA_CONFIG}>
            <NetworkManager />
            <CinematicLighting lighting={lighting} />
            <Suspense fallback={null}>
              <Physics>
                <Gallery lighting={lighting} />
              </Physics>
              <OtherPlayers />
            </Suspense>
            <PostProcessing lighting={lighting} />
          </Canvas>
        </div>
        {/* Mobile portrait lock screen */}
        <div className="portrait-warning">
          <p style={{ marginBottom: '1rem', fontWeight: 'bold' }}>Landscape Mode Required</p>
          <p style={{ fontSize: '1rem', opacity: 0.8 }}>Please rotate your phone horizontally to explore the gallery with touch controls.</p>
        </div>

        {/* Joystick táctil visible solo en móviles y apaisado */}
        <div className="joystick-container">
          <EcctrlJoystick />
        </div>
      </KeyboardControls>
    </>
  )
}

export default App
