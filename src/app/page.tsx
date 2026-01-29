"use client";

import { db, Product, CartItem, Category, User, BusinessConfig } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Trash2, Banknote, User as UserIcon, FileText, Lock, ShoppingBag, Store, LogOut, AlertTriangle, Image as ImageIcon, CheckCircle, Share2, Download, X, Wallet, Building } from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode"; 
import ResumenDia from "../components/resumenDia";
import { useRouter } from "next/navigation";

// --- CLIENTES AUTORIZADOS ---
const CLIENTES_AUTORIZADOS: Record<string, { nombre: string, ruc: string, direccion: string, pinMaster: string }> = {
    "2026": { nombre: "INVERSIONES CIELO Y DYLAN", ruc: "20602953638", direccion: "Imperial, Cañete", pinMaster: "1234" },
    "JUAN_POS": { nombre: "BODEGA DON JUAN", ruc: "10456789123", direccion: "Plaza de Armas 123", pinMaster: "5555" }
};

interface TicketData { 
    items: CartItem[]; 
    subtotal: number;
    discount: number;
    total: number; 
    payment: number;
    change: number;
    docType: "BOLETA" | "FACTURA"; docNum: string; date: Date; vendor: string; clientRuc?: string; qr: string; businessName: string; businessAddress: string; businessRuc: string; 
}

