import './AgeInput.css';

interface AgeInputProps {
    /** Total value in days */
    value: number;
    /** Called with new total days */
    onChange: (totalDays: number) => void;
}

function daysToComposite(totalDays: number) {
    const years = Math.floor(totalDays / 365);
    const remaining = totalDays - years * 365;
    const months = Math.floor(remaining / 30);
    const days = remaining - months * 30;
    return { years, months, days };
}

function compositeToDays(years: number, months: number, days: number) {
    return years * 365 + months * 30 + days;
}

export default function AgeInput({ value, onChange }: AgeInputProps) {
    const { years, months, days } = daysToComposite(value);

    const update = (field: 'years' | 'months' | 'days', raw: string) => {
        const num = parseInt(raw) || 0;
        const y = field === 'years' ? num : years;
        const m = field === 'months' ? num : months;
        const d = field === 'days' ? num : days;
        onChange(compositeToDays(y, m, d));
    };

    return (
        <div className="age-input-group">
            <div className="age-input-field">
                <label>Years</label>
                <input className="input" type="number" min={0} max={120}
                    value={years} onChange={e => update('years', e.target.value)} />
            </div>
            <div className="age-input-field">
                <label>Months</label>
                <input className="input" type="number" min={0} max={11}
                    value={months} onChange={e => update('months', e.target.value)} />
            </div>
            <div className="age-input-field">
                <label>Days</label>
                <input className="input" type="number" min={0} max={29}
                    value={days} onChange={e => update('days', e.target.value)} />
            </div>
        </div>
    );
}
