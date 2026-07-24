import { useFrame, useThree } from '@react-three/fiber'
import { useState, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { useStore } from '../store/useStore'
import { socket } from './NetworkManager'

function usePlayerControls() {
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false, jump: false })
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isUp = e.code === 'KeyW' || e.code === 'ArrowUp' || e.key === 'ArrowUp'
      const isDown = e.code === 'KeyS' || e.code === 'ArrowDown' || e.key === 'ArrowDown'
      const isLeft = e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'ArrowLeft'
      const isRight = e.code === 'KeyD' || e.code === 'ArrowRight' || e.key === 'ArrowRight'
      const isJump = e.code === 'Space' || e.key === ' '

      if (isUp) setMovement(m => ({ ...m, forward: true }))
      if (isDown) setMovement(m => ({ ...m, backward: true }))
      if (isLeft) setMovement(m => ({ ...m, left: true }))
      if (isRight) setMovement(m => ({ ...m, right: true }))
      if (isJump) setMovement(m => ({ ...m, jump: true }))
    }
    const handleKeyUp = (e) => {
      const isUp = e.code === 'KeyW' || e.code === 'ArrowUp' || e.key === 'ArrowUp'
      const isDown = e.code === 'KeyS' || e.code === 'ArrowDown' || e.key === 'ArrowDown'
      const isLeft = e.code === 'KeyA' || e.code === 'ArrowLeft' || e.key === 'ArrowLeft'
      const isRight = e.code === 'KeyD' || e.code === 'ArrowRight' || e.key === 'ArrowRight'
      const isJump = e.code === 'Space' || e.key === ' '

      if (isUp) setMovement(m => ({ ...m, forward: false }))
      if (isDown) setMovement(m => ({ ...m, backward: false }))
      if (isLeft) setMovement(m => ({ ...m, left: false }))
      if (isRight) setMovement(m => ({ ...m, right: false }))
      if (isJump) setMovement(m => ({ ...m, jump: false }))
    }
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  return movement
}

