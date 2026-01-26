import { useState, useEffect } from 'react';
import './Results.css';
import ResultEntryForm from './ResultEntryForm';
import ResultKanbanBoard from './ResultKanbanBoard';
import { Sample } from './types';

export default function ResultsPage() {
    const [viewMode, setViewMode] = useState<'board' | 'entry'>('board');
    const [samples, setSamples] = useState<Sample[]>([]);
    const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSamples();
    }, []);

    const loadSamples = async () => {
        setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.results.getPendingSamples();
                setSamples(data);
            }
        } catch (e) {
            console.error('Failed to load samples:', e);
        }
        setLoading(false);
    };

    const handleSelectSample = (sampleId: number) => {
        setSelectedSampleId(sampleId);
        setViewMode('entry');
    };

    const handleBackToBoard = () => {
        setViewMode('board');
        setSelectedSampleId(null);
        loadSamples(); // Refresh list to update statuses
    };

    const handleSampleUpdate = () => {
        loadSamples(); // Refresh data in background or foreground
    };

    return (
        <div className="results-page-container">
            {viewMode === 'board' && (
                <>
                    <div className="page-header-actions">
                        <h1 className="page-title">Results Dashboard</h1>
                        <div className="search-bar">
                            <input
                                type="text"
                                placeholder="Search by Patient, Sample ID, or Test..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="input search-input"
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-state">Loading samples...</div>
                    ) : (
                        <ResultKanbanBoard
                            samples={samples}
                            onSelectSample={handleSelectSample}
                            searchQuery={searchQuery}
                        />
                    )}
                </>
            )}

            {viewMode === 'entry' && selectedSampleId && (
                <ResultEntryForm
                    sampleId={selectedSampleId}
                    onClose={handleBackToBoard}
                    onSampleUpdate={handleSampleUpdate}
                />
            )}
        </div>
    );
}
