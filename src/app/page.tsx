"use client"; // 1. Esto avisa a Next.js que esta pantalla usa interactividad (clicks)

import { db, Product } from "../lib/db"; // Importamos nuestro cerebro (BD) y el contrato (Interface)
import { useState } from "react";

export default function Home() {
  // Estado para mostrar mensajes en pantalla (Feedback al usuario)
  const [mensaje, setMensaje] = useState("");

  // LECCIÓN: Función ASÍNCRONA (async)
  // Usamos async porque guardar en BD toma tiempo y no queremos bloquear la pantalla
  const cargarProductosPrueba = async () => {
    try {
      setMensaje("Cargando productos...");

      // 1. Limpiamos la tabla primero para no duplicar (si le das click 2 veces)
      // await = "Espera a que se borre todo antes de seguir"
      await db.products.clear(); 

      // 2. Definimos los datos usando el contrato 'Product'
      // Si aquí pones precio: "Caro", TypeScript te gritará (¡Pruébalo!)
      const productosIniciales: Product[] = [
        { name: "Arroz Faraón (Kg)", price: 4.50, category: "Abarrotes" },
        { name: "Aceite Primor", price: 11.00, category: "Abarrotes" },
        { name: "Coca Cola 3L", price: 12.50, category: "Bebidas" },
        { name: "Inca Kola 1.5L", price: 7.50, category: "Bebidas" },
        { name: "Jabón Bolívar", price: 3.20, category: "Limpieza" },
        { name: "Detergente Marsella", price: 8.00, category: "Limpieza" },
      ];

      // 3. Guardado masivo (Bulk Add)
      // Dexie es inteligente y guarda todo de golpe.
      await db.products.bulkAdd(productosIniciales);

      setMensaje("✅ ¡Éxito! 6 Productos cargados en la Base de Datos Local.");
    } catch (error) {
      setMensaje("❌ Error: " + error);
      console.error(error);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-50">
      <h1 className="text-4xl font-bold text-blue-800 mb-2">POS Cañete 🚀</h1>
      <p className="text-gray-600 mb-8">Configuración Inicial del Sistema</p>

      <div className="card bg-white p-6 rounded-xl shadow-lg text-center max-w-sm w-full">
        <p className="mb-4 text-sm text-gray-500">
          Presiona este botón para simular que eres el dueño llenando su inventario por primera vez.
        </p>
        
        <button 
          onClick={cargarProductosPrueba}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all active:scale-95"
        >
          📥 Cargar Productos de Prueba
        </button>

        {/* Aquí mostramos el mensaje de estado si existe */}
        {mensaje && (
          <div className="mt-4 p-3 bg-blue-50 text-blue-800 rounded text-sm font-medium animate-pulse">
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}