export default function Player({ spawnPosition = [0, 2, 0], lighting }) {
  const { forward, backward, left, right, jump } = usePlayerControls()
  const activeArt = useStore((state) => state.activeArt)
  const rigidBody = useRef()
  const { camera } = useThree()
  const frameCount = useRef(0)
  const SETTLE_FRAMES = 5
  const isFirstFrame = useRef(true)
  
  // Ref to always have fresh lighting values in useFrame
  const lightingRef = useRef(lighting)
  useEffect(() => {
    lightingRef.current = lighting
  }, [lighting])

  // Pure FPS controls: Yaw (horizontal) and Pitch (vertical)
  const yaw = useRef(0)
  const pitch = useRef(0)
  
  // Independent FOV state to prevent R3F from resetting it
  const currentFov = useRef(2 * Math.atan(12 / (lighting?.walkLens ?? 24)) * (180 / Math.PI))
  
  // ---- MANUAL POINTER LOCK (replaces drei PointerLockControls) ----
  useEffect(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return

    // Click on canvas → lock pointer (only if NOT inspecting)
    const handleClick = () => {
      const art = useStore.getState().activeArt
      if (!art && !document.pointerLockElement) {
        canvas.requestPointerLock()
      }
    }

    // Mouse movement → rotate camera (only while pointer is locked)
    const handleMouseMove = (e) => {
      if (!document.pointerLockElement) return
      // Don't rotate camera if we're inspecting (useFrame handles it via slerp)
      if (useStore.getState().activeArt) return

      yaw.current -= e.movementX * 0.002
      pitch.current -= e.movementY * 0.002
      // Clamp pitch so you can't flip upside down
      pitch.current = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch.current))
      
      // Update camera immediately during pointer lock for responsive feel
      // PERO SOLO si no estamos en el viaje de regreso (isReturning),
      // ya que durante el regreso, el useFrame se encarga de hacer el slerp suavizado
      if (!isReturning.current) {
        camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      }
    }

    canvas.addEventListener('click', handleClick)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [camera])

  // When entering inspection → release pointer
  useEffect(() => {
    if (activeArt && document.pointerLockElement) {
      document.exitPointerLock()
    }
  }, [activeArt])
  
  // Track previous state to detect exact frame of transition
  const previousActiveArt = useRef(null)
  const isReturning = useRef(false)
  const lastBroadcastTime = useRef(0)

  const speed = 5
  const { moveDir, cameraDir, cameraRight, dummyCamPos, dummyLookAt } = useMemo(() => ({
    moveDir: new THREE.Vector3(),
    cameraDir: new THREE.Vector3(),
    cameraRight: new THREE.Vector3(),
    dummyCamPos: new THREE.Vector3(),
    dummyLookAt: new THREE.Vector3()
  }), [])

  useFrame((state, delta) => {
    if (!rigidBody.current) return

    // HACK: Force camera far plane update for HMR (Vite doesn't hot-reload Canvas camera props)
    if (state.camera.far !== 3000) {
      state.camera.far = 3000
      state.camera.updateProjectionMatrix()
    }

    // Clamp delta to prevent massive jumps on lag spikes (max 50ms per frame for physics/lerp)
    const safeDelta = Math.min(delta, 0.05)
    
    // Check state transitions this exact frame
    const currentActiveArt = useStore.getState().activeArt
    
    // ENTRADA a inspección
    if (!previousActiveArt.current && currentActiveArt && currentActiveArt.position) {
      const artPos = new THREE.Vector3(...currentActiveArt.position)
      const headPos = new THREE.Vector3(rigidBody.current.translation().x, rigidBody.current.translation().y + 0.8, rigidBody.current.translation().z)
      
      // 1. Vector desde la obra hacia el jugador (en el plano XZ para evitar picados/contrapicados extremos)
      const toPlayer = new THREE.Vector3().subVectors(headPos, artPos)
      toPlayer.y = 0 
      // Si por algún milagro están exactamente encima, prevenir error matemático
      if (toPlayer.lengthSq() < 0.001) toPlayer.set(0, 0, 1)
      toPlayer.normalize()
      
      // 2. Vector "derecho" relativo a la vista del jugador (para desplazar el encuadre)
      const up = new THREE.Vector3(0, 1, 0)
      const right = new THREE.Vector3().crossVectors(up, toPlayer).normalize()

      const offsetX = lightingRef.current?.camOffsetX ?? 0.0
      const offsetY = lightingRef.current?.camOffsetY ?? 1.6
      const offsetZ = lightingRef.current?.camOffsetZ ?? 2.0
      const lookAtX = lightingRef.current?.camLookAtX ?? 0.8

      // 3. Posición 360º: Obra + (Acercamiento * toPlayer) + (Desplazamiento Lateral * right)
      dummyCamPos.copy(artPos)
        .addScaledVector(toPlayer, offsetZ)
        .addScaledVector(right, offsetX)
      dummyCamPos.y = artPos.y + offsetY

      // 4. Foco 360º: Obra + (Desplazamiento Lateral * right)
      dummyLookAt.copy(artPos)
        .addScaledVector(right, lookAtX)
      dummyLookAt.y = artPos.y + offsetY
    }
    
    // SALIDA de inspección
    if (previousActiveArt.current && !currentActiveArt) {
      isReturning.current = true // Empieza el viaje de vuelta al cuerpo
    }
    previousActiveArt.current = currentActiveArt

    // When pointer is locked, force R3F's raycaster to cast from screen center (the crosshair).
    // Without this, R3F raycasts from the frozen cursor position and 3D interactions break.
    if (document.pointerLockElement) {
      state.pointer.set(0, 0)
    }
    
    const position = rigidBody.current.translation()
    const currentLighting = lightingRef.current
    
    // Hold player strictly in place (kinematic) for a few frames while Rapier builds the complex trimesh floor
    frameCount.current++
    if (frameCount.current <= SETTLE_FRAMES) {
      rigidBody.current.setTranslation(
        { x: spawnPosition[0], y: spawnPosition[1], z: spawnPosition[2] }, true
      )
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      // Lock camera to head instantly
      const headPos = new THREE.Vector3(spawnPosition[0], spawnPosition[1] + 0.8, spawnPosition[2])
      state.camera.position.copy(headPos)
      state.camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      return
    }
    
    // Exact moment to release the player to normal physics
    if (frameCount.current === SETTLE_FRAMES + 1) {
      rigidBody.current.setBodyType(0, true) // 0 = Dynamic
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }
    
    // Keep camera snapped for just 2 more frames to hide any sub-millimeter physics stabilization
    if (frameCount.current <= SETTLE_FRAMES + 2) {
      const pos = rigidBody.current.translation()
      const headPos = new THREE.Vector3(pos.x, pos.y + 0.8, pos.z)
      state.camera.position.copy(headPos)
      state.camera.quaternion.setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
    }
    
    // Safety respawn: if player falls below the map, teleport back up
    if (position.y < -10) {
      rigidBody.current.setTranslation({ x: spawnPosition[0], y: spawnPosition[1] + 3, z: spawnPosition[2] }, true)
      rigidBody.current.setLinvel({ x: 0, y: 0, z: 0 }, true)
      return
    }
    
    // ---- INSPECTION MODE ----
    // ALWAYS use currentActiveArt from Zustand to avoid 1-frame closure staleness bugs!
    if (currentActiveArt && currentActiveArt.position) {
      // Freeze player physics (keep gravity)
      rigidBody.current.setLinvel({ x: 0, y: rigidBody.current.linvel().y, z: 0 }, true)
      
      // Las coordenadas relativas de dummyCamPos y dummyLookAt ya fueron calculadas
      // 1 sola vez en el instante en el que se hizo clic (bloque superior), 
      // para evitar que la cámara persiga errores si el jugador cae o algo se mueve.

      // Reset returning state if they click another art piece while returning
      isReturning.current = false
      
      // Movimientos súper suaves para inspección (ralentizados a petición)
      state.camera.position.lerp(dummyCamPos, safeDelta * 1.5)
      
      const currentQuat = state.camera.quaternion.clone()
      state.camera.lookAt(dummyLookAt)
      const targetQuat = state.camera.quaternion.clone()
      state.camera.quaternion.copy(currentQuat)
      state.camera.quaternion.slerp(targetQuat, safeDelta * 1.5)
      
      const targetLens = currentLighting?.inspectLens ?? 50
      const targetFov = 2 * Math.atan(12 / targetLens) * (180 / Math.PI)
      currentFov.current = THREE.MathUtils.lerp(currentFov.current, targetFov, safeDelta * 1.5)
      state.camera.fov = currentFov.current
      state.camera.updateProjectionMatrix()
      
      return // Skip WASD movement
    }

    // ---- WALK MODE ----
    // Lens zoom back to walk lens
    const targetLens = currentLighting?.walkLens ?? 24
    const targetFov = 2 * Math.atan(12 / targetLens) * (180 / Math.PI)
    
    // Si estamos en los primeros frames, setear el FOV de golpe para evitar el efecto de zoom inicial
    if (frameCount.current <= SETTLE_FRAMES) {
      currentFov.current = targetFov
      state.camera.fov = currentFov.current
    } else {
      // Suave al salir de inspección (muy lento para evitar saltos)
      currentFov.current = THREE.MathUtils.lerp(currentFov.current, targetFov, safeDelta * 1.5)
      state.camera.fov = currentFov.current
    }
    state.camera.updateProjectionMatrix()

    // Anchor camera to player head
    const headPos = new THREE.Vector3(position.x, position.y + 0.8, position.z)
    
    if (isReturning.current) {
      const dist = state.camera.position.distanceTo(headPos)
      // Acelerar el lerp al final para evitar la tortuga matemática (Zeno's paradox) y hacer un aterrizaje perfecto
      const returnSpeed = dist < 0.5 ? safeDelta * 6 : safeDelta * 3
      
      // Viaje suave de regreso al cuerpo
      state.camera.position.lerp(headPos, returnSpeed)
      
      // Mientas vuela de vuelta, hacemos slerp (interpolación esférica) suavemente 
      // hacia donde el jugador esté apuntando con su ratón. 
      // Esto da control inmediato, sin saltos violentos.
      const targetWalkQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      state.camera.quaternion.slerp(targetWalkQuat, returnSpeed)
      
      // Umbral microscópico (5 milímetros) para apagar la cinemática
      if (dist < 0.005) {
        isReturning.current = false
      }
    } else {
      // Modo caminar normal (1:1 instantáneo, inmune a lag spikes)
      state.camera.position.copy(headPos)
      const targetWalkQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch.current, yaw.current, 0, 'YXZ'))
      state.camera.quaternion.copy(targetWalkQuat)
    }
    
    // Movement direction from camera
    state.camera.getWorldDirection(cameraDir)
    cameraDir.y = 0
    cameraDir.normalize()
    
    cameraRight.copy(cameraDir).cross(state.camera.up).normalize()
    moveDir.set(0, 0, 0)
    
    // Bloquear el movimiento WASD mientras la cámara viaja de vuelta al cuerpo.
    // Si no bloqueamos esto, el jugador podría alejarse caminando más rápido de lo que la cámara
    // puede acercarse, dejando la cámara atascada permanentemente en el modo "viaje de vuelta" (isReturning = true).
    if (!isReturning.current) {
      if (forward) moveDir.add(cameraDir)
      if (backward) moveDir.sub(cameraDir)
      if (right) moveDir.add(cameraRight)
      if (left) moveDir.sub(cameraRight)
    }
    
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(speed)
    }
    
    const linvel = rigidBody.current.linvel()
    rigidBody.current.setLinvel({ x: moveDir.x, y: linvel.y, z: moveDir.z }, true)
    
    if (jump && Math.abs(linvel.y) < 0.1) {
      rigidBody.current.setLinvel({ x: linvel.x, y: 5, z: linvel.z }, true)
    }
    
    // MULTIPLAYER BROADCAST (15 times per second to save bandwidth)
    if (socket && state.clock.elapsedTime - lastBroadcastTime.current > 1 / 15) {
      socket.emit('playerMove', {
        position: [position.x, position.y, position.z],
        rotation: [pitch.current, yaw.current, 0]
      })
      lastBroadcastTime.current = state.clock.elapsedTime
    }
  })

  return (
    <RigidBody 
      ref={rigidBody} 
      colliders={false} 
      mass={1} 
      type="kinematicPosition" 
      position={spawnPosition} 
      enabledRotations={[false, false, false]} 
    >
      <CapsuleCollider args={[0.5, 0.3]} />
    </RigidBody>
  )
}
