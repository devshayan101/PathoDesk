import { queryAll, queryOne, run, runWithId } from '../database/db';

// Types
interface PriceListRow {
    id: number;
    code: string;
    name: string;
    description: string | null;
    is_default: number;
    is_active: number;
    created_at: string;
}

interface TestPriceRow {
    id: number;
    price_list_id: number;
    test_id: number;
    test_code: string;
    test_name: string;
    base_price: number;
    auto_discount_percent: number;
    discount_cap_percent: number;
    gst_applicable: number;
    gst_rate: number;
    effective_from: string;
    effective_to: string | null;
    is_active: number;
}

interface PackageRow {
    id: number;
    code: string;
    name: string;
    description: string | null;
    package_price: number;
    price_list_id: number | null;
    valid_from: string | null;
    valid_to: string | null;
    is_active: number;
    created_at: string;
}

// ==================== PRICE LISTS ====================

export function listPriceLists(): PriceListRow[] {
    return queryAll<PriceListRow>(`
    SELECT * FROM price_lists
    WHERE is_active = 1
    ORDER BY is_default DESC, name ASC
  `);
}

export function listAllPriceLists(): PriceListRow[] {
    return queryAll<PriceListRow>(`
    SELECT * FROM price_lists
    ORDER BY is_default DESC, name ASC
  `);
}

export function getPriceList(id: number): PriceListRow | undefined {
    return queryOne<PriceListRow>(`SELECT * FROM price_lists WHERE id = ?`, [id]);
}

export function getDefaultPriceList(): PriceListRow | undefined {
    return queryOne<PriceListRow>(`SELECT * FROM price_lists WHERE is_default = 1 AND is_active = 1`);
}

