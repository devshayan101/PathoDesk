
import { Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import logoUrl from '/icon.png';
import WidalTable, { isWidalTest } from './WidalTable';

// Register a standard font for better rendering
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
    ]
});

// PDF Styles
const FOOTER_HEIGHT = 130;
const styles = StyleSheet.create({
    page: {
        paddingTop: 24, // 30 + 1.5rem (24px)
        paddingLeft: 30,
        paddingRight: 30,
        paddingBottom: FOOTER_HEIGHT + 20,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        borderBottomWidth: 3,
        borderBottomColor: '#0055cc',
        paddingBottom: 8,
        backgroundColor: '#ffffff',
        padding: 10,
    },
    logo: {
        width: 60,
        height: 60,
        marginRight: 15,
        objectFit: 'contain',
    },
    labInfoContainer: {
        flex: 1,
    },
    labName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#004080',
        marginBottom: 2,
    },
    labInfoRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 2,
    },
    labInfo: {
        fontSize: 8,
        color: '#555555',
        marginRight: 10,
    },
    patientSectionContainer: {
        borderWidth: 1,
        borderColor: '#d1e0ec',
        borderRadius: 4,
        marginBottom: 10,
        backgroundColor: '#f0f4f8',
    },
    patientSectionRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#d1e0ec',
    },
    patientSectionRowLast: {
        flexDirection: 'row',
    },
    patientCol: {
        flex: 1,
        padding: 6,
        paddingHorizontal: 10,
        borderRightWidth: 1,
        borderRightColor: '#d1e0ec',
    },
    patientColLast: {
        flex: 1,
        padding: 6,
        paddingHorizontal: 10,
    },
    label: {
        fontSize: 7,
        color: '#607d8b',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    value: {
        fontSize: 9,
        fontWeight: 'bold',
        color: '#102a43',
    },
    testHeader: {
        backgroundColor: '#0066cc',
        color: '#ffffff',
        paddingVertical: 6,
        paddingHorizontal: 8,
        marginBottom: 0,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    table: {
        marginBottom: 15,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 4,
        backgroundColor: '#e1f0fa',
        borderBottomWidth: 2,
        borderBottomColor: '#0066cc',
    },
    tableHeaderCell: {
        fontSize: 8,
        color: '#004080',
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0,
        borderBottomColor: '#ebf4fa',
        paddingVertical: 4,
        paddingHorizontal: 4,
        minHeight: 18,
        alignItems: 'center',
    },
    tableRowEven: {
        backgroundColor: '#ffffff',
    },
    tableRowOdd: {
        backgroundColor: '#f6fafe',
    },
    colParameter: { flex: 3 },
    colResult: { flex: 2, textAlign: 'center' },
    colUnit: { flex: 1.5, textAlign: 'center' },
    colRange: { flex: 2, textAlign: 'center' },
    colFlag: { flex: 1, textAlign: 'center' },
    flagNormal: { color: '#28a745' },
    flagHigh: { color: '#dc3545', fontWeight: 'bold' },
    flagLow: { color: '#007bff', fontWeight: 'bold' },
    flagCritical: { color: '#dc3545', fontWeight: 'bold', textDecoration: 'underline' },
    footer: {
        position: 'absolute',
        bottom: 25,
        left: 30,
        right: 30,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 10,
    },
    verification: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    signatureBox: {
        width: 150,
        alignItems: 'center',
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        width: '100%',
        marginBottom: 5,
    },
    signatureImage: {
        width: 120,
        height: 40,
        objectFit: 'contain' as const,
        marginBottom: 4,
    },
    disclaimer: {
        fontSize: 7,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
    },
    watermarkContainer: {
        position: 'absolute',
        top: 350,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.05,
    },
    brandingContainer: {
        position: 'absolute',
        bottom: 10,
        left: 30,
        right: 30,
        alignItems: 'center',
    },
    brandingText: {
        fontSize: 6,
        color: '#bbb',
        textAlign: 'center',
    },
});

