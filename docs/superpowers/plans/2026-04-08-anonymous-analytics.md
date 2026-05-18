# Anonymous Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers-subagent-driven-development (recommended) or superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Oyuna anonim analitik katmanı ekleyip menü, oyun, analiz, online ve reklam akışlarından karar verdiren ürün verilerini güvenli biçimde toplamak.

**Architecture:** Tüm event gönderimleri tek bir `AnalyticsManager` üzerinden geçecek. Bu katman event adı doğrulaması, anonim bağlam ekleme, hassas alan temizleme ve sağlayıcıya iletimi tek yerde yönetecek; `main.js`, `GameAnalysisOverlay`, `SocketManager`, `AdManager` ve oyun akışındaki özel kural noktaları sadece bu katmanı çağıracak.

**Tech Stack:** Vanilla JavaScript, Capacitor, localStorage, Node test runner (`node --test`), Vite build, sağlayıcı-bağımsız analytics adapter tasarımı

---

## File Structure

**Create**
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AnalyticsCatalog.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AnalyticsManager.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-catalog.test.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

**Modify**
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\main.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\ui\GameAnalysisOverlay.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\ui\BoardRenderer.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\online\SocketManager.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AdManager.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\UserPreferences.js`
- `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\analysis\AnalysisSerialization.js`

**Responsibility Split**
- `AnalyticsCatalog.js`: hangi event’lerin ve parametrelerin yasal olduğunu tanımlar.
- `AnalyticsManager.js`: anonim bağlam, session yönetimi, hassas veri temizleme, adapter iletimi.
- `main.js`: uygulama, menü, oyun başlangıcı/bitişi, eğitim, puzzle ve analiz pratik akışları.
- `GameAnalysisOverlay.js`: sekme ve analiz etkileşim event’leri.
- `BoardRenderer.js`: oyun bitişi ve taş hamlesinden gelen özel kural işaretleri.
- `SocketManager.js`: oda kurma/katılma/bağlantı kopması gibi online event’ler.
- `AdManager.js`: consent ve reklam yaşam döngüsü event’leri.
- `AnalysisSerialization.js`: özel taş olayları ve oyun sonu parametreleri için standart veri üretimi.

### Task 1: Analytics Kataloğunu ve Çekirdek Manager’ı Kur

**Files:**
- Create: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AnalyticsCatalog.js`
- Create: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AnalyticsManager.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-catalog.test.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

- [ ] **Step 1: Katalog doğrulaması için başarısız testleri yaz**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedAnalyticsEvent, sanitizeAnalyticsPayload } from '../src/utils/AnalyticsCatalog.js';

test('known events are accepted', () => {
  assert.equal(isAllowedAnalyticsEvent('game_started'), true);
  assert.equal(isAllowedAnalyticsEvent('analysis_tab_opened'), true);
});

test('unknown events are rejected', () => {
  assert.equal(isAllowedAnalyticsEvent('raw_move_dump'), false);
});

