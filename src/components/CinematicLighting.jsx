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
  const skyMatRef = useRef()
  const { scene, gl } = useThree()

  // === REFLECTION PROBE (HDRI DINÁMICO) ===
  const cubeRenderTarget = useMemo(() => new THREE.WebGLCubeRenderTarget(256, {
    format: THREE.RGBAFormat,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  }), [])
  
  const cubeCamera = useMemo(() => new THREE.CubeCamera(0.1, 3000, cubeRenderTarget), [cubeRenderTarget])
  
  useEffect(() => {
    scene.environment = cubeRenderTarget.texture
    return () => { scene.environment = null }
  }, [scene, cubeRenderTarget])

  // Rastreador de cambios para no renderizar las 6 cámaras en cada frame (optimización extrema)
  const lastProbeUpdate = useRef(null)

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

    // Actualizar los colores del cielo directamente en la memoria de la tarjeta gráfica
    // Esto evita cualquier bug de HMR o reconciliación de React
    if (skyMatRef.current) {
      skyMatRef.current.uniforms.colorTop.value.set(lit.skyColorTop)
      skyMatRef.current.uniforms.colorBottom.value.set(lit.skyColorBottom)
      skyMatRef.current.uniforms.brightness.value = lit.skyBrightness
    }

    // Actualizar el Reflection Probe SOLO si ha cambiado algo de la luz o el cielo
    // Esto mantiene los FPS intactos al caminar, pero actualiza el HDRI al mover los sliders
    const currentLightingState = `${lit.skyColorTop}-${lit.skyColorBottom}-${lit.skyBrightness}-${lit.sunColor}-${lit.sunElevation}-${lit.sunAzimuth}`
    if (lastProbeUpdate.current !== currentLightingState) {
      // Esconder el environment global temporalmente para evitar que se grabe a sí mismo (feedback loop)
      const oldEnv = scene.environment
      scene.environment = null
      
      cubeCamera.position.set(0, 2, 0)
      cubeCamera.update(gl, scene)
      
      scene.environment = oldEnv
      lastProbeUpdate.current = currentLightingState
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
  
  // Posición para la luz direccional
  const calculatedSunX = sunDistance * Math.sin(phi) * Math.cos(theta)
  const calculatedSunY = sunDistance * Math.cos(phi)
  const calculatedSunZ = sunDistance * Math.sin(phi) * Math.sin(theta)

  // Posición visual para la Luna (muy lejos, detrás de la galería pero delante de las estrellas)
  const moonDistance = 900
  const moonX = moonDistance * Math.sin(phi) * Math.cos(theta)
  const moonY = moonDistance * Math.cos(phi)
  const moonZ = moonDistance * Math.sin(phi) * Math.sin(theta)

  // JSX: NO intensity props on lights — useFrame controls them exclusively
  
  const skyUniforms = useMemo(() => ({
    colorTop: { value: new THREE.Color('#765e5e') },
    colorBottom: { value: new THREE.Color('#ffd1d1') },
    brightness: { value: 1.0 }
  }), [])

  return (
    <>
      {/* Fondo Gradiente (Escala gigante) */}
      <mesh scale={1500}>
        <sphereGeometry args={[1, 32, 32]} />
        <shaderMaterial 
          ref={skyMatRef}
          side={THREE.BackSide} 
          depthWrite={false}
          toneMapped={false}
          uniforms={skyUniforms}
          vertexShader={`
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            uniform vec3 colorTop;
            uniform vec3 colorBottom;
            uniform float brightness;
            varying vec2 vUv;
            void main() {
              vec3 finalColor = mix(colorBottom, colorTop, vUv.y);
              gl_FragColor = vec4(finalColor * brightness, 1.0);
            }
          `}
        />
      </mesh>

      {/* La Luna Visual */}
      <mesh position={[moonX, moonY, moonZ]}>
        <sphereGeometry args={[25, 32, 32]} />
        <meshBasicMaterial color={lighting.sunColor} toneMapped={false} />
      </mesh>

      {/* Estrellas procedurales súper nítidas generadas matemáticamente */}
      <Stars 
        radius={1000} 
        depth={200} 
        count={lighting.starCount} 
        factor={lighting.starFactor * 10} 
        saturation={0} 
        fade 
        speed={lighting.starSpeed} 
      />
      
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