export default function POS() {
  const router = useRouter();
  
  // --- ESTADOS ---
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [inputClaveTienda, setInputClaveTienda] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [licenciaActiva, setLicenciaActiva] = useState<string | null>(null);
  const [vistaMovil, setVistaMovil] = useState<"CATALOGO" | "CARRITO">("CATALOGO");

  // --- DATOS ---
  const productos = useLiveQuery(() => db.products.toArray());
  const categoriasDB = useLiveQuery(() => db.categories.toArray());
  const vendedoresDB = useLiveQuery(() => db.users.toArray());
  const configDB = useLiveQuery(() => db.config.get(1));

  // --- POS ---
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  const [tipoDoc, setTipoDoc] = useState<"BOLETA" | "FACTURA">("BOLETA");
  const [vendedorId, setVendedorId] = useState(""); 
  const [clienteRuc, setClienteRuc] = useState(""); // ESTE ES EL ESTADO DEL RUC
  
  // --- NUEVOS ESTADOS DE PAGO ---
  const [descuentoInput, setDescuentoInput] = useState(""); 
  const [pagoClienteInput, setPagoClienteInput] = useState(""); 

  const [ticketData, setTicketData] = useState<TicketData | null>(null); 
  const [mostrarModal, setMostrarModal] = useState(false);
  const ticketRef = useRef<HTMLDivElement>(null);
  
  // --- CÁLCULOS MATEMÁTICOS ---
  const subTotalCalculado = carrito.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const descuento = parseFloat(descuentoInput) || 0;
  const totalFinal = Math.max(0, subTotalCalculado - descuento); 
  const pagoCliente = parseFloat(pagoClienteInput) || 0;
  const vuelto = pagoCliente >= totalFinal ? pagoCliente - totalFinal : 0;

  useEffect(() => {
    const licencia = sessionStorage.getItem("POS_LICENCIA_ACTIVA");
    if (licencia && CLIENTES_AUTORIZADOS[licencia]) {
        setLicenciaActiva(licencia); setAccesoConcedido(true);
        sincronizarDatosNegocio(licencia);
    }
  }, []);

  const sincronizarDatosNegocio = async (licencia: string) => {
      const dm = CLIENTES_AUTORIZADOS[licencia];
      const actual = await db.config.get(1);
      if (!actual || actual.name === "SIN CONFIGURAR") await db.config.put({ id: 1, name: dm.nombre, ruc: dm.ruc, address: dm.direccion, phone: "" });
  };

  useEffect(() => { if (vendedoresDB && vendedoresDB.length > 0 && !vendedorId) setVendedorId(vendedoresDB[0].name); }, [vendedoresDB]);

  const intentarLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (CLIENTES_AUTORIZADOS[inputClaveTienda]) {
          sessionStorage.setItem("POS_LICENCIA_ACTIVA", inputClaveTienda);
          setLicenciaActiva(inputClaveTienda); setAccesoConcedido(true); sincronizarDatosNegocio(inputClaveTienda);
      } else setErrorLogin("⛔ Licencia no válida");
  };
  const cerrarSesion = () => { if(confirm("¿Salir?")) { sessionStorage.clear(); setAccesoConcedido(false); setInputClaveTienda(""); setLicenciaActiva(null); } };
  const irASeccionProtegida = (ruta: string) => {
    if(!licenciaActiva) return;
    const pin = prompt("🔒 PIN Admin:");
    if (pin === CLIENTES_AUTORIZADOS[licenciaActiva].pinMaster) { router.push(ruta); } else alert("⛔ Incorrecto");
  };

  const agregarAlCarrito = (p: Product) => { 
      const ex = carrito.find(i => i.id === p.id); 
      if (ex) setCarrito(carrito.map(i => i.id === p.id ? { ...i, quantity: i.quantity + 1 } : i)); 
      else setCarrito([...carrito, { ...p, quantity: 1 }]); 
  };
  const cambiarCantidad = (idx: number, v: string) => { const c = parseFloat(v); if (c >= 0) { const n = [...carrito]; n[idx].quantity = c; setCarrito(n); } };
  const eliminarDelCarrito = (idx: number) => { setCarrito(carrito.filter((_, i) => i !== idx)); };

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    if (pagoCliente < totalFinal && pagoCliente > 0) return alert(`Falta dinero. Total: ${totalFinal}, Pagó: ${pagoCliente}`);
    
    // VALIDACIÓN DE RUC
    if (tipoDoc === "FACTURA" && clienteRuc.length !== 11) return alert("⚠️ Para FACTURA el RUC debe tener 11 dígitos");
    
    if (!vendedorId) return alert("Seleccione vendedor");

    try {
      setProcesando(true);
      const num = `${tipoDoc==="BOLETA"?"B":"F"}001-${Date.now().toString().slice(-6)}`;
      const fecha = new Date();
      
      await db.sales.add({ date: fecha, total: totalFinal, subtotal: subTotalCalculado, discount: descuento, payment: pagoCliente, change: vuelto, items: carrito });
      for (const i of carrito) { if (i.id) { const p = await db.products.get(i.id); if (p) await db.products.update(i.id, { stock: (p.stock || 0) - i.quantity }); } }
      
      const cfg = configDB || { name: "TIENDA", ruc: "000", address: "...", phone: "" };
      const qrRaw = `${cfg.ruc}|${tipoDoc}|${totalFinal.toFixed(2)}|${fecha.toLocaleDateString()}`;
      const qrUrl = await QRCode.toDataURL(qrRaw, { width: 100, margin: 1 });

      setTicketData({ items: JSON.parse(JSON.stringify(carrito)), subtotal: subTotalCalculado, discount: descuento, total: totalFinal, payment: pagoCliente, change: vuelto, docType: tipoDoc, docNum: num, date: fecha, vendor: vendedorId, clientRuc: clienteRuc, qr: qrUrl, businessName: cfg.name, businessAddress: cfg.address, businessRuc: cfg.ruc });
      setMostrarModal(true); setCarrito([]); setDescuentoInput(""); setPagoClienteInput(""); setClienteRuc("");
    } catch (e) { alert("Error"); console.error(e); } finally { setProcesando(false); }
  };

  const descargarImagen = async () => { if (!ticketRef.current || !ticketData) return; await new Promise(r => setTimeout(r, 100)); try { const c = await html2canvas(ticketRef.current, { scale: 2, backgroundColor: "#fff", logging: false, useCORS: true }); const l = document.createElement("a"); l.href = c.toDataURL("image/png"); l.download = `T-${ticketData.docNum}.png`; l.click(); } catch (e) { console.error(e); } };
  
  const enviarWhatsApp = () => {
      if (!ticketData) return;
      let t = `🧾 *${ticketData.businessName}*\n📄 ${ticketData.docType}: ${ticketData.docNum}\n👤 Vendedor: ${ticketData.vendor}\n`;
      if(ticketData.docType === "FACTURA") t += `🏢 RUC Cliente: ${ticketData.clientRuc}\n`; // Mostrar RUC en WhatsApp si es Factura
      t += `---\n`;
      ticketData.items.forEach(i => { t += `▪ ${i.quantity} ${i.unit||'UND'} x ${i.name}\n   (P.U: S/ ${i.price.toFixed(2)}) 👉 S/ ${(i.price*i.quantity).toFixed(2)}\n`; });
      t += `---\n`;
      if(ticketData.discount > 0) t += `Subtotal: S/ ${ticketData.subtotal.toFixed(2)}\n🎁 Descuento: - S/ ${ticketData.discount.toFixed(2)}\n`;
      t += `💰 *TOTAL A PAGAR: S/ ${ticketData.total.toFixed(2)}*\n`;
      if(ticketData.payment > 0) { t += `💵 Pagó con: S/ ${ticketData.payment.toFixed(2)}\n`; t += `🔄 Vuelto: S/ ${ticketData.change.toFixed(2)}\n`; }
      window.open(`https://wa.me/?text=${encodeURIComponent(t)}`, '_blank');
  };
  const cerrarModal = () => { setMostrarModal(false); setTicketData(null); };

  if (!accesoConcedido) return <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4"><div className="bg-white p-8 rounded-2xl w-full max-w-sm text-center"><Store size={48} className="mx-auto text-blue-600 mb-4"/><h1 className="text-3xl font-black text-slate-800 mb-2">LIBRE-CAJA</h1><form onSubmit={intentarLogin} className="space-y-4"><input type="password" value={inputClaveTienda} onChange={(e)=>setInputClaveTienda(e.target.value)} className="w-full p-3 border rounded text-center text-lg tracking-widest" autoFocus placeholder="CLAVE"/><button className="w-full bg-slate-900 text-white py-3 rounded font-bold">INGRESAR</button></form>{errorLogin && <p className="text-red-500 mt-2 font-bold">{errorLogin}</p>}</div></div>;
  if (!productos || !categoriasDB || !vendedoresDB) return <div className="p-10 text-center">Cargando...</div>;
  const productosFiltrados = categoriaSeleccionada === "Todos" ? productos : productos.filter(p => p.category === categoriaSeleccionada);

  return (
    <main className="flex flex-col md:flex-row h-screen bg-gray-100 overflow-hidden font-sans relative">
      
      {/* TICKET OCULTO */}
      <div style={{ position: 'absolute', top: 0, left: 0, zIndex: -50, opacity: 0, pointerEvents: 'none' }}>
        {ticketData && ( 
            <div id="ticket-oculto" ref={ticketRef} style={{ width: '350px', padding: '20px', fontFamily: 'monospace', backgroundColor: '#fff', color: '#000', border: '1px solid #000' }}> 
                <div style={{textAlign:'center',marginBottom:'10px'}}><h2 style={{fontWeight:'bold',fontSize:'18px',margin:0}}>{ticketData.businessName}</h2><p style={{fontSize:'10px',margin:'2px 0'}}>{ticketData.businessAddress}</p><p style={{fontSize:'10px',margin:'2px 0'}}>RUC: {ticketData.businessRuc}</p><p style={{fontSize:'12px',fontWeight:'bold',margin:'5px 0'}}>{ticketData.docType}: {ticketData.docNum}</p></div>
                <div style={{fontSize:'10px',marginBottom:'10px'}}>
                    <p>FECHA: {ticketData.date.toLocaleString()}</p>
                    <p>VEND: {ticketData.vendor}</p>
                    {/* AQUI SE MUESTRA EL RUC DEL CLIENTE EN LA BOLETA */}
                    {ticketData.clientRuc && <p style={{fontWeight:'bold'}}>RUC CLIENTE: {ticketData.clientRuc}</p>}
                </div>
                <div style={{borderBottom:'1px dashed #000',margin:'5px 0'}}></div>
                <table style={{width:'100%',fontSize:'9px'}}><thead><tr style={{textAlign:'left'}}><th>CNT</th><th>DESCRIP</th><th style={{textAlign:'right'}}>IMP</th></tr></thead><tbody>{ticketData.items.map((it,i)=>(<tr key={i}><td style={{verticalAlign:'top'}}>{it.quantity}</td><td style={{verticalAlign:'top'}}>{it.name}</td><td style={{textAlign:'right',fontWeight:'bold'}}>{(it.price*it.quantity).toFixed(2)}</td></tr>))}</tbody></table>
                <div style={{borderBottom:'1px dashed #000',margin:'10px 0'}}></div>
                <div style={{fontSize:'10px', textAlign:'right', marginBottom:'5px'}}>
                    {ticketData.discount > 0 && <p>Subtotal: S/ {ticketData.subtotal.toFixed(2)}</p>}
                    {ticketData.discount > 0 && <p>Descuento: - S/ {ticketData.discount.toFixed(2)}</p>}
                    <p style={{fontSize:'18px', fontWeight:'bold', margin:'5px 0'}}>TOTAL: S/ {ticketData.total.toFixed(2)}</p>
                    <p>Pagó con: S/ {ticketData.payment.toFixed(2)}</p>
                    <p>Vuelto: S/ {ticketData.change.toFixed(2)}</p>
                </div>
                <div style={{display:'flex',justifyContent:'center',marginTop:'15px'}}><img src={ticketData.qr} width={100}/></div>
                <p style={{fontSize:'9px',textAlign:'center',marginTop:'10px'}}>Gracias por su compra</p>
            </div> 
        )}
      </div>

      {mostrarModal && ticketData && ( <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center"><CheckCircle size={40} className="mx-auto text-green-600 mb-4"/><h2 className="text-2xl font-black text-slate-800">¡Venta Exitosa!</h2><p className="text-slate-500 mb-2 font-mono text-sm">{ticketData.docNum}</p><div className="bg-gray-50 p-3 rounded mb-4 text-sm"><div className="flex justify-between font-bold text-slate-700"><span>TOTAL A COBRAR:</span><span>S/ {ticketData.total.toFixed(2)}</span></div><div className="flex justify-between text-gray-500 text-xs"><span>Pagó con:</span><span>S/ {ticketData.payment.toFixed(2)}</span></div><div className="flex justify-between text-green-600 font-bold"><span>Vuelto:</span><span>S/ {ticketData.change.toFixed(2)}</span></div></div><div className="space-y-3"><button onClick={enviarWhatsApp} className="w-full bg-green-500 text-white py-3 rounded-xl font-bold flex justify-center gap-2"><Share2 size={20}/> WhatsApp</button><button onClick={descargarImagen} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold flex justify-center gap-2"><Download size={20}/> Ticket</button><button onClick={cerrarModal} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-bold flex justify-center gap-2"><X size={20}/> Cerrar</button></div></div></div> )}

      {/* MOVIL NAV */}
      <div className="md:hidden bg-slate-900 text-white p-3 flex justify-between items-center shadow-md z-20 sticky top-0"><div className="flex gap-2"><button onClick={()=>setVistaMovil("CATALOGO")} className={`px-3 py-1 rounded text-sm font-bold ${vistaMovil==="CATALOGO"?"bg-white text-slate-900":"text-gray-400"}`}>Catálogo</button><button onClick={()=>setVistaMovil("CARRITO")} className={`px-3 py-1 rounded text-sm font-bold flex items-center gap-1 ${vistaMovil==="CARRITO"?"bg-white text-slate-900":"text-gray-400"}`}>Carrito <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{carrito.length}</span></button></div><button onClick={cerrarSesion}><LogOut size={18}/></button></div>

      {/* PANEL IZQUIERDO: CARRITO */}
      <section className={`w-full md:w-[35%] bg-white border-r flex flex-col shadow-2xl z-10 transition-all ${vistaMovil === "CARRITO" ? "flex h-[calc(100vh-60px)]" : "hidden md:flex md:h-full"}`}>
        <div className="hidden md:flex p-4 bg-slate-900 text-white justify-between items-center"><h2 className="font-bold flex items-center gap-2"><ShoppingCart size={20}/> Venta</h2><button onClick={cerrarSesion} title="Salir"><LogOut size={20}/></button></div>
        <div className="flex-1 overflow-y-auto p-2 bg-slate-50">
             {carrito.map((item, i) => (
                 <div key={i} className="flex flex-col bg-white p-2 mb-2 rounded border shadow-sm">
                     <div className="flex justify-between items-center mb-2"><div className="flex items-center gap-2 overflow-hidden">{item.image ? <img src={item.image} className="w-10 h-10 rounded object-cover"/> : <ImageIcon size={20} className="text-gray-300"/>}<div className="flex flex-col"><span className="font-medium text-sm truncate w-32 md:w-full">{item.name}</span><span className="text-[10px] text-gray-400 font-bold">{item.unit || 'UNID'}</span></div></div><button onClick={()=>eliminarDelCarrito(i)} className="text-red-400 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button></div>
                     <div className="flex items-center justify-between bg-gray-50 p-1 rounded"><div className="flex items-center gap-2"><span className="text-[10px] text-gray-500 font-bold">CANT:</span><input type="number" value={item.quantity} onChange={(e) => cambiarCantidad(i, e.target.value)} className="w-16 p-1 text-center font-bold border border-gray-300 rounded text-sm outline-none focus:border-blue-500" step="0.01"/></div><span className="font-bold text-slate-800">S/ {(item.price * item.quantity).toFixed(2)}</span></div>
                 </div>
             ))}
             {carrito.length === 0 && <div className="text-center py-10 text-gray-400 text-sm flex flex-col items-center gap-2"><ShoppingCart size={40} className="opacity-20"/><p>Carrito vacío</p></div>}
        </div>

        {/* --- AREA DE TOTALES Y PAGOS --- */}
        <div className="p-4 bg-white border-t space-y-3 pb-20 md:pb-4 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
             <div className="flex justify-between items-center text-sm"><span className="text-gray-500">Subtotal:</span><span className="font-bold">S/ {subTotalCalculado.toFixed(2)}</span></div>
             <div className="flex justify-between items-center text-sm"><span className="text-red-500 font-bold flex items-center gap-1"><AlertTriangle size={12}/> Descuento:</span><div className="flex items-center gap-1 border-b border-red-200"><span className="text-red-500 font-bold">- S/</span><input type="number" placeholder="0.00" value={descuentoInput} onChange={(e)=>setDescuentoInput(e.target.value)} className="w-16 text-right outline-none text-red-500 font-bold bg-transparent placeholder-red-200"/></div></div>
             <div className="flex justify-between text-3xl font-black text-slate-800 border-t pt-2 border-dashed"><span>Total</span><span>S/ {totalFinal.toFixed(2)}</span></div>

             {/* PAGO Y VUELTO */}
             <div className="bg-blue-50 p-2 rounded-lg flex items-center justify-between border border-blue-100">
                 <div className="flex items-center gap-2 text-blue-800"><Wallet size={18}/><span className="text-xs font-bold uppercase">Paga con:</span></div>
                 <div className="flex items-center gap-2"><span className="font-bold text-blue-800">S/</span><input type="number" placeholder="0.00" value={pagoClienteInput} onChange={(e)=>setPagoClienteInput(e.target.value)} className="w-20 p-1 text-right font-bold border rounded focus:ring-2 ring-blue-400 outline-none"/></div>
             </div>
             {pagoCliente > 0 && (<div className={`text-center text-sm font-bold ${vuelto >= 0 ? "text-green-600" : "text-red-500"}`}>{vuelto >= 0 ? `Vuelto: S/ ${vuelto.toFixed(2)}` : `Falta: S/ ${Math.abs(vuelto).toFixed(2)}`}</div>)}

             {/* INFO VENTA Y TIPO DOCUMENTO */}
             <div className="flex flex-col gap-2">
                 <div className="flex gap-2">
                    <div className="flex-1 flex items-center gap-1 bg-gray-100 p-1 rounded px-2"><UserIcon size={14} className="text-gray-400"/><select value={vendedorId} onChange={(e)=>setVendedorId(e.target.value)} className="w-full bg-transparent outline-none font-bold text-gray-700 text-xs"><option value="">Vendedor</option>{vendedoresDB.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}</select></div>
                    <div className="flex gap-1">
                        <button onClick={()=>setTipoDoc("BOLETA")} className={`px-3 py-1 rounded font-bold text-xs border ${tipoDoc==="BOLETA"?"bg-blue-600 text-white":"bg-white"}`}>BOL</button>
                        <button onClick={()=>setTipoDoc("FACTURA")} className={`px-3 py-1 rounded font-bold text-xs border ${tipoDoc==="FACTURA"?"bg-blue-600 text-white":"bg-white"}`}>FAC</button>
                    </div>
                 </div>
                 
                 {/* --- INPUT RUC: SOLO APARECE SI ES FACTURA --- */}
                 {tipoDoc === "FACTURA" && (
                     <div className="flex items-center gap-2 border border-blue-300 bg-blue-50 p-2 rounded text-sm animate-in fade-in slide-in-from-top-1">
                         <Building size={16} className="text-blue-600"/>
                         <input type="number" placeholder="Ingrese RUC Cliente (11 dígitos)" value={clienteRuc} onChange={(e)=>setClienteRuc(e.target.value)} className="w-full bg-transparent outline-none font-bold text-slate-700 placeholder-blue-300"/>
                     </div>
                 )}
             </div>
             
             <button onClick={procesarVenta} disabled={procesando || carrito.length===0} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-xl flex justify-center gap-2 transition active:scale-95 disabled:bg-gray-300">
                 {procesando ? "..." : "COBRAR"}
             </button>
        </div>
      </section>

      {/* DERECHA: CATÁLOGO */}
      <section className={`w-full md:w-[65%] flex flex-col h-[calc(100vh-60px)] md:h-full bg-slate-100 ${vistaMovil === "CATALOGO" ? "flex" : "hidden md:flex"}`}>
         <div className="p-4 md:p-6 pb-2">
             <ResumenDia />
             <div className="flex justify-between items-center mb-4 mt-4">
                 <div><h1 className="text-lg md:text-xl font-bold text-slate-700 flex gap-2 items-center"><FileText size={20}/> Catálogo</h1><p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase">{configDB?.name || CLIENTES_AUTORIZADOS[licenciaActiva!]?.nombre}</p></div>
                 <div className="flex gap-2"><button onClick={()=>irASeccionProtegida('/ventas')} className="bg-white border px-3 py-2 rounded-lg flex gap-2 text-xs md:text-sm font-bold shadow-sm hover:bg-gray-50"><ShoppingBag size={16}/> <span className="hidden md:inline">VENTAS</span></button><button onClick={()=>irASeccionProtegida('/productos')} className="bg-slate-800 text-white px-3 py-2 rounded-lg flex gap-2 text-xs md:text-sm font-bold shadow hover:bg-black"><Lock size={16}/> ADMIN</button></div>
             </div>
             <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"><button onClick={()=>setCategoriaSeleccionada("Todos")} className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold border transition ${categoriaSeleccionada==="Todos"?"bg-blue-600 text-white":"bg-white text-gray-500"}`}>Todos</button>{categoriasDB.map(cat => (<button key={cat.id} onClick={()=>setCategoriaSeleccionada(cat.name)} className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold border whitespace-nowrap transition ${categoriaSeleccionada===cat.name?"bg-blue-600 text-white":"bg-white text-gray-500"}`}>{cat.name}</button>))}</div>
         </div>
         <div className="p-4 md:p-6 pt-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 content-start pb-20">
             {productosFiltrados.map((prod) => (
                 <button key={prod.id} onClick={()=>{ agregarAlCarrito(prod); }} className={`bg-white p-3 rounded-xl shadow-sm border flex flex-col items-center justify-between h-36 md:h-40 relative group hover:shadow-lg transition active:scale-95 ${prod.stock!<=5?'border-red-300 bg-red-50':''}`}>
                     {prod.image ? <img src={prod.image} className="w-14 h-14 md:w-16 md:h-16 object-cover rounded-md group-hover:scale-105 transition"/> : <div className="text-3xl group-hover:scale-110 transition">📦</div>}
                     <div className="text-center w-full"><p className="font-semibold text-gray-700 text-xs md:text-sm line-clamp-2 h-8 flex items-center justify-center">{prod.name}</p><div className="flex justify-center gap-2 mt-1 items-center"><span className={`text-[10px] px-2 py-1 rounded font-bold ${prod.stock!<=5?"bg-red-200 text-red-700":"bg-gray-100 text-gray-500"}`}>{prod.stock} {prod.unit?.slice(0,3) || 'UND'}</span><div className="text-blue-600 font-bold bg-blue-50 py-1 px-2 rounded-full text-xs md:text-sm">S/ {prod.price.toFixed(2)}</div></div></div>
                     {prod.stock!<=5 && <div className="absolute top-2 right-2 text-red-500 animate-pulse"><AlertTriangle size={16}/></div>}
                 </button>
             ))}
         </div>
      </section>
    </main>
  );
}