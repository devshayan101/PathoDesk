import * as XLSX from 'xlsx';

export interface ParsedTestRow {
    category: string;
    testCode: string;
    testName: string;
    parameter: string;
    paramCode: string;
    referenceRange: string;
    unit: string;
    price: number;
    sampleType: string;
    criticalLow: string;
    criticalHigh: string;
    isHeader: string;
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

                let lastTestName = '';
                let lastTestCode = '';
                let lastCategory = '';
                let lastSampleType = '';

                // Map columns (flexible matching)
                const mapped = rows.map((row: any) => {
                    const keys = Object.keys(row);
                    const find = (patterns: string[]) => {
                        const key = keys.find(k => patterns.some(p => k.toLowerCase().includes(p)));
                        return key && row[key] !== undefined && row[key] !== null ? String(row[key]).trim() : '';
                    };

                    const rawTestName = find(['test name', 'test_name', 'testname', 'test']);
                    const rawTestCode = find(['test code', 'test_code', 'code']).toUpperCase();
                    const rawCategory = find(['category', 'department', 'dept']);
                    const rawSampleType = find(['sample', 'specimen', 'sample type', 'sample_type']);

                    if (rawTestName) lastTestName = rawTestName;
                    if (rawTestCode) lastTestCode = rawTestCode;
                    if (rawCategory) lastCategory = rawCategory;
                    if (rawSampleType) lastSampleType = rawSampleType;

                    return {
                        category: lastCategory,
                        testCode: lastTestCode,
                        testName: lastTestName,
                        parameter: find(['parameter', 'param', 'analyte', 'analyte name']),
                        paramCode: find(['param code', 'parameter code', 'param_code', 'code']).toUpperCase(),
                        referenceRange: find(['reference', 'ref range', 'range', 'normal', 'biological ref']),
                        unit: find(['unit', 'uom', 'measure']),
                        price: parseFloat(find(['price', 'cost', 'rate', 'mrp'])) || 0,
                        sampleType: lastSampleType,
                        criticalLow: find(['critical low', 'crit_low', 'low critical']),
                        criticalHigh: find(['critical high', 'crit_high', 'high critical']),
                        isHeader: find(['is header', 'is_header', 'header', 'group', 'isheader'])
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
