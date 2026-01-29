"use client";
import { db } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { DollarSign, Save, Edit2 } from "lucide-react"; // Agregué el icono Edit2

export default function ResumenDia() {
  const hoyStr = new Date().toLocaleDateString();
  
  const ventasHoy = useLiveQuery(async () => {
    const all = await db.sales.toArray();
    return all.filter(v => new Date(v.date).toLocaleDateString() === hoyStr);
  });

  const cajaDelDia = useLiveQuery(() => db.dailyCash.where("dateStr").equals(hoyStr).first());

  const [inputCaja, setInputCaja] = useState("");
  const [editando, setEditando] = useState(false);

  const totalVentas = ventasHoy?.reduce((sum, v) => sum + v.total, 0) || 0;
  const cajaInicial = cajaDelDia?.initialAmount || 0;
  const dineroEnCaja = cajaInicial + totalVentas;

  const guardarCaja = async () => {
      const monto = parseFloat(inputCaja);
      if (isNaN(monto)) return;
      
      const existente = await db.dailyCash.where("dateStr").equals(hoyStr).first();
      if (existente) {
          await db.dailyCash.update(existente.id!, { initialAmount: monto });
      } else {
          await db.dailyCash.add({ dateStr: hoyStr, initialAmount: monto });
      }
      setEditando(false);
  };

  return (
    <div className="bg-slate-800 text-white p-4 rounded-xl shadow-lg mb-4 border border-slate-700">
        <div className="flex justify-between items-start">
            <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">Resumen del Día ({hoyStr})</h3>
                
                {/* CAJA INICIAL */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-emerald-400 font-bold">Caja Inicial:</span>
                    
                    {editando || !cajaDelDia ? (
                        // MODO EDICIÓN: Fondo Blanco y Letras Negras para máximo contraste
                        <div className="flex gap-2 animate-in fade-in">
                            <input 
                                type="number" 
                                placeholder="0.00" 
                                className="w-24 bg-white text-black font-black text-sm p-1 px-2 rounded outline-none border-2 border-emerald-500 shadow-inner" 
                                autoFocus
                                value={inputCaja} 
                                onChange={e=>setInputCaja(e.target.value)} 
                            />
                            <button onClick={guardarCaja} className="bg-emerald-500 hover:bg-emerald-600 text-white p-1.5 rounded shadow"><Save size={16}/></button>
                        </div>
                    ) : (
                        // MODO VISUALIZACIÓN: Texto blanco grande y botón de editar
                        <button onClick={()=>{setInputCaja(cajaInicial.toString()); setEditando(true);}} className="group flex items-center gap-2 font-bold text-white text-xl hover:text-emerald-400 transition">
                            S/ {cajaInicial.toFixed(2)}
                            <Edit2 size={14} className="text-gray-500 group-hover:text-emerald-400 opacity-50"/>
                        </button>
                    )}
                </div>

                {/* VENTAS */}
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-400">Ventas:</span>
                    <span className="font-bold text-green-400 text-lg">+ S/ {totalVentas.toFixed(2)}</span>
                </div>
            </div>

            {/* TOTAL FINAL */}
            <div className="text-right bg-slate-900 p-3 px-4 rounded-xl border border-slate-600 shadow-inner">
                <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Total en Cajón</p>
                <p className="text-3xl font-black text-white flex items-center justify-end gap-1">
                    <DollarSign size={24} className="text-emerald-500"/> {dineroEnCaja.toFixed(2)}
                </p>
            </div>
        </div>
    </div>
  );
}