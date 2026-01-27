"use client";

import { db } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";

export default function ResumenDia() {
  // CONSULTA INTELIGENTE:
  // Dexie observa la tabla 'sales'. Si haces una venta nueva,
  // este número se actualiza solo en milisegundos.
  const ventasHoy = useLiveQuery(async () => {
    const hoy = new Date();
    // Ponemos la hora a 00:00:00 para empezar a contar desde el inicio del día
    const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    
    // Filtramos: Dame todas las ventas donde la fecha sea mayor o igual al inicio de hoy
    return await db.sales
      .where("date")
      .aboveOrEqual(inicioDia)
      .toArray();
  });

  // Si aún no carga, mostramos 0
  if (!ventasHoy) return null;

  // MATEMÁTICA DE NEGOCIO:
  // Sumamos todos los totales de las ventas encontradas
  const totalCaja = ventasHoy.reduce((sum, venta) => sum + venta.total, 0);
  const cantidadVentas = ventasHoy.length;

  return (
    <div className="bg-blue-900 text-white p-4 rounded-xl shadow-lg flex justify-between items-center mb-6">
      <div>
        <h3 className="text-blue-200 text-sm font-semibold uppercase tracking-wider">Caja del Día</h3>
        <p className="text-3xl font-bold">S/ {totalCaja.toFixed(2)}</p>
      </div>
      
      <div className="text-right border-l border-blue-700 pl-4">
        <p className="text-2xl font-bold">{cantidadVentas}</p>
        <span className="text-xs text-blue-300">Ventas Hoy</span>
      </div>
    </div>
  );
}