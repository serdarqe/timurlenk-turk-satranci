import test from 'node:test';
import assert from 'node:assert/strict';

import { clearBoardInlineTransformForPerspective } from '../src/ui/BoardPerspective.js';

function makeStyle(initialTransform = 'none') {
    let transform = initialTransform;
    return {
        get transform() {
            return transform;
        },
        set transform(value) {
            transform = value;
        },
        removeProperty(propertyName) {
            if (propertyName === 'transform') transform = '';
        }
    };
}

test('tahta olcekleme siyah perspektifin rotate donusunu inline none ile ezmez', () => {
    const boardEl = { style: makeStyle('none') };

    clearBoardInlineTransformForPerspective(boardEl);

    assert.equal(boardEl.style.transform, '');
});
