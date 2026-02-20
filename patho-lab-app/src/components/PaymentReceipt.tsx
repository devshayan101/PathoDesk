
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// Define styles
const styles = StyleSheet.create({
    page: {
        padding: 30,
        fontFamily: 'Helvetica',
        fontSize: 10,
        lineHeight: 1.5,
    },
    header: {
        marginBottom: 20,
        borderBottom: '1px solid #ccc',
        paddingBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labName: {
        fontSize: 18,
        fontFamily: 'Helvetica-Bold',
        color: '#2c3e50',
    },
    labSubtitle: {
        fontSize: 10,
        color: '#7f8c8d',
    },
    title: {
        fontSize: 16,
        fontFamily: 'Helvetica-Bold',
        marginBottom: 10,
        textAlign: 'center',
        textTransform: 'uppercase',
        color: '#34495e',
    },
    section: {
        marginBottom: 15,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    label: {
        width: 100,
        fontFamily: 'Helvetica-Bold',
        color: '#555',
    },
    value: {
        flex: 1,
    },
    amountBox: {
        marginTop: 20,
        padding: 15,
        backgroundColor: '#f8f9fa',
        border: '1px solid #e0e0e0',
        borderRadius: 5,
    },
    totalAmount: {
        fontSize: 14,
        fontFamily: 'Helvetica-Bold',
        textAlign: 'right',
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 30,
        right: 30,
        textAlign: 'center',
        fontSize: 9,
        color: '#95a5a6',
        borderTop: '1px solid #eee',
        paddingTop: 10,
    },
    signatureRow: {
        marginTop: 50,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    signature: {
        borderTop: '1px solid #333',
        width: 150,
        textAlign: 'center',
        paddingTop: 5,
    },
});

interface PaymentReceiptProps {
    doctorName: string;
    doctorCode: string;
    paymentId: number | string;
    paymentDate: string;
    amount: number;
    paymentMode: string;
    reference?: string;
    period?: string;
}

export const PaymentReceipt = ({
    doctorName,
    doctorCode,
    paymentId,
    paymentDate,
    amount,
    paymentMode,
    reference,
    period
}: PaymentReceiptProps) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.labName}>Patho Lab</Text>
                    <Text style={styles.labSubtitle}>Advanced Diagnostic Center</Text>
                </View>
                <View>
                    <Text>Date: {paymentDate}</Text>
                    <Text>Receipt #: {paymentId}</Text>
                </View>
            </View>

            <Text style={styles.title}>Commission Payment Receipt</Text>

            {/* Doctor Details */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Doctor Name:</Text>
                    <Text style={styles.value}>{doctorName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Doctor Code:</Text>
                    <Text style={styles.value}>{doctorCode}</Text>
                </View>
            </View>

            {/* Payment Details */}
            <View style={styles.amountBox}>
                <View style={styles.row}>
                    <Text style={styles.label}>Amount Paid:</Text>
                    <Text style={styles.value}>Rs. {amount.toFixed(2)}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Payment Mode:</Text>
                    <Text style={styles.value}>{paymentMode}</Text>
                </View>
                {reference && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Reference #:</Text>
                        <Text style={styles.value}>{reference}</Text>
                    </View>
                )}
                {period && (
                    <View style={styles.row}>
                        <Text style={styles.label}>For Period:</Text>
                        <Text style={styles.value}>{period}</Text>
                    </View>
                )}

                <Text style={{ marginTop: 10, fontStyle: 'italic', fontSize: 12 }}>
                    Amount in words: {convertNumberToWords(amount)} Rupees Only
                </Text>
            </View>

            {/* Signatures */}
            <View style={styles.signatureRow}>
                <View style={styles.signature}>
                    <Text>Receiver's Signature</Text>
                </View>
                <View style={styles.signature}>
                    <Text>Authorized Signatory</Text>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text>This is a computer-generated receipt.</Text>
            </View>
        </Page>
    </Document>
);

// Helper function for number to words (Simplified version)
function convertNumberToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    const num = Math.floor(amount);

    if (num === 0) return 'Zero';
    if (num < 10) return ones[num];
    if (num < 20) return teens[num - 10];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertNumberToWords(num % 100) : '');
    if (num < 100000) return convertNumberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 !== 0 ? ' ' + convertNumberToWords(num % 1000) : '');
    if (num < 10000000) return convertNumberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 !== 0 ? ' ' + convertNumberToWords(num % 100000) : '');

    return String(num); // Fallback for very large numbers
}