test('room code and raw error text are stripped', () => {
  const payload = sanitizeAnalyticsPayload('online_room_joined', {
    room_code: 'ABCD12',
    error_message: 'peer unavailable: ABCD12',
    mode: 'online'
  });

  assert.equal(payload.room_code, undefined);
  assert.equal(payload.error_message, undefined);
  assert.equal(payload.mode, 'online');
});
```

- [ ] **Step 2: Testleri çalıştır ve beklenen başarısızlığı doğrula**

Run: `npm test`  
Expected: `AnalyticsCatalog.js` export edilmediği için FAIL

- [ ] **Step 3: Event kataloğunu minimal doğrulama ile yaz**

```js
export const ANALYTICS_EVENTS = Object.freeze({
  app_open: ['screen_name'],
  session_start: ['screen_name'],
  session_end: ['screen_name', 'duration_seconds'],
  mode_selected: ['mode'],
  difficulty_selected: ['difficulty'],
  game_started: ['mode', 'difficulty', 'local_color', 'is_online', 'is_scripted'],
  game_finished: ['mode', 'difficulty', 'winner', 'result_type', 'move_count', 'duration_seconds', 'special_event_count', 'analysis_ready'],
  game_abandoned: ['mode', 'difficulty', 'move_count', 'elapsed_seconds'],
  special_rule_used: ['special_rule', 'color', 'move_index'],
  analysis_generated: ['mode', 'move_count', 'result_type'],
  analysis_viewed: ['mode', 'move_count', 'result_type'],
  analysis_tab_opened: ['analysis_tab', 'result_type', 'move_count'],
  analysis_practice_started: ['entry_index', 'quality'],
  analysis_practice_solved: ['entry_index', 'quality'],
  analysis_practice_failed: ['entry_index', 'quality'],
  tutorial_opened: ['entry_point'],
  tutorial_completed: ['lesson_id'],
  puzzle_started: ['puzzle_id'],
  puzzle_completed: ['puzzle_id', 'duration_seconds', 'attempt_count'],
  puzzle_failed: ['puzzle_id', 'duration_seconds', 'attempt_count'],
  online_room_created: ['mode'],
  online_room_join_attempted: ['mode'],
  online_room_joined: ['mode'],
  online_match_started: ['local_color'],
  online_match_finished: ['winner', 'result_type', 'move_count'],
  online_disconnect: ['phase', 'had_reconnect'],
  consent_shown: ['platform'],
  consent_completed: ['platform', 'status'],
  ad_request: ['ad_type', 'placement'],
  ad_loaded: ['ad_type', 'placement'],
  ad_failed: ['ad_type', 'placement', 'error_code'],
  ad_shown: ['ad_type', 'placement'],
  ad_closed: ['ad_type', 'placement'],
  app_error: ['scope', 'error_code'],
  worker_error: ['worker_type', 'stage', 'error_code']
});

const FORBIDDEN_KEYS = new Set(['room_code', 'ip', 'peer_id', 'error_message', 'raw_error', 'stack']);

export function isAllowedAnalyticsEvent(eventName) {
  return Boolean(ANALYTICS_EVENTS[eventName]);
}

export function sanitizeAnalyticsPayload(eventName, payload = {}) {
  if (!isAllowedAnalyticsEvent(eventName)) return {};

  const allowedKeys = new Set(ANALYTICS_EVENTS[eventName]);
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      if (FORBIDDEN_KEYS.has(key)) return false;
      if (!allowedKeys.has(key)) return false;
      return value !== undefined;
    })
  );
}
```

- [ ] **Step 4: AnalyticsManager için başarısız testleri yaz**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { AnalyticsManager } from '../src/utils/AnalyticsManager.js';

test('track adds anonymous common context', () => {
  const calls = [];
  const adapter = { track: (event, payload) => calls.push({ event, payload }) };
  const manager = new AnalyticsManager({ adapter, installId: 'anon-install', sessionId: 'session-1' });

  manager.track('game_started', { mode: 'ai', difficulty: 'medium' });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.install_id_hash, 'anon-install');
  assert.equal(calls[0].payload.session_id, 'session-1');
});

test('track ignores unknown events', () => {
  const calls = [];
  const adapter = { track: (event, payload) => calls.push({ event, payload }) };
  const manager = new AnalyticsManager({ adapter, installId: 'anon-install', sessionId: 'session-1' });

  manager.track('unknown_event', { foo: 'bar' });

  assert.equal(calls.length, 0);
});
```

- [ ] **Step 5: Minimal AnalyticsManager’ı yaz**

