import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';

const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'patholab', 'patholab.db');

try {
    const db = new Database(dbPath, { fileMustExist: true });

    const testIds = [1, 2, 3];
    const priceListId = 1;

    const placeholders = testIds.map(() => '?').join(',');
    const query = `
    SELECT tp.*, t.test_code, tv.test_name, tp.effective_from, datetime('now') as now_time
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.test_id IN (${placeholders})
      AND tp.price_list_id = ?
      AND tp.is_active = 1
      AND t.is_active = 1
      AND tp.effective_from <= datetime('now')
      AND (tp.effective_to IS NULL OR tp.effective_to >= datetime('now'))
    ORDER BY tp.effective_from DESC
  `;

    const rows = db.prepare(query).all(...testIds, priceListId);
    console.log("Returned rows:", JSON.stringify(rows, null, 2));

    // let's also query without the date limitation
    const queryAll = `
    SELECT tp.*, t.test_code
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    WHERE tp.test_id IN (${placeholders})
      AND tp.price_list_id = ?
  `;
    const allRows = db.prepare(queryAll).all(...testIds, priceListId);
    console.log("All rows regardless of filters:", JSON.stringify(allRows, null, 2));

    db.close();
} catch (e: any) {
    console.error("Error:", e.message);
}
