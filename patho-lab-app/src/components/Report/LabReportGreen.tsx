
import { Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import logoUrl from '/icon.png';
import logo247Url from '/24_7.png';
import { formatDate } from './LabReport';
import WidalTable, { isWidalTest } from './WidalTable';

// Modern Green Clinical Theme Styles
const FOOTER_HEIGHT = 80;
const PRIMARY_GREEN = '#1a5d38';
const LIGHT_GREEN = '#edf7f0';
const ACCENT_GREEN = '#228b22';
const TEXT_DARK = '#202124';
const TEXT_MUTED = '#5f6368';
const BORDER_COLOR = '#e0e0e0';

const s = StyleSheet.create({
    page: {
        paddingTop: 12,
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: FOOTER_HEIGHT + 20,
        fontSize: 9,
        fontFamily: 'Helvetica',
        color: TEXT_DARK,
    },
    // --- Header ---
    topBar: {
        backgroundColor: PRIMARY_GREEN,
        height: 6,
    },
    headerRow: {
        flexDirection: 'row',
        padding: 12,
        paddingTop: 11, // Added space for NABLBadge overlap
        paddingBottom: 10,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: BORDER_COLOR,
    },
    logoCol: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    logo: {
        width: 48,
        height: 48,
        marginRight: 10,
    },
    labName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: PRIMARY_GREEN,
    },
    addressCol: {
        flex: 1,
        alignItems: 'flex-end',
    },
    addressText: {
        fontSize: 8,
        color: TEXT_MUTED,
        textAlign: 'right',
        marginBottom: 1,
    },
    nablBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: ACCENT_GREEN,
        color: '#fff',
        fontSize: 7,
        fontWeight: 'bold',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
    },
    // --- Patient Info Card ---
    patientBox: {
        margin: 12,
        marginTop: 10,
        marginBottom: 10,
        borderRadius: 6,
        backgroundColor: LIGHT_GREEN,
        borderWidth: 1,
        borderColor: '#cce5d6',
        padding: 10,
    },
    patientRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    patientLabel: {
        width: 100,
        fontSize: 9,
        color: TEXT_MUTED,
    },
    patientValue: {
        fontSize: 9,
        fontWeight: 'bold',
        color: TEXT_DARK,
        flex: 1,
    },
    patientSpacer: {
        width: 20,
    },
    // --- Results Table ---
    tableContainer: {
        marginHorizontal: 12,
    },
    departmentHeader: {
        textAlign: 'center',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: PRIMARY_GREEN,
    },
    testNameHeader: {
        textAlign: 'center',
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 6,
        color: TEXT_DARK,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: PRIMARY_GREEN,
        color: '#ffffff',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
        paddingVertical: 6,
        paddingHorizontal: 4,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 5,
        paddingHorizontal: 4,
        minHeight: 22,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    colTest: { flex: 3, paddingLeft: 4 },
    colResult: { flex: 1.5, textAlign: 'center' },
    colUnit: { flex: 1.2, textAlign: 'center', color: TEXT_MUTED },
    colRange: { flex: 2, textAlign: 'right', paddingRight: 4, color: TEXT_MUTED },
    colFlag: { flex: 0.8, alignItems: 'center', justifyContent: 'center' },

    // Flag Badges
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        fontSize: 8,
        fontWeight: 'bold',
        minWidth: 24,
        textAlign: 'center',
    },
    badgeHigh: { backgroundColor: '#fce8e6', color: '#d93025' },
    badgeLow: { backgroundColor: '#e8f0fe', color: '#1a73e8' },
    badgeCritical: { backgroundColor: '#d93025', color: '#fff' },
    badgeNormal: { backgroundColor: 'transparent', color: TEXT_DARK },

    // --- Interpretation ---
    interpBox: {
        marginTop: 5,
        padding: 10,
        borderLeftWidth: 4,
        borderLeftColor: ACCENT_GREEN,
        backgroundColor: '#f9fdf9',
        borderRadius: 4,
    },
    interpHeading: {
        fontSize: 10,
        fontWeight: 'bold',
        color: ACCENT_GREEN,
        marginBottom: 5
    },
    interpText: {
        fontSize: 9,
        color: TEXT_DARK,
        lineHeight: 1.4
    },

    // --- Footer ---
    footer: {
        position: 'absolute',
        bottom: 10,
        left: 12,
        right: 12,
        borderTopWidth: 1,
        borderTopColor: BORDER_COLOR,
        paddingTop: 5,
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
        borderTopColor: TEXT_MUTED,
        width: '80%',
        marginBottom: 4,
    },
    sigImage: {
        width: 100,
        height: 35,
        objectFit: 'contain' as const,
    },
    sigLabel: {
        fontSize: 8,
        color: TEXT_MUTED,
    },
    sigTitle: {
        fontSize: 9,
        fontWeight: 'bold',
        color: TEXT_DARK,
    },
    disclaimer: {
        fontSize: 7,
        color: TEXT_MUTED,
        marginTop: 8,
        textAlign: 'center',
    },
    pageNum: {
        fontSize: 8,
        textAlign: 'right',
        color: TEXT_MUTED,
    },
    // Watermark
    watermark: {
        position: 'absolute',
        top: 320,
        left: 0,
        right: 0,
        alignItems: 'center',
        opacity: 0.03,
    },
    branding: {
        position: 'absolute',
        bottom: 8,
        left: 12,
        right: 12,
        alignItems: 'center',
        paddingBottom: 2
    },
    brandingText: {
        fontSize: 7,
        color: '#969595ff',
    },
});

