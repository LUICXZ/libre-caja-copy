import Dexie, { Table } from 'dexie';

// 1. Definimos la forma de nuestros datos (Interfaces)
export interface Product {
  id?: number;          
  name: string;
  price: number;
  category: string;     
  image?: string;       // ¡MANTENEMOS ESTO! (Es útil para el futuro)
  stock: number;        // <--- NUEVO: Aquí guardaremos la cantidad (ej: 50)
}

export interface Sale {
  id?: number;
  date: Date;
  total: number;
  items: Product[];     // Cambié 'any[]' por 'Product[]' para que sea más seguro
}

// 2. Creamos la Clase de la Base de Datos
class PosDatabase extends Dexie {
  products!: Table<Product>;
  sales!: Table<Sale>;

  constructor() {
    super('PosCaneteDB'); 
    
    // 3. ACTUALIZACIÓN DE LA ESTRUCTURA
    // Agregamos ', stock' al final para poder buscar productos por cantidad
    this.version(1).stores({
      products: '++id, name, category, stock', // <--- AGREGADO AQUÍ
      sales: '++id, date'
    });
  }
}

// 3. Exportamos la instancia lista para usar
export const db = new PosDatabase();