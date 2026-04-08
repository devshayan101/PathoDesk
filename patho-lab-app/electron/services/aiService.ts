import { AIAnalysisRequest, AIAnalysisResponse } from '../../src/types';
import { getDb } from '../database/db';

export class AIService {
    /**
     * Anonymize data by stripping PHI (Protected Health Information)
     */
    private stripPHI(request: AIAnalysisRequest): any {
        // In a real implementation, this would use regex or NLP to identify and remove PHI
        // For now, we ensure patient-identifiable fields are not passed in or are nulled
        const sanitizedParams = request.parameters.map(p => ({
            code: p.code,
            name: p.name,
            value: p.value,
            unit: p.unit,
            ranges: p.ranges
        }));

        return {
            testName: request.testName,
            parameters: sanitizedParams
        };
    }

    private async checkCompliance(): Promise<{ allowed: boolean; error?: string }> {
        const db = getDb();
        const settings = db.prepare("SELECT setting_key, setting_value FROM lab_settings WHERE setting_key LIKE 'ai_%'").all() as any[];
        const config: Record<string, string> = {};
        settings.forEach(s => config[s.setting_key] = s.setting_value);

        if (config['ai_analysis_enabled'] !== 'true') {
            return { allowed: false, error: 'AI features are disabled in Lab Settings.' };
        }

        if (config['ai_baa_accepted'] !== 'true') {
            return { allowed: false, error: 'Business Associate Agreement (BAA) must be accepted before using AI features.' };
        }

        return { allowed: true };
    }

    async analyzeReport(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
        const compliance = await this.checkCompliance();
        if (!compliance.allowed) {
            return {
                success: false,
                interpretation: '',
                disclaimer: '',
                error: compliance.error
            };
        }

        const sanitizedData = this.stripPHI(request);
        
        try {
            // Simulated AI interpretation logic
            // In production, this would call an external API or local LLM
            console.log('AI analyzing sanitized data:', JSON.stringify(sanitizedData, null, 2));

            const interpretation = `Based on the provided values for ${sanitizedData.testName}, the results suggest a typical pattern. Further clinical correlation is recommended.`;
            const disclaimer = "ASSISTIVE ONLY - DO NOT USE FOR PRIMARY DIAGNOSIS. Clinical validation required.";

            return {
                success: true,
                interpretation,
                disclaimer
            };
        } catch (error) {
            console.error('AI Analysis failed:', error);
            return {
                success: false,
                interpretation: '',
                disclaimer: '',
                error: 'AI service communication failure'
            };
        }
    }
}

export const aiService = new AIService();
