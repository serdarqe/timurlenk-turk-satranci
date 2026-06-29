#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_METRICS_PATH = path.join('output', 'landscape-ui-audit', 'metrics.json');
const MIN_TOUCH_TARGET = 44;
const TOUCH_TARGET_TOLERANCE = 1;
const EFFECTIVE_MIN_TOUCH_TARGET = MIN_TOUCH_TARGET - TOUCH_TARGET_TOLERANCE;
const REQUIRED_VIEWPORTS = new Set([
  'mobile-small-landscape',
  'mobile-common-landscape',
  'mobile-large-landscape',
]);

const BROWSER_SNIPPET = String.raw`(() => {
  const rectOf = (rect) => ({
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    right: Math.round(rect.right),
    bottom: Math.round(rect.bottom),
  });

  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth;
  };

  const isDisabled = (el) =>
    el.disabled || el.getAttribute('aria-disabled') === 'true' || el.classList.contains('disabled');

  const selectorOf = (el) => {
    if (el.id) return '#' + el.id;
    if (el.className) {
      return '.' + String(el.className).trim().split(/\s+/).slice(0, 3).join('.');
    }
    return el.tagName.toLowerCase();
  };

  const visibleOverlay = [
    ['formation-menu', 'formation'],
    ['bot-menu', 'bot-menu'],
    ['tutorial-overlay', 'tutorial'],
    ['match-history-overlay', 'match-history'],
    ['game-settings-overlay', 'game-settings'],
    ['game-analysis-overlay', 'game-analysis'],
    ['game-end-result-overlay', 'game-end-result'],
    ['interactive-tutorial-overlay', 'interactive-tutorial'],
  ].find(([id]) => {
    const el = document.getElementById(id);
    return el && !el.classList.contains('hidden') && isVisible(el);
  });

  const screenName = visibleOverlay?.[1] ||
    (document.getElementById('game-view') && !document.getElementById('game-view').classList.contains('hidden') ? 'game-board' : 'main-menu');

  const interactiveSelector = [
    'button',
    'a[href]',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  const visibleInteractive = Array.from(document.querySelectorAll(interactiveSelector))
    .filter(isVisible)
    .filter((el) => !isDisabled(el));

  const smallTouchTargets = visibleInteractive
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) => rect.width < ${EFFECTIVE_MIN_TOUCH_TARGET} || rect.height < ${EFFECTIVE_MIN_TOUCH_TARGET})
    .map(({ el, rect }) => ({
      text: (el.innerText || el.getAttribute('aria-label') || el.id || el.className || el.tagName).toString().trim().slice(0, 80),
      selector: selectorOf(el),
      rect: rectOf(rect),
    }));

  const offscreenInteractive = visibleInteractive
    .map((el) => ({ el, rect: el.getBoundingClientRect() }))
    .filter(({ rect }) =>
      rect.left < -1 ||
      rect.top < -1 ||
      rect.right > window.innerWidth + 1 ||
      rect.bottom > window.innerHeight + 1)
    .map(({ el, rect }) => ({
      text: (el.innerText || el.getAttribute('aria-label') || el.id || el.className || el.tagName).toString().trim().slice(0, 80),
      selector: selectorOf(el),
      rect: rectOf(rect),
    }));

  const textSelector = [
    'button',
    'a',
    'label',
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'span',
    'li',
    'small',
    'strong',
    '.card',
    '.piece-guide-card',
    '.match-history-card',
  ].join(',');

  const clippedText = Array.from(document.querySelectorAll(textSelector))
    .filter(isVisible)
    .filter((el) => (el.textContent || '').trim().length > 0)
    .map((el) => ({ el, rect: el.getBoundingClientRect(), style: window.getComputedStyle(el) }))
    .filter(({ el, style }) => {
      const clippedX = el.scrollWidth > el.clientWidth + 1;
      const clippedY = el.scrollHeight > el.clientHeight + 1;
      return (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden') && (clippedX || clippedY);
    })
    .slice(0, 25)
    .map(({ el, rect }) => ({
      text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 90),
      selector: selectorOf(el),
      rect: rectOf(rect),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));

  const overlaps = (a, b) =>
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

  const visibleRects = (selector) => Array.from(document.querySelectorAll(selector))
    .filter(isVisible)
    .map((el) => ({ selector, rect: el.getBoundingClientRect() }));

  const boards = visibleRects('[data-board], .game-board, .board-container, .board-frame, #board, #chessboard');
  const hud = visibleRects('[data-hud], .game-header, .game-footer, .piece-info-panel, .move-history-panel, .move-history-drawer, .advantage-meter, .turn-indicator, .ad-slot, .banner-ad');
  const adSlots = visibleRects('[data-ad-slot], .ad-slot, .banner-ad, .ad-container');
  const primaryRegions = visibleRects('[data-board], .game-board, .board-container, .primary-btn, [data-primary-cta]');

  const boardHudOverlapCount = boards.flatMap((board) => hud.filter((item) => overlaps(board.rect, item.rect))).length;
  const adOverlapCount = adSlots.flatMap((ad) => primaryRegions.filter((item) => overlaps(ad.rect, item.rect))).length;

  const orientationSwitch =
    document.getElementById('btn-orientation-toggle') ||
    document.getElementById('orientation-toggle') ||
    document.querySelector('[aria-label="Ekran yönünü değiştir"]');
  const orientationSwitchRect = orientationSwitch?.getBoundingClientRect();

  const fixedBottomControls = Array.from(document.querySelectorAll('*'))
    .filter(isVisible)
    .map((el) => ({ el, rect: el.getBoundingClientRect(), style: window.getComputedStyle(el) }))
    .filter(({ rect, style }) =>
      (style.position === 'fixed' || style.position === 'sticky') &&
      rect.bottom > window.innerHeight - 18 &&
      rect.height > 30)
    .map(({ el, rect }) => ({
      selector: selectorOf(el),
      rect: rectOf(rect),
    }));

  let reducedMotionRuleCount = 0;
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules || [])) {
        if (String(rule.conditionText || '').includes('prefers-reduced-motion')) {
          reducedMotionRuleCount += 1;
        }
      }
    } catch (_error) {
      // Cross-origin stylesheets are ignored; local Vite CSS remains inspectable.
    }
  }

  return {
    viewportName: window.__landscapeAuditViewportName || (window.innerWidth + 'x' + window.innerHeight),
    screenName,
    orientation: document.documentElement.dataset.orientation || 'unknown',
    viewport: { width: window.innerWidth, height: window.innerHeight },
    document: {
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      scrollHeight: Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight || 0),
      clientHeight: document.documentElement.clientHeight,
    },
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    visibleInteractiveCount: visibleInteractive.length,
    smallTouchTargets,
    offscreenInteractive,
    clippedText,
    orientationSwitch: orientationSwitchRect ? {
      visible: isVisible(orientationSwitch),
      rect: rectOf(orientationSwitchRect),
      ariaPressed: orientationSwitch.getAttribute('aria-pressed'),
      ariaLabel: orientationSwitch.getAttribute('aria-label'),
    } : null,
    boardHudOverlapCount,
    adOverlapCount,
    fixedBottomControls,
    reducedMotionRuleCount,
  };
})()`;

