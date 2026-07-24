import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier'
import Player from './Player'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import Artwork from './Artwork'
import WaterSurface from './WaterSurface'

export default function Gallery({ lighting }) {
  const { scene, nodes } = useGLTF('/models/base_scene.glb')
  
  let spawnPos = [0, 2, 0]
  if (nodes.SpawnPoint) {
    // Asegurar que las matrices del mundo estén actualizadas para el raycast
    scene.updateMatrixWorld(true)
    
    const raycaster = new THREE.Raycaster(
      new THREE.Vector3(nodes.SpawnPoint.position.x, nodes.SpawnPoint.position.y + 10, nodes.SpawnPoint.position.z),
      new THREE.Vector3(0, -1, 0)
    )
    
    // Solo intersectar con mallas visibles para no chocar con empties o triggers
    const meshes = []
    scene.traverse(c => { if (c.isMesh) meshes.push(c) })
    const intersects = raycaster.intersectObjects(meshes, false)
    
    let floorY = nodes.SpawnPoint.position.y
    if (intersects.length > 0) {
      floorY = intersects[0].point.y
    }
    
    // El centro de la cápsula (0.8m) debe estar exactamente a 0.8m sobre el suelo detectado
    spawnPos = [nodes.SpawnPoint.position.x, floorY + 0.801, nodes.SpawnPoint.position.z]
  }

  const { emptyNodes, waterNode } = useMemo(() => {
    const foundNodes = []
    let foundWater = null

    scene.traverse((child) => {
      if (child.name.toLowerCase().includes('empty')) {
        const pos = new THREE.Vector3()
        child.getWorldPosition(pos)
        foundNodes.push({ id: child.uuid, position: [pos.x, pos.y, pos.z] })
        child.visible = false
      }

      if (child.name.toLowerCase().includes('circle') && child.isMesh) {
        const pos = new THREE.Vector3()
        const rot = new THREE.Quaternion()
        const scale = new THREE.Vector3()
        child.getWorldPosition(pos)
        child.getWorldQuaternion(rot)
        child.getWorldScale(scale)

        foundWater = {
          geometry: child.geometry,
          position: [pos.x, pos.y, pos.z],
          quaternion: [rot.x, rot.y, rot.z, rot.w],
          scale: [scale.x, scale.y, scale.z]
        }
        child.visible = false
      }
    })
    return { emptyNodes: foundNodes, waterNode: foundWater }
  }, [scene])

  const artCollection = [
    {
      title: 'Chimera tail',
      artist: 'Daniel Boubet',
      description: 'Use: garment, jewelry, iron.',
      url: '/models/pieces/piece_1.glb',
      images: [
        'https://picsum.photos/seed/chimera1/400/300',
        'https://picsum.photos/seed/chimera2/400/300'
      ]
    },
    {
      title: 'CHNOPS - Building blocks for life',
      artist: 'Daniel Boubet, Maria Capelo Collab',
      description: '3D Print Biodegradable resin.\nUse: Bracelet.',
      url: '/models/pieces/piece_2.glb',
      images: [
        '/piece_1_1.jpg',
        '/piece_1_2.jpg',
        '/piece_1_3.jpg'
      ]
    }
  ]

  // Downsample de texturas en runtime para ahorrar VRAM sin tocar los GLBs
  // Usa un canvas offscreen para redibujar cada textura a resolución menor
  const downsampleTextures = (root, maxSize = 1024) => {
    const processed = new Set()
    root.traverse((child) => {
      if (!child.isMesh || !child.material) return
      const materials = Array.isArray(child.material) ? child.material : [child.material]
      materials.forEach((mat) => {
        // --- LIMPIEZA DRÁSTICA (A PETICIÓN DEL USUARIO) ---
        // Mantener SOLO diffuse (map), normal y roughness.
        // Las texturas metálicas y de rugosidad en glTF vienen empaquetadas en la MISMA imagen.
        // NO podemos borrar metalnessMap sin destruir también roughnessMap.
        const forbiddenMaps = ['aoMap', 'emissiveMap', 'specularMap', 'specularColorMap', 'clearcoatMap']
        forbiddenMaps.forEach(key => {
          if (mat[key]) {
            mat[key].dispose()
            mat[key] = null
          }
        })
        mat.needsUpdate = true

        // Procesar solo los mapas permitidos para hacerles downsample a 1024.
        // NUNCA hacer downsample de 'normalMap' por Canvas, porque el canvas destruye los vectores RGB y crea glitches horribles.
        const allowedMaps = ['map', 'roughnessMap', 'metalnessMap']
        allowedMaps.forEach((key) => {
          const tex = mat[key]
          if (!tex || !tex.image || processed.has(tex.uuid)) return
          processed.add(tex.uuid)
          const img = tex.image
          if (img.width <= maxSize && img.height <= maxSize) return
          
          // Redibujar la imagen a menor resolución con canvas offscreen
          const canvas = document.createElement('canvas')
          const aspect = img.width / img.height
          canvas.width = Math.min(img.width, maxSize)
          canvas.height = Math.min(img.height, maxSize)
          if (aspect > 1) canvas.height = canvas.width / aspect
          else canvas.width = canvas.height * aspect
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          tex.image = canvas
          tex.needsUpdate = true
        })
      })
    })
  }

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        const mat = child.material
        const matName = (mat && mat.name) ? mat.name.toLowerCase() : ''
        const meshName = child.name.toLowerCase()
        const isGlass = (mat && mat.transparent) || (mat && mat.transmission > 0) || (mat && mat.opacity < 1) ||
          matName.includes('glass') || matName.includes('vidrio') || matName.includes('cristal') ||
          meshName.includes('glass') || meshName.includes('vidrio') || meshName.includes('cristal') || meshName.includes('window')

        if (isGlass) {
          child.castShadow = false
          child.receiveShadow = true 
        } else {
          child.castShadow = true
          child.receiveShadow = true
        }
      }
    })
    // Reducir texturas de 2048 → 1024 en VRAM (no toca geometría ni física)
    downsampleTextures(scene, 1024)
  }, [scene])

  return (
    <>
      {/* El jugador nace en la posición extraída del GLB */}
      <Player spawnPosition={spawnPos} lighting={lighting} />
      
      {/* Estanque de Agua Arquitectónico */}
      {waterNode && lighting && (
        <WaterSurface 
          geometry={waterNode.geometry} 
          position={waterNode.position} 
          quaternion={waterNode.quaternion}
          scale={waterNode.scale} 
          config={lighting}
        />
      )}

      {/* Obras de Arte dinámicas colocadas automáticamente sobre cada Empty */}
      {emptyNodes.map((node, i) => {
        const artData = artCollection[i % artCollection.length]
        return (
          <Artwork 
            key={node.id} 
            position={node.position} 
            url={artData.url}
            artData={artData} 
          />
        )
      })}

      <RigidBody type="fixed" colliders="trimesh">
        <primitive object={scene} />
      </RigidBody>
    </>
  )
}

useGLTF.preload('/models/base_scene.glb')
