import test from 'node:test';
import assert from 'node:assert/strict';

import {
    ANALYSIS_TABS,
    DEFAULT_ANALYSIS_TAB,
    resolveAnalysisTab
} from '../src/ui/analysisTabs.js';

test('analysis tab listesi beklenen sirada gelir', () => {
    assert.deepEqual(ANALYSIS_TABS, [
        'summary',
        'critical',
        'timur',
        'timeline'
    ]);
});

test('resolveAnalysisTab bilinmeyen sekmelerde ozete geri doner', () => {
    assert.equal(DEFAULT_ANALYSIS_TAB, 'summary');
    assert.equal(resolveAnalysisTab('critical'), 'critical');
    assert.equal(resolveAnalysisTab('timur'), 'timur');
    assert.equal(resolveAnalysisTab('gecersiz'), 'summary');
    assert.equal(resolveAnalysisTab(null), 'summary');
});
