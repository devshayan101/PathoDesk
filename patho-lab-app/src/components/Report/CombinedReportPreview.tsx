import { useState, useEffect } from 'react';
import { PDFViewer, PDFDownloadLink, pdf, Document } from '@react-pdf/renderer';
import CombinedLabReport from './CombinedLabReport';
import CombinedLabReportGreen from './CombinedLabReportGreen';

interface CombinedReportPreviewProps {
    orderId: number;
    onClose: () => void;
}

export default function CombinedReportPreview({ orderId, onClose }: CombinedReportPreviewProps) {
    const [reportDataList, setReportDataList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState<'standard' | 'green'>('standard');
    const [labSettings, setLabSettings] = useState<any>({});

    const [printing, setPrinting] = useState(false);

    // Fetch settings for active template
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.labSettings.get().then((settings: any) => {
                setLabSettings(settings);

                if (settings.activeTemplate === 'green' || settings.report_theme === 'green') setTemplate('green');
            });
        }
    }, []);

    useEffect(() => {
        const loadAllData = async () => {
            if (!orderId || !window.electronAPI) return;
            try {
                const data = await window.electronAPI.reports.getOrderData(orderId);
                setReportDataList(data);
            } catch (err) {
                console.error("Failed to load combined report data", err);
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [orderId]);

    const handlePrint = async () => {
        if (!reportDataList || reportDataList.length === 0) return;
        setPrinting(true);
        try {
            const blob = await pdf(
                <Document>
                    {template === 'green' ? (
                        <CombinedLabReportGreen dataList={reportDataList} labSettings={labSettings} />
                    ) : (
                        <CombinedLabReport dataList={reportDataList} labSettings={labSettings} />
                    )}
                </Document>
            ).toBlob();
            const url = URL.createObjectURL(blob);
            const printWindow = window.open(url);
            if (printWindow) {
                printWindow.addEventListener('load', () => {
                    printWindow.print();
                    URL.revokeObjectURL(url);
                });
            }
        } catch (e) {
            console.error('Failed to print combined report:', e);
        }
        setPrinting(false);
    };

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal.report-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div className="loading" style={{ margin: '2rem 0' }}>Generating Combined Report...</div>
                </div>
            </div>
        );
    }

    if (!reportDataList || reportDataList.length === 0) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <h3 style={{ margin: '0 0 1rem' }}>No Reports Available</h3>
                    <p style={{ color: 'var(--color-text-muted)' }}>We couldn't generate any reports for this order. Ensure samples have tests with entered results.</p>
                    <button className="btn btn-primary" onClick={onClose} style={{ marginTop: '1rem' }}>Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay">
            <div className="modal report-modal">
                <div className="report-header">
                    <h2>Combined Lab Report Preview</h2>
                    <div className="report-actions">
                        <button
                            className="btn btn-primary"
                            onClick={handlePrint}
                            disabled={printing}
                        >
                            {printing ? 'Preparing...' : '🖨 Print Combined'}
                        </button>
                        <PDFDownloadLink
                            document={
                                <Document>
                                    {template === 'green' ? (
                                        <CombinedLabReportGreen dataList={reportDataList} labSettings={labSettings} />
                                    ) : (
                                        <CombinedLabReport dataList={reportDataList} labSettings={labSettings} />
                                    )}
                                </Document>
                            }
                            fileName={`Combined_Report_${orderId}_${new Date().getTime()}.pdf`}
                            className="btn btn-primary"
                        >
                            {({ loading }) => loading ? 'Preparing...' : '⬇ Download PDF'}
                        </PDFDownloadLink>
                        <button className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>

                <div className="pdf-viewer-container">
                    <PDFViewer width="100%" height="100%" showToolbar={false}>
                        <Document>
                            {template === 'green' ? (
                                <CombinedLabReportGreen dataList={reportDataList} labSettings={labSettings} />
                            ) : (
                                <CombinedLabReport dataList={reportDataList} labSettings={labSettings} />
                            )}
                        </Document>
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
