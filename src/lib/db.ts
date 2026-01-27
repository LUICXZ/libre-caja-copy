import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface Product {
  id?: number;
  name: string;
  price: number;
  category: string;
  unit: string;
  image?: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Sale {
  id?: number;
  date: Date;
  total: number;
  items: CartItem[];
}

export interface Category { id?: number; name: string; }
export interface Seller { id?: number; name: string; }
export interface Unit { id?: number; name: string; }

// --- NUEVA INTERFAZ PARA DATOS DEL NEGOCIO ---
export interface BusinessConfig {
  id?: number; // Siempre será 1
  name: string;
  ruc: string;
  address: string;
  phone: string;
}

class PosDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  categories!: Table<Category>;
  sellers!: Table<Seller>;
  units!: Table<Unit>;
  config!: Table<BusinessConfig>; // --- NUEVA TABLA ---

  constructor() {
    super('PosCaneteDB'); 
    
    // VERSIÓN 5: Agregamos CONFIG
    this.version(5).stores({
      products: '++id, name, category, stock, unit', 
      sales: '++id, date',
      categories: '++id, name',
      sellers: '++id, name',
      units: '++id, name',
      config: '++id' // Nueva tabla simple
    });
  }
}

export const db = new PosDatabase();