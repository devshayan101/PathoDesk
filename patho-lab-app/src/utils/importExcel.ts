import * as XLSX from 'xlsx';

export interface ParsedTestRow {
    category: string;
    testCode: string;
    testName: string;
    parameter: string;
    referenceRange: string;
    unit: string;
    price: number;
    sampleType: string;
}

export const parseExcelForTests = async (file: File): Promise<ParsedTestRow[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

                if (rows.length === 0) {
                    throw new Error('No data found in Excel file');
                }

                // Map columns (flexible matching)
                const mapped = rows.map((row: any) => {
                    const keys = Object.keys(row);
                    const find = (patterns: string[]) => {
                        const key = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
                        return key ? row[key] : '';
                    };
                    return {
                        category: find(['category', 'department', 'dept']),
                        testCode: String(find(['test code', 'test_code', 'code'])).trim().toUpperCase(),
                        testName: find(['test name', 'test_name', 'testname', 'test']),
                        parameter: find(['parameter', 'param', 'analyte']),
                        referenceRange: String(find(['reference', 'ref range', 'range', 'normal'])),
                        unit: find(['unit']),
                        price: parseFloat(find(['price', 'cost', 'rate', 'mrp'])) || 0,
                        sampleType: find(['sample', 'specimen', 'sample type', 'sample_type']),
                    };
                }).filter((r: any) => r.testName && r.parameter);

                if (mapped.length === 0) {
                    throw new Error('Could not find required columns (Test Name, Parameter)');
                }

                resolve(mapped);
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};