interface ReportData {
    sample: {
        id: number;
        sample_uid: string;
        received_at: string;
        status: string;
        verified_at?: string;
        verified_by_name?: string;
    };
    patient: {
        id: number;
        patient_uid: string;
        full_name: string;
        dob: string;
        gender: string;
        phone?: string;
    };
    test: {
        test_name: string;
        department: string;
        method: string;
        sample_type: string;
        interpretation_template?: string;
    };
    results: {
        parameter_code: string;
        parameter_name: string;
        result_value: string;
        unit: string | null;
        abnormal_flag: string | null;
        ref_range_text: string | null;
        is_header?: number;
        parent_id?: number | null;
    }[];
    referringDoctor?: {
        name: string;
        specialty?: string;
    } | null;
    labTechnician?: {
        name: string;
        qualification?: string;
        signature?: string;
    } | null;
    pathologist?: {
        name: string;
        qualification?: string;
        signature?: string;
    } | null;
}

interface LabSettings {
    lab_name?: string;
    address_line1?: string;
    address_line2?: string;
    phone?: string;
    email?: string;
    nabl_accreditation?: string;
    disclaimer?: string;
    show_time_in_report?: string;
    report_theme?: string;
}

interface Props {
    data: ReportData;
    labSettings: LabSettings;
}

// Calculate age from DOB
function calculateAge(dob: string): string {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
        years--;
    }
    return `${years} years`;
}

// Format date — optionally includes time
export function formatDate(dateStr: string | null | undefined, showTime = false): string {
    const validDateStr = dateStr || new Date().toISOString();

    // SQLite returns "YYYY-MM-DD HH:MM:SS". JS parses this as local if no Z is present.
    // Convert to ISO string explicitly to enforce UTC parsing and local offset conversion.
    let isoStr = validDateStr;
    if (isoStr.includes(' ') && !isoStr.includes('T')) {
        isoStr = isoStr.replace(' ', 'T') + 'Z';
    } else if (isoStr.length === 10) {
        // Just a Date
        isoStr = isoStr + 'T00:00:00Z';
    } else if (!isoStr.endsWith('Z') && !isoStr.includes('+') && !isoStr.includes('-')) {
        isoStr += 'Z';
    }

    const date = new Date(isoStr);
    const opts: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    };
    if (showTime) {
        opts.hour = '2-digit';
        opts.minute = '2-digit';
    }
    return date.toLocaleDateString('en-IN', opts);
}

// Get flag style
function getFlagStyle(flag: string | null) {
    switch (flag) {
        case 'HIGH': return styles.flagHigh;
        case 'LOW': return styles.flagLow;
        case 'CRITICAL':
        case 'CRITICAL_HIGH':
        case 'CRITICAL_LOW': return styles.flagCritical;
        default: return styles.flagNormal;
    }
}

// Format flag display
function formatFlag(flag: string | null): string {
    switch (flag) {
        case 'HIGH': return 'H';
        case 'LOW': return 'L';
        case 'CRITICAL':
        case 'CRITICAL_HIGH': return 'C↑';
        case 'CRITICAL_LOW': return 'C↓';
        case 'NORMAL': return '';
        default: return '';
    }
}



