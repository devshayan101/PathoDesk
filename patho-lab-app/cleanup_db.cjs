const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const appData = process.env.APPDATA;
const pathsToTry = [
  path.join(appData, 'pathodesk', 'patholab.db'),
  path.join(appData, 'Electron', 'patholab.db')
];

let dbPath = null;
for(const p of pathsToTry) {
   if(fs.existsSync(p)) {
      dbPath = p;
      break;
   }
}

if(!dbPath) {
  console.error("Could not find patholab.db");
  process.exit(1);
}

console.log("Using DB:", dbPath);
const db = new Database(dbPath);

const priceLists = db.prepare(`SELECT id, name FROM price_lists WHERE name IN ('FAIZAN', 'ASD')`).all();
console.log("Found price lists:", priceLists);

for(const pl of priceLists) {
   console.log("Deleting", pl.name, pl.id);
   // packages
   const packages = db.prepare(`SELECT id FROM packages WHERE price_list_id = ?`).all(pl.id);
   for(const pkg of packages) {
       db.prepare(`DELETE FROM package_items WHERE package_id = ?`).run(pkg.id);
   }
   db.prepare(`DELETE FROM packages WHERE price_list_id = ?`).run(pl.id);
   
   // test_prices
   db.prepare(`DELETE FROM test_prices WHERE price_list_id = ?`).run(pl.id);
   
   // price_lists
   db.prepare(`DELETE FROM price_lists WHERE id = ?`).run(pl.id);
   console.log("Deleted", pl.name);
}

db.close();
console.log("Done");
