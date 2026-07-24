import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'

export default function WaterSurface({ geometry, position, quaternion, scale, config }) {
  const materialRef = useRef()
  
  // Cargamos la textura de normales que da relieve y forma a las olas
  const waterNormals = useLoader(THREE.TextureLoader, '/waternormals.jpg')
  const waterNormals2 = useMemo(() => waterNormals.clone(), [waterNormals])
  
  useMemo(() => {
    waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping
    waterNormals2.wrapS = waterNormals2.wrapT = THREE.RepeatWrapping
    const waterSize = config?.waterSize ?? 200
    waterNormals.repeat.set(waterSize, waterSize)
    waterNormals2.repeat.set(waterSize, waterSize)
  }, [waterNormals, waterNormals2, config?.waterSize])

  // Regenerar automáticamente los UVs de la geometría por si fallaron al exportar desde Blender
  useMemo(() => {
    if (!geometry) return
    geometry.computeBoundingBox()
    const { min, max } = geometry.boundingBox
    
    const rangeX = max.x - min.x || 1
    const rangeY = max.y - min.y || 1
    const rangeZ = max.z - min.z || 1

    const isXZ = rangeZ > rangeY 
    
    const rangeU = rangeX
    const rangeV = isXZ ? rangeZ : rangeY

    const pos = geometry.attributes.position
    const uvs = new Float32Array(pos.count * 2)

    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) - min.x) / rangeU
      const v = isXZ ? (pos.getZ(i) - min.z) / rangeV : (pos.getY(i) - min.y) / rangeV
      uvs[i * 2] = u
      uvs[i * 2 + 1] = v
    }
    
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.attributes.uv.needsUpdate = true
  }, [geometry])

  // Bucle de animación: desplazamos las normales en direcciones opuestas
  // La intersección de dos ondas crea ruido estático (aguas tranquilas) en lugar de un río fluyendo
  useFrame((state, delta) => {
    if (waterNormals && waterNormals2) {
      const speed = config.waterSpeed * 0.01
      waterNormals.offset.x += delta * speed
      waterNormals.offset.y += delta * speed
      
      waterNormals2.offset.x -= delta * speed * 0.8 // Velocidad asimétrica para evitar patrones repetitivos
      waterNormals2.offset.y -= delta * speed * 1.2
    }
  })

  // Usamos un Material Físico avanzado de Three.js (PBR)
  // Esto refleja el HDRI de forma nativa (a diferencia del objeto Water antiguo)
  // y refracta la luz como el agua real usando 'transmission'
  return (
    <mesh geometry={geometry} position={position} quaternion={quaternion} scale={scale} receiveShadow>
      <meshPhysicalMaterial 
        ref={materialRef}
        color={config.waterColor || '#e7f3ff'}
        metalness={0.1}
        roughness={0.0}
        transmission={0.9} // Efecto de cristal/agua transparente
        ior={1.333} // Índice de refracción real del agua
        transparent={true}
        opacity={1}
        normalMap={waterNormals}
        normalScale={new THREE.Vector2(config.waterDistortion * 0.15, config.waterDistortion * 0.15)}
        clearcoat={1.0} // Añadimos una capa extra de reflejo (barniz)
        clearcoatRoughness={0.0}
        clearcoatNormalMap={waterNormals2} // Usamos la textura invertida aquí
        clearcoatNormalScale={new THREE.Vector2(config.waterDistortion * 0.15, config.waterDistortion * 0.15)}
        envMapIntensity={2.0} // Multiplicador para absorber fuertemente los reflejos del HDRI
        depthWrite={false} // Evita artefactos de Z-fighting con el suelo
      />
    </mesh>
  )
}
