"use client";

import { db, Product } from "../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { useState, useRef, useEffect } from "react";
import { ShoppingCart, Trash2, Banknote, User, FileText, Settings, AlertTriangle, Lock, ShoppingBag, Store, LogOut } from "lucide-react";
import html2canvas from "html2canvas";
import QRCode from "qrcode"; 
import ResumenDia from "../components/resumenDia";
import { useRouter } from "next/navigation";

// --- 🔐 BASE DE DATOS DE TUS CLIENTES (LICENCIAS) ---
// Aquí es donde agregas a las personas que te compran el sistema.
// Formato: "CLAVE_DE_ACCESO": { datos del negocio }

interface DatosNegocio {
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
  pinAdmin: string; // Cada cliente puede tener su propia clave de admin
}

const CLIENTES_AUTORIZADOS: Record<string, DatosNegocio> = {
    // TÚ (Tu acceso personal)
    "2026": {
        nombre: "INVERSIONES CIELO Y DYLAN", // <--- TU NOMBRE REAL
        ruc: "20602953638",
        direccion: "Imperial, Cañete, Perú",
        telefono: "918944885",
        pinAdmin: "1234"
    },
    // EJEMPLO DEMO (Para que prueben antes de comprar)
    "DEMO": {
        nombre: "DEMO",
        ruc: "00000000000",
        direccion: "Ciudad de Ejemplo",
        telefono: "000-000",
        pinAdmin: "1234"
    }
};

const VENDEDORES = ["Turno Mañana", "Turno Tarde", "Admin"];

