"use client";

import { db, Product, Category, Seller } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useRef } from "react";
import { Trash2, Edit, Save, ArrowLeft, PackagePlus, AlertTriangle, Download, Upload, Database, Image as ImageIcon, Users, Tags } from "lucide-react";
import Link from "next/link";

export default function AdminProductos() {
  // --- CARGA DE DATOS ---
  const productos = useLiveQuery(() => db.products.toArray());
  const categoriasDB = useLiveQuery(() => db.categories.toArray());
  const vendedoresDB = useLiveQuery(() => db.sellers.toArray());

  // --- ESTADOS PRODUCTO ---
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState(""); // Ahora se llenará dinámicamente
  const [imagen, setImagen] = useState(""); // Para la foto
  const [idEditando, setIdEditando] = useState<number | null>(null);

  // --- ESTADOS DE CONFIGURACIÓN RÁPIDA ---
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevoVendedor, setNuevoVendedor] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  // --- LÓGICA DE FOTOS ---
  const procesarImagen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagen(reader.result as string); // Guardamos la imagen como texto (Base64)
      };
      reader.readAsDataURL(file);
    }
  };

  // --- GESTIÓN DE CATEGORÍAS ---
  const agregarCategoria = async () => {
    if (!nuevaCategoria) return;
    await db.categories.add({ name: nuevaCategoria.toUpperCase() });
    setNuevaCategoria("");
  };
  const borrarCategoria = async (id: number) => {
    if (confirm("¿Borrar categoría?")) await db.categories.delete(id);
  };

  // --- GESTIÓN DE VENDEDORES ---
  const agregarVendedor = async () => {
    if (!nuevoVendedor) return;
    await db.sellers.add({ name: nuevoVendedor });
    setNuevoVendedor("");
  };
  const borrarVendedor = async (id: number) => {
    if (confirm("¿Borrar vendedor?")) await db.sellers.delete(id);
  };

  // --- GESTIÓN DE PRODUCTOS ---
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre || !precio || !categoria) return alert("Falta nombre, precio o categoría");
    
    const stockNum = stock ? parseInt(stock) : 0;
    const datos = {
        name: nombre,
        price: parseFloat(precio),
        stock: stockNum,
        category: categoria,
        image: imagen // Guardamos la foto
    };

    try {
      if (idEditando) {
        await db.products.update(idEditando, datos);
        alert("✅ Actualizado");
      } else {
        await db.products.add(datos);
      }
      limpiarForm();
    } catch (error) {
      alert("Error: " + error);
    }
  };

  const limpiarForm = () => {
      setNombre(""); setPrecio(""); setStock(""); setImagen(""); setIdEditando(null);
      // No limpiamos categoría para facilitar ingresos masivos
  };

  const cargarParaEditar = (prod: Product) => {
    setNombre(prod.name);
    setPrecio(prod.price.toString());
    setStock(prod.stock ? prod.stock.toString() : "0"); 
    setCategoria(prod.category);
    setImagen(prod.image || "");
    setIdEditando(prod.id!); 
  };

  const borrarProducto = async (id: number) => {
    if (confirm("¿Borrar producto?")) await db.products.delete(id);
  };

  // --- BACKUP (Exportar/Importar) ---
  const exportarDatos = async () => {
    const backup = {
      fecha: new Date().toISOString(),
      productos: await db.products.toArray(),
      ventas: await db.sales.toArray(),
      categorias: await db.categories.toArray(),
      vendedores: await db.sellers.toArray()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Backup_POS_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    link.click();
  };

  const importarDatos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("⚠️ Se combinarán los datos. ¿Seguir?")) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const json = JSON.parse(event.target?.result as string);
            if (json.productos) await db.products.bulkPut(json.productos);
            if (json.ventas) await db.sales.bulkPut(json.ventas);
            if (json.categorias) await db.categories.bulkPut(json.categorias);
            if (json.vendedores) await db.sellers.bulkPut(json.vendedores);
            alert("✅ Restaurado con éxito.");
            window.location.reload();
        } catch (error) { alert("❌ Archivo inválido."); }
    };
    reader.readAsText(file);
  };

  if (!productos || !categoriasDB || !vendedoresDB) return <div className="p-10">Cargando...</div>;

  return (
    <main className="min-h-screen bg-slate-100 p-6 font-sans pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
            <Link href="/" className="bg-slate-800 text-white p-3 rounded-full hover:bg-black transition shadow-lg">
                <ArrowLeft />
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">Administrador</h1>
        </div>
        <div className="flex gap-2">
            <button onClick={exportarDatos} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Download size={18}/> BACKUP</button>
            <button onClick={() => fileInputRef.current?.click()} className="bg-slate-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold"><Upload size={18}/> RESTAURAR</button>
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={importarDatos}/>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: CONFIGURACIÓN (Vendedores y Categorías) */}
        <div className="space-y-6">
            {/* VENDEDORES */}
            <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700"><Users size={18}/> Equipo de Ventas</h3>
                <div className="flex gap-2 mb-3">
                    <input type="text" placeholder="Nuevo Vendedor" value={nuevoVendedor} onChange={(e)=>setNuevoVendedor(e.target.value)} className="w-full border p-2 rounded text-sm outline-none"/>
                    <button onClick={agregarVendedor} className="bg-blue-600 text-white px-3 rounded font-bold">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {vendedoresDB.map(v => (
                        <span key={v.id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-2">
                            {v.name} <button onClick={() => borrarVendedor(v.id!)} className="text-red-400 hover:text-red-600">×</button>
                        </span>
                    ))}
                    {vendedoresDB.length === 0 && <span className="text-xs text-gray-400">Sin vendedores. Agrega uno.</span>}
                </div>
            </div>

            {/* CATEGORÍAS */}
            <div className="bg-white p-5 rounded-xl shadow border border-gray-200">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700"><Tags size={18}/> Categorías</h3>
                <div className="flex gap-2 mb-3">
                    <input type="text" placeholder="Nueva Categoría" value={nuevaCategoria} onChange={(e)=>setNuevaCategoria(e.target.value)} className="w-full border p-2 rounded text-sm outline-none"/>
                    <button onClick={agregarCategoria} className="bg-blue-600 text-white px-3 rounded font-bold">+</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {categoriasDB.map(c => (
                        <span key={c.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs flex items-center gap-2 border border-blue-100">
                            {c.name} <button onClick={() => borrarCategoria(c.id!)} className="text-red-400 hover:text-red-600">×</button>
                        </span>
                    ))}
                    {categoriasDB.length === 0 && <span className="text-xs text-gray-400">Sin categorías.</span>}
                </div>
            </div>
        </div>

        {/* COLUMNA 2 Y 3: PRODUCTOS */}
        <div className="lg:col-span-2 space-y-6">
             {/* FORMULARIO PRODUCTO */}
             <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                <h2 className="text-xl font-bold mb-4 flex gap-2 items-center text-blue-600">
                    {idEditando ? <Edit size={20}/> : <PackagePlus size={20}/>}
                    {idEditando ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <form onSubmit={guardarProducto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500">NOMBRE</label>
                        <input type="text" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border rounded focus:border-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">PRECIO (S/)</label>
                        <input type="number" step="0.10" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full p-2 border rounded focus:border-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">STOCK</label>
                        <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-2 border rounded focus:border-blue-500 outline-none"/>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500">CATEGORÍA</label>
                        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-2 border rounded bg-white">
                            <option value="">-- Seleccionar --</option>
                            {categoriasDB.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                        {categoriasDB.length === 0 && <p className="text-[10px] text-red-500 mt-1">⚠️ Crea categorías primero</p>}
                    </div>
                    
                    {/* INPUT DE IMAGEN */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 flex justify-between">
                            FOTO (Opcional) 
                            {imagen && <button type="button" onClick={()=>setImagen("")} className="text-red-500 text-[10px]">Quitar</button>}
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                            <button type="button" onClick={() => imgInputRef.current?.click()} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded text-xs border w-full justify-center">
                                <ImageIcon size={16}/> {imagen ? "Cambiar Foto" : "Subir Foto"}
                            </button>
                            <input type="file" ref={imgInputRef} onChange={procesarImagen} className="hidden" accept="image/*"/>
                            {imagen && <img src={imagen} alt="Preview" className="w-10 h-10 object-cover rounded border"/>}
                        </div>
                    </div>

                    <div className="md:col-span-2 flex gap-2 mt-2">
                        <button type="submit" className={`flex-1 py-3 rounded-lg font-bold text-white flex justify-center gap-2 ${idEditando ? 'bg-orange-500' : 'bg-blue-600'}`}>
                            <Save /> {idEditando ? "Guardar Cambios" : "Guardar"}
                        </button>
                        {idEditando && <button type="button" onClick={limpiarForm} className="px-4 bg-gray-200 rounded-lg text-gray-600">Cancelar</button>}
                    </div>
                </form>
            </div>

            {/* TABLA DE PRODUCTOS */}
            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                        <tr>
                            <th className="p-3">Foto</th>
                            <th className="p-3">Producto</th>
                            <th className="p-3 text-center">Stock</th>
                            <th className="p-3">Precio</th>
                            <th className="p-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {productos.map((prod) => (
                            <tr key={prod.id} className="hover:bg-blue-50">
                                <td className="p-3">
                                    {prod.image ? <img src={prod.image} className="w-10 h-10 object-cover rounded shadow-sm"/> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>}
                                </td>
                                <td className="p-3">
                                    <p className="font-bold text-gray-800">{prod.name}</p>
                                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 rounded-full">{prod.category}</span>
                                </td>
                                <td className="p-3 text-center font-bold text-gray-600">{prod.stock}</td>
                                <td className="p-3 font-bold text-blue-600">S/ {prod.price.toFixed(2)}</td>
                                <td className="p-3 flex justify-center gap-2">
                                    <button onClick={() => cargarParaEditar(prod)} className="text-blue-500"><Edit size={18} /></button>
                                    <button onClick={() => borrarProducto(prod.id!)} className="text-red-500"><Trash2 size={18} /></button>
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