interface ReportData {
    sample: { id: number; sample_uid: string; received_at: string; status: string; verified_at?: string; verified_by_name?: string; };
    patient: { id: number; patient_uid: string; full_name: string; dob: string; gender: string; phone?: string; };
    test: { test_code: string; test_name: string; department: string; method: string; sample_type: string; interpretation_template?: string; };
    results: { parameter_code: string; parameter_name: string; result_value: string; unit: string | null; abnormal_flag: string | null; ref_range_text: string | null; is_header?: number; parent_id?: number | null; }[];
    referringDoctor?: { name: string; specialty?: string; } | null;
    labTechnician?: { name: string; qualification?: string; signature?: string; } | null;
    pathologist?: { name: string; qualification?: string; signature?: string; } | null;
}

interface LabSettings {
    lab_name?: string; address_line1?: string; address_line2?: string;
    phone?: string; email?: string; nabl_accreditation?: string;
    lab_incharge?: string;
    disclaimer?: string; show_time_in_report?: string;
}

interface Props { data: ReportData; labSettings: LabSettings; qrCode?: string | null; }

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

function flagBadgeStyle(flag: string | null) {
    switch (flag) {
        case 'HIGH': return s.badgeHigh;
        case 'LOW': return s.badgeLow;
        case 'CRITICAL': case 'CRITICAL_HIGH': case 'CRITICAL_LOW': return s.badgeCritical;
        default: return s.badgeNormal;
    }
}

