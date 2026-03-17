import { Text, View, StyleSheet } from '@react-pdf/renderer';

/**
 * Shared Widal Test matrix table for react-pdf reports.
 * Parses parameter names to extract antigen type (O, H, AH, BH) and dilution (1/20, 1/40, etc.)
 * Renders a grid with antigens as rows and dilutions as columns.
 * Special parameters IMPRESSION and METHOD are rendered below the grid.
 */

const DILUTIONS = ['1/20', '1/40', '1/80', '1/160', '1/320'];

const ANTIGEN_ORDER = ['O', 'H', 'AH', 'BH'];
const ANTIGEN_LABELS: Record<string, string> = {
    'O': 'Salmonella Typhi -"O" Antigen',
    'H': 'Salmonella Typhi -"H" Antigen',
    'AH': 'Salmonella Typhi -"AH" Antigen',
    'BH': 'Salmonella Typhi -"BH" Antigen',
};

const ws = StyleSheet.create({
    container: {
        marginBottom: 10,
    },
    bordered: {
        borderWidth: 1,
        borderColor: '#000',
    },
    titleRow: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    headerRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
    },
    headerLabelCol: {
        flex: 3,
        padding: 4,
    },
    headerDilCol: {
        flex: 1,
        textAlign: 'center',
        padding: 4,
        borderLeftWidth: 1,
        borderLeftColor: '#000',
        fontSize: 9,
        fontWeight: 'bold',
    },
    dataRow: {
        flexDirection: 'row',
        borderBottomWidth: 0.5,
        borderBottomColor: '#ccc',
        minHeight: 22,
        alignItems: 'center',
    },
    dataLabelCol: {
        flex: 3,
        padding: 4,
        fontSize: 9,
    },
    dataValueCol: {
        flex: 1,
        textAlign: 'center',
        padding: 4,
        borderLeftWidth: 1,
        borderLeftColor: '#ccc',
        fontSize: 9,
    },
    impressionRow: {
        flexDirection: 'row',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingVertical: 5,
        paddingHorizontal: 4,
    },
    impressionLabel: {
        fontSize: 10,
        fontWeight: 'bold',
        width: 120,
    },
    impressionValue: {
        fontSize: 10,
        fontWeight: 'bold',
        textAlign: 'center',
        flex: 1,
    },
    methodText: {
        fontSize: 8,
        color: '#555',
        marginTop: 6,
    },
    descriptionText: {
        fontSize: 7,
        color: '#666',
        marginTop: 6,
        lineHeight: 1.4,
    },
});

interface ResultItem {
    parameter_code: string;
    parameter_name: string;
    result_value: string;
    unit: string | null;
    abnormal_flag: string | null;
    ref_range_text: string | null;
}

interface WidalTableProps {
    testName: string;
    results: ResultItem[];
}

/**
 * Detect if a result set is a Widal-type test.
 * Call this to decide whether to render WidalTable or normal table.
 */
export function isWidalTest(testName: string): boolean {
    return testName.toUpperCase().includes('WIDAL');
}

/**
 * Parse results into the Widal matrix structure.
 */
function parseWidalResults(results: ResultItem[]) {
    // Build a lookup: antigen -> dilution -> value
    const matrix: Record<string, Record<string, string>> = {};
    let impression = '';
    let method = '';
    const extraRows: { name: string; value: string }[] = [];

    for (const r of results) {
        const name = r.parameter_name.toUpperCase().trim();
        const code = r.parameter_code.toUpperCase().trim();

        // Check for IMPRESSION
        if (name.includes('IMPRESSION') || code.includes('IMPRESSION')) {
            impression = r.result_value || '';
            continue;
        }

        // Check for METHOD
        if (name.includes('METHOD') || code.includes('METHOD')) {
            method = r.result_value || '';
            continue;
        }

        // Try to parse antigen and dilution from parameter name or code
        // Pattern: "O 1/20" or "AH 1/160" or "S. Typhi O 1/20" etc.
        let matched = false;
        const MATCH_ORDER = ['AH', 'BH', 'O', 'H'];
        for (const ag of MATCH_ORDER) {
            for (const dil of DILUTIONS) {
                // Match patterns like "O 1/20", "O_1/20", "O-1/20",
                // or full name like "Salmonella Typhi O 1/20"
                const patterns = [
                    `${ag} ${dil}`,
                    `${ag}_${dil}`,
                    `${ag}-${dil}`,
                    `"${ag}" ${dil}`,
                ];
                const nameUp = name;
                const codeUp = code;
                if (patterns.some(p => nameUp.includes(p) || codeUp.includes(p))) {
                    if (!matrix[ag]) matrix[ag] = {};
                    matrix[ag][dil] = r.result_value || '-';
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }

        // If not matched, treat as an extra row
        if (!matched) {
            extraRows.push({ name: r.parameter_name, value: r.result_value || '-' });
        }
    }

    return { matrix, impression, method, extraRows };
}

export default function WidalTable({ results }: WidalTableProps) {
    const { matrix, impression, method, extraRows } = parseWidalResults(results);

    return (
        <View style={ws.container}>
            <View style={ws.bordered}>
                {/* Title */}
                {/* <Text style={ws.titleRow}>{testName}</Text> */}

                {/* Header row with dilution columns */}
                <View style={ws.headerRow}>
                    <View style={ws.headerLabelCol} />
                    {DILUTIONS.map(dil => (
                        <Text key={dil} style={ws.headerDilCol}>{dil}</Text>
                    ))}
                </View>

                {/* Data rows per antigen */}
                {ANTIGEN_ORDER.map(ag => {
                    const row = matrix[ag];
                    if (!row && Object.keys(matrix).length > 0) {
                        // Only show antigens that have data
                        // But if no matrix data at all, show all with dashes
                    }
                    return (
                        <View key={ag} style={ws.dataRow}>
                            <Text style={ws.dataLabelCol}>{ANTIGEN_LABELS[ag]}</Text>
                            {DILUTIONS.map(dil => (
                                <Text key={dil} style={ws.dataValueCol}>
                                    {row?.[dil] || '-'}
                                </Text>
                            ))}
                        </View>
                    );
                })}

                {/* Extra rows (unrecognized parameters) */}
                {extraRows.map((row, i) => (
                    <View key={i} style={ws.dataRow}>
                        <Text style={[ws.dataLabelCol, { flex: 3 }]}>{row.name}</Text>
                        <Text style={{ flex: 5, textAlign: 'center', fontSize: 9, padding: 4 }}>{row.value}</Text>
                    </View>
                ))}

                {/* IMPRESSION row */}
                {impression && (
                    <View style={ws.impressionRow}>
                        <Text style={ws.impressionLabel}>IMPRESSION  :</Text>
                        <Text style={ws.impressionValue}>{impression}</Text>
                    </View>
                )}
            </View>

            {/* Method line */}
            {method && (
                <Text style={ws.methodText}>Method : {method}</Text>
            )}
        </View>
    );
}
