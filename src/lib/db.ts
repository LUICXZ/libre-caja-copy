import Dexie, { Table } from 'dexie';

// --- INTERFACES ---
export interface Product {
  id?: number;
  name: string;
  price: number;
  category: string;     
  image?: string;       // Aquí guardaremos la FOTO en base64
  stock: number;
}

export interface Sale {
  id?: number;
  date: Date;
  total: number;
  items: Product[];
}

// NUEVAS INTERFACES PARA CONFIGURACIÓN DINÁMICA
export interface Category {
  id?: number;
  name: string;
}

export interface Seller {
  id?: number;
  name: string;
}

// --- CLASE BASE DE DATOS ---
class PosDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;
  categories!: Table<Category>; // Tabla nueva
  sellers!: Table<Seller>;      // Tabla nueva

  constructor() {
    super('PosCaneteDB'); 
    
    // VERSIÓN 1 (La que tenías antes)
    this.version(1).stores({
      products: '++id, name, category, stock', 
      sales: '++id, date'
    });

    // VERSIÓN 2 (ACTUALIZACIÓN: Agregamos categorías y vendedores)
    // Dexie es inteligente y mantendrá tus productos antiguos a salvo.
    this.version(2).stores({
      products: '++id, name, category, stock', 
      sales: '++id, date',
      categories: '++id, name', // Nueva
      sellers: '++id, name'     // Nueva
    });
  }
}

export const db = new PosDatabase();