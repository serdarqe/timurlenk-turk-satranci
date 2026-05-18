export const ANALYSIS_TABS = [
    'summary',
    'critical',
    'timur',
    'timeline'
];

export const DEFAULT_ANALYSIS_TAB = 'summary';

export function resolveAnalysisTab(tab) {
    return ANALYSIS_TABS.includes(tab) ? tab : DEFAULT_ANALYSIS_TAB;
}
