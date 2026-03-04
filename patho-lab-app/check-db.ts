import Database from 'better-sqlite3';
import { app } from 'electron';
import * as path from 'path';
import * as os from 'os';

// Just mock the path
const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'patholab', 'patholab.db');
console.log('Database path:', dbPath);

try {
    const db = new Database(dbPath, { fileMustExist: true });

    const orders = db.prepare('SELECT id, total_amount, net_amount FROM orders').all() as any[];
    console.log('Total orders:', orders.length);

    const invoices = db.prepare('SELECT id, order_id, total_amount, status FROM invoices').all() as any[];
    console.log('Total invoices:', invoices.length);

    const diff = orders.length - invoices.length;
    console.log('Orders without invoices:', diff);

    db.close();
} catch (e: any) {
    console.error("Error reading db:", e.message);

    // try another path
    const dbPath2 = path.join(os.homedir(), 'AppData', 'Roaming', 'patho-lab-app', 'patholab.db');
    console.log('Trying path 2:', dbPath2);
    try {
        const db2 = new Database(dbPath2, { fileMustExist: true });

        const orders2 = db2.prepare('SELECT id, total_amount, net_amount FROM orders').all() as any[];
        console.log('Total orders:', orders2.length);

        const invoices2 = db2.prepare('SELECT id, order_id, total_amount, status FROM invoices').all() as any[];
        console.log('Total invoices:', invoices2.length);

        db2.close();
    } catch (e2: any) {
        console.error("Error reading db2:", e2.message);
    }
}
