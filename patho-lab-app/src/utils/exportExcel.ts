import * as XLSX from 'xlsx';

export const exportTestsToExcel = (data: any[], filename: string = 'Test_Master_Export.xlsx') => {
    // Map to user-friendly column headers matching the import format
    const formattedData = data.map(item => ({
        'Category': item.category,
        'Test Code': item.testCode,
        'Test Name': item.testName,
        'Parameter': item.parameter,
        'Reference Range': item.referenceRange || '',
        'Unit': item.unit || '',
        'Price': item.price || 0,
        'Sample Type': item.sampleType || '',
        'Is Header': item.isHeaderRaw === 1 ? 'Yes' : (item.parentName || 'No')
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tests');

    XLSX.writeFile(workbook, filename);
};
