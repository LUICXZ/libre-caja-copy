"use client";

import { db, Product, Sale } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useRef } from "react";
import { Trash2, Edit, Save, ArrowLeft, PackagePlus, AlertTriangle, Download, Upload, Database } from "lucide-react";
import Link from "next/link";

export default function AdminProductos() {
  const productos = useLiveQuery(() => db.products.toArray());
  
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("General");
  const [idEditando, setIdEditando] = useState<number | null>(null);

  // REF para el input de archivo invisible
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- 1. FUNCIÓN EXPORTAR (BACKUP) ---
  const exportarDatos = async () => {
    try {
      const allProducts = await db.products.toArray();
      const allSales = await db.sales.toArray();
      
      const backup = {
        fecha: new Date().toISOString(),
        productos: allProducts,
        ventas: allSales
      };

      // Crear archivo invisible y descargarlo
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Copia_Seguridad_POS_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
      link.click();
      
      alert("✅ Copia de seguridad descargada correctamente.");
    } catch (error) {
      console.error(error);
      alert("Error al crear copia.");
    }
  };

  // --- 2. FUNCIÓN IMPORTAR (RESTAURAR) ---
  const importarDatos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ ADVERTENCIA: Al importar, se combinarán los datos con los actuales. ¿Deseas continuar?")) {
        e.target.value = ""; // Limpiar input
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            
            if (json.productos) {
                // Usamos bulkPut para actualizar si existe ID o crear si no
                await db.products.bulkPut(json.productos);
            }
            if (json.ventas) {
                await db.sales.bulkPut(json.ventas);
            }
            
            alert("✅ Datos restaurados con éxito. El sistema está actualizado.");
            window.location.reload(); // Recargar para ver cambios
        } catch (error) {
            alert("❌ El archivo está dañado o no es válido.");
        }
    };
    reader.readAsText(file);
  };

  // --- LÓGICA DE PRODUCTOS (IGUAL QUE ANTES) ---
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio) return alert("Faltan datos");
    const stockNum = stock ? parseInt(stock) : 0;

    try {
      if (idEditando) {
        await db.products.update(idEditando, {
          name: nombre,
          price: parseFloat(precio),
          stock: stockNum,
          category: categoria
        });
        alert("✅ Actualizado");
      } else {
        await db.products.add({
          name: nombre,
          price: parseFloat(precio),
          stock: stockNum,
          category: categoria
        });
      }
      limpiarForm();
    } catch (error) {
      alert("Error: " + error);
    }
  };

  const limpiarForm = () => {
      setNombre("");
      setPrecio("");
      setStock("");
      setCategoria("General");
      setIdEditando(null);
  };

  const cargarParaEditar = (prod: Product) => {
    setNombre(prod.name);
    setPrecio(prod.price.toString());
    setStock(prod.stock ? prod.stock.toString() : "0"); 
    setCategoria(prod.category);
    setIdEditando(prod.id!); 
  };

  const borrarProducto = async (id: number) => {
    if (confirm("¿Borrar producto?")) await db.products.delete(id);
  };

  if (!productos) return <div className="p-10">Cargando...</div>;

  return (
    <main className="min-h-screen bg-slate-100 p-6 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 text-white p-3 rounded-full hover:bg-black transition shadow-lg">
                <ArrowLeft />
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">Administrador</h1>
        </div>
        
        {/* --- BARRA DE GESTIÓN DE DATOS (NUEVA) --- */}
        <div className="flex gap-2">
            <button 
                onClick={exportarDatos}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 shadow-md text-sm font-bold"
            >
                <Download size={18}/> RESGUARDAR DATOS
            </button>
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-700 shadow-md text-sm font-bold"
            >
                <Upload size={18}/> RESTAURAR
            </button>
            {/* Input invisible para cargar archivo */}
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json"
                onChange={importarDatos}
            />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORMULARIO */}
        <div className="bg-white p-6 rounded-xl shadow-lg h-fit border border-gray-200">
          <h2 className="text-xl font-bold mb-4 flex gap-2 items-center text-blue-600">
            {idEditando ? <Edit size={20}/> : <PackagePlus size={20}/>}
            {idEditando ? "Editar Producto" : "Nuevo Producto"}
          </h2>
          
          <form onSubmit={guardarProducto} className="space-y-4">
            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Nombre Producto</label>
                <input 
                    autoFocus
                    type="text" 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded focus:border-blue-500 outline-none"
                    placeholder="Ej: Leche Gloria"
                />
            </div>

            <div className="flex gap-4">
                <div className="w-1/2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Precio (S/)</label>
                    <input 
                        type="number" step="0.10"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded focus:border-blue-500 outline-none"
                        placeholder="0.00"
                    />
                </div>
                <div className="w-1/2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Stock Actual</label>
                    <input 
                        type="number"
                        value={stock}
                        onChange={(e) => setStock(e.target.value)}
                        className={`w-full p-3 border rounded focus:border-blue-500 outline-none font-bold ${parseInt(stock) < 5 ? 'text-red-500 border-red-300 bg-red-50' : 'text-green-600 border-gray-300'}`}
                        placeholder="0"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Categoría</label>
                <select 
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded bg-white"
                >
                    <option value="General">General</option>
                    <option value="Abarrotes">Abarrotes</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Snacks">Snacks</option>
                </select>
            </div>

            <button 
                type="submit"
                className={`w-full py-3 rounded-lg font-bold text-white flex justify-center gap-2 transition-all ${idEditando ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                <Save /> {idEditando ? "Guardar Cambios" : "Guardar en Almacén"}
            </button>
            
            {idEditando && (
                <button 
                    type="button"
                    onClick={limpiarForm}
                    className="w-full py-2 text-gray-500 hover:text-gray-800 text-sm underline"
                >
                    Cancelar Edición
                </button>
            )}
          </form>

          {/* MENSAJE DE SEGURIDAD */}
          <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800 flex gap-2">
            <Database size={32} className="shrink-0"/>
            <p>
                <strong>Importante:</strong> Los datos se guardan en este navegador. 
                Recuerda usar el botón "Resguardar Datos" semanalmente para no perder tu información.
            </p>
          </div>
        </div>

        {/* TABLA DE INVENTARIO */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-bold text-gray-700">Inventario ({productos.length})</h3>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-4">Producto</th>
                            <th className="p-4 text-center">Stock</th>
                            <th className="p-4">Precio</th>
                            <th className="p-4 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {productos.map((prod) => (
                            <tr key={prod.id} className="hover:bg-blue-50 transition-colors">
                                <td className="p-4">
                                    <p className="font-medium text-gray-800">{prod.name}</p>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 rounded-full">{prod.category}</span>
                                </td>
                                
                                <td className="p-4 text-center">
                                    <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                                        (prod.stock || 0) <= 5 
                                        ? "bg-red-100 text-red-600 flex items-center justify-center gap-1" 
                                        : "bg-green-100 text-green-700"
                                    }`}>
                                        {(prod.stock || 0) <= 5 && <AlertTriangle size={12}/>}
                                        {prod.stock || 0} u.
                                    </span>
                                </td>

                                <td className="p-4 font-bold text-gray-600">S/ {prod.price.toFixed(2)}</td>
                                <td className="p-4 flex justify-center gap-2">
                                    <button onClick={() => cargarParaEditar(prod)} className="p-2 text-blue-500 hover:bg-blue-100 rounded">
                                        <Edit size={18} />
                                    </button>
                                    <button onClick={() => borrarProducto(prod.id!)} className="p-2 text-red-500 hover:bg-red-100 rounded">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </main>
  );
}