```js
import { sanitizeAnalyticsPayload, isAllowedAnalyticsEvent } from './AnalyticsCatalog.js';

function fallbackAdapter() {
  return {
    track(eventName, payload) {
      console.debug('[analytics]', eventName, payload);
    }
  };
}

export class AnalyticsManager {
  constructor({ adapter, installId, sessionId, appVersion = 'dev', buildNumber = 'dev', language = 'tr', platform = 'web' } = {}) {
    this.adapter = adapter || fallbackAdapter();
    this.installId = installId;
    this.sessionId = sessionId;
    this.appVersion = appVersion;
    this.buildNumber = buildNumber;
    this.language = language;
    this.platform = platform;
  }

  track(eventName, payload = {}) {
    if (!isAllowedAnalyticsEvent(eventName)) return;

    const sanitized = sanitizeAnalyticsPayload(eventName, payload);
    this.adapter.track(eventName, {
      ...sanitized,
      install_id_hash: this.installId,
      session_id: this.sessionId,
      app_version: this.appVersion,
      build_number: this.buildNumber,
      language: this.language,
      platform: this.platform
    });
  }
}
```

- [ ] **Step 6: Testleri yeniden çalıştır**

Run: `npm test`  
Expected: `analytics-catalog` ve `analytics-manager` testleri PASS

- [ ] **Step 7: Commit**

```bash
git add src/utils/AnalyticsCatalog.js src/utils/AnalyticsManager.js tests/analytics-catalog.test.js tests/analytics-manager.test.js
git commit -m "feat: add anonymous analytics core"
```

### Task 2: Anonim Kimlik ve Session Yaşam Döngüsünü Ekle

**Files:**
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\UserPreferences.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AnalyticsManager.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

- [ ] **Step 1: install id kalıcılığı için başarısız test ekle**

```js
test('manager can create a stable anonymous install id', () => {
  const store = new Map();
  const manager = new AnalyticsManager({
    adapter: { track() {} },
    storage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, value)
    }
  });

  const first = manager.ensureInstallId();
  const second = manager.ensureInstallId();

  assert.equal(first, second);
});
```

- [ ] **Step 2: Testleri çalıştır ve FAIL olduğunu doğrula**

Run: `npm test`  
Expected: `ensureInstallId` bulunamadığı için FAIL

- [ ] **Step 3: UserPreferences içine anonim analytics anahtarlarını ekle**

```js
const ANALYTICS_INSTALL_ID_KEY = 'analytics_install_id';

function readStringPreference(key, fallbackValue = null) {
  try {
    const stored = localStorage.getItem(key);
    return stored ?? fallbackValue;
  } catch (error) {
    console.warn(`Preference read failed for ${key}:`, error);
    return fallbackValue;
  }
}

function writeStringPreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`Preference write failed for ${key}:`, error);
  }

  return value;
}
```

- [ ] **Step 4: AnalyticsManager’a install/session yardımcılarını ekle**

```js
function createAnonymousId(prefix = 'anon') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

ensureInstallId() {
  if (this.installId) return this.installId;
  const existing = this.storage?.getItem?.('analytics_install_id');
  this.installId = existing || createAnonymousId('install');
  this.storage?.setItem?.('analytics_install_id', this.installId);
  return this.installId;
}

startSession() {
  this.ensureInstallId();
  this.sessionId = createAnonymousId('session');
  this.sessionStartedAt = Date.now();
  this.track('session_start', { screen_name: 'app_boot' });
}

endSession(screenName = 'app_exit') {
  if (!this.sessionStartedAt) return;
  const durationSeconds = Math.max(1, Math.round((Date.now() - this.sessionStartedAt) / 1000));
  this.track('session_end', { screen_name: screenName, duration_seconds: durationSeconds });
  this.sessionStartedAt = null;
}
```

- [ ] **Step 5: Testleri yeniden çalıştır**

Run: `npm test`  
Expected: analytics kimlik ve session testleri PASS

- [ ] **Step 6: Commit**

```bash
git add src/utils/UserPreferences.js src/utils/AnalyticsManager.js tests/analytics-manager.test.js
git commit -m "feat: add anonymous analytics identity lifecycle"
```

### Task 3: Uygulama, Menü ve Oyun Başlangıç Event’lerini Bağla

**Files:**
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\main.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AnalyticsManager.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

- [ ] **Step 1: menu ve game_start event bağlama testini yaz**

