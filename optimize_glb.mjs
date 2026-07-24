import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { dedup, prune, textureResize } from '@gltf-transform/functions';

async function optimize() {
  const io = new NodeIO();
  console.log('Loading GLB...');
  const document = await io.read('public/models/base_scene.glb');
  
  // Remove specular extensions and keep only Diffuse, Normal, Roughness (MetallicRoughness)
  const materials = document.getRoot().listMaterials();
  for (const mat of materials) {
    const specExt = mat.getExtension('KHR_materials_specular');
    if (specExt) {
      specExt.dispose();
    }
    mat.setOcclusionTexture(null);
    mat.setEmissiveTexture(null);
  }
  
  // Resize to 1024x1024 and dedup/prune unused textures
  console.log('Resizing textures to 1024x1024, deduping and pruning...');
  await document.transform(
    textureResize({ size: [1024, 1024] }),
    dedup(),
    prune()
  );
  
  console.log('Saving optimized GLB...');
  await io.write('public/models/base_scene.glb', document);
  console.log('Optimization complete!');
}

optimize().catch(console.error);
