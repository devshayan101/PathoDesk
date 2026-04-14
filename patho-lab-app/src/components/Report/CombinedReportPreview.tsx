import { useState, useEffect, useMemo } from 'react';
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
    const [qrCode, setQrCode] = useState<string | null>(null);

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

    // Fetch QR code for verification
    useEffect(() => {
        const fetchQR = async () => {
            if (reportDataList.length > 0) {
                const sample = reportDataList[0].sample;
                if (sample?.verification_token) {
                    const qr = await window.electronAPI.reports.generateQRCode(sample.verification_token);
                    setQrCode(qr);
                }
            }
        };
        fetchQR();
    }, [reportDataList]);

    const combinedDocument = useMemo(() => {
        if (!reportDataList || reportDataList.length === 0) return null;
        
        return (
            <Document>
                {template === 'green' ? (
                    <CombinedLabReportGreen dataList={reportDataList} labSettings={labSettings} qrCode={qrCode} />
                ) : (
                    <CombinedLabReport dataList={reportDataList} labSettings={labSettings} qrCode={qrCode} />
                )}
            </Document>
        );
    }, [reportDataList, template, labSettings, qrCode]);

    // Handle auto-archival for verified/finalized reports
    useEffect(() => {
        if (loading || reportDataList.length === 0 || !combinedDocument) return;
        
        const autoArchive = async () => {
            const firstSample = reportDataList[0].sample;
            if (firstSample.status === 'FINALIZED' || firstSample.status === 'VERIFIED') {
                try {
                    const blob = await pdf(combinedDocument).toBlob();
                    const buffer = await blob.arrayBuffer();
                    const uint8Array = new Uint8Array(buffer);
                    
                    // We archive order reports with a prefix 'ORD_' or just use the first sample UID?
                    // Let's use firstSample.sample_uid + "_combined"
                    await window.electronAPI.reports.uploadPdf(`${firstSample.sample_uid}_combined`, uint8Array);
                    console.log(`Auto-archived combined report for ${firstSample.sample_uid}`);
                } catch (err) {
                    console.error("Combined auto-archival failed", err);
                }
            }
        };

        if (qrCode) {
            autoArchive();
        }
    }, [loading, reportDataList, qrCode, combinedDocument]);

    const handlePrint = async () => {
        if (!combinedDocument) return;
        setPrinting(true);
        try {
            const blob = await pdf(combinedDocument).toBlob();
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
                <div className="modal report-modal" style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div className="loading" style={{ margin: '2rem 0' }}>Generating Combined Report...</div>
                </div>
            </div>
        );
    }

    if (!reportDataList || reportDataList.length === 0 || !combinedDocument) {
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
                            document={combinedDocument}
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
                        {combinedDocument}
                    </PDFViewer>
                </div>
            </div>
        </div>
    );
}
