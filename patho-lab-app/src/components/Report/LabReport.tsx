
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register a standard font for better rendering
Font.register({
    family: 'Roboto',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
        { src: 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
    ]
});

// PDF Styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
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
        marginBottom: 15,
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
        bottom: 30,
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
    disclaimer: {
        fontSize: 7,
        color: '#999',
        textAlign: 'center',
        marginTop: 10,
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
        test_code: string;
        test_name: string;
        department: string;
        method: string;
        sample_type: string;
    };
    results: {
        parameter_code: string;
        parameter_name: string;
        result_value: string;
        unit: string | null;
        abnormal_flag: string | null;
        ref_range_text: string | null;
    }[];
    referringDoctor?: {
        name: string;
        specialty?: string;
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

// Format date
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
    const { sample, patient, test, results, referringDoctor } = data;

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Header - Lab Info */}
                <View style={styles.header}>
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
                <View style={styles.patientSection}>
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

                <View style={styles.patientSection}>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Sample Received</Text>
                        <Text style={styles.value}>{formatDate(sample.received_at)}</Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Report Date</Text>
                        <Text style={styles.value}>{formatDate(new Date().toISOString())}</Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Sample Type</Text>
                        <Text style={styles.value}>{test.sample_type}</Text>
                    </View>
                    <View style={styles.patientCol}>
                        <Text style={styles.label}>Method</Text>
                        <Text style={styles.value}>{test.method}</Text>
                    </View>
                </View>

                {/* Referred By */}
                {referringDoctor && (
                    <View style={[styles.patientSection, { marginBottom: 10 }]}>
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

                {/* Test Name */}
                <Text style={styles.testHeader}>{test.test_name}</Text>

                {/* Results Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colParameter}>Parameter</Text>
                        <Text style={styles.colResult}>Result</Text>
                        <Text style={styles.colUnit}>Unit</Text>
                        <Text style={styles.colRange}>Reference Range</Text>
                        <Text style={styles.colFlag}>Flag</Text>
                    </View>
                    {results.map((result, idx) => (
                        <View key={idx} style={styles.tableRow}>
                            <Text style={styles.colParameter}>{result.parameter_name}</Text>
                            <Text style={[styles.colResult, getFlagStyle(result.abnormal_flag)]}>
                                {result.result_value || '-'}
                            </Text>
                            <Text style={styles.colUnit}>{result.unit || ''}</Text>
                            <Text style={styles.colRange}>{result.ref_range_text || '-'}</Text>
                            <Text style={[styles.colFlag, getFlagStyle(result.abnormal_flag)]}>
                                {formatFlag(result.abnormal_flag)}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.verification}>
                        <View>
                            <Text style={styles.label}>Report Status: {sample.status}</Text>
                            {sample.verified_at && (
                                <Text style={styles.label}>Verified: {formatDate(sample.verified_at)}</Text>
                            )}
                        </View>
                        <View style={styles.signatureBox}>
                            <View style={styles.signatureLine} />
                            <Text style={styles.label}>{sample.verified_by_name || 'Authorized Signatory'}</Text>
                            <Text style={styles.label}>Pathologist</Text>
                        </View>
                    </View>
                    <Text style={styles.disclaimer}>{labSettings.disclaimer}</Text>
                </View>
            </Page>
        </Document>
    );
}