export default function POS() {
  const router = useRouter();
  
  // --- ESTADOS DE SESIÓN ---
  const [accesoConcedido, setAccesoConcedido] = useState(false);
  const [inputClaveTienda, setInputClaveTienda] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  
  // Datos del negocio actual (se llenan al loguearse)
  const [negocioActual, setNegocioActual] = useState<DatosNegocio | null>(null);

  // --- ESTADOS DEL POS ---
  const productos = useLiveQuery(() => db.products.toArray());
  const [carrito, setCarrito] = useState<Product[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Todos");
  
  const [tipoDoc, setTipoDoc] = useState<"BOLETA" | "FACTURA">("BOLETA");
  const [vendedor, setVendedor] = useState(VENDEDORES[0]);
  const [clienteRuc, setClienteRuc] = useState("");
  const [qrImage, setQrImage] = useState("");
  
  const ticketRef = useRef<HTMLDivElement>(null);
  const totalCalculado = carrito.reduce((sum, item) => sum + item.price, 0);
  const subTotal = totalCalculado / 1.18;
  const igv = totalCalculado - subTotal;
  
  useEffect(() => {
    if (negocioActual) {
        const dataQR = `${negocioActual.ruc}|${tipoDoc}|${totalCalculado.toFixed(2)}|${new Date().toLocaleDateString()}`;
        QRCode.toDataURL(dataQR, { width: 100, margin: 1 }, (err, url) => {
            if (!err) setQrImage(url);
        });
    }
  }, [totalCalculado, tipoDoc, carrito, negocioActual]);

  // --- LOGIN: Validar Licencia ---
  const intentarLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const clienteEncontrado = CLIENTES_AUTORIZADOS[inputClaveTienda];
      
      if (clienteEncontrado) {
          setNegocioActual(clienteEncontrado);
          setAccesoConcedido(true);
          setErrorLogin("");
      } else {
          setErrorLogin("⛔ Licencia no válida o expirada");
          setInputClaveTienda("");
      }
  };

  const cerrarSesion = () => {
      setAccesoConcedido(false);
      setNegocioActual(null);
      setInputClaveTienda("");
  };

  const irASeccionProtegida = (ruta: string) => {
    if (!negocioActual) return;
    const claveIngresada = prompt("🔒 SECCIÓN PROTEGIDA\nIngrese su PIN de administrador:");
    
    // Validamos contra el PIN específico de este cliente
    if (claveIngresada === negocioActual.pinAdmin) {
        router.push(ruta);
    } else if (claveIngresada !== null) {
        alert("⛔ Clave incorrecta.");
    }
  };

  const descontarStock = async () => {
    for (const item of carrito) {
        if (item.id) {
            const productoEnBd = await db.products.get(item.id);
            if (productoEnBd) {
                const nuevoStock = (productoEnBd.stock || 0) - 1;
                await db.products.update(item.id, { stock: nuevoStock });
            }
        }
    }
  };

  const descargarTicketImagen = async (nombreArchivo: string) => {
    if (!ticketRef.current) return;
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false,
        onclone: (documentClone) => {
            const ticket = documentClone.getElementById('ticket-oculto');
            if(ticket) { ticket.style.color = '#000000'; ticket.style.background = '#ffffff'; }
        }
      });
      const imagenURL = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = imagenURL;
      link.download = `${nombreArchivo}.png`;
      link.click();
    } catch (error: any) {
      console.error(error);
      alert("Error: " + (error.message || error));
    }
  };

  const generarMensajeWhatsApp = (items: Product[], total: number, docNum: string) => {
    if (!negocioActual) return "";
    let t = `🧾 *${negocioActual.nombre}*\n`;
    t += `📄 ${tipoDoc}: ${docNum}\n`;
    t += `📅 Fecha: ${new Date().toLocaleString('es-PE')}\n`;
    t += `👤 Atendido por: ${vendedor}\n`;
    t += `--------------------------------\n`;
    items.forEach(i => { t += `▪️ ${i.name} .. S/${i.price.toFixed(2)}\n`; });
    t += `--------------------------------\n`;
    t += `💰 *TOTAL: S/ ${total.toFixed(2)}*\n`;
    return encodeURIComponent(t);
  };

  const agregarAlCarrito = (producto: Product) => { setCarrito([...carrito, producto]); };
  const eliminarDelCarrito = (indexCX: number) => { const nuevoCarrito = carrito.filter((_, i) => i !== indexCX); setCarrito(nuevoCarrito); };

  const procesarVenta = async () => {
    if (carrito.length === 0) return alert("Carrito vacío");
    if (tipoDoc === "FACTURA" && clienteRuc.length !== 11) return alert("RUC inválido");
    try {
      setProcesando(true);
      const serie = tipoDoc === "BOLETA" ? "B001" : "F001";
      const correlativo = Date.now().toString().slice(-6);
      const numeroDocumento = `${serie}-${correlativo}`;
      await db.sales.add({ date: new Date(), total: totalCalculado, items: carrito });
      await descontarStock();
      const opcion = confirm(`✅ Venta ${numeroDocumento} guardada.\n\n[ACEPTAR] -> WhatsApp\n[CANCELAR] -> Descargar Imagen`);
      if (opcion) {
        const mensajeUrl = generarMensajeWhatsApp(carrito, totalCalculado, numeroDocumento);
        window.open(`https://wa.me/?text=${mensajeUrl}`, '_blank');
        setCarrito([]); setClienteRuc("");
      } else {
        setTimeout(async () => { await descargarTicketImagen(`Ticket-${numeroDocumento}`); setCarrito([]); setClienteRuc(""); }, 200);
      }
    } catch (error) { console.error(error); alert("Error al procesar"); } finally { setProcesando(false); }
  };

  // --- PANTALLA DE LOGIN (CANDADO) ---
  if (!accesoConcedido || !negocioActual) {
      return (
          <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
              <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                  <div className="bg-blue-100 p-4 rounded-full inline-block mb-4 text-blue-600">
                      <Store size={48} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-800 mb-2">LIBRE-CAJA</h1>
                  <p className="text-slate-500 mb-6 text-sm">Ingrese su Licencia de Cliente</p>
                  
                  <form onSubmit={intentarLogin} className="space-y-4">
                      <div>
                          <input 
                              type="password" 
                              placeholder="Código de Licencia"
                              value={inputClaveTienda}
                              onChange={(e) => setInputClaveTienda(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg text-center text-lg tracking-widest focus:border-blue-500 outline-none uppercase"
                              autoFocus
                          />
                      </div>
                      
                      {errorLogin && <p className="text-red-500 text-sm font-bold animate-pulse">{errorLogin}</p>}

                      <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-black transition flex items-center justify-center gap-2">
                          <Lock size={18} /> INGRESAR
                      </button>
                  </form>
                  <p className="mt-8 text-xs text-gray-400">Sistema Local Seguro - v1.0</p>
              </div>
          </div>
      );
  }

  // --- SISTEMA POS (Solo carga si hay negocioActual) ---
  if (!productos) return <div className="p-10 text-center">Cargando...</div>;
  const categoriasUnicas = ["Todos", ...Array.from(new Set(productos.map(p => p.category)))];
  const productosFiltrados = categoriaSeleccionada === "Todos" ? productos : productos.filter(p => p.category === categoriaSeleccionada);

  return (
    <main className="flex h-screen bg-gray-100 overflow-hidden font-sans relative">
      {/* TICKET OCULTO CON DATOS DINÁMICOS */}
      <div className="fixed top-0 -left-[9999px]">
        <div id="ticket-oculto" ref={ticketRef} className="w-[300px] p-6 font-mono text-xs shadow-none" style={{ backgroundColor: '#ffffff', color: '#000000' }}>
          <div className="text-center mb-2">
            <h2 className="font-bold text-base uppercase">{negocioActual.nombre}</h2>
            <p className="text-[10px] mt-1">{negocioActual.direccion}</p>
            <p className="text-[10px]">RUC: {negocioActual.ruc} | Cel: {negocioActual.telefono}</p>
            <div className="mt-2 p-1" style={{ border: '1px solid #000000' }}>
                <p className="font-bold">{tipoDoc} ELECTRÓNICA</p>
                <p>{tipoDoc === "BOLETA" ? "B001" : "F001"}-{Date.now().toString().slice(-6)}</p>
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[10px]">
             <span>FECHA: {new Date().toLocaleDateString('es-PE')}</span>
             <span>HORA: {new Date().toLocaleTimeString('es-PE')}</span>
          </div>
          <p className="text-[10px]">ATENDIDO POR: {vendedor.toUpperCase()}</p>
          {tipoDoc === "FACTURA" && <p className="text-[10px]">CLIENTE RUC: {clienteRuc}</p>}
          <div className="my-2" style={{ borderBottom: '1px dashed #000000' }}></div>
          <div className="flex justify-between font-bold mb-1">
            <span>CANT. DESCRIPCIÓN</span>
            <span>IMPORTE</span>
          </div>
          {carrito.map((item, idx) => (
             <div key={idx} className="flex justify-between mb-1 items-start">
               <span className="flex-1 pr-2 break-words">1 x {item.name}</span>
               <span className="whitespace-nowrap">{item.price.toFixed(2)}</span>
             </div>
          ))}
          <div className="my-2" style={{ borderBottom: '1px dashed #000000' }}></div>
          {tipoDoc === "FACTURA" && (
            <>
                <div className="flex justify-between text-[10px]"><span>OP. GRAVADA</span><span>{subTotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-[10px]"><span>I.G.V. (18%)</span><span>{igv.toFixed(2)}</span></div>
            </>
          )}
          <div className="flex justify-between font-bold text-lg mt-2">
            <span>TOTAL A PAGAR</span>
            <span>S/ {totalCalculado.toFixed(2)}</span>
          </div>
          <div className="my-3" style={{ borderBottom: '1px dashed #000000' }}></div>
          <div className="flex flex-col items-center justify-center gap-2">
            {qrImage && <img src={qrImage} alt="QR" width={100} height={100} />}
            <p className="text-[9px] text-center mt-2">Representación impresa del comprobante electrónico</p>
            <p className="text-[9px] font-bold">¡Gracias por su compra!</p>
          </div>
        </div>
      </div>

      {/* IZQUIERDA: PANEL DE COBRO */}
      <section className="w-[35%] bg-white border-r border-gray-300 flex flex-col shadow-2xl z-10">
        <div className="p-4 bg-slate-900 text-white shadow-md flex justify-between items-center">
          <h2 className="font-bold text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5"/> Venta</h2>
          <button onClick={cerrarSesion} title="Salir" className="text-gray-400 hover:text-red-400"><LogOut size={18}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50">
          {carrito.map((item, index) => (
            <div key={index} className="flex justify-between items-center bg-white p-2 px-3 rounded border border-gray-200 text-sm">
              <span className="font-medium text-gray-700">{item.name}</span>
              <div className="flex items-center gap-3">
                <span className="font-bold">S/ {item.price.toFixed(2)}</span>
                <button onClick={() => eliminarDelCarrito(index)} className="text-red-400 hover:text-red-600"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-slate-100 border-t border-gray-300 space-y-3">
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300">
                <User size={20} className="text-gray-500"/>
                <select value={vendedor} onChange={(e) => setVendedor(e.target.value)} className="w-full bg-transparent outline-none text-gray-700 font-medium">
                    {VENDEDORES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setTipoDoc("BOLETA")} className={`flex-1 py-2 rounded font-bold text-sm border ${tipoDoc === "BOLETA" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>📄 BOLETA</button>
                <button onClick={() => setTipoDoc("FACTURA")} className={`flex-1 py-2 rounded font-bold text-sm border ${tipoDoc === "FACTURA" ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300"}`}>🏢 FACTURA</button>
            </div>
            {tipoDoc === "FACTURA" && (
                <input type="number" placeholder="RUC Cliente (11 dígitos)" value={clienteRuc} onChange={(e) => setClienteRuc(e.target.value)} className="w-full p-2 border border-blue-400 rounded bg-blue-50 text-sm focus:outline-none" autoFocus />
            )}
        </div>
        <div className="p-6 bg-white border-t border-gray-200">
          <div className="flex justify-between text-3xl font-extrabold mb-4 text-slate-800">
            <span>Total</span>
            <span>S/ {totalCalculado.toFixed(2)}</span>
          </div>
          <button onClick={procesarVenta} disabled={procesando || carrito.length === 0} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white py-4 rounded-xl font-bold text-xl shadow-lg flex justify-center items-center gap-2">
            {procesando ? "..." : <>COBRAR <Banknote /></>}
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
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{negocioActual.nombre}</p>
             </div>
             <div className="flex gap-2">
                 <button onClick={() => irASeccionProtegida('/ventas')} className="bg-white border border-gray-300 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-50 transition text-sm font-bold shadow-sm">
                    <ShoppingBag size={18} /> <span className="hidden md:inline">VENTAS</span>
                 </button>
                 <button onClick={() => irASeccionProtegida('/productos')} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-black transition text-sm font-bold shadow-md">
                    <Lock size={16} /> ADMIN
                 </button>
             </div>
           </div>
           <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2">
              {categoriasUnicas.map(cat => (
                <button key={cat} onClick={() => setCategoriaSeleccionada(cat)} className={`px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-all border ${categoriaSeleccionada === cat ? "bg-blue-600 text-white border-blue-600 shadow-md transform scale-105" : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"}`}>
                    {cat}
                </button>
              ))}
           </div>
        </div>
        <div className="p-6 pt-0 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 content-start">
          {productosFiltrados.map((producto) => (
            <button key={producto.id} onClick={() => agregarAlCarrito(producto)} className={`bg-white p-3 rounded-xl shadow-sm hover:shadow-lg transition-all border flex flex-col items-center gap-2 h-36 justify-between group relative ${(producto.stock || 0) <= 5 ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:ring-2 ring-blue-500'}`}>
              <div className="text-3xl group-hover:scale-110 transition-transform">📦</div> 
              <div className="text-center w-full">
                <p className="font-semibold text-gray-700 text-sm line-clamp-2 h-10 flex items-center justify-center">{producto.name}</p>
                <div className="flex justify-center gap-2 mt-1 items-center">
                    <span className={`text-[10px] px-2 py-1 rounded font-bold ${(producto.stock || 0) <= 5 ? "bg-red-200 text-red-700" : "bg-gray-100 text-gray-500"}`}>{producto.stock || 0} u.</span>
                    <div className="text-blue-600 font-bold bg-blue-50 py-1 px-3 rounded-full text-md">S/ {producto.price.toFixed(2)}</div>
                </div>
              </div>
              {(producto.stock || 0) <= 5 && <div className="absolute top-2 right-2 text-red-500 animate-pulse"><AlertTriangle size={16} /></div>}
            </button>
          ))}
          <button onClick={() => irASeccionProtegida('/productos')} className="border-2 border-dashed border-gray-300 text-gray-400 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:text-blue-500 opacity-60 hover:opacity-100">
            <Lock size={20} /> <span className="text-xs font-bold">Nuevo (Admin)</span>
          </button>
        </div>
      </section>
    </main>
  );
}