function printUsage() {
  console.log(`Usage:
  npm run ui:landscape:audit -- [metrics-json]
  npm run ui:landscape:audit:snippet

Default metrics path:
  ${DEFAULT_METRICS_PATH}

Expected metrics shape:
  { "results": [ <browser snippet result>, ... ] }
`);
}

function normalizeMetrics(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.viewports)) {
    return data.viewports.flatMap((viewport) => {
      if (Array.isArray(viewport?.screens)) {
        return viewport.screens.map((screen) => ({
          viewportName: viewport.name || viewport.viewportName,
          ...screen.metrics,
          screenName: screen.name || screen.metrics?.screenName,
        }));
      }
      return [viewport];
    });
  }
  return [];
}

function formatEntry(entry) {
  return `${entry.viewportName || 'unknown'} / ${entry.screenName || 'unknown'}`;
}

function getSmallTouchTargetFailures(entry) {
  return (entry.smallTouchTargets || []).filter((target) => {
    const rect = target.rect || {};
    return (rect.width ?? 0) < EFFECTIVE_MIN_TOUCH_TARGET || (rect.height ?? 0) < EFFECTIVE_MIN_TOUCH_TARGET;
  });
}

function summarizeCounts(entries) {
  return entries.reduce((acc, entry) => {
    acc.smallTouchTargets += getSmallTouchTargetFailures(entry).length;
    acc.offscreenInteractive += entry.offscreenInteractive?.length || 0;
    acc.clippedText += entry.clippedText?.length || 0;
    acc.boardHudOverlapCount += entry.boardHudOverlapCount || 0;
    acc.adOverlapCount += entry.adOverlapCount || 0;
    return acc;
  }, {
    smallTouchTargets: 0,
    offscreenInteractive: 0,
    clippedText: 0,
    boardHudOverlapCount: 0,
    adOverlapCount: 0,
  });
}

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

