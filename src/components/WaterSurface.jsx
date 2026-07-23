import { useRef, useMemo } from 'react'
import { extend, useThree, useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { Water } from 'three-stdlib'

// Registramos el objeto Water en React Three Fiber
extend({ Water })

export default function WaterSurface({ geometry, position, quaternion, scale, config }) {
  const ref = useRef()
  const gl = useThree((state) => state.gl)
  
  // Cargamos la textura de normales que da relieve y forma a las olas
  const waterNormals = useLoader(THREE.TextureLoader, '/waternormals.jpg')
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping

  // Configuración dinámica del shader de agua enlazada a Leva
  const waterConfig = useMemo(() => ({
    textureWidth: 512,
    textureHeight: 512,
    waterNormals,
    sunDirection: new THREE.Vector3(config.sunX, config.sunY, config.sunZ).normalize(),
    sunColor: new THREE.Color(config.sunColor),
    waterColor: new THREE.Color(config.waterColor),
    distortionScale: config.waterDistortion,
    fog: false,
    format: gl.outputColorSpace || gl.encoding // Soporte para versiones nuevas y antiguas de Three.js
  }), [waterNormals, gl.outputColorSpace, gl.encoding, config.sunX, config.sunY, config.sunZ, config.sunColor, config.waterColor, config.waterDistortion])

  // Bucle de animación: avanza el tiempo del shader multiplicando por la velocidad
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.material.uniforms.time.value += delta * config.waterSpeed
    }
  })

  return (
    <water 
      ref={ref} 
      args={[geometry, waterConfig]} 
      position={position} 
      quaternion={quaternion} 
      scale={scale} 
    />
  )
}