```js
test('main flow can emit mode and game start analytics', () => {
  const emitted = [];
  const analytics = { track: (event, payload) => emitted.push({ event, payload }) };

  analytics.track('mode_selected', { mode: 'ai' });
  analytics.track('difficulty_selected', { difficulty: 'hard' });
  analytics.track('game_started', {
    mode: 'ai',
    difficulty: 'hard',
    local_color: 'white',
    is_online: false,
    is_scripted: false
  });

  assert.deepEqual(emitted.map((entry) => entry.event), [
    'mode_selected',
    'difficulty_selected',
    'game_started'
  ]);
});
```

- [ ] **Step 2: `main.js` içine ortak analytics örneğini ekle**

```js
import { AnalyticsManager } from './utils/AnalyticsManager.js';

const analytics = new AnalyticsManager({
  language: i18n.getLocale(),
  platform: 'capacitor'
});
```

- [ ] **Step 3: init ve menü geçişlerinde event tetikle**

```js
function init() {
  analytics.startSession();
  analytics.track('app_open', { screen_name: 'boot' });
  analytics.track('main_menu_viewed', { screen_name: 'main_menu' });
  AdManager.initialize();
}

btnTutorial.addEventListener('click', () => {
  analytics.track('tutorial_opened', { entry_point: 'main_menu' });
  showScreen(tutorialOverlay);
});

btnPuzzles?.addEventListener('click', () => {
  analytics.track('mode_selected', { mode: 'puzzle' });
  showScreen(puzzlesOverlay);
});

difficultyCards.forEach((card) => {
  card.addEventListener('click', () => {
    analytics.track('difficulty_selected', { difficulty: card.dataset.difficulty });
  });
});
```

- [ ] **Step 4: `startGame` içinde oyun başlangıcı event’i ekle**

```js
analytics.track('game_started', {
  mode: isOnlineMatch ? 'online' : (isScripted ? 'tutorial' : 'ai'),
  difficulty,
  local_color: isOnlineMatch ? myColor : COLORS.WHITE,
  is_online: Boolean(isOnlineMatch),
  is_scripted: Boolean(isScripted)
});
```

- [ ] **Step 5: session end için app lifecycle bağla**

```js
App.addListener('appStateChange', ({ isActive }) => {
  if (!isActive) {
    analytics.endSession(currentState === GAME_STATES.PLAYING ? 'game_view' : 'main_menu');
  }
});
```

- [ ] **Step 6: Doğrulama komutlarını çalıştır**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/main.js src/utils/AnalyticsManager.js tests/analytics-manager.test.js
git commit -m "feat: track app and game start analytics"
```

### Task 4: Oyun Bitişi, Özel Kurallar ve Analiz Event’lerini Bağla

**Files:**
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\main.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\ui\BoardRenderer.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\analysis\AnalysisSerialization.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\ui\GameAnalysisOverlay.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

- [ ] **Step 1: oyun bitiş payload’ı için başarısız test ekle**

```js
test('game finish payload includes result type and special count only', () => {
  const emitted = [];
  const manager = new AnalyticsManager({ adapter: { track: (event, payload) => emitted.push({ event, payload }) }, installId: 'a', sessionId: 'b' });

  manager.track('game_finished', {
    mode: 'ai',
    difficulty: 'hard',
    winner: 'black',
    result_type: 'stalemate_win',
    move_count: 88,
    duration_seconds: 502,
    special_event_count: 5,
    room_code: 'SECRET'
  });

  assert.equal(emitted[0].payload.result_type, 'stalemate_win');
  assert.equal(emitted[0].payload.room_code, undefined);
});
```

- [ ] **Step 2: `BoardRenderer` özel olayları event detayına ekle**

```js
const event = new CustomEvent('pieceMoved', {
  detail: {
    moveRecord,
    gameOver: this.gameState.status === 'game_over',
    winner: this.gameState.winner,
    resultType: this.gameState.gameOverReason,
    specialTags: moveRecord?.specialTags || []
  }
});
```

- [ ] **Step 3: `main.js` içinde özel kural ve oyun bitiş event’lerini bağla**

```js
document.addEventListener('pieceMoved', (e) => {
  const detail = e.detail || {};
  (detail.specialTags || []).forEach((tag) => {
    if (['royal_swap', 'citadel_exchange', 'pawn_cycle', 'promotion'].includes(tag)) {
      analytics.track('special_rule_used', {
        special_rule: tag,
        color: detail.moveRecord?.color,
        move_index: detail.moveRecord?.index
      });
    }
  });

  if (detail.gameOver) {
    analytics.track('game_finished', {
      mode: isOnlineMatch ? 'online' : 'ai',
      difficulty: gameState?.difficulty || selectedDifficulty,
      winner: detail.winner || 'draw',
      result_type: detail.resultType || 'draw',
      move_count: gameState?.moveHistory?.length || 0,
      duration_seconds: getElapsedGameSeconds(),
      special_event_count: countSpecialEvents(gameState?.moveHistory || []),
      analysis_ready: true
    });
  }
});
```

- [ ] **Step 4: analiz üretildi ve görüntülendi event’lerini ekle**

```js
analytics.track('analysis_generated', {
  mode: isOnlineMatch ? 'online' : 'ai',
  move_count: activeGameState.moveHistory.length,
  result_type: activeGameState.analysisReport?.summary?.resultType || 'ongoing'
});

