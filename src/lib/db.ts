import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface Product { id?: number; name: string; price: number; category: string; unit: string; image?: string; stock: number; }
export interface CartItem extends Product { quantity: number; }
export interface Sale { id?: number; date: Date; total: number; items: CartItem[]; }
export interface Category { id?: number; name: string; }
export interface Unit { id?: number; name: string; }
export interface BusinessConfig { id?: number; name: string; ruc: string; address: string; phone: string; }

// --- NUEVA INTERFAZ (ESTO ES LO QUE FALTABA) ---
export interface User {
  id?: number;
  name: string;
  pin: string;      
  role: "ADMIN" | "VENDEDOR"; 
}

// (Mantenemos Seller para compatibilidad si quedaron datos viejos, pero ya no lo usaremos activamente)
export interface Seller { id?: number; name: string; }

class PosDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  categories!: Table<Category>;
  sellers!: Table<Seller>; // Lo dejamos por seguridad de datos viejos
  units!: Table<Unit>;
  config!: Table<BusinessConfig>;
  users!: Table<User>; // --- ESTO FALTABA ---

  constructor() {
    super('PosCaneteDB'); 
    
    // Historial de versiones
    this.version(1).stores({ products: '++id, name, category, stock', sales: '++id, date' });
    this.version(2).stores({ products: '++id, name, category, stock', sales: '++id, date', categories: '++id, name', sellers: '++id, name' });
    this.version(3).stores({ products: '++id, name, category, stock, unit', sales: '++id, date', categories: '++id, name', sellers: '++id, name' });
    this.version(4).stores({ products: '++id, name, category, stock, unit', sales: '++id, date', categories: '++id, name', sellers: '++id, name', units: '++id, name' });
    this.version(5).stores({ products: '++id, name, category, stock, unit', sales: '++id, date', categories: '++id, name', sellers: '++id, name', units: '++id, name', config: '++id' });

    // VERSIÓN 6: Agregamos users
    this.version(6).stores({
      products: '++id, name, category, stock, unit', 
      sales: '++id, date',
      categories: '++id, name',
      units: '++id, name',
      config: '++id',
      users: '++id, pin', // Indexamos por PIN
      sellers: '++id, name' // Mantenemos la tabla vieja por si acaso
    });
  }
}

export const db = new PosDatabase();