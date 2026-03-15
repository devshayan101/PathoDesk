import { Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';
import logoUrl from '/icon.png';
import WidalTable, { isWidalTest } from './WidalTable';
import { formatDate } from './LabReport';

// Register a standard font for better rendering
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
    ]
});

// PDF Styles
const FOOTER_HEIGHT = 110;
const styles = StyleSheet.create({
    page: {
        paddingTop: 30,
        paddingLeft: 30,
        paddingRight: 30,
        paddingBottom: FOOTER_HEIGHT + 30,
        fontSize: 10,
        fontFamily: 'Helvetica',
    },
    header: {
        marginBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#0066cc',
        paddingBottom: 10,
    },
    labName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#0066cc',
        marginBottom: 4,
    },
    labInfo: {
        fontSize: 9,
        color: '#666',
        marginBottom: 2,
    },
    patientSection: {
        flexDirection: 'row',
        marginBottom: 5,
        backgroundColor: '#f5f5f5',
        padding: 10,
        borderRadius: 4,
    },
    patientCol: {
        flex: 1,
    },
    label: {
        fontSize: 8,
        color: '#666',
        marginBottom: 2,
    },
    value: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    testHeader: {
        backgroundColor: '#0066cc',
        color: 'white',
        padding: 8,
        marginBottom: 5,
        fontSize: 12,
        fontWeight: 'bold',
    },
    table: {
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#e0e0e0',
        padding: 6,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        padding: 6,
        minHeight: 25,
        alignItems: 'center',
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

export default function CombinedLabReport({ dataList, labSettings }: any) {
    if (!dataList || dataList.length === 0) return null;
    
    // Extracted global patient and sample info from the first report
    const { sample, patient, referringDoctor } = dataList[0];
    const showTime = labSettings.show_time_in_report === 'true';

    // Find first available lab technician and pathologist
    const labTechnician = dataList.find((d: any) => d.labTechnician)?.labTechnician || null;
    const pathologist = dataList.find((d: any) => d.pathologist)?.pathologist || null;

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
                <Text style={styles.labName}>{labSettings.lab_name || 'Pathology Laboratory'}</Text>
                <Text style={styles.labInfo}>{labSettings.address_line1}</Text>
                <Text style={styles.labInfo}>{labSettings.address_line2}</Text>
                <Text style={styles.labInfo}>
                    Phone: {labSettings.phone}  |  Email: {labSettings.email}
                </Text>
                {labSettings.nabl_accreditation && (
                    <Text style={styles.labInfo}>NABL: {labSettings.nabl_accreditation}</Text>
                )}
            </View>

            {/* Patient Info */}
            <View style={styles.patientSection} fixed>
                <View style={styles.patientCol}>
                    <Text style={styles.label}>Patient Name</Text>
                    <Text style={styles.value}>{patient.full_name}</Text>
                </View>
                <View style={styles.patientCol}>
                    <Text style={styles.label}>Patient ID</Text>
                    <Text style={styles.value}>{patient.patient_uid}</Text>
                </View>
                <View style={styles.patientCol}>
                    <Text style={styles.label}>Age / Gender</Text>
                    <Text style={styles.value}>
                        {calculateAge(patient.dob)} / {patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other'}
                    </Text>
                </View>
                <View style={styles.patientCol}>
                    <Text style={styles.label}>Sample ID</Text>
                    <Text style={styles.value}>{sample.sample_uid}</Text>
                </View>
            </View>

            <View style={styles.patientSection} fixed>
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
                    {/* Just display mixed if multiple, or one type */}
                    <Text style={styles.value}>{Array.from(new Set(dataList.map((d: any) => d.test.sample_type))).join(', ')}</Text>
                </View>
                <View style={styles.patientCol}>
                    <Text style={styles.label}>Method</Text>
                    <Text style={styles.value}>{Array.from(new Set(dataList.map((d: any) => d.test.method))).join(', ')}</Text>
                </View>
            </View>

            {/* Referred By */}
            {referringDoctor && (
                <View style={[styles.patientSection, { marginBottom: 10 }]} fixed>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Referred By</Text>
                        <Text style={styles.value}>{referringDoctor.name}</Text>
                    </View>
                    {referringDoctor.specialty && (
                        <View style={styles.patientCol}>
                            <Text style={styles.label}>Specialty</Text>
                            <Text style={styles.value}>{referringDoctor.specialty}</Text>
                        </View>
                    )}
                </View>
            )}

            {/* Render all Tests and Results Continously */}
            <View wrap={true}>
                {dataList.map((data: any, testIndex: number) => {
                    const { test, results } = data;
                    return (
                        <View key={testIndex} style={{ marginBottom: 15 }} wrap={false}>
                            {/* Test Name */}
                            <Text style={styles.testHeader}>{test.test_name}</Text>

                            {/* Results — Widal matrix or normal table */}
                            {isWidalTest(test.test_name) ? (
                                <WidalTable testName={test.test_name} results={results} />
                            ) : (
                                <View style={styles.table}>
                                    <View style={styles.tableHeader}>
                                        <Text style={styles.colParameter}>Parameter</Text>
                                        <Text style={styles.colResult}>Result</Text>
                                        <Text style={styles.colUnit}>Unit</Text>
                                        <Text style={styles.colRange}>Reference Range</Text>
                                        <Text style={styles.colFlag}>Flag</Text>
                                    </View>
                                    {results.map((result: any, idx: number) => (
                                        result.is_header === 1 ? (
                                            <View key={idx} style={[styles.tableRow, { paddingVertical: 4, minHeight: 20 }]} wrap={false}>
                                                <Text style={[styles.colParameter, { fontWeight: 'bold', width: '100%', fontSize: 10 }]}>{result.parameter_name}</Text>
                                            </View>
                                        ) : (
                                            <View key={idx} style={styles.tableRow} wrap={false}>
                                                <Text style={[styles.colParameter, { paddingLeft: result.parent_id ? 20 : 0 }]}>{result.parameter_name}</Text>
                                                <Text style={[styles.colResult, { paddingLeft: result.parent_id ? -10 : 0 }, getFlagStyle(result.abnormal_flag)]}>
                                                    {result.result_value || '-'}
                                                </Text>
                                                <Text style={[styles.colUnit, { paddingLeft: result.parent_id ? -6 : 0 }]}>{result.unit || ''}</Text>
                                                <Text style={[styles.colRange, { paddingLeft: result.parent_id ? -5 : 0 }]}>{result.ref_range_text || '-'}</Text>
                                                <Text style={[styles.colFlag, getFlagStyle(result.abnormal_flag)]}>
                                                    {formatFlag(result.abnormal_flag)}
                                                </Text>
                                            </View>
                                        )
                                    ))}
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
                        </View>
                    );
                })}
            </View>

            {/* Footer - fixed at bottom of every page */}
            <View style={styles.footer} fixed>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10 }}>
                    {/* Lab Technician Signature */}
                    <View style={styles.signatureBox}>
                        {labTechnician?.signature ? (
                            <Image src={labTechnician.signature} style={styles.signatureImage} />
                        ) : (
                            <View style={styles.signatureLine} />
                        )}
                        <Text style={styles.label}>{labTechnician?.name || 'Lab Technician'}</Text>
                        {labTechnician?.qualification && (
                            <Text style={[styles.label, { fontSize: 7 }]}>{labTechnician.qualification}</Text>
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
                        {pathologist?.signature ? (
                            <Image src={pathologist.signature} style={styles.signatureImage} />
                        ) : (
                            <View style={styles.signatureLine} />
                        )}
                        <Text style={styles.label}>{pathologist?.name || sample.verified_by_name || 'Pathologist'}</Text>
                        {pathologist?.qualification && (
                            <Text style={[styles.label, { fontSize: 7 }]}>{pathologist.qualification}</Text>
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
