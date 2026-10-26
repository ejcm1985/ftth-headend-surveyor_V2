// src/dbLocal.js
import Dexie from 'dexie';

export const dbLocal = new Dexie('HeadendSurveyorDB');

dbLocal.version(1).stores({
  headends: 'id, nombre, codigo, direccion, sincronizado',
  racks: 'id, headend_id, nombre_rack, total_u, sincronizado',
  rack_equipos: 'id, rack_id, posicion_u_inicio, nombre_equipo, sincronizado',
  catalogo: 'id, nombre, tipo, unidades_u'
});

// Precargar datos iniciales del catálogo si está vacío
dbLocal.on('populate', () => {
  dbLocal.catalogo.bulkAdd([
    { id: '1', nombre: 'Huawei MA5800-X7', tipo: 'OLT', unidades_u: 6, descripcion_default: 'Chasis 6U, 7 slots de servicio' },
    { id: '2', nombre: 'Huawei MA5800-X17', tipo: 'OLT', unidades_u: 11, descripcion_default: 'Chasis 11U, 17 slots de servicio' },
    { id: '3', nombre: 'ODF 48 Hilos SC/APC', tipo: 'ODF', unidades_u: 1, descripcion_default: 'Bandeja de distribución 48 puertos' },
    { id: '4', nombre: 'ODF 96 Hilos SC/APC', tipo: 'ODF', unidades_u: 2, descripcion_default: 'Bandeja de distribución 96 puertos' },
    { id: '5', nombre: 'Switch Agregación Cisco 3850', tipo: 'Switch', unidades_u: 1, descripcion_default: '24 puertos SFP+' },
    { id: '6', nombre: 'Rectificador Emerson / Vertiv', tipo: 'Energía', unidades_u: 3, descripcion_default: 'Planta de fuerza DC -48V' }
  ]);
});