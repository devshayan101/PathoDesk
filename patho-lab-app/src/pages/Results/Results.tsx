import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Results.css';
import ResultEntryForm from './ResultEntryForm';
import ResultKanbanBoard from './ResultKanbanBoard';
import { Sample } from './types';

export default function ResultsPage() {
    const location = useLocation();
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState<'board' | 'entry'>('board');
    const [samples, setSamples] = useState<Sample[]>([]);
    const [selectedSampleId, setSelectedSampleId] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSamples();
    }, []);

    const loadSamples = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            if (window.electronAPI) {
                const data = await window.electronAPI.results.getPendingSamples();
                setSamples(data);
            }
        } catch (e) {
            console.error('Failed to load samples:', e);
        }
        if (!silent) setLoading(false);
    };

    // Auto-select sample if provided in navigation state
    useEffect(() => {
        if (!loading && samples.length > 0 && location.state?.filterSampleUid) {
            const sampleUid = location.state.filterSampleUid;
            const sampleToOpen = samples.find(s => s.sample_uid === sampleUid);

            if (sampleToOpen) {
                handleSelectSample(sampleToOpen.id);
            } else {
                // If not found, just pre-fill the search bar
                setSearchQuery(sampleUid);
            }

            // Clear state to prevent reopening on refresh
            navigate('.', { replace: true, state: {} });
        }
    }, [loading, samples, location.state, navigate]);

    const handleSelectSample = (sampleId: number) => {
        setSelectedSampleId(sampleId);
        setViewMode('entry');
    };

    const handleBackToBoard = () => {
        setViewMode('board');
        setSelectedSampleId(null);
        loadSamples(); // Full refresh when going back to board
    };

    const handleSampleUpdate = () => {
        loadSamples(true); // Silent refresh - don't disrupt the entry form
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
