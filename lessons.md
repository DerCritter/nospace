# Lessons Learned & Best Practices

Este documento contiene los aprendizajes técnicos críticos descubiertos durante el desarrollo del proyecto, para evitar regresiones y errores comunes.

## 1. React Three Fiber: Props Reactivas en `<Canvas>`
**Problema:** Pasar objetos inline (ej. `camera={{ position: [0, 1.6, 4] }}`) al `<Canvas>` causa que R3F intercepte la cámara y sobreescriba su posición/estado si el componente padre hace un re-render.
**Consecuencia:** La cámara se teletransporta por 1 fotograma a la posición de inicio, rompiendo los lerps activos y causando un "salto" y un destello de luz incontrolable (flashazo).
**Solución:** Siempre extraer el objeto de configuración (`CAMERA_CONFIG`) fuera del componente funcional para que su referencia de memoria sea estática y nunca dispare la reactividad interna de R3F.

## 2. Picos de Lag (Lag Spikes) y Lerp (`delta`)
**Problema:** Al usar `THREE.MathUtils.lerp(current, target, delta * speed)`, un pico de lag en el navegador (ej. por montar un componente pesado como el HUD con imágenes) hace que `delta` sea enorme (ej. 150ms).
**Consecuencia:** Al multiplicar un delta gigante por la velocidad, el factor de interpolación supera a 1, haciendo que la cámara o la luz "salten" o se teletransporten instantáneamente al destino, arruinando la suavidad.
**Solución:** Siempre hacer un *clamp* (limitar) el `delta` a un máximo seguro antes de usarlo en simulaciones o interpolaciones:
`const safeDelta = Math.min(delta, 0.05)` (Limita el delta a máximo 50ms por frame).

## 3. Gimbal Lock al Extraer Ángulos Euler
**Problema:** Al intentar sincronizar la cámara libre (Pitch/Yaw) con la orientación actual del quaternion de la cámara (`camera.quaternion`) usando `setFromQuaternion(..., 'YXZ')`, Three.js puede devolver una representación matemática "al revés" (ej. Pitch de 180º).
**Consecuencia:** Dado que en un FPS el Pitch está limitado matemáticamente (clamp) entre -90º y 90º, al mover el ratón un píxel, el sistema detecta que estás "boca abajo" y corrige violentamente la rotación, rompiéndote el cuello (salto de 90º o 180º).
**Solución:** Nunca extraer Euler de un Quaternion para controles FPS. En su lugar, extraer el **vector de dirección (forward vector)** aplicando el quaternion a un vector `(0, 0, -1)`, y calcular el Yaw y Pitch puramente con trigonometría, recordando que en Three.js el vector frontal es `-Z`:
`yaw = Math.atan2(-dir.x, -dir.z)`
`pitch = Math.asin(dir.y)`
Esto garantiza ángulos matemáticamente puros dentro de los límites humanos.

## 4. Re-renders Globales y Post-Procesamiento
**Problema:** Incluir lógica dependiente del estado (como el `target` del `DepthOfField`) directamente dentro de `App.jsx` causaba que TODA la aplicación (incluyendo físicas y galería) sufriera un ciclo de reconciliación en React al interactuar.
**Consecuencia:** Generaba caídas de fotogramas masivas al abrir el HUD.
**Solución:** Aislar los efectos de post-procesamiento en un componente hijo (`<PostProcessing />`) que se suscriba independientemente al estado (`useStore`), de manera que `App.jsx` nunca se vuelva a renderizar tras montarse.

## 5. FOV (Field of View) Independiente
**Problema:** Leer `state.camera.fov` frame a frame para hacer un lerp puede fallar si R3F decide sincronizar la cámara con sus configuraciones internas.
**Solución:** Usar un `useRef` dedicado (`currentFov`) como la única fuente de la verdad para animaciones de lente, y forzar matemáticamente `state.camera.fov = currentFov.current` en cada frame para tener autoridad absoluta sobre el hardware.

## 6. Stale Closures (Clausuras Obsoletas) en `useFrame`
**Problema:** Leer variables de estado (ej. `activeArt`) directamente desde el closure del componente funcional dentro del hook `useFrame` puede causar bugs de estado fantasma durante las transiciones de re-render de React.
**Consecuencia:** Durante 1 fotograma, el código ejecuta lógicas opuestas (ej. activa una transición de salida e inmediatamente la aborta porque la variable antigua dice que sigues interactuando).
**Solución:** Dentro de `useFrame`, nunca depender del estado mapeado en la raíz del componente. Usar siempre llamadas síncronas a la tienda: `useStore.getState().variable` para garantizar la fuente de la verdad en milisegundos.

## 7. Tracking Cinematográfico y la Paradoja de Zenón
**Problema:** Al mover la cámara físicamente hacia atrás sin actualizar su rotación, el sujeto (la obra de arte) se desliza fuera del campo de visión (efecto de paralaje). Además, terminar un lerp a 5cm de distancia causa un salto (pop) al devolver el control al jugador, pero usar un umbral microscópico hace que el lerp tarde horas en terminar (Zeno's paradox).
**Solución:** 
1. **Tracking dinámico:** Durante todo el viaje de vuelta, la cámara debe aplicar `lookAt(sujeto)` continuamente, y solo al tocar el cuerpo del jugador debe extraer los ángulos Yaw/Pitch finales para entregarle el mando.
2. **Acelerador de Lerp:** Reducir el umbral de corte a proporciones microscópicas (5 milímetros) pero duplicar la velocidad de interpolación (ej. de `x3` a `x6`) cuando la cámara entra en el último medio metro. Esto rompe la paradoja matemática y asegura un aterrizaje veloz e imperceptible.

## 8. Peligros Ocultos de `SphereGeometry` y Clipping
**Problema:** Declarar `<sphereGeometry args={[32, 32]} />` en Three.js asigna un radio base de 32 (los argumentos son `[radio, segmentosAncho, segmentosAlto]`). Al aplicarle un `scale={1500}`, la esfera resultante tiene un radio masivo de 48,000 unidades.
**Consecuencia:** Si el `camera.far` de la escena es de 3000 unidades, la esfera queda 100% cortada por el plano de renderizado (Clipping Plane) y se vuelve completamente invisible, dejando al descubierto el color de fondo HTML y causando horas de debug erróneo sobre materiales y shaders.
**Solución:** Siempre declarar el radio explícitamente en geometrías base que van a ser escaladas brutalmente: `<sphereGeometry args={[1, 32, 32]} />` para que el `scale` sea 1:1 con las unidades del mundo.

## 9. Reflection Probes (HDRI Dinámico) Eficientes
**Problema:** Usar un `CubeCamera` para generar un mapa de entorno dinámico (HDRI) a tiempo real dispara 6 renders de la escena por fotograma, destruyendo los FPS en navegadores y gráficas modestas.
**Solución:** Extraer el control del `CubeCamera` del render loop constante. Utilizar un sistema de caché de variables lumínicas (`lastProbeUpdate`) en el `useFrame` para detectar exactamente si el usuario modificó algún color o posición del sol. Si detecta un cambio, dispara la toma fotográfica esférica 1 única vez, y luego apaga la cámara, garantizando que el coste de rendimiento al caminar por la sala sea 0 absoluto mientras se disfrutan reflejos 100% precisos en los materiales metálicos.