if (args.includes('--print-snippet')) {
  console.log(BROWSER_SNIPPET);
  process.exit(0);
}

const metricsPath = args.find((arg) => !arg.startsWith('--')) || DEFAULT_METRICS_PATH;
if (!fs.existsSync(metricsPath)) {
  console.error(`Landscape UI metrics file not found: ${metricsPath}`);
  console.error('Collect metrics with the browser snippet first: npm run ui:landscape:audit:snippet');
  process.exit(1);
}

const raw = fs.readFileSync(metricsPath, 'utf8');
const data = JSON.parse(raw);
const entries = normalizeMetrics(data);
const failures = [];
const warnings = [];

if (!entries.length) {
  failures.push('No metric entries found.');
}

const seenViewports = new Set(entries.map((entry) => entry.viewportName).filter(Boolean));
for (const viewport of REQUIRED_VIEWPORTS) {
  if (!seenViewports.has(viewport)) {
    failures.push(`Missing required landscape viewport: ${viewport}`);
  }
}

for (const entry of entries) {
  const label = formatEntry(entry);
  if (entry.orientation !== 'landscape') {
    failures.push(`${label}: expected data-orientation="landscape", got "${entry.orientation}".`);
  }
  if (entry.horizontalOverflow) {
    failures.push(`${label}: horizontal overflow detected (${entry.document?.scrollWidth} > ${entry.document?.clientWidth}).`);
  }
  if (entry.offscreenInteractive?.length) {
    failures.push(`${label}: ${entry.offscreenInteractive.length} interactive element(s) are offscreen.`);
  }
  const smallTouchTargetFailures = getSmallTouchTargetFailures(entry);
  if (smallTouchTargetFailures.length) {
    failures.push(`${label}: ${smallTouchTargetFailures.length} touch target(s) are smaller than ${EFFECTIVE_MIN_TOUCH_TARGET}x${EFFECTIVE_MIN_TOUCH_TARGET}.`);
  }
  if (entry.boardHudOverlapCount > 0) {
    failures.push(`${label}: board/HUD overlap detected (${entry.boardHudOverlapCount}).`);
  }
  if (entry.adOverlapCount > 0) {
    failures.push(`${label}: ad/critical UI overlap detected (${entry.adOverlapCount}).`);
  }
  const shouldShowGlobalOrientationSwitch = entry.screenName === 'main-menu';
  if (shouldShowGlobalOrientationSwitch && !entry.orientationSwitch?.visible) {
    failures.push(`${label}: orientation switch is not visible on main menu.`);
  } else if (!shouldShowGlobalOrientationSwitch && entry.orientationSwitch?.visible) {
    failures.push(`${label}: global orientation switch should be hidden outside main menu.`);
  } else if (entry.orientationSwitch?.visible) {
    const rect = entry.orientationSwitch.rect || {};
    if (rect.width < EFFECTIVE_MIN_TOUCH_TARGET || rect.height < EFFECTIVE_MIN_TOUCH_TARGET) {
      failures.push(`${label}: orientation switch is smaller than ${MIN_TOUCH_TARGET}x${MIN_TOUCH_TARGET}.`);
    }
    if (entry.orientationSwitch.ariaPressed == null) {
      warnings.push(`${label}: orientation switch has no aria-pressed state.`);
    }
  }
  if (!entry.reducedMotionRuleCount) {
    warnings.push(`${label}: no prefers-reduced-motion rule detected in loaded styles.`);
  }
  if (entry.clippedText?.length) {
    warnings.push(`${label}: ${entry.clippedText.length} clipped text candidate(s); inspect if not intentional ellipsis.`);
  }
  if (entry.fixedBottomControls?.length && entry.viewport?.height <= 390) {
    warnings.push(`${label}: ${entry.fixedBottomControls.length} fixed/sticky bottom control(s); verify safe-area/ad clearance.`);
  }
}

const counts = summarizeCounts(entries);
console.log(`Landscape UI audit checked ${entries.length} metric entry/entries.`);
console.log(`Counts: ${JSON.stringify(counts)}`);

if (warnings.length) {
  console.warn('\nWarnings:');
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (failures.length) {
  console.error('\nFailures:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('PASS: Landscape UI audit gates passed.');
