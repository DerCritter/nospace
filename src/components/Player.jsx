import { useFrame, useThree } from '@react-three/fiber'
import { useState, useEffect, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { RigidBody, CapsuleCollider } from '@react-three/rapier'
import { useStore } from '../store/useStore'

function usePlayerControls() {
  const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false, jump: false })
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp': setMovement(m => ({ ...m, forward: true })); break;
        case 'KeyS':
        case 'ArrowDown': setMovement(m => ({ ...m, backward: true })); break;
        case 'KeyA':
        case 'ArrowLeft': setMovement(m => ({ ...m, left: true })); break;
        case 'KeyD':
        case 'ArrowRight': setMovement(m => ({ ...m, right: true })); break;
        case 'Space': setMovement(m => ({ ...m, jump: true })); break;
      }
    }
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp': setMovement(m => ({ ...m, forward: false })); break;
        case 'KeyS':
        case 'ArrowDown': setMovement(m => ({ ...m, backward: false })); break;
        case 'KeyA':
        case 'ArrowLeft': setMovement(m => ({ ...m, left: false })); break;
        case 'KeyD':
        case 'ArrowRight': setMovement(m => ({ ...m, right: false })); break;
        case 'Space': setMovement(m => ({ ...m, jump: false })); break;
      }
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
  
  // Ref to always have fresh lighting values in useFrame
  const lightingRef = useRef(lighting)
  useEffect(() => {
    lightingRef.current = lighting
  }, [lighting])

  // Euler for manual mouse-look (YXZ order = FPS standard)
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  
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

      euler.current.setFromQuaternion(camera.quaternion)
      euler.current.y -= e.movementX * 0.002
      euler.current.x -= e.movementY * 0.002
      // Clamp pitch so you can't flip upside down
      euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x))
      camera.quaternion.setFromEuler(euler.current)
    }

    canvas.addEventListener('click', handleClick)
    document.addEventListener('mousemove', handleMouseMove)

    return () => {
      canvas.removeEventListener('click', handleClick)
      document.removeEventListener('mousemove', handleMouseMove)
    }
  }, [camera])

  // When entering inspection → release the pointer so the cursor is free for UI
  useEffect(() => {
    if (activeArt && document.pointerLockElement) {
      document.exitPointerLock()
    }
  }, [activeArt])

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

    // When pointer is locked, force R3F's raycaster to cast from screen center (the crosshair).
    // Without this, R3F raycasts from the frozen cursor position and 3D interactions break.
    if (document.pointerLockElement) {
      state.pointer.set(0, 0)
    }
    
    const position = rigidBody.current.translation()
    const currentLighting = lightingRef.current
    
    // ---- INSPECTION MODE ----
    if (activeArt && activeArt.position) {
      // Freeze player physics (keep gravity)
      rigidBody.current.setLinvel({ x: 0, y: rigidBody.current.linvel().y, z: 0 }, true)
      
      const offsetX = currentLighting?.camOffsetX ?? 0.0
      const offsetY = currentLighting?.camOffsetY ?? 1.6
      const offsetZ = currentLighting?.camOffsetZ ?? 2.0
      const lookAtX = currentLighting?.camLookAtX ?? 0.8

      dummyCamPos.set(
        activeArt.position[0] + offsetX,
        activeArt.position[1] + offsetY,
        activeArt.position[2] + offsetZ
      )
      dummyLookAt.set(
        activeArt.position[0] + lookAtX,
        activeArt.position[1] + offsetY,
        activeArt.position[2]
      )

      // Smooth camera position
      state.camera.position.lerp(dummyCamPos, delta * 3)
      
      // Smooth camera rotation (slerp)
      const currentQuat = state.camera.quaternion.clone()
      state.camera.lookAt(dummyLookAt)
      const targetQuat = state.camera.quaternion.clone()
      state.camera.quaternion.copy(currentQuat)
      state.camera.quaternion.slerp(targetQuat, delta * 3)
      
      // Lens zoom
      const targetLens = currentLighting?.inspectLens ?? 50
      const targetFov = 2 * Math.atan(12 / targetLens) * (180 / Math.PI)
      state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, delta * 4)
      state.camera.updateProjectionMatrix()
      
      return // Skip WASD movement
    }

    // ---- WALK MODE ----
    // Lens zoom back to walk lens
    const targetLens = currentLighting?.walkLens ?? 24
    const targetFov = 2 * Math.atan(12 / targetLens) * (180 / Math.PI)
    state.camera.fov = THREE.MathUtils.lerp(state.camera.fov, targetFov, delta * 4)
    state.camera.updateProjectionMatrix()

    // Anchor camera to player head
    const headPos = new THREE.Vector3(position.x, position.y + 0.8, position.z)
    state.camera.position.lerp(headPos, delta * 15)
    
    // Movement direction from camera
    state.camera.getWorldDirection(cameraDir)
    cameraDir.y = 0
    cameraDir.normalize()
    
    cameraRight.copy(cameraDir).cross(state.camera.up).normalize()
    moveDir.set(0, 0, 0)
    
    if (forward) moveDir.add(cameraDir)
    if (backward) moveDir.sub(cameraDir)
    if (right) moveDir.add(cameraRight)
    if (left) moveDir.sub(cameraRight)
    
    if (moveDir.length() > 0) {
      moveDir.normalize().multiplyScalar(speed)
    }
    
    const linvel = rigidBody.current.linvel()
    rigidBody.current.setLinvel({ x: moveDir.x, y: linvel.y, z: moveDir.z }, true)
    
    if (jump && Math.abs(linvel.y) < 0.1) {
      rigidBody.current.setLinvel({ x: linvel.x, y: 5, z: linvel.z }, true)
    }
  })

  return (
    <RigidBody 
      ref={rigidBody} 
      colliders={false} 
      mass={1} 
      type="dynamic" 
      position={spawnPosition} 
      enabledRotations={[false, false, false]} 
    >
      <CapsuleCollider args={[0.5, 0.3]} />
    </RigidBody>
  )
}
