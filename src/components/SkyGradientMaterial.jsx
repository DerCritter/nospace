import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const SkyGradientMaterial = shaderMaterial(
  {
    colorTop: new THREE.Color('#765e5e'),
    colorBottom: new THREE.Color('#ffd1d1'),
    brightness: 1.0,
  },
  // vertex shader
  `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // fragment shader
  `
    uniform vec3 colorTop;
    uniform vec3 colorBottom;
    uniform float brightness;
    varying vec2 vUv;
    void main() {
      // vUv.y va de 0 (abajo) a 1 (arriba)
      vec3 finalColor = mix(colorBottom, colorTop, vUv.y);
      gl_FragColor = vec4(finalColor * brightness, 1.0);
    }
  `
)

extend({ SkyGradientMaterial })

export { SkyGradientMaterial }
