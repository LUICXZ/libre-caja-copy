"use client";

import { db } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Calendar, ShoppingBag, X, BarChart3, List, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function HistorialVentas() {
  const ventas = useLiveQuery(async () => {
    const all = await db.sales.toArray();
    return all.reverse();
  });
  
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [vista, setVista] = useState<"LISTA" | "GRAFICOS">("LISTA");
  const [ventaExpandida, setVentaExpandida] = useState<number | null>(null);

  if (!ventas) return <div className="p-10 text-center">Cargando datos...</div>;

  // --- LÓGICA DE FILTRADO ---
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

  // Inicializamos los días en 0 para que siempre aparezcan en el gráfico
  const diasSemana = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];
  diasSemana.forEach(d => ventasPorDia[d] = 0);

  ventas.forEach(v => {
      // 1. Top Productos
      v.items.forEach(p => {
          conteoProductos[p.name] = (conteoProductos[p.name] || 0) + 1;
      });
      
      // 2. Ventas por Día (Solo últimos 7 días reales o de la semana actual)
      const fechaObj = new Date(v.date);
      const dia = fechaObj.toLocaleDateString('es-PE', { weekday: 'short' }); 
      if (ventasPorDia[dia] !== undefined) {
          ventasPorDia[dia] += v.total;
      }
  });
  
  const topProductos = Object.entries(conteoProductos)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

  const toggleDetalle = (id: number) => {
    setVentaExpandida(ventaExpandida === id ? null : id);
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
                    <h1 className="text-3xl font-bold text-slate-800">Historial</h1>
                    <p className="text-slate-500">
                        Total en pantalla: <span className="font-bold text-emerald-600">S/ {totalMostrado.toFixed(2)}</span>
                    </p>
                </div>
            </div>
            
            {/* CONTROLES */}
            <div className="flex gap-4">
                <div className="bg-white p-1 rounded-lg border border-gray-300 flex shadow-sm">
                    <button onClick={() => setVista("LISTA")} className={`px-4 py-2 rounded-md text-sm font-bold flex gap-2 items-center transition ${vista === "LISTA" ? "bg-slate-100 text-slate-800" : "text-gray-400 hover:text-gray-600"}`}>
                        <List size={18}/> Lista
                    </button>
                    <button onClick={() => setVista("GRAFICOS")} className={`px-4 py-2 rounded-md text-sm font-bold flex gap-2 items-center transition ${vista === "GRAFICOS" ? "bg-slate-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}>
                        <BarChart3 size={18}/> Gráficos
                    </button>
                </div>

                {vista === "LISTA" && (
                    <div className="bg-white p-2 rounded-lg border border-gray-300 flex items-center gap-2 shadow-sm">
                        <Calendar className="text-gray-500 ml-2" size={20}/>
                        <input type="date" value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="outline-none text-sm text-gray-700 font-medium bg-transparent p-1"/>
                        {fechaFiltro && <button onClick={() => setFechaFiltro("")} className="text-gray-400 hover:text-red-500 p-1"><X size={18} /></button>}
                    </div>
                )}
            </div>
        </div>

        {/* --- VISTA LISTA --- */}
        {vista === "LISTA" && (
            <div className="space-y-4">
                {ventasFiltradas.map((venta) => {
                    const fechaVisual = new Date(venta.date);
                    const estaAbierto = ventaExpandida === venta.id;
                    return (
                        <div key={venta.id} onClick={() => toggleDetalle(venta.id!)} className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer ${estaAbierto ? 'border-blue-400 ring-1 ring-blue-400 shadow-md' : 'border-gray-200 hover:border-blue-300'}`}>
                            <div className="p-4 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-full transition-colors ${estaAbierto ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-600'}`}>
                                        <ShoppingBag size={20} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-700 flex items-center gap-2">
                                            Venta #{venta.id}
                                            {estaAbierto ? <ChevronUp size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
                                        </p>
                                        <p className="text-xs text-slate-500 font-mono">
                                            {fechaVisual.toLocaleDateString()} - {fechaVisual.toLocaleTimeString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-slate-800">S/ {venta.total.toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">{venta.items.length} prod.</p>
                                </div>
                            </div>
                            {estaAbierto && (
                                <div className="p-4 pt-0 border-t border-dashed border-gray-200 bg-slate-50 rounded-b-xl animate-in fade-in slide-in-from-top-1">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-3">Detalle:</p>
                                    {venta.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm py-1 border-b border-gray-200 last:border-0">
                                            <span className="text-gray-700">{item.name}</span>
                                            <span className="font-medium text-slate-900">S/ {item.price.toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {ventasFiltradas.length === 0 && <div className="text-center py-20 text-gray-400">No hay ventas en este periodo.</div>}
            </div>
        )}

        {/* --- VISTA GRÁFICOS (CORREGIDA) --- */}
        {vista === "GRAFICOS" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. TOP PRODUCTOS */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                    <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <TrendingUp className="text-blue-500"/> Productos Top
                    </h2>
                    <div className="space-y-5">
                        {topProductos.map(([nombre, cantidad], index) => (
                            <div key={nombre}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700 flex gap-2">
                                        <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold ${index===0?'bg-yellow-100 text-yellow-700': 'bg-gray-100 text-gray-500'}`}>#{index+1}</span>
                                        {nombre}
                                    </span>
                                    <span className="font-bold text-slate-900">{cantidad} un.</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${(cantidad / (topProductos[0][1] || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {topProductos.length === 0 && <p className="text-gray-400 italic">Sin datos suficientes.</p>}
                    </div>
                </div>

                {/* 2. VENTAS SEMANALES (ARREGLADO) */}
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 flex flex-col">
                    <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <Calendar className="text-emerald-500"/> Semana Actual
                    </h2>
                    
                    {/* CONTENEDOR DEL GRÁFICO: Alineamos al fondo (items-end) */}
                    <div className="flex items-end justify-between flex-1 h-64 gap-2 border-b border-gray-200 pb-2">
                        {diasSemana.map((dia) => {
                            const totalDia = ventasPorDia[dia] || 0;
                            // Calculamos el máximo global para la escala (mínimo 100 para que no se rompa si es 0)
                            const maxVenta = Math.max(...Object.values(ventasPorDia), 100);
                            // Altura mínima 1% para que se vea la barrita gris base
                            const altura = Math.max((totalDia / maxVenta) * 100, 1); 
                            
                            return (
                                <div key={dia} className="flex flex-col justify-end items-center gap-1 w-full h-full group">
                                    {/* Etiqueta flotante con el monto (se redondea a entero) */}
                                    <div className={`text-[10px] font-bold mb-1 transition-all ${totalDia > 0 ? "text-slate-600 group-hover:-translate-y-1" : "text-transparent"}`}>
                                        S/{Math.round(totalDia)}
                                    </div>
                                    
                                    {/* La Barra */}
                                    <div 
                                        className={`w-full max-w-[30px] rounded-t-md transition-all duration-700 ease-out ${totalDia > 0 ? "bg-emerald-500 group-hover:bg-emerald-400" : "bg-gray-100"}`}
                                        style={{ height: `${altura}%` }}
                                    ></div>
                                    
                                    {/* Día */}
                                    <div className="text-[10px] uppercase text-gray-400 font-bold mt-1">{dia}</div>
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