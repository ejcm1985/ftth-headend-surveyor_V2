// src/dbLocal.js
import Dexie from 'dexie';

export const dbLocal = new Dexie('HeadendSurveyorDB');

// Subimos a versión 2 para agregar la tabla de infraestructura
dbLocal.version(2).stores({
  headends: 'id, nombre, codigo, direccion, sincronizado',
  racks: 'id, headend_id, nombre_rack, total_u, sincronizado',
  rack_equipos: 'id, rack_id, posicion_u_inicio, nombre_equipo, sincronizado',
  catalogo: 'id, nombre, tipo, unidades_u',
  infraestructura: 'id, headend_id, tipo, sincronizado'
});

dbLocal.on('populate', () => {
  dbLocal.catalogo.bulkAdd([
    { id: '1', nombre: 'Fiber Home', tipo: 'OLT', unidades_u: 6, descripcion_default: 'Chasis 6U, 7 slots de servicio' },
    { id: '2', nombre: 'Fiber Home', tipo: 'OLT', unidades_u: 11, descripcion_default: 'Chasis 11U, 17 slots de servicio' },
    { id: '3', nombre: 'ODF 48 Hilos SC/APC', tipo: 'ODF', unidades_u: 1, descripcion_default: 'Bandeja de distribución 48 puertos' },
    { id: '4', nombre: 'ODF 96 Hilos SC/APC', tipo: 'ODF', unidades_u: 2, descripcion_default: 'Bandeja de distribución 96 puertos' },
    { id: '5', nombre: 'Switch Core Cisco 3850', tipo: 'Switch', unidades_u: 1, descripcion_default: '24 puertos SFP+' },
    { id: '6', nombre: 'EDFA Optronics 1550nm', tipo: 'EDFA', unidades_u: 2, descripcion_default: '16 puertos ópticos +20dBm' }
  ]);
});