export function createPriceList(data: {
    code: string;
    name: string;
    description?: string;
    isDefault?: boolean;
}): { success: boolean; id?: number; error?: string } {
    try {
        // If setting as default, clear other defaults
        if (data.isDefault) {
            run(`UPDATE price_lists SET is_default = 0`);
        }

        const id = runWithId(`
      INSERT INTO price_lists (code, name, description, is_default)
      VALUES (?, ?, ?, ?)
    `, [data.code, data.name, data.description || null, data.isDefault ? 1 : 0]);

        // Insert default price of 0 for all active tests in the new price list
        run(`
          INSERT INTO test_prices (price_list_id, test_id, base_price, gst_applicable, gst_rate, effective_from)
          SELECT ?, id, 0, 0, 0, datetime('now')
          FROM tests
          WHERE is_active = 1
        `, [id]);

        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function updatePriceList(id: number, data: {
    code?: string;
    name?: string;
    description?: string;
    isDefault?: boolean;
    isActive?: boolean;
}): { success: boolean; error?: string } {
    try {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.code !== undefined) {
            updates.push('code = ?');
            params.push(data.code);
        }
        if (data.name !== undefined) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            params.push(data.description);
        }
        if (data.isDefault !== undefined) {
            if (data.isDefault) {
                run(`UPDATE price_lists SET is_default = 0`);
            }
            updates.push('is_default = ?');
            params.push(data.isDefault ? 1 : 0);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            params.push(data.isActive ? 1 : 0);
        }

        if (updates.length > 0) {
            params.push(id);
            run(`UPDATE price_lists SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function deletePriceList(id: number): { success: boolean; error?: string } {
    try {
        // Check if any invoices use this price list
        const invoiceCount = queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM invoices WHERE price_list_id = ?
    `, [id]);

        if (invoiceCount && invoiceCount.count > 0) {
            return { success: false, error: 'Cannot delete price list with existing invoices. Deactivate instead.' };
        }

        // Soft delete
        run(`UPDATE price_lists SET is_active = 0 WHERE id = ?`, [id]);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// ==================== TEST PRICES ====================

export function listTestPrices(priceListId: number): TestPriceRow[] {
    return queryAll<TestPriceRow>(`
    SELECT tp.*, t.test_code, tv.test_name
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.price_list_id = ?
      AND tp.is_active = 1
      AND (tp.effective_to IS NULL OR datetime(tp.effective_to) >= datetime('now'))
      AND tv.status = 'PUBLISHED'
      AND t.is_active = 1
    GROUP BY tp.test_id
    ORDER BY tv.test_name ASC
  `, [priceListId]);
}

export function getTestPrice(testId: number, priceListId: number): TestPriceRow | undefined {
    return queryOne<TestPriceRow>(`
    SELECT tp.*, t.test_code, tv.test_name
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.test_id = ?
      AND tp.price_list_id = ?
      AND tp.is_active = 1
      AND t.is_active = 1
      AND datetime(tp.effective_from) <= datetime('now')
      AND (tp.effective_to IS NULL OR datetime(tp.effective_to) >= datetime('now'))
    ORDER BY tp.effective_from DESC
    LIMIT 1
  `, [testId, priceListId]);
}

export function setTestPrice(priceListId: number, testId: number, data: {
    basePrice: number;
    autoDiscountPercent?: number;
    discountCapPercent?: number;
    gstApplicable?: boolean;
    gstRate?: number;
    effectiveFrom?: string;
    effectiveTo?: string | null;
}): { success: boolean; id?: number; error?: string } {
    try {
        // Deactivate old prices for this test/price list
        run(`
      UPDATE test_prices 
      SET is_active = 0 
      WHERE price_list_id = ? AND test_id = ? AND is_active = 1
    `, [priceListId, testId]);

        const id = runWithId(`
      INSERT INTO test_prices (
        price_list_id, test_id, base_price, auto_discount_percent, 
        discount_cap_percent, gst_applicable, gst_rate, effective_from, effective_to
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
            priceListId,
            testId,
            data.basePrice,
            data.autoDiscountPercent || 0,
            data.discountCapPercent || 100,
            data.gstApplicable ? 1 : 0,
            data.gstRate || 0,
            data.effectiveFrom || new Date().toISOString(),
            data.effectiveTo || null
        ]);

        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function bulkSetTestPrices(priceListId: number, prices: Array<{
    testId: number;
    basePrice: number;
    gstApplicable?: boolean;
    gstRate?: number;
}>): { success: boolean; count: number; error?: string } {
    try {
        let count = 0;
        for (const price of prices) {
            const result = setTestPrice(priceListId, price.testId, {
                basePrice: price.basePrice,
                gstApplicable: price.gstApplicable,
                gstRate: price.gstRate
            });
            if (result.success) count++;
        }
        return { success: true, count };
    } catch (error: any) {
        return { success: false, count: 0, error: error.message };
    }
}

// Get prices for multiple tests at once (for order creation)
export function getTestPricesForTests(testIds: number[], priceListId: number): Map<number, TestPriceRow> {
    const prices = new Map<number, TestPriceRow>();

    if (testIds.length === 0) return prices;

    const placeholders = testIds.map(() => '?').join(',');
    const rows = queryAll<TestPriceRow>(`
    SELECT tp.*, t.test_code, tv.test_name
    FROM test_prices tp
    JOIN tests t ON tp.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE tp.test_id IN (${placeholders})
      AND tp.price_list_id = ?
      AND tp.is_active = 1
      AND t.is_active = 1
      AND datetime(tp.effective_from) <= datetime('now')
      AND (tp.effective_to IS NULL OR datetime(tp.effective_to) >= datetime('now'))
    ORDER BY tp.effective_from DESC
  `, [...testIds, priceListId]);

    for (const row of rows) {
        if (!prices.has(row.test_id)) {
            prices.set(row.test_id, row);
        }
    }

    return prices;
}

// ==================== PACKAGES ====================

export function listPackages(priceListId?: number): PackageRow[] {
    if (priceListId) {
        return queryAll<PackageRow>(`
      SELECT * FROM packages
      WHERE (price_list_id = ? OR price_list_id IS NULL)
        AND is_active = 1
        AND (valid_to IS NULL OR valid_to >= datetime('now'))
      ORDER BY name ASC
    `, [priceListId]);
    }
    return queryAll<PackageRow>(`
    SELECT * FROM packages
    WHERE is_active = 1
    ORDER BY name ASC
  `);
}

export function getPackage(id: number) {
    const pkg = queryOne<PackageRow>(`SELECT * FROM packages WHERE id = ?`, [id]);
    if (!pkg) return null;

    const items = queryAll<{ test_id: number; test_code: string; test_name: string }>(`
    SELECT pi.test_id, t.test_code, tv.test_name
    FROM package_items pi
    JOIN tests t ON pi.test_id = t.id
    JOIN test_versions tv ON t.id = tv.test_id
    WHERE pi.package_id = ?
      AND tv.status = 'PUBLISHED'
    GROUP BY pi.test_id
  `, [id]);

    return { ...pkg, items };
}

export function createPackage(data: {
    code: string;
    name: string;
    description?: string;
    packagePrice: number;
    priceListId?: number;
    validFrom?: string;
    validTo?: string;
    testIds: number[];
}): { success: boolean; id?: number; error?: string } {
    try {
        const id = runWithId(`
      INSERT INTO packages (code, name, description, package_price, price_list_id, valid_from, valid_to)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
            data.code,
            data.name,
            data.description || null,
            data.packagePrice,
            data.priceListId || null,
            data.validFrom || null,
            data.validTo || null
        ]);

        // Add package items
        for (const testId of data.testIds) {
            run(`INSERT INTO package_items (package_id, test_id) VALUES (?, ?)`, [id, testId]);
        }

        return { success: true, id };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export function updatePackage(id: number, data: {
    name?: string;
    description?: string;
    packagePrice?: number;
    validTo?: string;
    isActive?: boolean;
    testIds?: number[];
}): { success: boolean; error?: string } {
    try {
        const updates: string[] = [];
        const params: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            params.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            params.push(data.description);
        }
        if (data.packagePrice !== undefined) {
            updates.push('package_price = ?');
            params.push(data.packagePrice);
        }
        if (data.validTo !== undefined) {
            updates.push('valid_to = ?');
            params.push(data.validTo);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            params.push(data.isActive ? 1 : 0);
        }

        if (updates.length > 0) {
            params.push(id);
            run(`UPDATE packages SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Update test items if provided
        if (data.testIds !== undefined) {
            run(`DELETE FROM package_items WHERE package_id = ?`, [id]);
            for (const testId of data.testIds) {
                run(`INSERT INTO package_items (package_id, test_id) VALUES (?, ?)`, [id, testId]);
            }
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
