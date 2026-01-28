"use client";

import { db, Product, User } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useEffect, useRef } from "react";
import { Trash2, Edit, Save, ArrowLeft, PackagePlus, Download, Upload, Image as ImageIcon, Users, Tags, Ruler, Building2, Shield, Key } from "lucide-react";
import Link from "next/link";

export default function AdminProductos() {
  const productos = useLiveQuery(() => db.products.toArray());
  const categoriasDB = useLiveQuery(() => db.categories.toArray());
  const unidadesDB = useLiveQuery(() => db.units.toArray());
  const usuariosDB = useLiveQuery(() => db.users.toArray());
  const configDB = useLiveQuery(() => db.config.get(1)); 

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidad, setUnidad] = useState(""); 
  const [imagen, setImagen] = useState(""); 
  const [idEditando, setIdEditando] = useState<number | null>(null);

  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [nuevaUnidad, setNuevaUnidad] = useState("");
  const [nuevoUser, setNuevoUser] = useState({ name: "", pin: "", role: "VENDEDOR" });
  const [empresa, setEmpresa] = useState({ name: "", ruc: "", address: "", phone: "" });

  useEffect(() => {
      if (configDB) setEmpresa({ name: configDB.name, ruc: configDB.ruc, address: configDB.address, phone: configDB.phone });
  }, [configDB]);

  const imgInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agregarUsuario = async () => {
      if (!nuevoUser.name || !nuevoUser.pin) return alert("Falta nombre o PIN");
      await db.users.add({ 
          name: nuevoUser.name.toUpperCase(), 
          pin: nuevoUser.pin, 
          role: nuevoUser.role as "ADMIN" | "VENDEDOR" 
      });
      setNuevoUser({ name: "", pin: "", role: "VENDEDOR" });
  };
  const borrarUsuario = async (id: number) => { 
      if (confirm("¿Borrar usuario?")) await db.users.delete(id); 
  };

  const guardarEmpresa = async () => { await db.config.put({ id: 1, ...empresa }); alert("✅ Datos actualizados"); };
  const procesarImagen = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onloadend = () => { setImagen(reader.result as string); }; reader.readAsDataURL(file); } };
  const agregarCategoria = async () => { if (!nuevaCategoria) return; await db.categories.add({ name: nuevaCategoria.toUpperCase() }); setNuevaCategoria(""); };
  const borrarCategoria = async (id: number) => { if (confirm("¿Borrar?")) await db.categories.delete(id); };
  const agregarUnidad = async () => { if (!nuevaUnidad) return; await db.units.add({ name: nuevaUnidad.toUpperCase() }); setNuevaUnidad(""); };
  const borrarUnidad = async (id: number) => { if (confirm("¿Borrar?")) await db.units.delete(id); };
  
  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault(); if (!nombre || !precio || !categoria || !unidad) return alert("Falta datos");
    const datos = { name: nombre, price: parseFloat(precio), stock: stock ? parseFloat(stock) : 0, category: categoria, unit: unidad, image: imagen };
    try { if (idEditando) { await db.products.update(idEditando, datos); alert("✅ Actualizado"); } else { await db.products.add(datos); } limpiarForm(); } catch (error) { alert("Error: " + error); }
  };
  const limpiarForm = () => { setNombre(""); setPrecio(""); setStock(""); setImagen(""); setIdEditando(null); setUnidad(""); };
  const cargarParaEditar = (prod: Product) => { setNombre(prod.name); setPrecio(prod.price.toString()); setStock(prod.stock.toString()); setCategoria(prod.category); setUnidad(prod.unit); setImagen(prod.image||""); setIdEditando(prod.id!); };
  const borrarProducto = async (id: number) => { if (confirm("¿Borrar?")) await db.products.delete(id); };
  const exportarDatos = async () => { /* logica backup igual */ };
  const importarDatos = async (e: React.ChangeEvent<HTMLInputElement>) => { /* logica import igual */ };

  if (!productos || !categoriasDB || !usuariosDB || !unidadesDB) return <div className="p-10 text-center">Cargando...</div>;

  return (
    <main className="min-h-screen bg-slate-100 p-6 font-sans pb-20">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4"><Link href="/" className="bg-slate-800 text-white p-3 rounded-full hover:bg-black"><ArrowLeft /></Link><h1 className="text-3xl font-bold text-slate-800">Administrador</h1></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
            <div className="bg-slate-800 p-5 rounded-xl shadow-lg text-white">
                <h3 className="font-bold flex items-center gap-2 mb-4 text-emerald-400"><Building2 size={20}/> Datos del Negocio</h3>
                <div className="space-y-3 text-sm">
                    <div><label className="block text-slate-400 text-xs font-bold mb-1">NOMBRE</label><input type="text" value={empresa.name} onChange={(e)=>setEmpresa({...empresa, name: e.target.value})} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:border-emerald-500 outline-none"/></div>
                    <div><label className="block text-slate-400 text-xs font-bold mb-1">RUC</label><input type="text" value={empresa.ruc} onChange={(e)=>setEmpresa({...empresa, ruc: e.target.value})} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:border-emerald-500 outline-none"/></div>
                    <div><label className="block text-slate-400 text-xs font-bold mb-1">DIRECCIÓN</label><input type="text" value={empresa.address} onChange={(e)=>setEmpresa({...empresa, address: e.target.value})} className="w-full p-2 rounded bg-slate-700 border border-slate-600 focus:border-emerald-500 outline-none"/></div>
                    <button onClick={guardarEmpresa} className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded font-bold mt-2 transition">GUARDAR</button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow border border-gray-200">
                <h3 className="font-bold flex items-center gap-2 mb-3 text-slate-700 text-sm"><Shield size={16}/> Usuarios y Accesos</h3>
                <div className="flex flex-col gap-2 mb-3 bg-gray-50 p-2 rounded border">
                    <input type="text" placeholder="Nombre (Ej: Juan)" value={nuevoUser.name} onChange={(e)=>setNuevoUser({...nuevoUser, name: e.target.value})} className="w-full border p-1.5 rounded text-sm"/>
                    <div className="flex gap-2">
                        <input type="number" placeholder="PIN (4 dig)" value={nuevoUser.pin} onChange={(e)=>setNuevoUser({...nuevoUser, pin: e.target.value})} className="w-1/2 border p-1.5 rounded text-sm"/>
                        <select value={nuevoUser.role} onChange={(e)=>setNuevoUser({...nuevoUser, role: e.target.value})} className="w-1/2 border p-1.5 rounded text-sm font-bold bg-white">
                            <option value="VENDEDOR">Vendedor</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>
                    <button onClick={agregarUsuario} className="bg-blue-600 text-white py-2 rounded font-bold text-xs flex justify-center gap-2"><Key size={14}/> CREAR ACCESO</button>
                </div>
                <div className="flex flex-col gap-2">
                    {usuariosDB.map(u => (
                        <div key={u.id} className="flex justify-between items-center bg-gray-100 p-2 rounded text-xs border border-gray-200">
                            <div><p className="font-bold text-slate-800">{u.name}</p><p className="text-[10px] text-gray-500">PIN: **** | {u.role}</p></div>
                            <button onClick={()=>borrarUsuario(u.id!)} className="text-red-500 bg-white p-1 rounded border hover:bg-red-50"><Trash2 size={14}/></button>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl shadow border">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-slate-700 text-sm"><Tags size={16}/> Categorías</h3>
                <div className="flex gap-2 mb-2"><input type="text" placeholder="Nueva..." value={nuevaCategoria} onChange={(e)=>setNuevaCategoria(e.target.value)} className="w-full border p-1.5 rounded text-sm outline-none"/><button onClick={agregarCategoria} className="bg-blue-600 text-white px-3 rounded font-bold">+</button></div>
                <div className="flex flex-wrap gap-2">{categoriasDB.map(c => <span key={c.id} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-[10px] flex items-center gap-2 font-bold">{c.name} <button onClick={()=>borrarCategoria(c.id!)} className="text-red-500">×</button></span>)}</div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow border">
                <h3 className="font-bold flex items-center gap-2 mb-2 text-slate-700 text-sm"><Ruler size={16}/> Unidades</h3>
                <div className="flex gap-2 mb-2"><input type="text" placeholder="Ej: CAJA..." value={nuevaUnidad} onChange={(e)=>setNuevaUnidad(e.target.value)} className="w-full border p-1.5 rounded text-sm outline-none"/><button onClick={agregarUnidad} className="bg-blue-600 text-white px-3 rounded font-bold">+</button></div>
                <div className="flex flex-wrap gap-2">{unidadesDB.map(u => <span key={u.id} className="bg-orange-50 text-orange-700 px-2 py-1 rounded text-[10px] flex items-center gap-2 font-bold">{u.name} <button onClick={()=>borrarUnidad(u.id!)} className="text-red-500">×</button></span>)}</div>
            </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
             <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
                <h2 className="text-xl font-bold mb-4 flex gap-2 items-center text-blue-600">{idEditando ? <Edit size={20}/> : <PackagePlus size={20}/>} {idEditando ? "Editar Producto" : "Nuevo Producto"}</h2>
                <form onSubmit={guardarProducto} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className="text-xs font-bold text-gray-500">NOMBRE</label><input type="text" autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-2 border rounded focus:border-blue-500 outline-none"/></div>
                    <div className="flex gap-2"><div className="flex-1"><label className="text-xs font-bold text-gray-500">PRECIO (S/)</label><input type="number" step="0.10" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full p-2 border rounded focus:border-blue-500 outline-none"/></div><div className="w-1/3"><label className="text-xs font-bold text-gray-500">UNIDAD</label><select value={unidad} onChange={(e)=>setUnidad(e.target.value)} className="w-full p-2 border rounded bg-white outline-none text-sm font-bold text-gray-700"><option value="">Elegir...</option>{unidadesDB.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div></div>
                    <div><label className="text-xs font-bold text-gray-500">STOCK</label><input type="number" step="0.01" value={stock} onChange={(e) => setStock(e.target.value)} className="w-full p-2 border rounded focus:border-blue-500 outline-none"/></div>
                    <div><label className="text-xs font-bold text-gray-500">CATEGORÍA</label><select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full p-2 border rounded bg-white"><option value="">Elegir...</option>{categoriasDB.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-gray-500">FOTO</label><div className="flex items-center gap-2 mt-1"><button type="button" onClick={() => imgInputRef.current?.click()} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded text-xs border w-full justify-center"><ImageIcon size={16}/> {imagen ? "Cambiar" : "Subir"}</button><input type="file" ref={imgInputRef} onChange={procesarImagen} className="hidden" accept="image/*"/>{imagen && <img src={imagen} className="w-10 h-10 object-cover rounded border"/>}</div></div>
                    <div className="md:col-span-2 flex gap-2 mt-2"><button type="submit" className="flex-1 py-3 bg-blue-600 rounded-lg font-bold text-white"><Save/> Guardar</button>{idEditando && <button type="button" onClick={limpiarForm} className="px-4 bg-gray-200 rounded-lg">Cancelar</button>}</div>
                </form>
            </div>
            <div className="bg-white rounded-xl shadow border overflow-hidden">
                <table className="w-full text-left"><thead className="bg-gray-100 text-xs"><tr><th className="p-3">Info</th><th className="p-3 text-center">Stock</th><th className="p-3">Precio</th><th className="p-3 text-center">Acciones</th></tr></thead>
                <tbody className="divide-y divide-gray-100 text-sm">{productos.map((prod) => (<tr key={prod.id} className="hover:bg-blue-50"><td className="p-3 flex gap-3 items-center">{prod.image ? <img src={prod.image} className="w-10 h-10 object-cover rounded"/> : <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-300"><ImageIcon size={16}/></div>}<div><p className="font-bold">{prod.name}</p><span className="text-[10px] bg-gray-100 px-2 rounded-full">{prod.category}</span></div></td><td className="p-3 text-center font-bold">{prod.stock} <span className="text-[10px] text-gray-400">{prod.unit}</span></td><td className="p-3 font-bold text-blue-600">S/ {prod.price.toFixed(2)}</td><td className="p-3 text-center"><button onClick={() => cargarParaEditar(prod)} className="text-blue-500 mr-2"><Edit size={18}/></button><button onClick={() => borrarProducto(prod.id!)} className="text-red-500"><Trash2 size={18}/></button></td></tr>))}</tbody></table>
            </div>
        </div>
      </div>
    </main>
  );
}