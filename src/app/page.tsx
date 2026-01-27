"use client";

import { db, Product, CartItem, Category, Seller, BusinessConfig } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Trash2, Banknote, User, FileText, Lock, ShoppingBag, Store, LogOut, AlertTriangle, Image as ImageIcon, CheckCircle, Share2, Download, X } from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode"; 
import ResumenDia from "../components/resumenDia";
import { useRouter } from "next/navigation";

// Interface para el ticket
interface TicketData {
    items: CartItem[];
    total: number;
    docType: "BOLETA" | "FACTURA";
    docNum: string;
    date: Date;
    vendor: string;
    clientRuc?: string;
    qr: string;
    // Datos del negocio en el momento de la venta
    businessName: string;
    businessAddress: string;
    businessRuc: string;
}

export default function POS() {
  const router = useRouter();
  
  // --- ESTADOS SESIÓN ---
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [inputClaveTienda, setInputClaveTienda] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  
  // --- LEER CONFIGURACIÓN DE LA BASE DE DATOS ---
  // Aquí es donde el POS busca el nombre "ELSA E.I.R.L" que guardaste
  const configDB = useLiveQuery(() => db.config.get(1)); 
  const [negocioActual, setNegocioActual] = useState<BusinessConfig>({ name: "CARGANDO...", ruc: "---", address: "...", phone: "" });

  useEffect(() => {
      if (configDB) {
          setNegocioActual(configDB);
      }
  }, [configDB]);

  // --- DATOS BD ---
  const productos = useLiveQuery(() => db.products.toArray());
  const categoriasDB = useLiveQuery(() => db.categories.toArray());
  const vendedoresDB = useLiveQuery(() => db.sellers.toArray());

  // --- ESTADOS POS ---
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [tipoDoc, setTipoDoc] = useState<"BOLETA" | "FACTURA">("BOLETA");
  const [vendedorId, setVendedorId] = useState(""); 
  const [clienteRuc, setClienteRuc] = useState("");
  
  const [ticketData, setTicketData] = useState<TicketData | null>(null); 
  const [mostrarModal, setMostrarModal] = useState(false);

  const ticketRef = useRef<HTMLDivElement>(null);
  const totalCalculado = carrito.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // --- MEMORIA DE SESIÓN ---
  useEffect(() => {
    const sesionActiva = sessionStorage.getItem("POS_SESION_ACTIVA");
    if (sesionActiva === "true") {
        setAccesoConcedido(true);
    }
  }, []);

  useEffect(() => {
      if (vendedoresDB && vendedoresDB.length > 0 && !vendedorId) setVendedorId(vendedoresDB[0].name);
  }, [vendedoresDB]);

  // LOGIN GENÉRICO
  const intentarLogin = (e: React.FormEvent) => {
      e.preventDefault();
      // CLAVE MAESTRA: 2026
      if (inputClaveTienda === "2026") {
          sessionStorage.setItem("POS_SESION_ACTIVA", "true");
          setAccesoConcedido(true);
      } else {
          setErrorLogin("⛔ Clave incorrecta");
      }
  };

  const cerrarSesion = () => { if(confirm("¿Cerrar turno?")) { sessionStorage.clear(); setAccesoConcedido(false); setInputClaveTienda(""); } };
  
  const irASeccionProtegida = (ruta: string) => {
    const token = sessionStorage.getItem("POS_ADMIN_TOKEN");
    if (token && (Date.now() - parseInt(token) < 300000)) { router.push(ruta); return; }
    const pin = prompt("🔒 PIN Admin (Default: 1234):");
    if (pin === "1234") { sessionStorage.setItem("POS_ADMIN_TOKEN", Date.now().toString()); router.push(ruta); }
    else if (pin !== null) alert("⛔ Incorrecto");
  };

  // --- LÓGICA CARRITO ---
  const agregarAlCarrito = (producto: Product) => { const existente = carrito.find(item => item.id === producto.id); if (existente) { setCarrito(carrito.map(item => item.id === producto.id ? { ...item, quantity: item.quantity + 1 } : item)); } else { setCarrito([...carrito, { ...producto, quantity: 1 }]); } };
  const cambiarCantidad = (index: number, nuevaCant: string) => { const cantidadNumerica = parseFloat(nuevaCant); if (cantidadNumerica >= 0) { const nuevoCarrito = [...carrito]; nuevoCarrito[index].quantity = cantidadNumerica; setCarrito(nuevoCarrito); } };
  const eliminarDelCarrito = (index: number) => { setCarrito(carrito.filter((_, i) => i !== index)); };
  const descontarStock = async () => { for (const item of carrito) { if (item.id) { const prod = await db.products.get(item.id); if (prod) await db.products.update(item.id, { stock: (prod.stock || 0) - item.quantity }); } } };

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    if (carrito.some(i => i.quantity <= 0)) return alert("Cantidades > 0");
    if (tipoDoc === "FACTURA" && clienteRuc.length !== 11) return alert("RUC inválido");
    if (!vendedorId) return alert("Seleccione vendedor");

    try {
      setProcesando(true);
      const serie = tipoDoc === "BOLETA" ? "B001" : "F001";
      const num = `${serie}-${Date.now().toString().slice(-6)}`;
      const fecha = new Date();
      
      await db.sales.add({ date: fecha, total: totalCalculado, items: carrito });
      await descontarStock();
      
      const qrRaw = `${negocioActual.ruc}|${tipoDoc}|${totalCalculado.toFixed(2)}|${fecha.toLocaleDateString()}`;
      const qrUrl = await QRCode.toDataURL(qrRaw, { width: 100, margin: 1 });

      const dataFinal: TicketData = {
          items: JSON.parse(JSON.stringify(carrito)),
          total: totalCalculado,
          docType: tipoDoc,
          docNum: num,
          date: fecha,
          vendor: vendedorId,
          clientRuc: clienteRuc,
          qr: qrUrl,
          businessName: negocioActual.name,     // USA EL NOMBRE DE LA BD
          businessAddress: negocioActual.address,
          businessRuc: negocioActual.ruc
      };

      setTicketData(dataFinal);
      setMostrarModal(true);
      setCarrito([]); setClienteRuc("");
      
    } catch (e) { alert("Error al procesar"); console.error(e); } 
    finally { setProcesando(false); }
  };

  const descargarImagen = async () => { if (!ticketRef.current || !ticketData) { alert("Error ticket."); return; } await new Promise(resolve => setTimeout(resolve, 100)); try { const canvas = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true }); const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `Ticket-${ticketData.docNum}.png`; link.click(); } catch (e) { console.error(e); alert("Error imagen."); } };
  
  // --- WHATSAPP CORREGIDO CON PRECIO UNITARIO ---
  const enviarWhatsApp = () => {
      if (!ticketData) return;
      let t = `🧾 *${ticketData.businessName}*\n`;
      t += `📄 ${ticketData.docType}: ${ticketData.docNum}\n`;
      t += `👤 Vendedor: ${ticketData.vendor}\n`;
      t += `--------------------------------\n`;
      
      ticketData.items.forEach(i => { 
          // CÁLCULO VISIBLE: P.UNIT x CANTIDAD = TOTAL
          const pu = i.price.toFixed(2);
          const tot = (i.price * i.quantity).toFixed(2);
          t += `▪️ ${i.quantity} ${i.unit || 'UNID'} x ${i.name}\n`;
          t += `   (P.U: S/ ${pu})  👉 S/ ${tot}\n`; 
      });

      t += `--------------------------------\n`;
      t += `💰 *TOTAL: S/ ${ticketData.total.toFixed(2)}*`;
      
      window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank');
  };

  const cerrarModal = () => { setMostrarModal(false); setTicketData(null); };

  if (!accesoConcedido) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl w-full max-w-sm text-center shadow-xl">
                  <Store size={48} className="mx-auto text-blue-600 mb-4"/>
                  <h1 className="text-3xl font-black text-slate-800 mb-2">LIBRE-CAJA</h1>
                  <p className="text-slate-500 mb-6 text-sm">Ingrese Clave de Acceso</p>
                  <form onSubmit={intentarLogin} className="space-y-4">
                      <input type="password" value={inputClaveTienda} onChange={(e)=>setInputClaveTienda(e.target.value)} className="w-full p-3 border rounded text-center text-lg uppercase tracking-widest focus:ring-2 ring-blue-500 outline-none" autoFocus placeholder="CLAVE"/>
                      {errorLogin && <p className="text-red-500 font-bold">{errorLogin}</p>}
                      <button className="w-full bg-slate-900 text-white py-3 rounded font-bold flex justify-center gap-2 hover:bg-black"><Lock size={18}/> ENTRAR</button>
                  </form>
              </div>
          </div>
      );
  }

  if (!productos || !categoriasDB || !vendedoresDB) return <div className="p-10 text-center">Cargando...</div>;
  const productosFiltrados = categoriaSeleccionada === "Todos" ? productos : productos.filter(p => p.category === categoriaSeleccionada);

  return (
    <main className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
      
      {/* TICKET DINÁMICO OCULTO */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -50, opacity: 0, pointerEvents: 'none' }}>
        {ticketData && (
            <div id="ticket-oculto" ref={ticketRef} style={{ width: '350px', padding: '20px', fontFamily: 'monospace', backgroundColor: '#ffffff', color: '#000000', border: '1px solid #000000' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                    <h2 style={{ fontWeight: 'bold', fontSize: '18px', textTransform: 'uppercase', margin: 0 }}>{ticketData.businessName}</h2>
                    <p style={{ fontSize: '10px', margin: '2px 0' }}>{ticketData.businessAddress}</p>
                    <p style={{ fontSize: '10px', margin: '2px 0' }}>RUC: {ticketData.businessRuc}</p>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '5px 0' }}>{ticketData.docType}: {ticketData.docNum}</p>
                </div>
                <div style={{ fontSize: '10px', marginBottom: '10px' }}>
                    <p style={{ margin: '2px 0' }}>FECHA: {ticketData.date.toLocaleDateString()} {ticketData.date.toLocaleTimeString()}</p>
                    <p style={{ margin: '2px 0' }}>VENDEDOR: {ticketData.vendor}</p>
                    {ticketData.docType === "FACTURA" && <p style={{ margin: '2px 0' }}>CLIENTE: {ticketData.clientRuc}</p>}
                </div>
                <div style={{ borderBottom: '1px dashed #000000', margin: '5px 0' }}></div>
                <table style={{ width: '100%', fontSize: '9px', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #000' }}><th style={{ width: '10%', padding: '2px 0' }}>CANT</th><th style={{ width: '15%', padding: '2px 0' }}>UNID</th><th style={{ width: '35%', padding: '2px 0' }}>DESCRIP.</th><th style={{ width: '20%', padding: '2px 0', textAlign: 'right' }}>P.UNIT</th><th style={{ width: '20%', padding: '2px 0', textAlign: 'right' }}>IMPORTE</th></tr>
                    </thead>
                    <tbody>
                        {ticketData.items.map((it, i) => (
                            <tr key={i} style={{ borderBottom: '1px dotted #ccc' }}>
                                <td style={{ verticalAlign: 'top', padding: '4px 0' }}>{it.quantity}</td>
                                <td style={{ verticalAlign: 'top', padding: '4px 0' }}>{it.unit || 'UNID'}</td>
                                <td style={{ verticalAlign: 'top', padding: '4px 0' }}>{it.name}</td>
                                <td style={{ verticalAlign: 'top', padding: '4px 0', textAlign: 'right' }}>{it.price.toFixed(2)}</td>
                                <td style={{ verticalAlign: 'top', padding: '4px 0', textAlign: 'right', fontWeight: 'bold' }}>{(it.price * it.quantity).toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div style={{ borderBottom: '1px dashed #000000', margin: '10px 0' }}></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginTop: '5px' }}><span>TOTAL A PAGAR</span><span>S/ {ticketData.total.toFixed(2)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '15px' }}><img src={ticketData.qr} width={100} height={100} alt="QR" style={{ display: 'block' }}/></div>
                <p style={{ fontSize: '9px', textAlign: 'center', marginTop: '10px' }}>Gracias por su preferencia</p>
            </div>
        )}
      </div>

      {/* MODAL ÉXITO */}
      {mostrarModal && ticketData && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center transform scale-100 animate-in zoom-in-95">
                  <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center text-green-600 mb-4"><CheckCircle size={40} /></div>
                  <h2 className="text-2xl font-black text-slate-800">¡Venta Exitosa!</h2>
                  <p className="text-slate-500 mb-6 font-mono text-sm">{ticketData.docNum} | S/ {ticketData.total.toFixed(2)}</p>
                  <div className="space-y-3">
                      <button onClick={enviarWhatsApp} className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Share2 size={20}/> WhatsApp</button>
                      <button onClick={descargarImagen} className="w-full bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"><Download size={20}/> Descargar Ticket</button>
                      <button onClick={cerrarModal} className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"><X size={20}/> Cerrar</button>
                  </div>
              </div>
          </div>
      )}

      {/* PANEL IZQUIERDO: CARRITO */}
      <section className="w-[35%] bg-white border-r flex flex-col shadow-2xl z-10">
        <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
             <h2 className="font-bold flex items-center gap-2"><ShoppingCart size={20}/> Venta</h2>
             <button onClick={cerrarSesion} title="Salir"><LogOut size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
             {carrito.map((item, i) => (
                 <div key={i} className="flex flex-col bg-white p-2 mb-2 rounded border shadow-sm">
                     <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2 overflow-hidden">
                           {item.image ? <img src={item.image} className="w-8 h-8 rounded object-cover"/> : <ImageIcon size={20} className="text-gray-300"/>}
                           <div className="flex flex-col">
                               <span className="font-medium text-sm truncate w-32">{item.name}</span>
                               <span className="text-[10px] text-gray-400 font-bold">{item.unit || 'UNID'}</span>
                           </div>
                        </div>
                        <button onClick={()=>eliminarDelCarrito(i)} className="text-red-400 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                     </div>
                     <div className="flex items-center justify-between bg-gray-50 p-1 rounded">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500 font-bold">CANT:</span>
                            <input type="number" value={item.quantity} onChange={(e) => cambiarCantidad(i, e.target.value)} className="w-16 p-1 text-center font-bold border border-gray-300 rounded text-sm outline-none focus:border-blue-500" step="0.01"/>
                        </div>
                        <span className="font-bold text-slate-800">S/ {(item.price * item.quantity).toFixed(2)}</span>
                     </div>
                 </div>
             ))}
             {carrito.length === 0 && <div className="text-center py-10 text-gray-400 text-sm">Carrito vacío</div>}
        </div>
        <div className="p-4 bg-slate-100 border-t space-y-3">
             <div className="flex items-center gap-2 bg-white p-2 rounded border">
                 <User size={20} className="text-gray-400"/>
                 <select value={vendedorId} onChange={(e)=>setVendedorId(e.target.value)} className="w-full bg-transparent outline-none font-bold text-gray-700">
                     <option value="">-- Seleccionar Vendedor --</option>
                     {vendedoresDB.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                 </select>
             </div>
             <div className="flex gap-2">
                 <button onClick={()=>setTipoDoc("BOLETA")} className={`flex-1 py-2 rounded font-bold text-sm border ${tipoDoc==="BOLETA"?"bg-blue-600 text-white":"bg-white"}`}>BOLETA</button>
                 <button onClick={()=>setTipoDoc("FACTURA")} className={`flex-1 py-2 rounded font-bold text-sm border ${tipoDoc==="FACTURA"?"bg-blue-600 text-white":"bg-white"}`}>FACTURA</button>
             </div>
             {tipoDoc==="FACTURA" && <input type="number" placeholder="RUC Cliente" value={clienteRuc} onChange={(e)=>setClienteRuc(e.target.value)} className="w-full p-2 border rounded"/>}
        </div>
        <div className="p-4 bg-white border-t">
             <div className="flex justify-between text-3xl font-black mb-4"><span>Total</span><span>S/ {totalCalculado.toFixed(2)}</span></div>
             <button onClick={procesarVenta} disabled={procesando || carrito.length===0} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-xl flex justify-center gap-2 transition active:scale-95 disabled:bg-gray-300">
                 {procesando ? "..." : <>COBRAR <Banknote/></>}
             </button>
        </div>
      </section>

      {/* DERECHA: CATÁLOGO */}
      <section className="w-[65%] flex flex-col h-full bg-slate-100">
         <div className="p-6 pb-2">
             <ResumenDia />
             <div className="flex justify-between items-center mb-4 mt-4">
                 <div>
                    <h1 className="text-xl font-bold text-slate-700 flex gap-2 items-center"><FileText size={20}/> Catálogo</h1>
                    {/* AQUI SE MUESTRA EL NOMBRE QUE VIENE DE LA BD */}
                    <p className="text-xs font-bold text-gray-400 uppercase">{negocioActual.name}</p>
                 </div>
                 <div className="flex gap-2">
                     <button onClick={()=>irASeccionProtegida('/ventas')} className="bg-white border px-4 py-2 rounded-lg flex gap-2 text-sm font-bold shadow-sm hover:bg-gray-50"><ShoppingBag size={18}/> VENTAS</button>
                     <button onClick={()=>irASeccionProtegida('/productos')} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex gap-2 text-sm font-bold shadow hover:bg-black"><Lock size={16}/> ADMIN</button>
                 </div>
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                 <button onClick={()=>setCategoriaSeleccionada("Todos")} className={`px-4 py-1.5 rounded-full text-sm font-bold border transition ${categoriaSeleccionada==="Todos"?"bg-blue-600 text-white":"bg-white text-gray-500"}`}>Todos</button>
                 {categoriasDB.map(cat => (
                     <button key={cat.id} onClick={()=>setCategoriaSeleccionada(cat.name)} className={`px-4 py-1.5 rounded-full text-sm font-bold border whitespace-nowrap transition ${categoriaSeleccionada===cat.name?"bg-blue-600 text-white":"bg-white text-gray-500"}`}>{cat.name}</button>
                 ))}
             </div>
         </div>
         <div className="p-6 pt-0 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
             {productosFiltrados.map((prod) => (
                 <button key={prod.id} onClick={()=>agregarAlCarrito(prod)} className={`bg-white p-3 rounded-xl shadow-sm border flex flex-col items-center justify-between h-40 relative group hover:shadow-lg transition active:scale-95 ${prod.stock!<=5?'border-red-300 bg-red-50':''}`}>
                     {prod.image ? <img src={prod.image} className="w-16 h-16 object-cover rounded-md group-hover:scale-105 transition"/> : <div className="text-3xl group-hover:scale-110 transition">📦</div>}
                     <div className="text-center w-full">
                         <p className="font-semibold text-gray-700 text-sm line-clamp-2 h-9 flex items-center justify-center">{prod.name}</p>
                         <div className="flex justify-center gap-2 mt-1 items-center">
                             <span className={`text-[10px] px-2 py-1 rounded font-bold ${prod.stock!<=5?"bg-red-200 text-red-700":"bg-gray-100 text-gray-500"}`}>{prod.stock} {prod.unit || 'UNID'}</span>
                             <div className="text-blue-600 font-bold bg-blue-50 py-1 px-2 rounded-full text-sm">S/ {prod.price.toFixed(2)}</div>
                         </div>
                     </div>
                     {prod.stock!<=5 && <div className="absolute top-2 right-2 text-red-500 animate-pulse"><AlertTriangle size={16}/></div>}
                 </button>
             ))}
         </div>
      </section>
    </main>
  );
}