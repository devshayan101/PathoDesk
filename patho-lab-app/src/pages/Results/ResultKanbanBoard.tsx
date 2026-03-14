import { useMemo } from 'react';
import { Sample } from './types';

interface ResultKanbanBoardProps {
    samples: Sample[];
    onSelectSample: (sampleId: number) => void;
    searchQuery: string;
}

const COLUMNS = [
    { id: 'pending', title: 'Pending', status: ['RECEIVED'] },
    { id: 'in_progress', title: 'In Progress', status: ['DRAFT'] },
    { id: 'to_verify', title: 'To Verify', status: ['SUBMITTED'] },
    { id: 'completed', title: 'Completed', status: ['VERIFIED', 'FINALIZED'] }
];

export default function ResultKanbanBoard({ samples, onSelectSample, searchQuery }: ResultKanbanBoardProps) {

    const filteredSamples = useMemo(() => {
        if (!searchQuery) return samples;
        const lowerQuery = searchQuery.toLowerCase();
        return samples.filter(s =>
            s.sample_uid.toLowerCase().includes(lowerQuery) ||
            s.patient_name.toLowerCase().includes(lowerQuery) ||
            s.test_name.toLowerCase().includes(lowerQuery)
        );
    }, [samples, searchQuery]);

    const getColumnSamples = (statuses: string[]) => {
        return filteredSamples.filter(s => statuses.includes(s.status));
    };

    return (
        <div className="kanban-board">
            {COLUMNS.map(col => (
                <div key={col.id} className={`kanban-column col-${col.id}`}>
                    <div className="column-header">
                        <h3>{col.title}</h3>
                        <span className="count-badge">{getColumnSamples(col.status).length}</span>
                    </div>
                    <div className="column-content">
                        {getColumnSamples(col.status).map(sample => (
                            <div
                                key={sample.id}
                                className="kanban-card"
                                onClick={() => onSelectSample(sample.id)}
                            >
                                <div className="card-header">
                                    <span className="sample-uid">{sample.sample_uid}</span>
                                    <span className={`status-dot status-${sample.status.toLowerCase()}`}></span>
                                </div>
                                <div className="card-body">
                                    <p className="patient-name">{sample.patient_name}</p>
                                    <p className="test-name">{sample.test_name}</p>
                                    {sample.doctor_name && (
                                        <p className="doctor-name">
                                            <span className="label">Ref:</span> {sample.doctor_name}
                                        </p>
                                    )}
                                </div>
                                <div className="card-footer">
                                    <span className="order-uid">{sample.order_uid}</span>
                                    {(sample.received_at || sample.collected_at) && (
                                        <span className="sample-date" style={{ fontSize: '0.7rem' }}>
                                            {new Date(sample.received_at || sample.collected_at!).toLocaleDateString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}
