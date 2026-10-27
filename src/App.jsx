import React, { useState, useEffect } from 'react';
import { dbLocal } from './dbLocal';
import { 
  Server, HardDrive, Plus, Camera, FileText, Download, 
  Wifi, WifiOff, ArrowLeft, Trash2, Edit2, BookOpen, Layers, 
  Zap, Wind, ShieldCheck, BatteryCharging, Power
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const TIPOS_EQUIPO_RACK = ['OLT', 'ODF', 'Switch', 'EDFA', 'Chasis', 'Energía', 'Otro'];

const TIPOS_INFRA = [
  'Tablero Eléctrico',
  'Termostato',
  'Aire Acondicionado',
  'Barra MGB',
  'Sistema de Energía',
  'UPS',
  'Banco de Baterías',
  'Inversor'
];

// Compresión nativa optimizada para móviles
const comprimirFoto = (file, maxDimension = 1200, calidad = 0.75) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', calidad));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

export default function App() {
  const [online, setOnline] = useState(navigator.onLine);
  const [vista, setVista] = useState('headends');
  const [subPestanaCabecera, setSubPestanaCabecera] = useState('racks'); // 'racks' | 'infra'

  const [headends, setHeadends] = useState([]);
  const [headendActual, setHeadendActual] = useState(null);
  const [racks, setRacks] = useState([]);
  const [rackActual, setRackActual] = useState(null);
  const [equipos, setEquipos] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [infraestructuras, setInfraestructuras] = useState([]);

  // Modales
  const [modalHeadend, setModalHeadend] = useState(false);
  const [modalRack, setModalRack] = useState(false);
  const [modalEquipo, setModalEquipo] = useState(false);
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [modalInfra, setModalInfra] = useState(false);

  const [uSeleccionada, setUSeleccionada] = useState(1);
  const [equipoEditandoCatalogo, setEquipoEditandoCatalogo] = useState(null);
  const [rackEditando, setRackEditando] = useState(null);
  const [headendEditando, setHeadendEditando] = useState(null);
  const [infraEditando, setInfraEditando] = useState(null);
  const [procesandoFoto, setProcesandoFoto] = useState(false);

  // Formularios
  const [formHeadend, setFormHeadend] = useState({ nombre: '', codigo: '', direccion: '' });
  const [formRack, setFormRack] = useState({ nombre_rack: 'RACK-01', total_u: 42, foto_frontal: null });
  const [formEquipo, setFormEquipo] = useState({
    nombre_equipo: '', tipo: 'OLT', unidades_ocupadas: 1, descripcion: '', foto: null
  });
  const [formCatalogo, setFormCatalogo] = useState({
    nombre: '', tipo: 'OLT', unidades_u: 1, descripcion_default: ''
  });

  // Formulario flexible de Infraestructura
  const [tipoInfraSeleccionado, setTipoInfraSeleccionado] = useState(TIPOS_INFRA[0]);
  const [formInfra, setFormInfra] = useState({});
  const [fotosInfra, setFotosInfra] = useState({});

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    cargarDatosLocales();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cargarDatosLocales = async () => {
    const heList = await dbLocal.headends.toArray();
    setHeadends(heList);
    const catList = await dbLocal.catalogo.toArray();
    setCatalogo(catList);
  };

  const seleccionarHeadend = async (he) => {
    setHeadendActual(he);
    const rackList = await dbLocal.racks.where('headend_id').equals(he.id).toArray();
    setRacks(rackList);
    const infraList = await dbLocal.infraestructura.where('headend_id').equals(he.id).toArray();
    setInfraestructuras(infraList);
    setVista('racks');
    setSubPestanaCabecera('racks');
  };

  const seleccionarRack = async (rk) => {
    setRackActual(rk);
    const eqList = await dbLocal.rack_equipos.where('rack_id').equals(rk.id).toArray();
    setEquipos(eqList);
    setVista('rack-detail');
  };

  const manejarFotoGenerica = async (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setProcesandoFoto(true);
        const fotoComprimida = await comprimirFoto(file, 1200, 0.75);
        callback(fotoComprimida);
      } catch (err) {
        console.error("Error al procesar foto:", err);
      } finally {
        setProcesandoFoto(false);
      }
    }
  };

  // --- CRUD CABECERAS ---
  const abrirModalCrearHeadend = () => {
    setHeadendEditando(null);
    setFormHeadend({ nombre: '', codigo: '', direccion: '' });
    setModalHeadend(true);
  };

  const abrirModalEditarHeadend = (he, e) => {
    e.stopPropagation();
    setHeadendEditando(he);
    setFormHeadend({ nombre: he.nombre, codigo: he.codigo, direccion: he.direccion || '' });
    setModalHeadend(true);
  };

  const eliminarHeadend = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar esta cabecera completa? Se eliminarán todos sus racks, equipos e infraestructura.')) {
      const racksAsociados = await dbLocal.racks.where('headend_id').equals(id).toArray();
      for (const rk of racksAsociados) {
        await dbLocal.rack_equipos.where('rack_id').equals(rk.id).delete();
      }
      await dbLocal.racks.where('headend_id').equals(id).delete();
      await dbLocal.infraestructura.where('headend_id').equals(id).delete();
      await dbLocal.headends.delete(id);
      setHeadends(headends.filter(h => h.id !== id));
    }
  };

  const guardarHeadend = async (e) => {
    e.preventDefault();
    if (headendEditando) {
      const datosActualizados = {
        nombre: formHeadend.nombre,
        codigo: formHeadend.codigo,
        direccion: formHeadend.direccion,
        sincronizado: false
      };
      await dbLocal.headends.update(headendEditando.id, datosActualizados);
      setHeadends(headends.map(h => (h.id === headendEditando.id ? { ...h, ...datosActualizados } : h)));
    } else {
      const nuevo = { id: crypto.randomUUID(), ...formHeadend, sincronizado: false };
      await dbLocal.headends.add(nuevo);
      setHeadends([...headends, nuevo]);
    }
    setModalHeadend(false);
    setHeadendEditando(null);
  };

  // --- CRUD RACKS ---
  const abrirModalCrearRack = () => {
    setRackEditando(null);
    setFormRack({ nombre_rack: `RACK-0${racks.length + 1}`, total_u: 42, foto_frontal: null });
    setModalRack(true);
  };

  const abrirModalEditarRack = (rk, e) => {
    e.stopPropagation();
    setRackEditando(rk);
    setFormRack({
      nombre_rack: rk.nombre_rack,
      total_u: rk.total_u,
      foto_frontal: rk.foto_frontal || null
    });
    setModalRack(true);
  };

  const eliminarRack = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('¿Seguro que deseas eliminar este rack y sus equipos asociados?')) {
      await dbLocal.racks.delete(id);
      await dbLocal.rack_equipos.where('rack_id').equals(id).delete();
      setRacks(racks.filter(r => r.id !== id));
    }
  };

  const guardarRack = async (e) => {
    e.preventDefault();
    if (rackEditando) {
      const datosActualizados = {
        nombre_rack: formRack.nombre_rack,
        total_u: parseInt(formRack.total_u),
        foto_frontal: formRack.foto_frontal,
        sincronizado: false
      };
      await dbLocal.racks.update(rackEditando.id, datosActualizados);
      setRacks(racks.map(r => r.id === rackEditando.id ? { ...r, ...datosActualizados } : r));
    } else {
      const nuevo = {
        id: crypto.randomUUID(),
        headend_id: headendActual.id,
        nombre_rack: formRack.nombre_rack,
        total_u: parseInt(formRack.total_u),
        foto_frontal: formRack.foto_frontal,
        sincronizado: false
      };
      await dbLocal.racks.add(nuevo);
      setRacks([...racks, nuevo]);
    }
    setModalRack(false);
    setRackEditando(null);
  };

  // --- CRUD EQUIPOS EN RACK ---
  const guardarEquipo = async (e) => {
    e.preventDefault();
    const nuevo = {
      id: crypto.randomUUID(),
      rack_id: rackActual.id,
      posicion_u_inicio: uSeleccionada,
      nombre_equipo: formEquipo.nombre_equipo,
      tipo: formEquipo.tipo,
      unidades_ocupadas: parseInt(formEquipo.unidades_ocupadas),
      descripcion: formEquipo.descripcion,
      foto_url: formEquipo.foto,
      sincronizado: false
    };
    await dbLocal.rack_equipos.add(nuevo);
    setEquipos([...equipos, nuevo]);
    setModalEquipo(false);
    setFormEquipo({ nombre_equipo: '', tipo: 'OLT', unidades_ocupadas: 1, descripcion: '', foto: null });
  };

  const eliminarEquipoDeRack = async (id) => {
    if (window.confirm('¿Deseas quitar este equipo del bastidor?')) {
      await dbLocal.rack_equipos.delete(id);
      setEquipos(equipos.filter(eq => eq.id !== id));
    }
  };

  // --- CRUD INFRAESTRUCTURA ---
  const abrirModalCrearInfra = () => {
    setInfraEditando(null);
    setTipoInfraSeleccionado(TIPOS_INFRA[0]);
    setFormInfra({});
    setFotosInfra({});
    setModalInfra(true);
  };

  const abrirModalEditarInfra = (item) => {
    setInfraEditando(item);
    setTipoInfraSeleccionado(item.tipo);
    setFormInfra(item.datos || {});
    setFotosInfra(item.fotos || {});
    setModalInfra(true);
  };

  const eliminarInfra = async (id) => {
    if (window.confirm('¿Deseas eliminar este registro de infraestructura?')) {
      await dbLocal.infraestructura.delete(id);
      setInfraestructuras(infraestructuras.filter(inf => inf.id !== id));
    }
  };

  const guardarInfra = async (e) => {
    e.preventDefault();
    if (infraEditando) {
      const actualizado = {
        tipo: tipoInfraSeleccionado,
        datos: formInfra,
        fotos: fotosInfra,
        sincronizado: false
      };
      await dbLocal.infraestructura.update(infraEditando.id, actualizado);
      setInfraestructuras(infraestructuras.map(inf => inf.id === infraEditando.id ? { ...inf, ...actualizado } : inf));
    } else {
      const nuevo = {
        id: crypto.randomUUID(),
        headend_id: headendActual.id,
        tipo: tipoInfraSeleccionado,
        datos: formInfra,
        fotos: fotosInfra,
        sincronizado: false
      };
      await dbLocal.infraestructura.add(nuevo);
      setInfraestructuras([...infraestructuras, nuevo]);
    }
    setModalInfra(false);
    setInfraEditando(null);
    setFormInfra({});
    setFotosInfra({});
  };

  // --- CATÁLOGO CRUD ---
  const abrirModalCrearCatalogo = () => {
    setEquipoEditandoCatalogo(null);
    setFormCatalogo({ nombre: '', tipo: 'OLT', unidades_u: 1, descripcion_default: '' });
    setModalCatalogo(true);
  };

  const abrirModalEditarCatalogo = (item) => {
    setEquipoEditandoCatalogo(item);
    setFormCatalogo({
      nombre: item.nombre,
      tipo: item.tipo,
      unidades_u: item.unidades_u,
      descripcion_default: item.descripcion_default || ''
    });
    setModalCatalogo(true);
  };

  const eliminarDeCatalogo = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar este modelo del catálogo maestro?')) {
      await dbLocal.catalogo.delete(id);
      setCatalogo(catalogo.filter(c => c.id !== id));
    }
  };

  const guardarEnCatalogo = async (e) => {
    e.preventDefault();
    if (equipoEditandoCatalogo) {
      const datosActualizados = {
        nombre: formCatalogo.nombre,
        tipo: formCatalogo.tipo,
        unidades_u: parseInt(formCatalogo.unidades_u),
        descripcion_default: formCatalogo.descripcion_default
      };
      await dbLocal.catalogo.update(equipoEditandoCatalogo.id, datosActualizados);
      setCatalogo(catalogo.map(c => (c.id === equipoEditandoCatalogo.id ? { ...c, ...datosActualizados } : c)));
    } else {
      const nuevoItem = {
        id: crypto.randomUUID(),
        ...formCatalogo,
        unidades_u: parseInt(formCatalogo.unidades_u)
      };
      await dbLocal.catalogo.add(nuevoItem);
      setCatalogo([...catalogo, nuevoItem]);
    }
    setModalCatalogo(false);
    setEquipoEditandoCatalogo(null);
  };

  // --- REPORTE PDF CONSOLIDADO (RACKS + INFRAESTRUCTURA) ---
  const exportarPDFCabecera = async () => {
    if (!headendActual) return;
    const doc = new jsPDF();
    
    // Encabezado
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text(`AUDITORÍA GENERAL FTTH: ${headendActual.nombre.toUpperCase()}`, 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`Código: ${headendActual.codigo} | Dirección: ${headendActual.direccion || 'N/A'}`, 14, 28);
    doc.text(`Fecha: ${new Date().toLocaleDateString()} | Racks: ${racks.length} | Equipos Infra: ${infraestructuras.length}`, 14, 34);

    let startY = 48;

    // 1. SECCIÓN: BASTIDORES DE RED (RACKS)
    for (let i = 0; i < racks.length; i++) {
      const rk = racks[i];
      const equiposDelRack = await dbLocal.rack_equipos.where('rack_id').equals(rk.id).toArray();
      
      if (i > 0) {
        doc.addPage();
        startY = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(14, 116, 144);
      doc.text(`Bastidor: ${rk.nombre_rack} (${rk.total_u} Unidades)`, 14, startY);
      
      if (rk.foto_frontal && rk.foto_frontal.startsWith('data:image')) {
        try {
          doc.addImage(rk.foto_frontal, 'JPEG', 14, startY + 4, 45, 60, undefined, 'FAST');
          startY += 68;
        } catch (e) {
          startY += 8;
        }
      } else {
        startY += 8;
      }

      const filas = equiposDelRack
        .sort((a, b) => a.posicion_u_inicio - b.posicion_u_inicio)
        .map(eq => [
          `U${eq.posicion_u_inicio} - U${eq.posicion_u_inicio + eq.unidades_ocupadas - 1}`,
          eq.nombre_equipo,
          eq.tipo,
          `${eq.unidades_ocupadas}U`,
          eq.descripcion || 'Sin descripción'
        ]);

      doc.autoTable({
        startY: startY,
        head: [['Posición', 'Equipo / Modelo', 'Tipo', 'U', 'Descripción Técnica']],
        body: filas.length > 0 ? filas : [['-', 'Sin equipos registrados', '-', '-', '-']],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 8 }
      });

      startY = doc.lastAutoTable.finalY + 12;
    }

    // 2. SECCIÓN: INFRAESTRUCTURA Y SISTEMAS DE SOPORTE
    if (infraestructuras.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(14, 116, 144);
      doc.text(`INFRAESTRUCTURA DE SOPORTE, ENERGÍA Y CLIMA`, 14, 20);

      const filasInfra = infraestructuras.map(inf => {
        const d = inf.datos || {};
        const resumen = Object.entries(d)
          .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
          .join(' | ');
        return [inf.tipo, resumen || 'N/A'];
      });

      doc.autoTable({
        startY: 28,
        head: [['Equipo / Sistema', 'Especificaciones Registradas']],
        body: filasInfra,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 }
      });
    }

    doc.save(`Auditoria_Completa_${headendActual.codigo}.pdf`);
  };

  // --- DESCARGAR TODAS LAS FOTOS (RACKS + INFRAESTRUCTURA EN ZIP) ---
  const descargarFotosCabeceraZIP = async () => {
    if (!headendActual) return;

    const zip = new JSZip();
    const carpetaCabecera = zip.folder(`Cabecera_${headendActual.codigo}`);

    // Fotos de Racks
    for (const rk of racks) {
      const carpetaRack = carpetaCabecera.folder(`Rack_${rk.nombre_rack.replace(/\s+/g, '_')}`);
      if (rk.foto_frontal?.startsWith('data:image')) {
        carpetaRack.file(`00_Panoramica_Frontal.jpg`, rk.foto_frontal.split(',')[1], { base64: true });
      }
      const equiposDelRack = await dbLocal.rack_equipos.where('rack_id').equals(rk.id).toArray();
      equiposDelRack.forEach((eq) => {
        if (eq.foto_url?.startsWith('data:image')) {
          carpetaRack.file(`U${String(eq.posicion_u_inicio).padStart(2, '0')}_${eq.nombre_equipo.replace(/\s+/g, '_')}.jpg`, eq.foto_url.split(',')[1], { base64: true });
        }
      });
    }

    // Fotos de Infraestructura
    if (infraestructuras.length > 0) {
      const carpetaInfra = carpetaCabecera.folder(`00_Infraestructura_Facilidades`);
      infraestructuras.forEach((inf, idx) => {
        const subCarpeta = carpetaInfra.folder(`${idx + 1}_${inf.tipo.replace(/\s+/g, '_')}`);
        if (inf.fotos) {
          Object.entries(inf.fotos).forEach(([nombreFoto, b64]) => {
            if (b64?.startsWith('data:image')) {
              subCarpeta.file(`${nombreFoto}.jpg`, b64.split(',')[1], { base64: true });
            }
          });
        }
      });
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `Auditoria_Fotos_${headendActual.codigo}.zip`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Superior */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-cyan-400" />
          <h1 className="font-bold text-lg text-white tracking-wide">FTTH Headend Surveyor</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setVista('catalogo')} 
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs rounded-md border border-slate-700"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" /> Catálogo Maestro
          </button>
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700">
            {online ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-medium">Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-amber-400 font-medium">Offline</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 p-4 max-w-5xl w-full mx-auto">

        {/* 1. VISTA DE CABECERAS */}
        {vista === 'headends' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">Cabeceras Registradas</h2>
                <p className="text-xs text-slate-400">Selecciona una cabecera para ver sus bastidores e infraestructura</p>
              </div>
              <button 
                onClick={abrirModalCrearHeadend} 
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg shadow-cyan-600/20"
              >
                <Plus className="w-4 h-4" /> Nueva Cabecera
              </button>
            </div>

            {headends.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                <HardDrive className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                <p className="text-slate-400 text-sm">No hay cabeceras registradas todavía.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {headends.map(he => (
                  <div 
                    key={he.id} 
                    onClick={() => seleccionarHeadend(he)}
                    className="bg-slate-900 border border-slate-800 hover:border-cyan-500 p-4 rounded-xl cursor-pointer transition-all shadow-md group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">
                          {he.codigo}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={(e) => abrirModalEditarHeadend(he, e)} 
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded transition-colors"
                            title="Editar cabecera"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => eliminarHeadend(he.id, e)} 
                            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded transition-colors"
                            title="Eliminar cabecera"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-bold text-lg text-white mt-2 group-hover:text-cyan-400">{he.nombre}</h3>
                      <p className="text-xs text-slate-400 mt-1">{he.direccion || 'Sin dirección registrada'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. VISTA DE CABECERA SELECCIONADA (CON PESTAÑAS: RACKS / INFRAESTRUCTURA) */}
        {vista === 'racks' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setVista('headends')} className="p-2 hover:bg-slate-800 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">{headendActual?.nombre} ({headendActual?.codigo})</h2>
                  <p className="text-xs text-slate-400">{headendActual?.direccion || 'Sin dirección'}</p>
                </div>
              </div>

              {/* Botones de Exportación Completa */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={exportarPDFCabecera} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 text-xs font-semibold rounded-lg shadow-sm"
                  title="Descargar PDF con Racks e Infraestructura"
                >
                  <FileText className="w-4 h-4" /> PDF Completo
                </button>
                <button 
                  onClick={descargarFotosCabeceraZIP} 
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold rounded-lg shadow-sm"
                  title="Descargar fotos en ZIP"
                >
                  <Download className="w-4 h-4" /> Fotos (ZIP)
                </button>
              </div>
            </div>

            {/* PESTAÑAS: BASTIDORES VS INFRAESTRUCTURA */}
            <div className="flex border-b border-slate-800 mb-6 gap-2">
              <button
                onClick={() => setSubPestanaCabecera('racks')}
                className={`flex items-center gap-2 py-2 px-4 text-sm font-semibold border-b-2 transition-all ${
                  subPestanaCabecera === 'racks'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Server className="w-4 h-4" /> Bastidores / Racks ({racks.length})
              </button>
              <button
                onClick={() => setSubPestanaCabecera('infra')}
                className={`flex items-center gap-2 py-2 px-4 text-sm font-semibold border-b-2 transition-all ${
                  subPestanaCabecera === 'infra'
                    ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Zap className="w-4 h-4" /> Infraestructura & Facilidades ({infraestructuras.length})
              </button>
            </div>

            {/* SUB-PESTAÑA 1: BASTIDORES */}
            {subPestanaCabecera === 'racks' && (
              <div>
                <div className="flex justify-end mb-4">
                  <button 
                    onClick={abrirModalCrearRack} 
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Nuevo Rack
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {racks.map(rk => (
                    <div 
                      key={rk.id} 
                      onClick={() => seleccionarRack(rk)}
                      className="bg-slate-900 border border-slate-800 hover:border-cyan-500 rounded-xl overflow-hidden cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="h-40 bg-slate-800 flex items-center justify-center relative overflow-hidden">
                        {rk.foto_frontal ? (
                          <img src={rk.foto_frontal} alt={rk.nombre_rack} className="w-full h-full object-cover" />
                        ) : (
                          <Server className="w-12 h-12 text-slate-600" />
                        )}
                        <span className="absolute top-2 left-2 bg-slate-950/80 text-cyan-400 text-xs font-mono px-2 py-0.5 rounded border border-slate-800">
                          {rk.total_u}U
                        </span>
                        
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
                          <button 
                            onClick={(e) => abrirModalEditarRack(rk, e)} 
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded transition-colors"
                            title="Editar rack"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={(e) => eliminarRack(rk.id, e)} 
                            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-rose-400 rounded transition-colors"
                            title="Eliminar rack"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-4">
                        <h3 className="font-bold text-white group-hover:text-cyan-400 text-base">{rk.nombre_rack}</h3>
                        <p className="text-xs text-slate-400 mt-1">Toca para gestionar o auditar equipos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUB-PESTAÑA 2: INFRAESTRUCTURA Y FACILIDADES */}
            {subPestanaCabecera === 'infra' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="text-xs text-slate-400">Equipos de soporte eléctrico, climatización y energía</p>
                  <button 
                    onClick={abrirModalCrearInfra} 
                    className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-2 rounded-lg text-xs font-semibold"
                  >
                    <Plus className="w-4 h-4" /> Agregar Equipo de Soporte
                  </button>
                </div>

                {infraestructuras.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
                    <Zap className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                    <p className="text-slate-400 text-sm">No hay equipos de infraestructura registrados en esta cabecera.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {infraestructuras.map(inf => (
                      <div key={inf.id} className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                              {inf.tipo}
                            </span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => abrirModalEditarInfra(inf)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => eliminarInfra(inf.id)} className="p-1 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            {Object.entries(inf.datos || {}).map(([clave, valor]) => (
                              <div key={clave} className="bg-slate-800/60 p-2 rounded border border-slate-800">
                                <span className="text-[10px] text-slate-400 block uppercase font-mono">{clave.replace(/_/g, ' ')}</span>
                                <span className="font-semibold text-slate-200">{valor || '-'}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Galería de fotos del equipo */}
                        {inf.fotos && Object.keys(inf.fotos).length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-800 flex gap-2 overflow-x-auto pb-1">
                            {Object.entries(inf.fotos).map(([nombre, b64]) => b64 && (
                              <div key={nombre} className="relative flex-shrink-0 w-16 h-16 rounded overflow-hidden border border-slate-700">
                                <img src={b64} alt={nombre} className="w-full h-full object-cover" />
                                <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[8px] text-center text-slate-200 truncate px-0.5">
                                  {nombre}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. VISTA DE DETALLE DE RACK (ARRIBA A ABAJO) */}
        {vista === 'rack-detail' && (
          <div>
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setVista('racks')} className="p-2 hover:bg-slate-800 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">{rackActual?.nombre_rack}</h2>
                  <p className="text-xs text-slate-400">{headendActual?.nombre} | Altura: {rackActual?.total_u}U</p>
                </div>
              </div>
            </div>

            <div className="max-w-xl mx-auto bg-slate-900 border-4 border-slate-700 rounded-xl p-3 shadow-2xl">
              <div className="text-center font-bold pb-2 text-xs text-cyan-400 border-b border-slate-800">
                VISTA FRONTAL (ARRIBA: U1 → ABAJO: U{rackActual?.total_u})
              </div>

              <div className="flex flex-col gap-1 mt-3">
                {Array.from({ length: rackActual?.total_u || 42 }, (_, i) => i + 1).map((u) => {
                  const eq = equipos.find(e => u >= e.posicion_u_inicio && u < (e.posicion_u_inicio + e.unidades_ocupadas));
                  const esPrimerSlot = eq && eq.posicion_u_inicio === u;

                  if (eq && !esPrimerSlot) return null;

                  return (
                    <div
                      key={u}
                      onClick={() => {
                        if (!eq) {
                          setUSeleccionada(u);
                          setModalEquipo(true);
                        }
                      }}
                      style={{ height: eq ? `${eq.unidades_ocupadas * 46}px` : '38px' }}
                      className={`flex items-center px-3 rounded cursor-pointer border transition-all ${
                        eq 
                          ? 'bg-cyan-950/80 border-cyan-500 shadow-md' 
                          : 'bg-slate-800/40 border-dashed border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <span className="w-8 font-mono text-xs font-bold text-slate-500 border-r border-slate-700 pr-2">
                        U{u}
                      </span>

                      <div className="flex-1 flex items-center justify-between pl-3 overflow-hidden">
                        {eq ? (
                          <div className="flex items-center gap-2 truncate">
                            <Server className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-white truncate">
                                {eq.nombre_equipo} <span className="text-[10px] text-cyan-400 font-mono">({eq.tipo})</span>
                              </p>
                              <p className="text-[10px] text-slate-300 truncate">{eq.descripcion || 'Sin descripción'}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 flex items-center gap-1 italic">
                            <Plus className="w-3 h-3" /> Asignar equipo
                          </span>
                        )}

                        <div className="flex items-center gap-2">
                          {eq?.foto_url && (
                            <div className="w-7 h-7 rounded overflow-hidden border border-cyan-400 flex-shrink-0">
                              <img src={eq.foto_url} alt="foto equipo" className="w-full h-full object-cover" />
                            </div>
                          )}
                          {eq && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                eliminarEquipoDeRack(eq.id);
                              }}
                              className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded"
                              title="Quitar del rack"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. VISTA DEL CATÁLOGO MAESTRO */}
        {vista === 'catalogo' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setVista('headends')} className="p-2 hover:bg-slate-800 rounded-lg">
                  <ArrowLeft className="w-5 h-5 text-slate-400" />
                </button>
                <div>
                  <h2 className="text-xl font-bold text-white">Catálogo Maestro de Equipos</h2>
                  <p className="text-xs text-slate-400">Modelos predefinidos para asignar rápidamente</p>
                </div>
              </div>
              <button 
                onClick={abrirModalCrearCatalogo} 
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                <Plus className="w-4 h-4" /> Agregar Modelo
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {catalogo.map(item => (
                <div key={item.id} className="bg-slate-900 border border-slate-800 hover:border-slate-700 p-4 rounded-xl flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-800">
                        {item.tipo} ({item.unidades_u}U)
                      </span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => abrirModalEditarCatalogo(item)} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 rounded">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => eliminarDeCatalogo(item.id)} className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-white mt-2">{item.nombre}</h3>
                    <p className="text-xs text-slate-400 mt-1">{item.descripcion_default || 'Sin descripción'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL ESPECÍFICO DE INFRAESTRUCTURA Y FACILIDADES --- */}
      {modalInfra && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white mb-2">
              {infraEditando ? `Editar ${infraEditando.tipo}` : 'Registrar Equipo de Infraestructura'}
            </h3>
            
            {/* Selector de Tipo */}
            <div className="mb-4">
              <label className="text-xs text-slate-400 block mb-1">Categoría de Infraestructura</label>
              <select
                disabled={!!infraEditando}
                value={tipoInfraSeleccionado}
                onChange={(e) => {
                  setTipoInfraSeleccionado(e.target.value);
                  setFormInfra({});
                  setFotosInfra({});
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white disabled:opacity-60"
              >
                {TIPOS_INFRA.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <form onSubmit={guardarInfra} className="space-y-4">
              
              {/* 1. TABLERO ELÉCTRICO */}
              {tipoInfraSeleccionado === 'Tablero Eléctrico' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca</label>
                      <input type="text" value={formInfra.marca || ''} onChange={e => setFormInfra({...formInfra, marca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Protección</label>
                      <input type="text" placeholder="Ej: 3x100A" value={formInfra.proteccion || ''} onChange={e => setFormInfra({...formInfra, proteccion: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Tensión</label>
                      <input type="text" placeholder="Ej: 220V/380V" value={formInfra.tension || ''} onChange={e => setFormInfra({...formInfra, tension: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Interrupción</label>
                      <input type="text" placeholder="Ej: 10kA" value={formInfra.interrupcion || ''} onChange={e => setFormInfra({...formInfra, interrupcion: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Barra</label>
                      <input type="text" placeholder="Cobre/Aluminio" value={formInfra.barra || ''} onChange={e => setFormInfra({...formInfra, barra: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>

                  {/* 3 Fotos Requeridas */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-cyan-400">Fotografías Requeridas</p>
                    {['Cerrado', 'Abierto', 'Barras'].map(fotoTipo => (
                      <div key={fotoTipo} className="flex items-center justify-between bg-slate-800/40 p-2 rounded">
                        <span className="text-xs text-slate-300">Foto {fotoTipo}</span>
                        <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs">
                          {fotosInfra[fotoTipo] ? '✓ Cambiar' : 'Tomar Foto'}
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => manejarFotoGenerica(e, b64 => setFotosInfra({...fotosInfra, [fotoTipo]: b64}))} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. TERMOSTATO */}
              {tipoInfraSeleccionado === 'Termostato' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca</label>
                      <input type="text" value={formInfra.marca || ''} onChange={e => setFormInfra({...formInfra, marca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Modelo</label>
                      <input type="text" value={formInfra.modelo || ''} onChange={e => setFormInfra({...formInfra, modelo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Capacidad</label>
                      <input type="text" value={formInfra.capacidad || ''} onChange={e => setFormInfra({...formInfra, capacidad: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Tensión</label>
                      <input type="text" value={formInfra.tension || ''} onChange={e => setFormInfra({...formInfra, tension: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Frecuencia</label>
                      <input type="text" placeholder="50/60 Hz" value={formInfra.frecuencia || ''} onChange={e => setFormInfra({...formInfra, frecuencia: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Sistema Activo</label>
                      <input type="text" placeholder="Ej: Sí / No" value={formInfra.sistema_activo || ''} onChange={e => setFormInfra({...formInfra, sistema_activo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Inverter</label>
                      <select value={formInfra.inverter || 'No'} onChange={e => setFormInfra({...formInfra, inverter: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm">
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. AIRE ACONDICIONADO */}
              {tipoInfraSeleccionado === 'Aire Acondicionado' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca</label>
                      <input type="text" value={formInfra.marca || ''} onChange={e => setFormInfra({...formInfra, marca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Modelo</label>
                      <input type="text" value={formInfra.modelo || ''} onChange={e => setFormInfra({...formInfra, modelo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Capacidad (BTU/TR)</label>
                      <input type="text" placeholder="Ej: 24000 BTU" value={formInfra.capacidad || ''} onChange={e => setFormInfra({...formInfra, capacidad: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Tensión</label>
                      <input type="text" placeholder="Ej: 220V" value={formInfra.tension || ''} onChange={e => setFormInfra({...formInfra, tension: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Frecuencia</label>
                      <input type="text" placeholder="60 Hz" value={formInfra.frecuencia || ''} onChange={e => setFormInfra({...formInfra, frecuencia: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Sistema Activo</label>
                      <select value={formInfra.sistema_activo || 'Principal'} onChange={e => setFormInfra({...formInfra, sistema_activo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm">
                        <option value="Principal">Principal</option>
                        <option value="Backup">Backup</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Inverter</label>
                      <select value={formInfra.inverter || 'No'} onChange={e => setFormInfra({...formInfra, inverter: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm">
                        <option value="Sí">Sí</option>
                        <option value="No">No</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. BARRA MGB */}
              {tipoInfraSeleccionado === 'Barra MGB' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Orificios Totales</label>
                      <input type="number" value={formInfra.orificios_totales || ''} onChange={e => setFormInfra({...formInfra, orificios_totales: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Orificios Usados</label>
                      <input type="number" value={formInfra.orificios_usados || ''} onChange={e => setFormInfra({...formInfra, orificios_usados: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Orificios Libres</label>
                      <input type="number" value={formInfra.orificios_libres || ''} onChange={e => setFormInfra({...formInfra, orificios_libres: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Alto (cm)</label>
                      <input type="number" value={formInfra.alto_cm || ''} onChange={e => setFormInfra({...formInfra, alto_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Ancho (cm)</label>
                      <input type="number" value={formInfra.ancho_cm || ''} onChange={e => setFormInfra({...formInfra, ancho_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* 5. SISTEMA DE ENERGÍA */}
              {tipoInfraSeleccionado === 'Sistema de Energía' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca</label>
                      <input type="text" value={formInfra.marca || ''} onChange={e => setFormInfra({...formInfra, marca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Modelo</label>
                      <input type="text" value={formInfra.modelo || ''} onChange={e => setFormInfra({...formInfra, modelo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">N° Rectificadores</label>
                      <input type="number" value={formInfra.n_rectificadores || ''} onChange={e => setFormInfra({...formInfra, n_rectificadores: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Capacidad Rect. (Amp/DC)</label>
                      <input type="text" placeholder="Ej: 50A -48V" value={formInfra.capacidad_rectificadores || ''} onChange={e => setFormInfra({...formInfra, capacidad_rectificadores: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca Banco Baterías</label>
                      <input type="text" value={formInfra.marca_baterias || ''} onChange={e => setFormInfra({...formInfra, marca_baterias: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Capacidad Baterías (Amp/Hrs)</label>
                      <input type="text" placeholder="Ej: 100Ah" value={formInfra.capacidad_baterias || ''} onChange={e => setFormInfra({...formInfra, capacidad_baterias: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Ancho (cm)</label>
                      <input type="number" value={formInfra.ancho_cm || ''} onChange={e => setFormInfra({...formInfra, ancho_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Alto (cm)</label>
                      <input type="number" value={formInfra.alto_cm || ''} onChange={e => setFormInfra({...formInfra, alto_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>

                  {/* 2 Fotos */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-cyan-400">Fotografías Requeridas</p>
                    {['Vista Frontal', 'Vista Trasera'].map(fotoTipo => (
                      <div key={fotoTipo} className="flex items-center justify-between bg-slate-800/40 p-2 rounded">
                        <span className="text-xs text-slate-300">{fotoTipo}</span>
                        <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs">
                          {fotosInfra[fotoTipo] ? '✓ Cambiar' : 'Tomar Foto'}
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => manejarFotoGenerica(e, b64 => setFotosInfra({...fotosInfra, [fotoTipo]: b64}))} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. UPS */}
              {tipoInfraSeleccionado === 'UPS' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca</label>
                      <input type="text" value={formInfra.marca || ''} onChange={e => setFormInfra({...formInfra, marca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Modelo</label>
                      <input type="text" value={formInfra.modelo || ''} onChange={e => setFormInfra({...formInfra, modelo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Capacidad (KVA)</label>
                      <input type="text" placeholder="Ej: 10 KVA" value={formInfra.capacidad_kva || ''} onChange={e => setFormInfra({...formInfra, capacidad_kva: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Marca Baterías</label>
                      <input type="text" value={formInfra.marca_baterias || ''} onChange={e => setFormInfra({...formInfra, marca_baterias: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">N° Bancos</label>
                      <input type="number" value={formInfra.n_bancos || ''} onChange={e => setFormInfra({...formInfra, n_bancos: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Capacidad Baterías (Amp/Hrs)</label>
                    <input type="text" value={formInfra.capacidad_baterias || ''} onChange={e => setFormInfra({...formInfra, capacidad_baterias: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                  </div>

                  {/* 2 Fotos */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <p className="text-xs font-semibold text-cyan-400">Fotografías Requeridas</p>
                    {['Vista Frontal', 'Vista Trasera'].map(fotoTipo => (
                      <div key={fotoTipo} className="flex items-center justify-between bg-slate-800/40 p-2 rounded">
                        <span className="text-xs text-slate-300">{fotoTipo}</span>
                        <label className="cursor-pointer bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs">
                          {fotosInfra[fotoTipo] ? '✓ Cambiar' : 'Tomar Foto'}
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => manejarFotoGenerica(e, b64 => setFotosInfra({...fotosInfra, [fotoTipo]: b64}))} />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7. BANCO DE BATERÍAS */}
              {tipoInfraSeleccionado === 'Banco de Baterías' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Tipo de Batería</label>
                      <input type="text" placeholder="Ej: Litio / Plomo Ácido VRLA" value={formInfra.tipo_bateria || ''} onChange={e => setFormInfra({...formInfra, tipo_bateria: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Consumo (A/h)</label>
                      <input type="text" placeholder="Ej: 150 Ah" value={formInfra.consumo_ah || ''} onChange={e => setFormInfra({...formInfra, consumo_ah: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Fecha de Instalación</label>
                    <input type="date" value={formInfra.fecha_instalacion || ''} onChange={e => setFormInfra({...formInfra, fecha_instalacion: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Ancho (cm)</label>
                      <input type="number" value={formInfra.ancho_cm || ''} onChange={e => setFormInfra({...formInfra, ancho_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Alto (cm)</label>
                      <input type="number" value={formInfra.alto_cm || ''} onChange={e => setFormInfra({...formInfra, alto_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* 8. INVERSOR */}
              {tipoInfraSeleccionado === 'Inversor' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Marca</label>
                      <input type="text" value={formInfra.marca || ''} onChange={e => setFormInfra({...formInfra, marca: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Modelo</label>
                      <input type="text" value={formInfra.modelo || ''} onChange={e => setFormInfra({...formInfra, modelo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Capacidad del Inversor (KW)</label>
                    <input type="text" placeholder="Ej: 5 KW" value={formInfra.capacidad_kw || ''} onChange={e => setFormInfra({...formInfra, capacidad_kw: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-slate-400">Ancho (cm)</label>
                      <input type="number" value={formInfra.ancho_cm || ''} onChange={e => setFormInfra({...formInfra, ancho_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Alto (cm)</label>
                      <input type="number" value={formInfra.alto_cm || ''} onChange={e => setFormInfra({...formInfra, alto_cm: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setModalInfra(false)} className="px-4 py-2 bg-slate-800 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={procesandoFoto} className="px-4 py-2 bg-cyan-600 rounded text-sm font-bold disabled:opacity-50">Guardar Equipo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- OTROS MODALES PREEXISTENTES --- */}

      {/* Modal Crear / Editar Headend */}
      {modalHeadend && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {headendEditando ? `Editar ${headendEditando.nombre}` : 'Nueva Cabecera (Headend)'}
            </h3>
            <form onSubmit={guardarHeadend} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Nombre de la Cabecera</label>
                <input type="text" required placeholder="Ej: Central Principal" value={formHeadend.nombre} onChange={e => setFormHeadend({...formHeadend, nombre: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Código</label>
                <input type="text" required placeholder="Ej: HE-01" value={formHeadend.codigo} onChange={e => setFormHeadend({...formHeadend, codigo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Dirección</label>
                <input type="text" placeholder="Ej: Calle 10, Edificio NOC" value={formHeadend.direccion} onChange={e => setFormHeadend({...formHeadend, direccion: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setModalHeadend(false); setHeadendEditando(null); }} className="px-4 py-2 bg-slate-800 rounded text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 rounded text-sm font-bold">{headendEditando ? 'Guardar Cambios' : 'Crear Cabecera'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear / Editar Rack */}
      {modalRack && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {rackEditando ? `Editar ${rackEditando.nombre_rack}` : `Nuevo Rack en ${headendActual?.nombre}`}
            </h3>
            <form onSubmit={guardarRack} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Identificador del Rack</label>
                <input type="text" required placeholder="Ej: RACK-01" value={formRack.nombre_rack} onChange={e => setFormRack({...formRack, nombre_rack: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Total de Unidades (U)</label>
                <input type="number" required min="10" max="52" value={formRack.total_u} onChange={e => setFormRack({...formRack, total_u: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">{rackEditando ? 'Reemplazar Foto Frontal' : 'Foto Frontal Panorámica del Rack'}</label>
                {formRack.foto_frontal && (
                  <div className="mb-2 relative w-full h-28 rounded-lg overflow-hidden border border-cyan-500">
                    <img src={formRack.foto_frontal} alt="Vista previa rack" className="w-full h-full object-cover" />
                  </div>
                )}
                <input type="file" accept="image/*" capture="environment" onChange={e => manejarFotoGenerica(e, (fotoBase64) => setFormRack({...formRack, foto_frontal: fotoBase64}))} className="w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded file:bg-slate-800 file:border-0 file:text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setModalRack(false); setRackEditando(null); }} className="px-4 py-2 bg-slate-800 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={procesandoFoto} className="px-4 py-2 bg-cyan-600 rounded text-sm font-bold disabled:opacity-50">{rackEditando ? 'Guardar Cambios' : 'Crear Rack'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Asignar Equipo en Rack */}
      {modalEquipo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              Asignar Equipo en <span className="text-cyan-400 font-mono">U{uSeleccionada}</span>
            </h3>
            <form onSubmit={guardarEquipo} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Cargar desde Catálogo</label>
                <select 
                  onChange={(e) => {
                    const item = catalogo.find(c => c.id === e.target.value);
                    if (item) {
                      setFormEquipo({
                        ...formEquipo,
                        nombre_equipo: item.nombre,
                        tipo: item.tipo,
                        unidades_ocupadas: item.unidades_u,
                        descripcion: item.descripcion_default || ''
                      });
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white"
                >
                  <option value="">-- Seleccionar del catálogo --</option>
                  {catalogo.map(c => (
                    <option key={c.id} value={c.id}>{c.tipo} - {c.nombre} ({c.unidades_u}U)</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400">Nombre / Modelo del Equipo</label>
                <input type="text" required placeholder="Ej: EDFA 1550nm 16 Puertos" value={formEquipo.nombre_equipo} onChange={e => setFormEquipo({...formEquipo, nombre_equipo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Tipo de Equipo</label>
                  <select value={formEquipo.tipo} onChange={e => setFormEquipo({...formEquipo, tipo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                    {TIPOS_EQUIPO_RACK.map(t => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Ocupación (U)</label>
                  <input type="number" min="1" max="20" required value={formEquipo.unidades_ocupadas} onChange={e => setFormEquipo({...formEquipo, unidades_ocupadas: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Descripción (Puertos, Slots, Notas)</label>
                <textarea rows="2" placeholder="Ej: 16 salidas SC/APC..." value={formEquipo.descripcion} onChange={e => setFormEquipo({...formEquipo, descripcion: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div>
                <label className="text-xs text-slate-400">Foto del Equipo / Etiqueta</label>
                <input type="file" accept="image/*" capture="environment" onChange={e => manejarFotoGenerica(e, (fotoBase64) => setFormEquipo({...formEquipo, foto: fotoBase64}))} className="w-full text-xs text-slate-400 file:mr-2 file:py-2 file:px-3 file:rounded file:bg-slate-800 file:border-0 file:text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalEquipo(false)} className="px-4 py-2 bg-slate-800 rounded text-sm">Cancelar</button>
                <button type="submit" disabled={procesandoFoto} className="px-4 py-2 bg-cyan-600 rounded text-sm font-bold disabled:opacity-50">Asignar al Rack</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catálogo */}
      {modalCatalogo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">{equipoEditandoCatalogo ? 'Editar Modelo' : 'Nuevo Modelo en Catálogo'}</h3>
            <form onSubmit={guardarEnCatalogo} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400">Nombre / Modelo Estándar</label>
                <input type="text" required placeholder="Ej: EDFA Optronics" value={formCatalogo.nombre} onChange={e => setFormCatalogo({...formCatalogo, nombre: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Tipo de Equipo</label>
                  <select value={formCatalogo.tipo} onChange={e => setFormCatalogo({...formCatalogo, tipo: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white">
                    {TIPOS_EQUIPO_RACK.map(t => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Altura (U)</label>
                  <input type="number" min="1" max="25" required value={formCatalogo.unidades_u} onChange={e => setFormCatalogo({...formCatalogo, unidades_u: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400">Descripción Predeterminada</label>
                <textarea rows="2" value={formCatalogo.descripcion_default} onChange={e => setFormCatalogo({...formCatalogo, descripcion_default: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm text-white" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setModalCatalogo(false); setEquipoEditandoCatalogo(null); }} className="px-4 py-2 bg-slate-800 rounded text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 rounded text-sm font-bold">{equipoEditandoCatalogo ? 'Guardar Cambios' : 'Crear en Catálogo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
