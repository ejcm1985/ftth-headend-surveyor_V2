// src/syncService.js
import { supabase } from './supabase';
import { dbLocal } from './dbLocal';

// Convertir base64 a archivo Blob para subirlo a Supabase Storage
function base64ToBlob(base64Data, contentType = 'image/jpeg') {
  const byteCharacters = atob(base64Data.split(',')[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    byteArrays.push(new Uint8Array(byteNumbers));
  }
  return new Blob(byteArrays, { type: contentType });
}

// Subir una foto individual a Supabase Storage y retornar su URL pública
async function subirFotoAStorage(fotoBase64, rutaArchivo) {
  if (!fotoBase64 || !fotoBase64.startsWith('data:image')) {
    return fotoBase64; // Si ya es una URL web o está vacía, no hace nada
  }

  try {
    const blob = base64ToBlob(fotoBase64);
    const nombreUnico = `${rutaArchivo}_${Date.now()}.jpg`;

    const { error: errorSubida } = await supabase.storage
      .from('headend-photos')
      .upload(nombreUnico, blob, { contentType: 'image/jpeg', upsert: true });

    if (errorSubida) throw errorSubida;

    const { data } = supabase.storage.from('headend-photos').getPublicUrl(nombreUnico);
    return data.publicUrl;
  } catch (err) {
    console.error(`Error subiendo foto ${rutaArchivo}:`, err);
    return fotoBase64; // Fallback: mantiene la local si falla
  }
}

// FUNCIÓN PRINCIPAL DE SINCRONIZACIÓN COMPLETA
export async function sincronizarConSupabase(onProgreso) {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Revisa las variables en .env');
  }

  onProgreso('Subiendo cabeceras a la nube...');
  const headendsLocales = await dbLocal.headends.toArray();
  for (const he of headendsLocales) {
    await supabase.from('headends').upsert({
      id: he.id,
      nombre: he.nombre,
      codigo: he.codigo,
      direccion: he.direccion
    });
  }

  onProgreso('Subiendo bastidores y fotos...');
  const racksLocales = await dbLocal.racks.toArray();
  for (const rk of racksLocales) {
    let fotoUrl = rk.foto_frontal;
    if (fotoUrl && fotoUrl.startsWith('data:image')) {
      fotoUrl = await subirFotoAStorage(fotoUrl, `racks/${rk.id}`);
      await dbLocal.racks.update(rk.id, { foto_frontal: fotoUrl });
    }
    await supabase.from('racks').upsert({
      id: rk.id,
      headend_id: rk.headend_id,
      nombre_rack: rk.nombre_rack,
      total_u: rk.total_u,
      foto_frontal: fotoUrl
    });
  }

  onProgreso('Subiendo equipos instalados...');
  const equiposLocales = await dbLocal.rack_equipos.toArray();
  for (const eq of equiposLocales) {
    let fotoUrl = eq.foto_url;
    if (fotoUrl && fotoUrl.startsWith('data:image')) {
      fotoUrl = await subirFotoAStorage(fotoUrl, `equipos/${eq.id}`);
      await dbLocal.rack_equipos.update(eq.id, { foto_url: fotoUrl });
    }
    await supabase.from('rack_equipos').upsert({
      id: eq.id,
      rack_id: eq.rack_id,
      posicion_u_inicio: eq.posicion_u_inicio,
      unidades_ocupadas: eq.unidades_ocupadas,
      nombre_equipo: eq.nombre_equipo,
      tipo: eq.tipo,
      descripcion: eq.descripcion,
      foto_url: fotoUrl
    });
  }

  onProgreso('Subiendo equipos de infraestructura y sus fotos...');
  const infraLocales = await dbLocal.infraestructura.toArray();
  for (const inf of infraLocales) {
    const fotosActualizadas = { ...(inf.fotos || {}) };
    for (const [nombreFoto, b64] of Object.entries(fotosActualizadas)) {
      if (b64 && b64.startsWith('data:image')) {
        const urlPublica = await subirFotoAStorage(b64, `infra/${inf.id}_${nombreFoto}`);
        fotosActualizadas[nombreFoto] = urlPublica;
      }
    }
    await dbLocal.infraestructura.update(inf.id, { fotos: fotosActualizadas });

    await supabase.from('infraestructura').upsert({
      id: inf.id,
      headend_id: inf.headend_id,
      tipo: inf.tipo,
      datos: inf.datos,
      fotos: fotosActualizadas
    });
  }

  onProgreso('Sincronizando catálogo...');
  const catalogoLocal = await dbLocal.catalogo.toArray();
  for (const cat of catalogoLocal) {
    await supabase.from('catalogo_equipos').upsert({
      id: cat.id,
      nombre: cat.nombre,
      tipo: cat.tipo,
      unidades_u: cat.unidades_u,
      descripcion_default: cat.descripcion_default
    });
  }

  // DESCARGAR DATOS DE LA NUBE A LOCAL (Para sincronizar varios teléfonos)
  onProgreso('Descargando cambios de la nube...');
  const { data: heCloud } = await supabase.from('headends').select('*');
  if (heCloud) await dbLocal.headends.bulkPut(heCloud);

  const { data: rkCloud } = await supabase.from('racks').select('*');
  if (rkCloud) await dbLocal.racks.bulkPut(rkCloud);

  const { data: eqCloud } = await supabase.from('rack_equipos').select('*');
  if (eqCloud) await dbLocal.rack_equipos.bulkPut(eqCloud);

  const { data: infCloud } = await supabase.from('infraestructura').select('*');
  if (infCloud) await dbLocal.infraestructura.bulkPut(infCloud);

  onProgreso('¡Sincronización completada con éxito!');
}
