import Dexie, { Table } from 'dexie';

// 1. Definimos la forma de nuestros datos (Interfaces)
export interface Product {
  id?: number;          // El ? significa que es opcional al crearlo (se autogenera)
  name: string;
  price: number;
  category: string;     // 'Abarrotes', 'Bebidas', etc.
  image?: string;       // URL de la foto o emoji
}

export interface Sale {
  id?: number;
  date: Date;
  total: number;
  items: any[];         // Aquí guardaremos la lista de lo que compró
}

// 2. Creamos la Clase de la Base de Datos
class PosDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;

  constructor() {
    super('PosCaneteDB'); // Nombre de la BD en el navegador
    
    // Definimos las tablas y qué campos son buscables (índices)
    this.version(1).stores({
      products: '++id, name, category', // ++id significa autoincremental
      sales: '++id, date'
    });
  }
}

// 3. Exportamos la instancia lista para usar
export const db = new PosDatabase();