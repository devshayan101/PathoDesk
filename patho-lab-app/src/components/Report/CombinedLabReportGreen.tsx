import { Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import logoUrl from '/icon.png';
import { formatDate } from './LabReport';
import WidalTable, { isWidalTest } from './WidalTable';

// Green Clinical Theme Styles
const FOOTER_HEIGHT = 110;
const ACCENT = '#1a8a3f';

const s = StyleSheet.create({
    page: {
        paddingTop: 12, //
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: FOOTER_HEIGHT + 20,
        fontSize: 9,
        fontFamily: 'Helvetica',
    },
    // --- Header ---
    topBar: {
        backgroundColor: ACCENT,
        height: 8,
    },
    headerRow: {
        flexDirection: 'row',
        padding: 12,
        paddingTop: 8,
        paddingBottom: 8,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: ACCENT,
    },
    logoCol: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logo: {
        width: 44,
        height: 44,
        marginRight: 10,
    },
    labName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: ACCENT,
    },
    addressCol: {
        flex: 1,
        alignItems: 'flex-end',
    },
    addressText: {
        fontSize: 8,
        color: '#333',
        textAlign: 'right',
        marginBottom: 1,
    },
    nablBadge: {
        position: 'absolute',
        top: 12,
        right: 0,
        backgroundColor: ACCENT,
        color: '#fff',
        fontSize: 7,
        fontWeight: 'bold',
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    // --- Patient Info ---
    patientBox: {
        margin: 12,
        marginTop: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 8,
    },
    patientRow: {
        flexDirection: 'row',
        marginBottom: 3,
    },
    patientLabel: {
        width: 110,
        fontSize: 9,
        color: '#333',
    },
    patientValue: {
        fontSize: 9,
        fontWeight: 'bold',
        flex: 1,
    },
    patientSpacer: {
        width: 20,
    },
    // --- Results Table ---
    tableContainer: {
        marginHorizontal: 12,
        marginBottom: 10,
    },
    departmentHeader: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#333',
        textDecoration: 'underline',
    },
    testNameHeader: {
        textAlign: 'center',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        borderTopWidth: 1,
        borderTopColor: '#000',
        paddingVertical: 4,
        backgroundColor: '#f0f0f0',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 0,
        borderBottomColor: '#ddd',
        paddingVertical: 4,
        minHeight: 20,
        alignItems: 'center',
    },
    colTest: { flex: 3, paddingLeft: 4 },
    colResult: { flex: 1.5, textAlign: 'center' },
    colUnit: { flex: 1.2, textAlign: 'center' },
    colRange: { flex: 2, textAlign: 'right', paddingRight: 4 },
    colFlag: { flex: 0.5, textAlign: 'center', paddingRight: 4 },
    flagHigh: { color: '#dc3545', fontWeight: 'bold' },
    flagLow: { color: '#007bff', fontWeight: 'bold' },
    flagCritical: { color: '#dc3545', fontWeight: 'bold', textDecoration: 'underline' },
    flagNormal: { color: '#000' },
    // --- Footer ---
    footer: {
        position: 'absolute',
        bottom: 15,
        left: 12,
        right: 12,
        borderTopWidth: 1,
        borderTopColor: '#ccc',
        paddingTop: 8,
    },
    sigRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    sigBox: {
        width: 160,
        alignItems: 'center',
    },
    sigLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        width: '100%',
        marginBottom: 4,
    },
    sigImage: {
        width: 100,
        height: 35,
        objectFit: 'contain' as const,
        marginBottom: 3,
    },
    sigLabel: {
        fontSize: 7,
        color: '#333',
        marginBottom: 1,
    },
    sigTitle: {
        fontSize: 8,
        fontWeight: 'bold',
        color: '#000',
    },
    disclaimer: {
        fontSize: 6,
        color: '#888',
        marginTop: 6,
    },
    pageNum: {
        fontSize: 7,
        textAlign: 'center',
        color: '#666',
        marginTop: 4,
    },
    // Watermark
    watermark: {
        position: 'absolute',
        top: 350,
        left: 0,
        right: 0,
        alignItems: 'center',
        opacity: 0.04,
    },
    branding: {
        position: 'absolute',
        bottom: 4,
        left: 12,
        right: 12,
        alignItems: 'center',
    },
    brandingText: {
        fontSize: 7,
        color: '#bbb',
    },
});

// Helpers
function calcAge(dob: string): string {
    const b = new Date(dob), t = new Date();
    let y = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) y--;
    return `${y} Yrs`;
}

function formatFlag(flag: string | null): string {
    switch (flag) {
        case 'HIGH': return 'H';
        case 'LOW': return 'L';
        case 'CRITICAL': case 'CRITICAL_HIGH': return 'C↑';
        case 'CRITICAL_LOW': return 'C↓';
        case 'NORMAL': return '';
        default: return '';
    }
}

