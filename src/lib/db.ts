import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface Product { id?: number; name: string; price: number; category: string; unit: string; image?: string; stock: number; }
export interface CartItem extends Product { quantity: number; }

// ACTUALIZADO: Ahora la venta guarda todo el detalle del dinero
export interface Sale { 
  id?: number; 
  date: Date; 
  total: number; // El total FINAL cobrado (después de descuento)
  subtotal: number; // La suma original antes de descuento
  discount: number; // Cuánto se descontó
  payment: number; // Con cuánto pagó el cliente (Ej: 50 soles)
  change: number; // El vuelto (Ej: 2.50)
  items: CartItem[]; 
}

export interface Category { id?: number; name: string; }
export interface Unit { id?: number; name: string; }
export interface BusinessConfig { id?: number; name: string; ruc: string; address: string; phone: string; }
export interface User { id?: number; name: string; pin: string; role: "ADMIN" | "VENDEDOR"; }

// NUEVO: Tabla para guardar la Caja Inicial del día
export interface DailyCash { 
  id?: number; 
  dateStr: string; // Ej: "28/01/2026" (Para identificar el día)
  initialAmount: number; // Monto de apertura
}

class PosDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  categories!: Table<Category>;
  units!: Table<Unit>;
  config!: Table<BusinessConfig>;
  users!: Table<User>;
  dailyCash!: Table<DailyCash>; // --- NUEVA TABLA ---

  constructor() {
    super('PosCaneteDB'); 
    
    // VERSIÓN 7: Actualizamos Ventas y agregamos Caja Diaria
    this.version(7).stores({
      products: '++id, name, category, stock, unit', 
      sales: '++id, date', // Dexie permite agregar campos a los objetos sin cambiar el esquema si no son índices
      categories: '++id, name',
      units: '++id, name',
      config: '++id',
      users: '++id, pin',
      dailyCash: '++id, dateStr' // Indexamos por fecha texto
    });
  }
}

export const db = new PosDatabase();