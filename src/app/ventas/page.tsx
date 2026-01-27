"use client";

import { db } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Calendar, ShoppingBag, X, BarChart3, List, ChevronDown, ChevronUp } from "lucide-react"; // Agregué iconos de flecha
import Link from "next/link";
import { useState } from "react";

export default function HistorialVentas() {
  const ventas = useLiveQuery(async () => {
    const all = await db.sales.toArray();
    return all.reverse();
  });
  
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [vista, setVista] = useState<"LISTA" | "GRAFICOS">("LISTA");
  
  // ESTADO NUEVO: Para saber qué venta está abierta (expandida)
  const [ventaExpandida, setVentaExpandida] = useState<number | null>(null);

  if (!ventas) return <div className="p-10 text-center">Cargando libro de ventas...</div>;

  // LÓGICA DE FILTRADO (BLINDADA CONTRA ERRORES DE FECHA)
  const ventasFiltradas = ventas.filter(v => {
    if (!fechaFiltro) return true;
    const fechaVenta = new Date(v.date);
    const [yearStr, monthStr, dayStr] = fechaFiltro.split('-');
    
    return (
        fechaVenta.getFullYear() === parseInt(yearStr) &&
        fechaVenta.getMonth() + 1 === parseInt(monthStr) &&
        fechaVenta.getDate() === parseInt(dayStr)
    );
  });

  const totalMostrado = ventasFiltradas.reduce((acc, v) => acc + v.total, 0);

  // --- LÓGICA DE ESTADÍSTICAS ---
  const conteoProductos: Record<string, number> = {};
  const ventasPorDia: Record<string, number> = {};

  ventas.forEach(v => {
      // Top Productos
      v.items.forEach(p => {
          conteoProductos[p.name] = (conteoProductos[p.name] || 0) + 1;
      });
      // Ventas por Día
      const fechaObj = new Date(v.date);
      const dia = fechaObj.toLocaleDateString('es-PE', { weekday: 'short' }); 
      ventasPorDia[dia] = (ventasPorDia[dia] || 0) + v.total;
  });
  
  const topProductos = Object.entries(conteoProductos)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

  const diasSemana = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

  // FUNCIÓN PARA ABRIR/CERRAR ACORDEÓN
  const toggleDetalle = (id: number) => {
    if (ventaExpandida === id) {
        setVentaExpandida(null); // Si ya estaba abierto, lo cerramos
    } else {
        setVentaExpandida(id); // Abrimos el nuevo
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-6 font-sans">
      
      <div className="max-w-5xl mx-auto">
        {/* CABECERA */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-4">
                <Link href="/" className="bg-slate-800 text-white p-3 rounded-full hover:bg-black transition shadow-lg">
                    <ArrowLeft />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">Historial de Ventas</h1>
                    <p className="text-slate-500">
                        Total periodo: <span className="font-bold text-green-600">S/ {totalMostrado.toFixed(2)}</span>
                    </p>
                </div>
            </div>
            
            <div className="flex gap-4">
                <div className="bg-white p-1 rounded-lg border border-gray-300 flex shadow-sm">
                    <button 
                        onClick={() => setVista("LISTA")}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex gap-2 items-center transition ${vista === "LISTA" ? "bg-slate-100 text-slate-800" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <List size={18}/> Lista
                    </button>
                    <button 
                        onClick={() => setVista("GRAFICOS")}
                        className={`px-4 py-2 rounded-md text-sm font-bold flex gap-2 items-center transition ${vista === "GRAFICOS" ? "bg-slate-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                    >
                        <BarChart3 size={18}/> Gráficos
                    </button>
                </div>

                {vista === "LISTA" && (
                    <div className="bg-white p-2 rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm">
                        <Calendar className="text-gray-500 ml-2" size={20}/>
                        <input 
                            type="date" 
                            value={fechaFiltro}
                            onChange={(e) => setFechaFiltro(e.target.value)}
                            className="outline-none text-sm text-gray-700 font-medium bg-transparent p-1"
                        />
                        {fechaFiltro && (
                            <button onClick={() => setFechaFiltro("")} className="text-gray-400 hover:text-red-500 p-1">
                                <X size={18} />
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* --- VISTA: LISTA DE VENTAS (MODO ACORDEÓN) --- */}
        {vista === "LISTA" && (
            <div className="space-y-4">
                {ventasFiltradas.map((venta) => {
                    const fechaVisual = new Date(venta.date);
                    const estaAbierto = ventaExpandida === venta.id; // ¿Es esta la venta abierta?

                    return (
                        <div 
                            key={venta.id} 
                            // Al hacer clic en toda la tarjeta, se abre/cierra
                            onClick={() => toggleDetalle(venta.id!)}
                            className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer ${estaAbierto ? 'border-blue-400 ring-1 ring-blue-400 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}
                        >
                            <div className="p-4 flex justify-between items-center bg-white rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full transition-colors ${estaAbierto ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 flex items-center gap-2">
                                            Venta #{venta.id}
                                            {/* Flechita que gira */}
                                            {estaAbierto ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">
                                            {fechaVisual.toLocaleDateString()} - {fechaVisual.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-800">S/ {venta.total.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">{venta.items.length} productos</p>
                                </div>
                            </div>

                            {/* Detalle Desplegable (Solo se muestra si estaAbierto es true) */}
                            {estaAbierto && (
                                <div className="p-4 pt-0 border-t border-dashed border-gray-200 bg-slate-50 rounded-b-xl animate-in fade-in slide-in-from-top-2 duration-200">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-3">Detalle de Productos:</p>
                                    <div className="space-y-1">
                                        {venta.items.map((item, idx) => (
                                            <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                                                <span className="text-gray-700">{item.name}</span>
                                                <span className="font-medium text-slate-900">S/ {item.price.toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                {ventasFiltradas.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <p>No se encontraron ventas.</p>
                    </div>
                )}
            </div>
        )}

        {/* --- VISTA: GRÁFICOS --- */}
        {vista === "GRAFICOS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">🏆 Productos Más Vendidos</h2>
                    <div className="space-y-4">
                        {topProductos.map(([nombre, cantidad], index) => (
                            <div key={nombre}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">#{index+1} {nombre}</span>
                                    <span className="font-bold text-blue-600">{cantidad} un.</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${(cantidad / (topProductos[0][1] || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h2 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">📅 Ventas de la Semana</h2>
                    <div className="flex items-end justify-between h-48 gap-2">
                        {diasSemana.map((dia) => {
                            const totalDia = ventasPorDia[dia] || 0;
                            const maxVenta = Math.max(...Object.values(ventasPorDia), 10);
                            const altura = Math.max((totalDia / maxVenta) * 100, 5);
                            return (
                                <div key={dia} className="flex flex-col items-center gap-2 w-full">
                                    <div className="text-xs font-bold text-gray-600">S/{totalDia}</div>
                                    <div className={`w-full rounded-t-md transition-all ${totalDia > 0 ? "bg-emerald-500" : "bg-gray-100"}`} style={{ height: `${altura}%` }}></div>
                                    <div className="text-xs uppercase text-gray-400 font-bold">{dia}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        )}
      </div>
    </main>
  );
}