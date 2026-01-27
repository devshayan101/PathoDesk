export interface Sample {
    id: number;
    sample_uid: string;
    order_uid: string;
    patient_name: string;
    test_name: string;
    status: string;
    doctor_name?: string;
    received_at?: string;
}

export interface RefRange {
    min_value: number | null;
    max_value: number | null;
    critical_low: number | null;
    critical_high: number | null;
}

export interface ResultParameter {
    parameter_id: number;
    parameter_code: string;
    parameter_name: string;
    unit: string;
    result_value?: string;
    abnormal_flag?: string;
    ref_ranges: RefRange[];
}

export interface PreviousResult {
    parameter_code: string;
    value: string;
    test_date: string;
}

export interface ResultData {
    sample_id: number;
    sample_uid: string;
    patient_name: string;
    patient_uid: string;
    patient_age_days: number;
    patient_gender: string;
    test_id: number;
    test_version_id: number;
    test_name: string;
    status: string;
    parameters: ResultParameter[];
    previousResults?: PreviousResult[];
}
