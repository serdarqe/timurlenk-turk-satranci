import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const onboardingCss = readFileSync(
    new URL('../src/styles/onboarding.css', import.meta.url),
    'utf8'
);

test('onboarding copy uses dark ink colors on the parchment card', () => {
    assert.match(onboardingCss, /--onboarding-ink:\s*#2b2115\s*;/);
    assert.match(onboardingCss, /--onboarding-ink-muted:\s*#514431\s*;/);
    assert.match(onboardingCss, /\.onboarding-title\s*\{[\s\S]*?color:\s*var\(--onboarding-ink\)\s*;/);
    assert.match(onboardingCss, /\.onboarding-desc\s*\{[\s\S]*?color:\s*var\(--onboarding-ink-muted\)\s*;/);
    assert.match(onboardingCss, /\.onboarding-skip\s*\{[\s\S]*?color:\s*var\(--onboarding-ink-muted\)\s*!important\s*;/);
});