export default function LabReportGreen({ data, labSettings, qrCode }: Props) {
    const { sample, patient, test, results: rawResults, referringDoctor } = data;
    const showTime = labSettings.show_time_in_report === 'true';
    const gender = patient.gender === 'M' ? 'Male' : patient.gender === 'F' ? 'Female' : 'Other';

    // Filter out parameters with no result value, but keep headers
    const results = rawResults.filter(r => r.is_header === 1 || (r.result_value && r.result_value.trim() !== ''));

    return (
        <Page size="A4" style={s.page}>
            {/* Watermark */}
            <View style={s.watermark} fixed>
                <Image src={logoUrl} style={{ width: 250 }} />
                {labSettings.lab_name && (
                    <Text style={{ fontSize: 28, fontWeight: 'bold', color: PRIMARY_GREEN, marginTop: 12 }}>
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
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={[s.labName, { flexWrap: 'wrap' }]}>{labSettings.lab_name || 'Pathology Laboratory'}</Text>
                    </View>
                </View>
                <Image src={logo247Url} style={{ width: 36, height: 36, marginHorizontal: 10 }} />
                <View style={s.addressCol}>
                    <Text style={s.addressText}>{labSettings.address_line1}</Text>
                    <Text style={s.addressText}>{labSettings.address_line2}</Text>
                    {labSettings.phone && <Text style={s.addressText}>{labSettings.phone}</Text>}
                    {labSettings.email && <Text style={s.addressText}>{labSettings.email}</Text>}
                    {labSettings.lab_incharge && (
                        <Text style={{ fontSize: 9, fontWeight: 'bold', color: ACCENT_GREEN, marginTop: 3, textAlign: 'right' }}>{labSettings.lab_incharge}</Text>
                    )}
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
                    <Text style={s.patientValue}>:  {test.sample_type}</Text>
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

            {/* Results */}
            <View style={s.tableContainer}>
                {/* Department */}
                <Text style={s.departmentHeader}>{test.department || 'PATHOLOGY'}</Text>
                {/* Test Name */}
                <Text style={s.testNameHeader}>{test.test_name}</Text>

                {/* Widal matrix or normal table */}
                {isWidalTest(test.test_name) ? (
                    <WidalTable testName={test.test_name} results={results} />
                ) : (
                    <>
                        <View style={s.tableHeader}>
                            <Text style={[s.colTest, { fontWeight: 'bold' }]}>Test Name</Text>
                            <Text style={[s.colResult, { fontWeight: 'bold' }]}>Results</Text>
                            <Text style={[s.colUnit, { fontWeight: 'bold', color: '#ffffff' }]}>Units</Text>
                            <Text style={[s.colRange, { fontWeight: 'bold', color: '#ffffff' }]}>Reference range</Text>
                            <Text style={[s.colFlag, { fontWeight: 'bold', textAlign: 'center' }]}>Flag</Text>
                        </View>

                        {/* Rows */}
                        {results.map((r, i) => (
                            r.is_header === 1 ? (
                                <View key={i} style={[s.tableRow, { paddingVertical: 6, minHeight: 24, backgroundColor: 'rgba(0,0,0,0.02)' }]} wrap={false}>
                                    <Text style={[s.colTest, { fontWeight: 'bold', width: '100%', fontSize: 10, color: PRIMARY_GREEN }]}>{r.parameter_name}</Text>
                                </View>
                            ) : (
                                <View key={i} style={[s.tableRow, { backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.03)' }]} wrap={false}>
                                    <Text style={[s.colTest, { paddingLeft: r.parent_id ? 20 : 4 }]}>{r.parameter_name}</Text>
                                    <Text style={[s.colResult, { marginLeft: r.parent_id ? -10 : 0 }]}>
                                        <Text style={{ fontWeight: r.abnormal_flag && r.abnormal_flag !== 'NORMAL' ? 'bold' : 'normal' }}>
                                            {r.result_value || '-'}
                                        </Text>
                                    </Text>
                                    <Text style={[s.colUnit, { marginLeft: r.parent_id ? -5 : 0 }]}>{r.unit || ''}</Text>
                                    <Text style={[s.colRange, { marginLeft: r.parent_id ? -5 : 0 }]}>{r.ref_range_text || '-'}</Text>
                                    <View style={s.colFlag}>
                                        {formatFlag(r.abnormal_flag) !== '' ? (
                                            <Text style={[s.badge, flagBadgeStyle(r.abnormal_flag)]}>
                                                {formatFlag(r.abnormal_flag)}
                                            </Text>
                                        ) : null}
                                    </View>
                                </View>
                            )
                        ))}
                    </>
                )}
            </View>

            {/* Interpretation Template */}
            {test.interpretation_template && (
                <View style={s.interpBox}>
                    <Text style={s.interpHeading}>Interpretation:</Text>
                    <Text style={s.interpText}>
                        {test.interpretation_template}
                    </Text>
                </View>
            )}

            {/* Footer - fixed at bottom of every page */}
            <View style={s.footer} fixed>
                <View style={s.sigRow}>
                    <View style={s.sigBox}>
                        {data.labTechnician?.signature ? (
                            <Image src={data.labTechnician.signature} style={s.sigImage} />
                        ) : (
                            <View style={s.sigLine} />
                        )}
                        <Text style={s.sigLabel}>{data.labTechnician?.name || 'Lab Technician'}</Text>
                        {data.labTechnician?.qualification && (
                            <Text style={s.sigTitle}>{data.labTechnician.qualification}</Text>
                        )}
                    </View>

                    {/* Middle - Report Status */}
                    <View style={{ alignItems: 'center', marginBottom: 4 }}>
                        {qrCode && (
                            <Image src={qrCode} style={{ width: 50, height: 50, marginBottom: 4 }} />
                        )}
                        <Text style={[s.sigLabel, { fontSize: 8 }]}>Report Status: <Text style={{ fontWeight: 'bold' }}>{sample.status}</Text></Text>
                        {sample.verified_at && (
                            <Text style={[s.sigLabel, { fontSize: 8 }]}>Verified: {formatDate(sample.verified_at, showTime)}</Text>
                        )}
                    </View>

                    <View style={s.sigBox}>
                        {data.pathologist?.signature ? (
                            <Image src={data.pathologist.signature} style={s.sigImage} />
                        ) : (
                            <View style={s.sigLine} />
                        )}
                        <Text style={s.sigLabel}>{data.pathologist?.name || sample.verified_by_name || 'Pathologist'}</Text>
                        {data.pathologist?.qualification && (
                            <Text style={s.sigTitle}>{data.pathologist.qualification}</Text>
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
