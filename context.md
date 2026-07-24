# Project Context: Virtual Art Gallery

## Descripción General
Galería de arte virtual 3D interactiva construida con **React**, **Three.js** (React Three Fiber) y física con **Rapier**.
El jugador navega en primera persona (FPS) y puede interactuar con las obras de arte para entrar en un modo de inspección cinematográfica.

## Arquitectura de Estado
- **Zustand (`useStore.js`)**: Maneja el estado global, principalmente `activeArt` (la obra de arte que se está inspeccionando actualmente).

## Componentes Clave
1. **`App.jsx`**: Punto de entrada. Contiene el `<Canvas>`, la UI de controles Leva, el `HUD`, y aisla el `PostProcessing` para evitar re-renders masivos.
2. **`Player.jsx`**: Motor de movimiento FPS y física. Controla la cámara. Gestiona la transición suave entre el modo de caminata (libre, yaw/pitch puro) y el modo inspección (`lookAt` y lerp).
3. **`Gallery.jsx`**: Carga el modelo GLTF base del entorno, configura la colisión estática y renderiza la colección de `Artwork`.
4. **`Artwork.jsx`**: Contenedor de cada obra individual. Carga los modelos, genera un hitbox invisible interactivo y muestra el cartel "INTERACT" dinámico en el espacio 3D.
5. **`CinematicLighting.jsx`**: Sistema de iluminación procedural y reactivo. Se adapta suavemente (dimming, spotlights) dependiendo de si el usuario está inspeccionando una obra o caminando.
6. **`HUD.jsx`**: Interfaz 2D superpuesta (HTML puro sobre el canvas). Muestra la información de la obra, galería de imágenes y botones de interacción. Maneja sus propias transiciones CSS (`opacity`).

## Flujo de Interacción
1. Jugador camina (WASD) -> Pointer Lock activado.
2. Jugador hace clic en una obra (INTERACT) -> `activeArt` se establece en Zustand.
3. El Pointer Lock se libera, la cámara lerpea hacia una posición fija frente a la obra y el FOV hace zoom (35/50mm).
4. El `HUD` aparece suavemente (CSS transition).
5. Las luces de entorno bajan su intensidad (Dim) y un spotlight apunta a la obra (`CinematicLighting.jsx`).
6. El jugador hace clic en EXIT -> `activeArt` es null.
7. La cámara extrae suavemente el ángulo de visión actual (vía vectores direccionales) y regresa al modo libre, mientras el HUD desaparece.