function flagStyle(flag: string | null) {
    switch (flag) {
        case 'HIGH': return s.flagHigh;
        case 'LOW': return s.flagLow;
        case 'CRITICAL': case 'CRITICAL_HIGH': case 'CRITICAL_LOW': return s.flagCritical;
        default: return s.flagNormal;
    }
}

export default function CombinedLabReportGreen({ dataList, labSettings }: any) {
    if (!dataList || dataList.length === 0) return null;

    // Extracted global patient and sample info from the first report
    const { sample, patient, referringDoctor } = dataList[0];
    const showTime = labSettings.show_time_in_report === 'true';
    const gender = patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other';

    // Find first available lab technician and pathologist
    const labTechnician = dataList.find((d: any) => d.labTechnician)?.labTechnician || null;
    const pathologist = dataList.find((d: any) => d.pathologist)?.pathologist || null;

    return (
        <Page size="A4" style={s.page}>
            {/* Watermark */}
            <View style={s.watermark} fixed>
                <Image src={logoUrl} style={{ width: 200, opacity: 0.1 }} />
                {labSettings.lab_name && (
                    <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#000', opacity: 0.1, marginTop: 8 }}>
                        {labSettings.lab_name}
                    </Text>
                )}
            </View>

            {/* Top green bar */}
            <View style={s.topBar} fixed />

            {/* NABL badge */}
            {labSettings.nabl_accreditation && (
                <Text style={s.nablBadge} fixed>{labSettings.nabl_accreditation}</Text>
            )}

            {/* Header row - fixed on every page */}
            <View style={s.headerRow} fixed>
                <View style={s.logoCol}>
                    <Image src={logoUrl} style={s.logo} />
                    <Text style={[s.labName, { flex: 1, flexWrap: 'wrap', paddingRight: 10 }]}>{labSettings.lab_name || 'Pathology Laboratory'}</Text>
                </View>
                <Image src="/24_7.png" style={{ width: 36, height: 36, marginHorizontal: 10 }} />
                <View style={s.addressCol}>
                    <Text style={s.addressText}>{labSettings.address_line1}</Text>
                    <Text style={s.addressText}>{labSettings.address_line2}</Text>
                    {labSettings.phone && <Text style={s.addressText}>{labSettings.phone}</Text>}
                    {labSettings.email && <Text style={s.addressText}>{labSettings.email}</Text>}
                </View>
            </View>

            {/* Patient Info Box */}
            <View style={s.patientBox} fixed>
                <View style={s.patientRow}>
                    <Text style={s.patientLabel}>Patient Name</Text>
                    <Text style={s.patientValue}>:  {patient.full_name}</Text>
                    <View style={s.patientSpacer} />
                    <Text style={s.patientLabel}>Sl. No.</Text>
                    <Text style={s.patientValue}>:  {sample.sample_uid}</Text>
                </View>
                <View style={s.patientRow}>
                    <Text style={s.patientLabel}>Age & Sex</Text>
                    <Text style={s.patientValue}>:  {calcAge(patient.dob)}  |  {gender}</Text>
                    <View style={s.patientSpacer} />
                    <Text style={s.patientLabel}>Collection Date</Text>
                    <Text style={s.patientValue}>:  {formatDate(sample.received_at || (sample as any).collected_at, showTime)}</Text>
                </View>
                <View style={s.patientRow}>
                    <Text style={s.patientLabel}>Sample Type</Text>
                    <Text style={s.patientValue}>:  {Array.from(new Set(dataList.map((d: any) => d.test.sample_type))).join(', ')}</Text>
                    <View style={s.patientSpacer} />
                    <Text style={s.patientLabel}>Reporting Date</Text>
                    <Text style={s.patientValue}>:  {formatDate(new Date().toISOString(), showTime)}</Text>
                </View>
                {referringDoctor && (
                    <View style={s.patientRow}>
                        <Text style={s.patientLabel}>Referred By</Text>
                        <Text style={s.patientValue}>:  {referringDoctor.name}</Text>
                    </View>
                )}
            </View>

            {/* Results Mapping */}
            <View wrap={true}>
                {dataList.map((data: any, testIndex: number) => {
                    const { test, results: rawResults } = data;
                    // Filter out parameters with no result value, but keep headers
                    const results = rawResults.filter((r: any) => r.is_header === 1 || (r.result_value && r.result_value.trim() !== ''));

                    return (
                        <View key={testIndex} style={s.tableContainer} wrap={true} minPresenceAhead={250}>
                            {/* Widal matrix or normal table */}
                            {isWidalTest(test.test_name) ? (
                                <>
                                    <View wrap={false}>
                                        <Text style={s.departmentHeader}>{test.department || 'PATHOLOGY'}</Text>
                                        <Text style={s.testNameHeader}>{test.test_name}</Text>
                                    </View>
                                    <WidalTable testName={test.test_name} results={results} />
                                </>
                            ) : (
                                <>
                                    <View wrap={false}>
                                        {/* Department */}
                                        <Text style={s.departmentHeader}>{test.department || 'PATHOLOGY'}</Text>
                                        {/* Test Name */}
                                        <Text style={s.testNameHeader}>{test.test_name}</Text>

                                        <View style={s.tableHeader}>
                                            <Text style={[s.colTest, { fontWeight: 'bold' }]}>Test Name</Text>
                                            <Text style={[s.colResult, { fontWeight: 'bold' }]}>Results</Text>
                                            <Text style={[s.colUnit, { fontWeight: 'bold' }]}>Units</Text>
                                            <Text style={[s.colRange, { fontWeight: 'bold' }]}>Reference range</Text>
                                            <Text style={[s.colFlag, { fontWeight: 'bold' }]}>Flag</Text>
                                        </View>
                                    </View>

                                    {/* Rows */}
                                    {results.map((r: any, i: number) => (
                                        r.is_header === 1 ? (
                                            <View key={i} style={[s.tableRow, { paddingVertical: 4, minHeight: 20 }]} wrap={false}>
                                                <Text style={[s.colTest, { fontWeight: 'bold', width: '100%', fontSize: 10 }]}>{r.parameter_name}</Text>
                                            </View>
                                        ) : (
                                            <View key={i} style={s.tableRow} wrap={false}>
                                                <Text style={[s.colTest, { paddingLeft: r.parent_id ? 20 : 4 }]}>{r.parameter_name}</Text>
                                                <Text style={[s.colResult, { paddingLeft: r.parent_id ? -10 : 0 }, flagStyle(r.abnormal_flag)]}>
                                                    {r.result_value || '-'}
                                                </Text>
                                                <Text style={[s.colUnit, { paddingLeft: r.parent_id ? -5 : 0 }]}>{r.unit || ''}</Text>
                                                <Text style={[s.colRange, { paddingLeft: r.parent_id ? -5 : 0 }]}>{r.ref_range_text || '-'}</Text>
                                                <Text style={[s.colFlag, flagStyle(r.abnormal_flag)]}>
                                                    {formatFlag(r.abnormal_flag)}
                                                </Text>
                                            </View>
                                        )
                                    ))}
                                </>
                            )}

                            {/* Interpretation Template */}
                            {test.interpretation_template && (
                                <View style={{ marginTop: 10, padding: 10, borderLeft: '3px solid #2e7d32', backgroundColor: '#f9fdf9' }}>
                                    <Text style={{ fontSize: 10, fontWeight: 'normal', color: '#2e7d32', marginBottom: 5 }}>Interpretation:</Text>
                                    <Text style={{ fontSize: 9, color: '#333', lineHeight: 1.4 }}>
                                        {test.interpretation_template}
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>

            {/* End of Report Marker */}
            <View style={{ marginTop: 20, alignItems: 'center', width: '100%' }} wrap={true}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#666' }}>---End of Report----</Text>
            </View>            {/* Footer - fixed at bottom of every page */}
            <View style={s.footer} fixed>
                <View style={s.sigRow}>
                    <View style={s.sigBox}>
                        {labTechnician?.signature ? (
                            <Image src={labTechnician.signature} style={s.sigImage} />
                        ) : (
                            <View style={s.sigLine} />
                        )}
                        <Text style={s.sigLabel}>{labTechnician?.name || 'Lab Technician'}</Text>
                        {labTechnician?.qualification && (
                            <Text style={s.sigTitle}>{labTechnician.qualification}</Text>
                        )}
                    </View>

                    {/* Middle - Report Status */}
                    <View style={{ alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[s.sigLabel, { fontSize: 8 }]}>Report Status: {sample.status}</Text>
                        {sample.verified_at && (
                            <Text style={[s.sigLabel, { fontSize: 8 }]}>Verified: {formatDate(sample.verified_at, showTime)}</Text>
                        )}
                    </View>

                    <View style={s.sigBox}>
                        {pathologist?.signature ? (
                            <Image src={pathologist.signature} style={s.sigImage} />
                        ) : (
                            <View style={s.sigLine} />
                        )}
                        <Text style={s.sigLabel}>{pathologist?.name || sample.verified_by_name || 'Pathologist'}</Text>
                        {pathologist?.qualification && (
                            <Text style={s.sigTitle}>{pathologist.qualification}</Text>
                        )}
                    </View>
                </View>
                {labSettings.disclaimer && (
                    <Text style={s.disclaimer}>{labSettings.disclaimer}</Text>
                )}
                <Text style={s.pageNum} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
            </View>

            {/* Branding */}
            <View style={s.branding} fixed>
                <Text style={s.brandingText}>FMS Software Solutions | fmsenterprises001@gmail.com | +91-7765009936</Text>
            </View>
        </Page>
    );
}
