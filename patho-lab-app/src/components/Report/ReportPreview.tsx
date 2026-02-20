import { useState, useEffect } from 'react';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import LabReport from './LabReport';
import './ReportPreview.css';

interface ReportData {
    sample: any;
    patient: any;
    test: any;
    results: any[];
}

interface LabSettings {
    [key: string]: string;
}

interface Props {
    sampleId: number;
    onClose: () => void;
}

export default function ReportPreview({ sampleId, onClose }: Props) {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [labSettings, setLabSettings] = useState<LabSettings>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [sampleId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            if (window.electronAPI) {
                const [data, settings] = await Promise.all([
                    window.electronAPI.reports.getData(sampleId),
                    window.electronAPI.labSettings.get()
                ]);

                if (!data) {
                    throw new Error('Report data not found');
                }

                setReportData(data);
                setLabSettings(settings);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load report data');
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal report-modal">
                    <div className="loading">Loading report...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="modal-overlay">
                <div className="modal report-modal">
                    <div className="error">{error}</div>
                    <button className="btn btn-secondary" onClick={onClose}>Close</button>
                </div>
            </div>
        );
    }

    if (!reportData) {
        return null;
    }

    return (
        <div className="modal-overlay">
            <div className="modal report-modal">
                <div className="report-header">
                    <h2>Lab Report - {reportData.patient.full_name}</h2>
                    <div className="report-actions">
                        <PDFDownloadLink
                            document={<LabReport data={reportData} labSettings={labSettings} />}
                            fileName={`Report_${reportData.sample.sample_uid}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) => loading ? 'Preparing...' : '⬇ Download PDF'}
                        </PDFDownloadLink>
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>

                <div className="pdf-viewer-container">
                    <PDFViewer width="100%" height="100%" showToolbar={false}>
                        <LabReport data={reportData} labSettings={labSettings} />
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
