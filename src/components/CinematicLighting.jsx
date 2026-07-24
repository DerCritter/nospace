import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Stars, GradientTexture } from '@react-three/drei'
import { useRef, useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '../store/useStore'

export default function CinematicLighting({ lighting }) {
  const ambientRef = useRef()
  const dirRef = useRef()
  const spotRef = useRef()
  const spotTargetRef = useRef()
  const { scene } = useThree()

  // Eliminamos scene.background manual porque ahora usamos una esfera de gradiente en el JSX

  // Read activeArt directly from Zustand inside useFrame — no prop, no re-render
  const activeArtRef = useRef(null)

  // Sync ref with store (subscribes without causing re-renders)
  useEffect(() => {
    const unsub = useStore.subscribe((state) => {
      activeArtRef.current = state.activeArt
    })
    // Set initial value
    activeArtRef.current = useStore.getState().activeArt
    return unsub
  }, [])

  // Store base lighting values so we don't fight with React props
  const baseLightingRef = useRef(lighting)
  useEffect(() => {
    baseLightingRef.current = lighting
  }, [lighting])

  // Set initial intensity once
  useEffect(() => {
    if (ambientRef.current) ambientRef.current.intensity = lighting.ambient
    if (dirRef.current) dirRef.current.intensity = lighting.sun
    if (spotRef.current) spotRef.current.intensity = 0
    if (scene.environmentIntensity !== undefined) scene.environmentIntensity = lighting.skyIntensity
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Memoize Environment so it never re-renders and never resets scene.environmentIntensity to 1
  const staticEnvironment = useMemo(() => <Environment files="/clouds.hdr" />, [])

  useFrame((state, delta) => {
    // Clamp delta to max 50ms to prevent lerp jumps on frame drops
    const safeDelta = Math.min(delta, 0.05)
    const activeArt = activeArtRef.current
    const lit = baseLightingRef.current
    const targetDim = activeArt ? 0.05 : 1.0
    
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity, lit.ambient * targetDim, safeDelta * 0.8
      )
    }
    
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity, lit.sun * targetDim, safeDelta * 0.8
      )
    }
    
    if (scene.environmentIntensity !== undefined) {
      scene.environmentIntensity = THREE.MathUtils.lerp(
        scene.environmentIntensity, lit.skyIntensity * targetDim, safeDelta * 0.8
      )
    }

    // Spotlight teatral
    if (spotRef.current && spotTargetRef.current) {
      const targetSpotIntensity = activeArt ? lit.spotIntensity : 0.0
      spotRef.current.intensity = THREE.MathUtils.lerp(
        spotRef.current.intensity, targetSpotIntensity, safeDelta * 1.2
      )
      
      if (activeArt && activeArt.position) {
        const tx = activeArt.position[0]
        const ty = activeArt.position[1] + 3.5
        const tz = activeArt.position[2] + 2.0
        
        // Mover el foco de luz instantáneamente para evitar que el rayo barra la habitación y cause un "flashazo"
        spotRef.current.position.set(tx, ty, tz)
        spotTargetRef.current.position.set(
          activeArt.position[0], 
          activeArt.position[1] + 0.5, 
          activeArt.position[2]
        )
        
        spotRef.current.target = spotTargetRef.current
        spotTargetRef.current.updateMatrixWorld()
      }
    }
  })

  // Convertir esféricas (Azimuth / Elevation) a cartesianas (X, Y, Z) para imitar simuladores solares
  const sunDistance = 50 // Distancia fija para las sombras
  const phi = THREE.MathUtils.degToRad(90 - lighting.sunElevation)
  const theta = THREE.MathUtils.degToRad(lighting.sunAzimuth)
  const calculatedSunX = sunDistance * Math.sin(phi) * Math.cos(theta)
  const calculatedSunY = sunDistance * Math.cos(phi)
  const calculatedSunZ = sunDistance * Math.sin(phi) * Math.sin(theta)

  // JSX: NO intensity props on lights — useFrame controls them exclusively
  return (
    <>
      {/* Fondo Gradiente */}
      <mesh scale={200}>
        <sphereGeometry args={[32, 32]} />
        <meshBasicMaterial side={THREE.BackSide} toneMapped={false} fog={false}>
          <GradientTexture
            attach="map"
            stops={[0, 1]}
            colors={[lighting.skyColorTop, lighting.skyColorBottom]}
            size={1024}
          />
        </meshBasicMaterial>
      </mesh>

      {/* Estrellas procedurales súper nítidas generadas matemáticamente */}
      <Stars 
        radius={100} 
        depth={50} 
        count={lighting.starCount} 
        factor={lighting.starFactor} 
        saturation={0} 
        fade 
        speed={lighting.starSpeed} 
      />
      
      {/* El Environment usa un archivo local seguro para generar reflejos sutiles. Memoizado para evitar parpadeos. */}
      {staticEnvironment}
      
      <ambientLight ref={ambientRef} color={lighting.ambientColor} />
      <directionalLight 
        ref={dirRef}
        position={[calculatedSunX, calculatedSunY, calculatedSunZ]} 
        color={lighting.sunColor}
        castShadow 
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.1}
        shadow-camera-far={200}
        shadow-bias={-0.0001}
        shadow-normalBias={0.2}
      />
      
      {/* Real ThreeJS spotlight (white light, no volumetric sprite) */}
      <spotLight
        ref={spotRef}
        color={lighting.spotColor}
        distance={20}
        angle={lighting.spotAngle}
        penumbra={lighting.spotPenumbra}
        decay={2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
        shadow-normalBias={0.2}
      />
      <object3D ref={spotTargetRef} />
    </>
  )
}
