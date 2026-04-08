import { ResultParameter } from '../types';

interface WidalEntryGridProps {
    parameters: ResultParameter[];
    values: Record<string, string>;
    onValueChange: (paramCode: string, value: string) => void;
    onInputBlur: (paramCode: string, value: string) => void;
    disabled?: boolean;
}

const DILUTIONS = ['1/20', '1/40', '1/80', '1/160', '1/320'];
const ANTIGEN_ORDER = ['O', 'H', 'AH', 'BH'];
const ANTIGEN_LABELS: Record<string, string> = {
    'O': 'Salmonella Typhi -"O" Antigen',
    'H': 'Salmonella Typhi -"H" Antigen',
    'AH': 'Salmonella Typhi -"AH" Antigen',
    'BH': 'Salmonella Typhi -"BH" Antigen',
};

export default function WidalEntryGrid({ parameters, values, onValueChange, onInputBlur, disabled }: WidalEntryGridProps) {
    
    // Build a lookup: Antigen -> Dilution -> Parameter
    const matrix: Record<string, Record<string, ResultParameter>> = {};
    let impressionParam: ResultParameter | null = null;
    let methodParam: ResultParameter | null = null;
    const extraParams: ResultParameter[] = [];

    parameters.forEach(param => {
        const name = param.parameter_name.toUpperCase().trim();
        const code = param.parameter_code.toUpperCase().trim();

        if (name.includes('IMPRESSION') || code.includes('IMPRESSION')) {
            impressionParam = param;
            return;
        }

        if (name.includes('METHOD') || code.includes('METHOD')) {
            methodParam = param;
            return;
        }

        if (param.is_header) return;

        let matched = false;
        const MATCH_ORDER = ['AH', 'BH', 'O', 'H'];
        for (const ag of MATCH_ORDER) {
            for (const dil of DILUTIONS) {
                const patterns = [
                    `${ag} ${dil}`,
                    `${ag}_${dil}`,
                    `${ag}-${dil}`,
                    `"${ag}" ${dil}`,
                ];
                if (patterns.some(p => name.includes(p) || code.includes(p))) {
                    if (!matrix[ag]) matrix[ag] = {};
                    matrix[ag][dil] = param;
                    matched = true;
                    break;
                }
            }
            if (matched) break;
        }

        if (!matched) {
            extraParams.push(param);
        }
    });

    return (
        <div className="widal-entry-container">
            <div className="widal-entry-grid-wrapper">
                <table className="widal-entry-grid">
                    <thead>
                        <tr>
                            <th className="antigen-header">Antigen</th>
                            {DILUTIONS.map(dil => (
                                <th key={dil} className="dilution-header">{dil}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {ANTIGEN_ORDER.map(ag => (
                            <tr key={ag}>
                                <td className="antigen-label">{ANTIGEN_LABELS[ag]}</td>
                                {DILUTIONS.map(dil => {
                                    const param = matrix[ag]?.[dil];
                                    if (!param) return <td key={dil} className="cell-disabled">—</td>;
                                    
                                    return (
                                        <td key={dil}>
                                            <input
                                                type="text"
                                                className="input grid-input"
                                                value={values[param.parameter_code] || ''}
                                                onChange={(e) => onValueChange(param.parameter_code, e.target.value)}
                                                onBlur={(e) => onInputBlur(param.parameter_code, e.target.value)}
                                                disabled={disabled}
                                                placeholder="-"
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Extra Parameters (Unmatched) */}
            {extraParams.length > 0 && (
                <div className="widal-extra-params">
                    {extraParams.map(param => (
                        <div key={param.parameter_code} className="extra-param-field">
                            <label>{param.parameter_name}</label>
                            <input
                                type="text"
                                className="input"
                                value={values[param.parameter_code] || ''}
                                onChange={(e) => onValueChange(param.parameter_code, e.target.value)}
                                onBlur={(e) => onInputBlur(param.parameter_code, e.target.value)}
                                disabled={disabled}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Special Fields (Impression & Method) */}
            <div className="widal-special-fields">
                {impressionParam && (
                    <div className="special-field">
                        <label>IMPRESSION :</label>
                        <input
                            type="text"
                            className="input impression-input"
                            value={values[(impressionParam as ResultParameter).parameter_code] || ''}
                            onChange={(e) => onValueChange((impressionParam as ResultParameter).parameter_code, e.target.value)}
                            onBlur={(e) => onInputBlur((impressionParam as ResultParameter).parameter_code, e.target.value)}
                            disabled={disabled}
                            placeholder="Enter impression..."
                        />
                    </div>
                )}
                {methodParam && (
                    <div className="special-field method-field">
                        <label>Method :</label>
                        <input
                            type="text"
                            className="input method-input"
                            value={values[(methodParam as ResultParameter).parameter_code] || ''}
                            onChange={(e) => onValueChange((methodParam as ResultParameter).parameter_code, e.target.value)}
                            onBlur={(e) => onInputBlur((methodParam as ResultParameter).parameter_code, e.target.value)}
                            disabled={disabled}
                            placeholder="Enter method..."
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