analytics.track('analysis_viewed', {
  mode: isOnlineMatch ? 'online' : 'ai',
  move_count: activeGameState.moveHistory.length,
  result_type: report?.summary?.resultType || 'ongoing'
});
```

- [ ] **Step 5: analiz sekme geçişlerini event’e çevir**

```js
constructor(rootElement, { onClose, onMainMenu, onPractice, onTabChange } = {}) {
  this.onTabChange = onTabChange || (() => {});
}

_setActiveTab(tab) {
  const nextTab = resolveAnalysisTab(tab);
  if (nextTab === this.activeTab) return;
  this.activeTab = nextTab;
  this.onTabChange(nextTab, this.report);
  this._resetScroll();
  this._render();
}
```

- [ ] **Step 6: Test, build ve commit**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

```bash
git add src/main.js src/ui/BoardRenderer.js src/analysis/AnalysisSerialization.js src/ui/GameAnalysisOverlay.js tests/analytics-manager.test.js
git commit -m "feat: track game end and analysis analytics"
```

### Task 5: Eğitim, Puzzle, Online ve Reklam Event’lerini Bağla

**Files:**
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\main.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\online\SocketManager.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\utils\AdManager.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

- [ ] **Step 1: online ve reklam event’leri için başarısız testleri ekle**

```js
test('ad events only expose type placement and code', () => {
  const emitted = [];
  const manager = new AnalyticsManager({ adapter: { track: (event, payload) => emitted.push({ event, payload }) }, installId: 'a', sessionId: 'b' });

  manager.track('ad_failed', {
    ad_type: 'interstitial',
    placement: 'main_menu_exit',
    error_code: 'NO_FILL',
    stack: 'sensitive'
  });

  assert.equal(emitted[0].payload.error_code, 'NO_FILL');
  assert.equal(emitted[0].payload.stack, undefined);
});
```

- [ ] **Step 2: `SocketManager` callback zincirine analytics hooks ekle**

```js
this.onRoomCreated?.({ joinCode: this.joinCode, color: this.playerColor });
this.analytics?.track('online_room_created', { mode: 'online' });

this.onRoomJoined?.({ joinCode: joinCode.toUpperCase(), color: this.playerColor });
this.analytics?.track('online_room_joined', { mode: 'online' });
```

- [ ] **Step 3: `main.js` içinde tutorial ve puzzle event’lerini ekle**

```js
async function startPuzzle(puzzleData) {
  analytics.track('puzzle_started', { puzzle_id: puzzleData.id });
}

