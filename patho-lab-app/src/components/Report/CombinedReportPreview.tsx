import { useRef, useState, useEffect } from 'react';
import { useReactToPrint } from 'react-to-print';
import LabReport from '../../components/Report/LabReport';
import LabReportGreen from '../../components/Report/LabReportGreen';

interface CombinedReportPreviewProps {
    orderId: number;
    onClose: () => void;
}

export default function CombinedReportPreview({ orderId, onClose }: CombinedReportPreviewProps) {
    const componentRef = useRef<HTMLDivElement>(null);
    const [reportDataList, setReportDataList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [template, setTemplate] = useState<'standard' | 'green'>('standard');
    const [labSettings, setLabSettings] = useState<any>(null);

    // Fetch settings for active template
    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.labSettings.get().then(settings => {
                const settingsObj = settings.reduce((acc: any, curr: any) => ({
                    ...acc,
                    [curr.setting_key]: curr.setting_value
                }), {});
                setLabSettings(settingsObj);

                if (settingsObj.activeTemplate === 'green') setTemplate('green');
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

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Combined_Report_${reportDataList[0]?.patient?.patient_uid || orderId}`,
        pageStyle: `
            @page { size: auto; margin: 0mm; } 
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        `
    });

    const handleSavePdf = async () => {
        if (!componentRef.current || !window.electronAPI) return;

        try {
            // Wait for all images to load
            const images = componentRef.current.getElementsByTagName('img');
            await Promise.all(Array.from(images).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            }));

            // Calculate height based on A4 ratio (1:1.414) plus padding
            const width = componentRef.current.offsetWidth;
            const contentHeight = componentRef.current.offsetHeight;

            // Standard A4 height based on width
            const printHeight = Math.max(contentHeight + 200, width * 1.414);

            await window.electronAPI.reports.generatePdf({
                html: componentRef.current.outerHTML,
                fileName: `Combined_Report_${orderId}_${new Date().getTime()}`
            }, {
                printBackground: true,
                marginTop: 0,
                marginBottom: 0,
                marginLeft: 0,
                marginRight: 0,
                width: width,
                height: printHeight
            });

            // Note: The generatePdf function might need adjusting since we are rendering multiple A4 sized reports. 
            // In a production environment with electron-to-pdf, CSS page breaks usually handle this nicely.
        } catch (error) {
            console.error('Failed to generate PDF:', error);
            alert('Failed to generate PDF. Please try checking your settings or trying again.');
        }
    };

    if (loading) {
        return (
            <div className="modal-overlay">
                <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
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
        <div className="modal-overlay" style={{ padding: '2rem' }}>
            <div className="modal-content" style={{ maxWidth: '1000px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>

                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2>Combined Lab Report Preview</h2>
                    <div className="actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary" onClick={() => handlePrint()}>🖨️ Print Combined Report</button>
                        <button className="btn btn-primary" onClick={handleSavePdf}>💾 Save as PDF</button>
                        <button className="btn btn-icon" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div
                    className="report-preview-container"
                    style={{ flex: 1, overflowY: 'auto', background: '#ccc', padding: '2rem', borderRadius: 'var(--radius-md)' }}
                >
                    <style>
                        {`
                        @media print {
                            .page-break-after {
                                page-break-after: always;
                            }
                        }
                        .page-break-after {
                            margin-bottom: 2rem;
                            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                        }
                        `}
                    </style>
                    <div ref={componentRef} style={{ background: 'white' }}>
                        {reportDataList.map((reportData, index) => (
                            <div key={index} className="page-break-after">
                                {template === 'green' ? (
                                    <LabReportGreen data={reportData} labSettings={labSettings} />
                                ) : (
                                    <LabReport data={reportData} labSettings={labSettings} />
                                )}
                                {/* Add page breaks after every report EXCEPT the last one */}
                                {index < reportDataList.length - 1 && (
                                    <div style={{ pageBreakAfter: 'always' }}></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
