import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

function readProjectFile(path) {
    return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('default match setup and quick start use white medium Timur with 15 minutes', () => {
    const main = readProjectFile('src/main.js');
    const personas = readProjectFile('src/ai/AIPersonas.js');
    const index = readProjectFile('index.html');

    assert.match(personas, /DEFAULT_AI_PERSONA_ID\s*=\s*'timur'/);
    assert.match(main, /let selectedDifficulty\s*=\s*DIFFICULTY\.MEDIUM/);
    assert.match(main, /let selectedPlayerColor\s*=\s*COLORS\.WHITE/);
    assert.match(main, /let selectedTimeControl\s*=\s*TIME_CONTROL_IDS\.FIFTEEN_MINUTES/);
    assert.match(main, /timeControl:\s*TIME_CONTROL_IDS\.FIFTEEN_MINUTES/);
    assert.match(main, /aiPersonaId:\s*DEFAULT_AI_PERSONA_ID/);
    assert.match(main, /startMatchFromSetup\(getDefaultMatchSetup\(\),\s*'toast\.quick_start'\)/);
    assert.match(index, /Eril Dizilim · Timur · 15 dk/);
    assert.match(index, /class="card time-control-card selected"\s+data-time-control="15m"/);
    assert.doesNotMatch(index, /class="card time-control-card selected"\s+data-time-control="none"/);
});