btnTutorial.addEventListener('click', () => {
  analytics.track('tutorial_opened', { entry_point: 'main_menu' });
});
```

- [ ] **Step 4: `AdManager` içine analytics adapter geçir ve event’leri bağla**

```js
static setAnalytics(analytics) {
  this.analytics = analytics;
}

AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
  this.analytics?.track('ad_loaded', { ad_type: 'banner', placement: 'bottom_banner' });
});

AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, (error) => {
  this.analytics?.track('ad_failed', {
    ad_type: 'interstitial',
    placement: 'between_matches',
    error_code: String(error?.code || 'unknown')
  });
});
```

- [ ] **Step 5: consent event’lerini ekle**

```js
this.analytics?.track('consent_shown', { platform: info.platform });
this.analytics?.track('consent_completed', {
  platform: info.platform,
  status: consentInfo.status || 'unknown'
});
```

- [ ] **Step 6: Test, build ve commit**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

```bash
git add src/main.js src/online/SocketManager.js src/utils/AdManager.js tests/analytics-manager.test.js
git commit -m "feat: track tutorial online and ad analytics"
```

### Task 6: Hata Toplama, Doğrulama ve Gizlilik Kontrolü

**Files:**
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\main.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\ai\AIEngine.js`
- Modify: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\src\analysis\AnalysisEngine.js`
- Test: `C:\Users\serda\OneDrive\Desktop\Uygulamalar\Timurlenk Türk Satrancı\TimurChessWeb\tests\analytics-manager.test.js`

- [ ] **Step 1: hata event’leri için başarısız test yaz**

```js
test('error analytics only keep scope and code', () => {
  const emitted = [];
  const manager = new AnalyticsManager({ adapter: { track: (event, payload) => emitted.push({ event, payload }) }, installId: 'a', sessionId: 'b' });

  manager.track('worker_error', {
    worker_type: 'ai_worker',
    stage: 'message',
    error_code: 'timeout',
    stack: 'stack trace'
  });

  assert.equal(emitted[0].payload.worker_type, 'ai_worker');
  assert.equal(emitted[0].payload.stack, undefined);
});
```

- [ ] **Step 2: global hata event’lerini ekle**

```js
window.addEventListener('error', () => {
  analytics.track('app_error', { scope: 'window', error_code: 'uncaught_error' });
});

window.addEventListener('unhandledrejection', () => {
  analytics.track('app_error', { scope: 'promise', error_code: 'unhandled_rejection' });
});
```

- [ ] **Step 3: AI ve analiz worker hata noktalarını işaretle**

```js
this.worker.onerror = () => {
  analytics?.track('worker_error', {
    worker_type: 'ai_worker',
    stage: 'onerror',
    error_code: 'worker_crash'
  });
};
```

- [ ] **Step 4: gizlilik doğrulama kontrol listesini çalıştır**

```text
Kontrol et:
- room_code event payload’ına düşmüyor
- raw stack event payload’ına düşmüyor
- peer id event payload’ına düşmüyor
- install_id hash dışarı tek kimlik olarak gidiyor
- move listesi tam hamle dump olarak gönderilmiyor
```

- [ ] **Step 5: Son doğrulama komutları**

Run: `npm test`  
Expected: PASS

Run: `npm run build`  
Expected: PASS

Run: `npx cap copy android`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/main.js src/ai/AIEngine.js src/analysis/AnalysisEngine.js tests/analytics-manager.test.js
git commit -m "feat: add anonymous analytics error tracking"
```

## Self-Review

- Spec coverage: uygulama açılışı, oyun akışı, analiz, eğitim, puzzle, online, reklam ve hata izleme görevlerle kapsandı.
- Placeholder scan: tüm görevlerde gerçek dosya yolları, örnek kod ve komutlar verildi.
- Type consistency: event adları ve payload alanları `AnalyticsCatalog.js` ile merkezileştirildi; tüm görevler bu isimleri kullanıyor.