export default function LabReport({ data, labSettings }: Props) {
    const { sample, patient, test, results: rawResults, referringDoctor } = data;
    const showTime = labSettings.show_time_in_report === 'true';

    // Filter out parameters with no result value, but keep headers
    const results = rawResults.filter(r => r.is_header === 1 || (r.result_value && r.result_value.trim() !== ''));

    return (
        <Page size="A4" style={[styles.page, { display: 'flex', flexDirection: 'column' }]}>
            {/* Microscope Watermark - fixed on every page */}
            <View style={styles.watermarkContainer} fixed>
                <Image src={logoUrl} style={{ width: 220, opacity: 0.1 }} />
                {labSettings.lab_name && (
                    <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#000', opacity: 0.1, marginTop: 10 }}>
                        {labSettings.lab_name}
                    </Text>
                )}
            </View>

            {/* Header - Lab Info - fixed on every page */}
            <View style={styles.header} fixed>
                <Image src={logoUrl} style={styles.logo} />
                <View style={[styles.labInfoContainer, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={[styles.labName, { flex: 1, flexWrap: 'wrap', paddingRight: 10 }]}>{labSettings.lab_name || 'Pathology Laboratory'}</Text>
                    
                    <Image src="/24_7.png" style={{ width: 44, height: 44, marginRight: 15 }} />

                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                        <View style={styles.labInfoRow}>
                            {labSettings.address_line1 && <Text style={styles.labInfo}>{labSettings.address_line1},</Text>}
                            {labSettings.address_line2 && <Text style={styles.labInfo}>{labSettings.address_line2}</Text>}
                        </View>

                        <View style={styles.labInfoRow}>
                            {labSettings.phone && <Text style={styles.labInfo}>Phone: {labSettings.phone}</Text>}
                            {labSettings.email && <Text style={styles.labInfo}>Email: {labSettings.email}</Text>}
                            {labSettings.nabl_accreditation && (
                                <Text style={styles.labInfo}>NABL: {labSettings.nabl_accreditation}</Text>
                            )}
                        </View>
                    </View>
                </View>
            </View>

            {/* Patient Info */}
            <View style={styles.patientSectionContainer}>
                {/* Row 1 */}
                <View style={styles.patientSectionRow}>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Patient Name</Text>
                        <Text style={styles.value}>{patient.full_name}</Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Age / Gender</Text>
                        <Text style={styles.value}>
                            {calculateAge(patient.dob)} / {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                        </Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Patient ID</Text>
                        <Text style={styles.value}>{patient.patient_uid}</Text>
                    </View>
                    <View style={styles.patientColLast}>
                        <Text style={styles.label}>Sample ID</Text>
                        <Text style={styles.value}>{sample.sample_uid}</Text>
                    </View>
                </View>

                {/* Row 2 */}
                <View style={!referringDoctor ? styles.patientSectionRowLast : styles.patientSectionRow}>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Sample Received</Text>
                        <Text style={styles.value}>{formatDate(sample.received_at, showTime)}</Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Report Date</Text>
                        <Text style={styles.value}>{formatDate(new Date().toISOString(), showTime)}</Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Sample Type</Text>
                        <Text style={styles.value}>{test.sample_type}</Text>
                    </View>
                    <View style={styles.patientColLast}>
                        <Text style={styles.label}>Method</Text>
                        <Text style={styles.value}>{test.method}</Text>
                    </View>
                </View>

                {/* Row 3 (Referred By - Optional) */}
                {referringDoctor && (
                    <View style={styles.patientSectionRowLast}>
                        <View style={styles.patientCol}>
                            <Text style={styles.label}>Referred By</Text>
                            <Text style={styles.value}>{referringDoctor.name}</Text>
                        </View>
                        <View style={styles.patientCol}>
                            <Text style={styles.label}>Specialty</Text>
                            <Text style={styles.value}>{referringDoctor.specialty || '-'}</Text>
                        </View>
                        <View style={styles.patientCol}>
                            <Text style={styles.label}></Text>
                            <Text style={styles.value}></Text>
                        </View>
                        <View style={styles.patientColLast}>
                            <Text style={styles.label}></Text>
                            <Text style={styles.value}></Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Test Name */}
            <Text style={styles.testHeader}>{test.test_name}</Text>

            {/* Results — Widal matrix or normal table */}
            {isWidalTest(test.test_name) ? (
                <WidalTable testName={test.test_name} results={results} />
            ) : (
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.colParameter, styles.tableHeaderCell]}>Parameter</Text>
                        <Text style={[styles.colResult, styles.tableHeaderCell]}>Result</Text>
                        <Text style={[styles.colUnit, styles.tableHeaderCell]}>Unit</Text>
                        <Text style={[styles.colRange, styles.tableHeaderCell]}>Reference Range</Text>
                        <Text style={[styles.colFlag, styles.tableHeaderCell]}>Flag</Text>
                    </View>
                    {results.map((result, idx) => {
                        const rowStyle = idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd;
                        return result.is_header === 1 ? (
                            <View key={idx} style={[styles.tableRow, rowStyle, { paddingVertical: 2, minHeight: 12, borderBottomWidth: 0 }]} wrap={false}>
                                <Text style={[styles.colParameter, { fontWeight: 'bold', width: '100%', fontSize: 10, color: '#004080' }]}>{result.parameter_name}</Text>
                            </View>
                        ) : (
                            <View key={idx} style={[styles.tableRow, rowStyle]} wrap={false}>
                                <Text style={[styles.colParameter, { paddingLeft: result.parent_id ? 15 : 0, color: '#102a43' }]}>{result.parameter_name}</Text>
                                <Text style={[styles.colResult, { fontSize: 10, fontWeight: 'bold', color: '#102a43'}, getFlagStyle(result.abnormal_flag)]}>
                                    {result.result_value || '-'}
                                </Text>
                                <Text style={[styles.colUnit, { color: '#607d8b' }]}>{result.unit || ''}</Text>
                                <Text style={[styles.colRange, { fontSize: 8, color: '#607d8b' }]}>{result.ref_range_text || '-'}</Text>
                                <Text style={[styles.colFlag, getFlagStyle(result.abnormal_flag)]}>
                                    {formatFlag(result.abnormal_flag)}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            )}

            {/* Interpretation Template */}
            {test.interpretation_template && (
                <View style={{ marginTop: 0, padding: 10, border: '1px solid #eee', borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'normal', marginBottom: 5 }}>Note:</Text>
                    <Text style={{ fontSize: 9, color: '#444', lineHeight: 1.4 }}>
                        {test.interpretation_template}
                    </Text>
                </View>
            )}

            {/* Footer - fixed at bottom of every page */}
            <View style={styles.footer} fixed>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                    {/* Lab Technician Signature */}
                    <View style={styles.signatureBox}>
                        {data.labTechnician?.signature ? (
                            <Image src={data.labTechnician.signature} style={styles.signatureImage} />
                        ) : (
                            <View style={styles.signatureLine} />
                        )}
                        <Text style={styles.label}>{data.labTechnician?.name || 'Lab Technician'}</Text>
                        {data.labTechnician?.qualification && (
                            <Text style={[styles.label, { fontSize: 7 }]}>{data.labTechnician.qualification}</Text>
                        )}
                        <Text style={[styles.label, { fontWeight: 'bold' }]}>Lab Technician</Text>
                    </View>

                    {/* Report Status (Middle) */}
                    <View style={{ alignItems: 'center', marginBottom: 5 }}>
                        <Text style={[styles.label, { fontSize: 9 }]}>Report Status: {sample.status}</Text>
                        {sample.verified_at && (
                            <Text style={[styles.label, { fontSize: 9 }]}>Verified: {formatDate(sample.verified_at, showTime)}</Text>
                        )}
                    </View>

                    {/* Pathologist Signature */}
                    <View style={styles.signatureBox}>
                        {data.pathologist?.signature ? (
                            <Image src={data.pathologist.signature} style={styles.signatureImage} />
                        ) : (
                            <View style={styles.signatureLine} />
                        )}
                        <Text style={styles.label}>{data.pathologist?.name || sample.verified_by_name || 'Pathologist'}</Text>
                        {data.pathologist?.qualification && (
                            <Text style={[styles.label, { fontSize: 7 }]}>{data.pathologist.qualification}</Text>
                        )}
                        <Text style={[styles.label, { fontWeight: 'bold' }]}>Pathologist</Text>
                    </View>
                </View>
                <Text style={styles.disclaimer}>{labSettings.disclaimer}</Text>
            </View>

            {/* Software Branding - fixed at bottom of every page */}
            <View style={styles.brandingContainer} fixed>
                <Text style={styles.brandingText}>FMS Software Solutions</Text>
                <Text style={styles.brandingText}>Email: fmsenterprises001@gmail.com | WhatsApp: +91-7765009936</Text>
            </View>
        </Page>
    );
}
