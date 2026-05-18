import './styles/main.css';
import './styles/menu.css';
import './styles/board.css';
import './styles/pieces.css';
import './styles/tutorial.css';
import './styles/interactive-tutorial.css';
import './styles/mobile-touch.css';
import './styles/onboarding.css';
import './styles/analysis.css';
import './styles/themes.css';

import { COLORS, FORMATIONS, GAME_STATES, DIFFICULTY } from './utils/constants.js';
import { GameState } from './game/GameState.js';
import { PieceFactory } from './game/PieceFactory.js';
import { MoveValidator } from './game/MoveValidator.js';
import { BoardRenderer } from './ui/BoardRenderer.js';
import { AIEngine } from './ai/AIEngine.js';
import { DEFAULT_AI_PERSONA_ID, getAIPersona, isAIPersonaId } from './ai/AIPersonas.js';
import { DEFAULT_AI_BOT_ID, getAIBot, getAIBotSelectionCards, isAIBotId } from './ai/AIBots.js';
import { LESSONS } from './tutorial/TutorialEngine.js';
import { SCRIPTED_MATCH, PHASE_INFO, setupScriptedMatchBoard } from './tutorial/ScriptedMatch.js';
import { InteractiveTutorial } from './tutorial/InteractiveTutorial.js';
import { PUZZLES } from './utils/PuzzlesData.js';
import { App } from '@capacitor/app';
import { i18n } from './utils/i18n.js';
import { SocketManager } from './online/SocketManager.js';
import { audioManager } from './utils/AudioManager.js';
import { AdManager } from './utils/AdManager.js';
import { OnboardingOverlay } from './ui/OnboardingOverlay.js';
import { userPreferences } from './utils/UserPreferences.js';
import { AnalyticsManager } from './utils/AnalyticsManager.js';
import { FirebaseAnalyticsAdapter } from './utils/FirebaseAnalyticsAdapter.js';
import { GameAnalysisEngine } from './analysis/AnalysisEngine.js';
import { GameAnalysisOverlay } from './ui/GameAnalysisOverlay.js';
import { calculateMoveImpact, getAdvantageModelForState, updateAdvantageMeter } from './ui/AdvantageMeter.js';
import { getCoordinateLabel, serializeGameStateSnapshot } from './analysis/AnalysisSerialization.js';
import { canPracticeAnalysisEntry, getPracticeExplanationDetails, isMatchingExpectedMove } from './analysis/PracticeUtils.js';
import { createGameRecordId, buildGameRecord } from './storage/GameRecordBuilder.js';
import { GameUploadService } from './storage/GameUploadService.js';
import { buildMatchHistoryRecord, addMatchHistoryRecord, getMatchHistoryRecords } from './storage/MatchHistoryStore.js';
import {
  TIME_CONTROL_IDS,
  getTimeControl,
  createClockState,
  formatClockMs,
  getClockRemainingMs,
  commitActiveClock,
  switchClockAfterMove,
  stopClock,
  hasClock
} from './game/TimeControls.js';
import { getCurrentGamesAuthUid } from './storage/FirebaseGamesConfig.js';
import { themeManager } from './utils/ThemeManager.js';
import { PieceRenderer } from './ui/PieceRenderer.js';
import { clearBoardInlineTransformForPerspective } from './ui/BoardPerspective.js';

let currentState = GAME_STATES.MENU;
let selectedFormation = FORMATIONS.MASCULINE;
let selectedDifficulty = DIFFICULTY.MEDIUM;
let selectedPlayerColor = COLORS.WHITE;
let selectedTimeControl = TIME_CONTROL_IDS.NONE;
let selectedAiPersonaId = DEFAULT_AI_PERSONA_ID;
let selectedAiBotId = null;
let pendingBotMenuId = null;
let gameState = null;
let boardRenderer = null;
let gameAnalysisOverlay = null;
let analysisPracticeSession = null;
let currentLesson = 0;
let interactiveTutorial = null;
let socketManager = null;
let isOnlineMatch = false;
let myColor = null;
let isOpponentTurn = false;
let isSimulatingRemoteMove = false;
let currentOnlineRoomCode = null;
let onlineReconnectPending = false;
let boardScaleHandlerInitialized = false;
let boardScaleResizeTimeout = null;
let boardScaleFollowUpTimeout = null;
let boardScaleFrame = 0;
let pendingAiMoveTimeout = null;
let activeClockInterval = null;
let currentGameStartedAt = null;
let currentPuzzleId = null;
let currentPuzzleAttemptCount = 0;
let currentGameRecordMeta = null;
let lastMatchSetup = null;
let previousAdvantageScoreForBlack = null;
let latestAdvantageMoveImpact = null;
const analytics = new AnalyticsManager({
  adapter: new FirebaseAnalyticsAdapter(),
  language: i18n.getLocale(),
  platform: 'capacitor'
});
const gameUploadService = new GameUploadService();
const appRecordInfo = {
  version: import.meta.env.VITE_APP_VERSION || 'unknown',
  buildNumber: import.meta.env.VITE_APP_BUILD_NUMBER || 'unknown',
  platform: 'android'
};
const LAST_MATCH_SETUP_KEY = 'timur_last_match_setup_v1';
const screenshotMode = (() => {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');

  return {
    enabled: !!shot,
    shot: shot || 'main',
    lang: params.get('lang') || 'en',
    roomCode: (params.get('room') || 'TIMUR6').toUpperCase()
  };
})();

if (screenshotMode.enabled) {
  localStorage.setItem('onboarding_done', '1');
}

// DOM Elements
const mainMenu = document.getElementById('main-menu');
const formationMenu = document.getElementById('formation-menu');
const botMenu = document.getElementById('bot-menu');
const gameView = document.getElementById('game-view');
const gameAnalysisOverlayElement = document.getElementById('game-analysis-overlay');
const gameEndResultOverlayElement = document.getElementById('game-end-result-overlay');
const gameSettingsOverlay = document.getElementById('game-settings-overlay');
const tutorialOverlay = document.getElementById('tutorial-overlay');
const interactiveTutorialOverlay = document.getElementById('interactive-tutorial-overlay');
const puzzlesOverlay = document.getElementById('puzzles-overlay');
const matchHistoryOverlay = document.getElementById('match-history-overlay');
const licensesOverlay = document.getElementById('licenses-overlay');
const toast = document.getElementById('toast');
const analysisPracticeExplanation = document.getElementById('analysis-practice-explanation');
const interactiveTutorialContainer = interactiveTutorialOverlay?.querySelector('.itut-container');
const scriptedTutorialCoach = document.getElementById('scripted-tutorial-coach');
const scriptedTutorialPhase = document.getElementById('scripted-tutorial-phase');
const scriptedTutorialStep = document.getElementById('scripted-tutorial-step');
const scriptedTutorialText = document.getElementById('scripted-tutorial-text');

// Buttons
const btnNewGame = document.getElementById('btn-new-game');
const btnQuickStart = document.getElementById('btn-quick-start');
const btnTutorial = document.getElementById('btn-tutorial');
const btnPuzzles = document.getElementById('btn-puzzles');
const btnClosePuzzles = document.getElementById('btn-close-puzzles');
const btnMatchHistory = document.getElementById('btn-match-history');
const btnCloseMatchHistory = document.getElementById('btn-close-match-history');
const btnOpenLicenses = document.getElementById('btn-open-licenses');
const btnCloseLicenses = document.getElementById('btn-close-licenses');
const btnCloseLicensesSecondary = document.getElementById('btn-close-licenses-secondary');
const puzzleList = document.getElementById('puzzle-list');
const matchHistoryList = document.getElementById('match-history-list');
const btnInteractiveTutorial = document.getElementById('btn-interactive-tutorial');
const btnOnline = document.getElementById('btn-online');
const btnBackMain = document.getElementById('btn-back-main');
const btnOpenBotMenu = document.getElementById('btn-open-bot-menu');
const btnBackFormationFromBots = document.getElementById('btn-back-formation-from-bots');
const btnStartMatch = document.getElementById('btn-start-match');
const btnStartBotMatch = document.getElementById('btn-start-bot-match');
const btnGameMenu = document.getElementById('btn-game-menu');
const btnCloseSettings = document.getElementById('btn-close-settings');
const btnCloseSettingsSecondary = document.getElementById('btn-close-settings-secondary');
const btnReturnMainMenu = document.getElementById('btn-return-main-menu');
const btnTogglePieceLetters = document.getElementById('btn-toggle-piece-letters');
const btnToggleAdvantageMeter = document.getElementById('btn-toggle-advantage-meter');
const btnCloseTutorial = document.getElementById('btn-close-tutorial');
const btnPrevLesson = document.getElementById('btn-prev-lesson');
const btnNextLesson = document.getElementById('btn-next-lesson');
const btnScriptedHint = document.getElementById('btn-scripted-hint');
const btnScriptedExit = document.getElementById('btn-scripted-exit');
const btnToggleLog = document.getElementById('btn-toggle-log');
const btnCloseLog = document.getElementById('btn-close-log');
const btnPracticeReturnAnalysis = document.getElementById('btn-practice-return-analysis');
const btnCloseGameEndResult = document.getElementById('btn-close-game-end-result');
const btnGameEndRematch = document.getElementById('btn-game-end-rematch');
const btnGameEndAnalysis = document.getElementById('btn-game-end-analysis');
const btnGameEndMainMenu = document.getElementById('btn-game-end-main-menu');
const pieceLettersToggleState = document.getElementById('piece-letters-toggle-state');
const advantageMeterToggleState = document.getElementById('advantage-meter-toggle-state');
const analysisPracticeBestMove = document.getElementById('analysis-practice-best-move');
const analysisPracticeTags = document.getElementById('analysis-practice-tags');
const analysisPracticeReasons = document.getElementById('analysis-practice-reasons');
const gameEndResultBadge = document.getElementById('game-end-result-badge');
const gameEndResultTitle = document.getElementById('game-end-result-title');
const gameEndResultSubtitle = document.getElementById('game-end-result-subtitle');
const gameEndResultMetaMoves = document.getElementById('game-end-result-meta-moves');
const gameEndResultMetaSpecial = document.getElementById('game-end-result-meta-special');
const privacyPolicyLink = document.querySelector('.policy-link');

// Online Menu Elements
const onlineMenu = document.getElementById('online-menu');
const btnCreateRoom = document.getElementById('btn-create-room');
const btnJoinRoom = document.getElementById('btn-join-room');
const joinRoomCodeInput = document.getElementById('join-room-code');
const btnBackOnlineMenu = document.getElementById('btn-back-online-menu');
const onlineSetupContainer = document.getElementById('online-setup-container');
const onlineWaitingContainer = document.getElementById('online-waiting-container');
const displayRoomCode = document.getElementById('display-room-code');
const btnCopyCode = document.getElementById('btn-copy-code');
const btnShareCode = document.getElementById('btn-share-code');
const topPlayerAvatarIcon = document.getElementById('top-player-avatar-icon');
const topPlayerName = document.getElementById('top-player-name');
const topPlayerStatus = document.getElementById('ai-status');
const topPlayerClock = document.getElementById('top-player-clock');
const bottomPlayerName = document.getElementById('bottom-player-name');
const bottomPlayerClock = document.getElementById('bottom-player-clock');
const turnIndicator = document.getElementById('turn-indicator');
const advantageMeterElements = {
  meter: document.getElementById('advantage-meter'),
  blackFill: document.getElementById('advantage-black-fill'),
  whiteFill: document.getElementById('advantage-white-fill'),
  score: document.getElementById('advantage-score'),
  label: document.getElementById('advantage-label'),
  impact: document.getElementById('advantage-impact')
};

// Panels
const moveLogPanel = document.getElementById('move-log-panel');
const moveList = document.getElementById('move-list');
let moveCount = 1;

// Cards
const formationCards = document.querySelectorAll('.formation-card');
const difficultyCards = document.querySelectorAll('.difficulty-card');
const playerColorCards = document.querySelectorAll('.player-color-card');
const aiPersonaCards = document.querySelectorAll('.ai-persona-card');
const aiBotCardsContainer = document.getElementById('ai-bot-cards');
const timeControlCards = document.querySelectorAll('.time-control-card');
const tutorialTabs = document.querySelectorAll('.tutorial-tab');
const TUTORIAL_PROGRESS_KEY = 'tutorial_last_lesson';
const MINI_TUTORIAL_PROGRESS_KEY = 'interactive_tutorial_last_scenario';

function resetOnlineMatchState() {
  clearPendingAiTrigger(true);
  stopGameClock();
  isOnlineMatch = false;
  myColor = null;
  isOpponentTurn = false;
  isSimulatingRemoteMove = false;
  currentOnlineRoomCode = null;
  onlineReconnectPending = false;
  if (socketManager) socketManager.disconnect();
  syncGameHud();
}

function clearPendingAiTrigger(cancelWorker = false) {
  if (pendingAiMoveTimeout) {
    clearTimeout(pendingAiMoveTimeout);
    pendingAiMoveTimeout = null;
  }

  if (cancelWorker) {
    AIEngine.cancelPending();
  }
}

function waitMs(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function applyInitialLocale() {
  const targetLocale = screenshotMode.enabled ? screenshotMode.lang : i18n.getLocale();

  if (targetLocale !== i18n.getLocale()) {
    i18n.setLocale(targetLocale);
  } else {
    i18n.updateDOM();
  }

  document.documentElement.lang = targetLocale;
}

function updatePieceLetterToggleUI() {
  if (!btnTogglePieceLetters || !pieceLettersToggleState) return;

  const enabled = userPreferences.getShowPieceLetters();
  pieceLettersToggleState.textContent = i18n.t(enabled ? 'settings.on' : 'settings.off');
  btnTogglePieceLetters.setAttribute('aria-pressed', String(enabled));
  btnTogglePieceLetters.classList.toggle('is-enabled', enabled);
  btnTogglePieceLetters.classList.toggle('primary-btn', enabled);
  btnTogglePieceLetters.classList.toggle('secondary-btn', !enabled);
}

function updateAdvantageMeterToggleUI() {
  if (!btnToggleAdvantageMeter || !advantageMeterToggleState) return;

  const enabled = userPreferences.getShowAdvantageMeter();
  advantageMeterToggleState.textContent = i18n.t(enabled ? 'settings.on' : 'settings.off');
  btnToggleAdvantageMeter.setAttribute('aria-pressed', String(enabled));
  btnToggleAdvantageMeter.classList.toggle('is-enabled', enabled);
  btnToggleAdvantageMeter.classList.toggle('primary-btn', enabled);
  btnToggleAdvantageMeter.classList.toggle('secondary-btn', !enabled);
}

function updateThemeUI() {
  const currentTheme = themeManager.getBoardTheme();
  const currentSkin = themeManager.getPieceSkin();

  document.querySelectorAll('[data-board-theme]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.boardTheme === currentTheme);
  });

  document.querySelectorAll('[data-piece-skin]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.pieceSkin === currentSkin);
  });
}

function clampIndex(value, max) {
  const numeric = Number.parseInt(value, 10);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(numeric, max));
}

function getSavedLessonIndex() {
  return clampIndex(localStorage.getItem(TUTORIAL_PROGRESS_KEY), LESSONS.length - 1);
}

function saveLessonIndex(index) {
  localStorage.setItem(TUTORIAL_PROGRESS_KEY, String(clampIndex(index, LESSONS.length - 1)));
}

function getSavedMiniTutorialScenarioIndex() {
  return clampIndex(localStorage.getItem(MINI_TUTORIAL_PROGRESS_KEY), 11);
}

function saveMiniTutorialScenarioIndex(index) {
  localStorage.setItem(MINI_TUTORIAL_PROGRESS_KEY, String(Math.max(0, index)));
}

function getDefaultMatchSetup() {
  return {
    formation: FORMATIONS.MASCULINE,
    difficulty: DIFFICULTY.MEDIUM,
    playerColor: COLORS.WHITE,
    timeControl: TIME_CONTROL_IDS.NONE,
    aiPersonaId: DEFAULT_AI_PERSONA_ID,
    aiBotId: null
  };
}

function sanitizeMatchSetup(setup = {}) {
  const fallback = getDefaultMatchSetup();
  const formation = [FORMATIONS.MASCULINE, FORMATIONS.FEMININE].includes(setup.formation) ? setup.formation : fallback.formation;
  const difficulty = Object.values(DIFFICULTY).includes(setup.difficulty) ? setup.difficulty : fallback.difficulty;
  const playerColor = [COLORS.WHITE, COLORS.BLACK].includes(setup.playerColor) ? setup.playerColor : fallback.playerColor;
  const timeControl = getTimeControl(setup.timeControl).id;
  const aiPersonaId = isAIPersonaId(setup.aiPersonaId) ? setup.aiPersonaId : fallback.aiPersonaId;
  const aiBotId = isAIBotId(setup.aiBotId) ? setup.aiBotId : null;
  return { formation, difficulty, playerColor, timeControl, aiPersonaId, aiBotId };
}

function loadLastMatchSetup() {
  try {
    return sanitizeMatchSetup(JSON.parse(localStorage.getItem(LAST_MATCH_SETUP_KEY) || 'null') || getDefaultMatchSetup());
  } catch (error) {
    return getDefaultMatchSetup();
  }
}

function saveLastMatchSetup(setup) {
  const normalized = sanitizeMatchSetup(setup);
  lastMatchSetup = normalized;
  try {
    localStorage.setItem(LAST_MATCH_SETUP_KEY, JSON.stringify(normalized));
  } catch (error) {
    console.warn('[MatchSetup] Could not persist last setup.', error);
  }
  return normalized;
}

function getAiBotCards() {
  return Array.from(document.querySelectorAll('.ai-bot-card'));
}

function getFirstBotMenuId() {
  return getAIBotSelectionCards(i18n.getLocale()).find((model) => !model.isClassic)?.id || DEFAULT_AI_BOT_ID;
}

function syncBotMenuCardSelection() {
  const activeBotId = isAIBotId(pendingBotMenuId) ? pendingBotMenuId : '';

  getAiBotCards().forEach(card => {
    card.classList.toggle('selected', card.dataset.aiBot === activeBotId);
  });

  if (btnStartBotMatch) {
    btnStartBotMatch.disabled = !isAIBotId(activeBotId);
  }
}

function syncSetupCardSelection() {
  formationCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.formation === selectedFormation);
  });
  difficultyCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.difficulty === selectedDifficulty);
  });
  playerColorCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.playerColor === selectedPlayerColor);
  });
  timeControlCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.timeControl === selectedTimeControl);
  });
  aiPersonaCards.forEach(card => {
    card.classList.toggle('selected', card.dataset.aiPersona === selectedAiPersonaId);
  });
  syncBotMenuCardSelection();
}

function selectAiBot(botId = '') {
  selectedAiBotId = isAIBotId(botId) ? botId : null;
  const bot = selectedAiBotId ? getAIBot(selectedAiBotId) : null;

  if (bot) {
    selectedDifficulty = bot.difficulty;
    selectedAiPersonaId = bot.personaId;
  }

  syncSetupCardSelection();
}

function selectBotMenuOpponent(botId = '') {
  pendingBotMenuId = isAIBotId(botId) ? botId : getFirstBotMenuId();
  syncBotMenuCardSelection();
}

function renderAiBotCards() {
  if (!aiBotCardsContainer) return;

  aiBotCardsContainer.innerHTML = '';
  const botModels = getAIBotSelectionCards(i18n.getLocale()).filter((model) => !model.isClassic);
  const groupedByStars = botModels.reduce((groups, model) => {
    const key = String(model.stars);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(model);
    return groups;
  }, new Map());

  Array.from(groupedByStars.entries())
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([stars, models]) => {
      const tier = document.createElement('section');
      tier.className = 'ai-bot-star-tier';

      const tierLabel = document.createElement('div');
      tierLabel.className = 'ai-bot-star-tier-label';
      tierLabel.textContent = `${'★'.repeat(Number(stars))} ${stars}`;
      tier.appendChild(tierLabel);

      const tierGrid = document.createElement('div');
      tierGrid.className = 'ai-bot-tier-grid';

      models.forEach((model) => {
        const card = document.createElement('div');
        card.className = 'card ai-bot-card ai-bot-list-item';
        card.dataset.aiBot = model.id;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');

        const icon = document.createElement('i');
        icon.className = `${model.iconClass} card-icon`;
        icon.style.color = model.iconColor;
        card.appendChild(icon);

        const title = document.createElement('h3');
        title.textContent = model.label;
        card.appendChild(title);

        const meta = document.createElement('p');
        meta.className = 'ai-bot-meta';
        meta.textContent = model.levelText;
        card.appendChild(meta);

        const starsElement = document.createElement('p');
        starsElement.className = 'ai-bot-stars';
        starsElement.setAttribute('aria-label', model.starsLabel);
        starsElement.textContent = model.starsText;
        card.appendChild(starsElement);

        const description = document.createElement('p');
        description.className = 'ai-bot-desc';
        description.textContent = model.description;
        card.appendChild(description);

        tierGrid.appendChild(card);
      });

      tier.appendChild(tierGrid);
      aiBotCardsContainer.appendChild(tier);
    });

  syncBotMenuCardSelection();
}

function applySetupSelection(setup = getDefaultMatchSetup()) {
  const normalized = sanitizeMatchSetup(setup);
  selectedFormation = normalized.formation;
  selectedDifficulty = normalized.difficulty;
  selectedPlayerColor = normalized.playerColor;
  selectedTimeControl = normalized.timeControl;
  selectedAiPersonaId = normalized.aiPersonaId;
  selectedAiBotId = normalized.aiBotId;

  syncSetupCardSelection();
}

function getCurrentMatchSetup() {
  return sanitizeMatchSetup({
    formation: selectedFormation,
    difficulty: selectedDifficulty,
    playerColor: selectedPlayerColor,
    timeControl: selectedTimeControl,
    aiPersonaId: selectedAiPersonaId,
    aiBotId: selectedAiBotId
  });
}

function getTimeControlLabel(timeControlId) {
  const timeControl = getTimeControl(timeControlId);
  return i18n.t(timeControl.labelKey);
}

function clearClockTicker() {
  if (activeClockInterval) {
    clearInterval(activeClockInterval);
    activeClockInterval = null;
  }
}

function renderClockDisplay(now = Date.now()) {
  const clock = gameState?.clock;
  const clockEnabled = hasClock(clock);
  const topColor = getTopHudColor(gameState);
  const bottomColor = getBottomHudColor(gameState);

  [
    { element: topPlayerClock, color: topColor },
    { element: bottomPlayerClock, color: bottomColor }
  ].forEach(({ element, color }) => {
    if (!element) return;
    element.classList.toggle('hidden', !clockEnabled);
    if (!clockEnabled) return;

    const remainingMs = getClockRemainingMs(clock, color, now);
    element.textContent = formatClockMs(remainingMs);
    element.classList.toggle('is-active', clock.activeColor === color && clock.running);
    element.classList.toggle('is-low', Number.isFinite(remainingMs) && remainingMs <= 30_000);
  });
}

function startClockTicker() {
  clearClockTicker();
  if (!hasClock(gameState?.clock)) {
    renderClockDisplay();
    return;
  }

  renderClockDisplay();
  activeClockInterval = setInterval(() => {
    if (!gameState || currentState !== GAME_STATES.PLAYING || gameState.isGameOver?.()) {
      clearClockTicker();
      renderClockDisplay();
      return;
    }

    commitActiveClock(gameState.clock);
    renderClockDisplay();

    if (gameState.clock?.expiredColor) {
      handleClockTimeout(gameState.clock.expiredColor);
    }
  }, 500);
}

function stopGameClock() {
  clearClockTicker();
  if (gameState?.clock) {
    stopClock(gameState.clock);
    renderClockDisplay();
  }
}

function saveCurrentMatchHistory(state = gameState) {
  if (!state || state.isScripted || state.analysisPractice?.enabled || !state.moveHistory?.length) {
    return;
  }

  addMatchHistoryRecord(buildMatchHistoryRecord({
    gameState: state,
    sessionMeta: currentGameRecordMeta,
    timeControl: state.timeControl || currentGameRecordMeta?.timeControl || TIME_CONTROL_IDS.NONE
  }));
}

function finalizeCurrentGame({
  winner = gameState?.winner,
  resultType = resolveGameEndResultType(gameState),
  analysisReady = false
} = {}) {
  if (!gameState || gameState.matchFinalized) {
    return;
  }

  gameState.matchFinalized = true;
  stopGameClock();

  analytics.track('game_finished', {
    mode: getGameModeForAnalytics(),
    difficulty: gameState?.difficulty || selectedDifficulty,
    ai_persona: gameState?.aiPersonaId || currentGameRecordMeta?.aiPersonaId || 'none',
    ...getAiBotAnalyticsFields(),
    winner: getAnalyticsWinner(winner),
    result_type: getAnalyticsResultType(resultType),
    move_count: gameState?.moveHistory?.length || 0,
    duration_seconds: getElapsedGameSeconds(),
    special_event_count: countSpecialEvents(gameState?.moveHistory || []),
    analysis_ready: analysisReady
  });

  if (gameState.isPuzzle) {
    const puzzleEvent = getAnalyticsWinner(winner) === COLORS.WHITE
      ? 'puzzle_completed'
      : 'puzzle_failed';

    analytics.track(puzzleEvent, {
      puzzle_id: currentPuzzleId || 'unknown',
      duration_seconds: getElapsedGameSeconds(),
      attempt_count: currentPuzzleAttemptCount || 1
    });
  }

  if (getGameModeForAnalytics() === 'online') {
    analytics.track('online_match_finished', {
      winner: getAnalyticsWinner(winner),
      result_type: getAnalyticsResultType(resultType),
      move_count: gameState?.moveHistory?.length || 0
    });
  }

  saveCurrentMatchHistory(gameState);
  void queueGameRecordUpload(gameState);
  showGameEndResultOverlay();
  void preparePostGameAnalysis();
}

function handleClockTimeout(expiredColor) {
  if (!gameState || gameState.isGameOver?.() || gameState.matchFinalized) {
    return;
  }

  const winner = expiredColor === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
  gameState.status = 'game_over';
  gameState.winner = winner;
  gameState.resultType = 'timeout_win';
  gameState.timeout = {
    expiredColor,
    winner,
    at: new Date().toISOString()
  };

  clearPendingAiTrigger(true);
  boardRenderer?.render();
  syncGameHud();
  showToast(i18n.t('toast.timeout'));
  finalizeCurrentGame({ winner, resultType: 'timeout_win' });
}

function ensureInteractiveTutorial() {
  if (!interactiveTutorialContainer) return null;

  if (!interactiveTutorial) {
    interactiveTutorial = new InteractiveTutorial(interactiveTutorialContainer);
    interactiveTutorial.onProgressChange = ({ scenarioIndex }) => {
      saveMiniTutorialScenarioIndex(scenarioIndex);
    };
    interactiveTutorial.onClose = () => {
      showScreen(tutorialOverlay);
    };
    interactiveTutorial.onComplete = () => {
      showToast(i18n.t('tutorial.coach.mini_completed'), 3200);
      analytics.track('tutorial_completed', { lesson_id: 'mini_lessons' });
      showScreen(tutorialOverlay);
    };
  }

  return interactiveTutorial;
}

function openInteractiveTutorialScreen() {
  const tutorial = ensureInteractiveTutorial();
  if (!tutorial) return;

  showScreen(interactiveTutorialOverlay);
  tutorial.start(getSavedMiniTutorialScenarioIndex());
  analytics.track('tutorial_opened', { entry_point: 'mini_lessons' });
}

function hideScriptedTutorialCoach() {
  scriptedTutorialCoach?.classList.add('hidden');
}

function formatMultilineText(text) {
  return String(text || '').replace(/\n/g, '<br>');
}

function getScriptedCoachText(stepData, lang) {
  const rawInstruction = stepData?.instruction?.[lang] || stepData?.instruction?.tr || '';
  const rawCoach = stepData?.coach?.[lang] || stepData?.coach?.tr || '';

  if (rawCoach) return rawCoach;

  const paragraphs = String(rawInstruction)
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) return rawInstruction;
  return paragraphs[paragraphs.length - 1];
}

function updateScriptedTutorialCoach(stepData, options = {}) {
  if (!scriptedTutorialCoach || !stepData) return;

  const lang = i18n.getLocale() === 'en' ? 'en' : 'tr';
  const total = SCRIPTED_MATCH.length;
  const stepIndex = Math.min((gameState?.scriptStep ?? 0) + 1, total);
  const phaseLabel = PHASE_INFO[stepData.phase]?.[lang] || '';
  const text = options.completed
    ? (options.message || '')
    : getScriptedCoachText(stepData, lang);

  if (scriptedTutorialPhase) scriptedTutorialPhase.textContent = phaseLabel;
  if (scriptedTutorialStep) {
    scriptedTutorialStep.textContent = i18n.t('tutorial.coach.step', {
      current: stepIndex,
      total
    });
  }
  if (scriptedTutorialText) scriptedTutorialText.innerHTML = formatMultilineText(text);
  if (btnScriptedHint) btnScriptedHint.classList.toggle('hidden', Boolean(options.completed));

  scriptedTutorialCoach.classList.remove('hidden');
}

function applyPieceLetterPreference(enabled) {
  userPreferences.setShowPieceLetters(enabled);
  analytics.track('piece_letters_toggled', { enabled: Boolean(enabled) });
  updatePieceLetterToggleUI();
  if (currentState === GAME_STATES.PLAYING) {
    boardRenderer?.refreshVisualSettings();
  }
}

function togglePieceLetters() {
  applyPieceLetterPreference(!userPreferences.getShowPieceLetters());
}

function applyAdvantageMeterPreference(enabled) {
  userPreferences.setShowAdvantageMeter(enabled);
  analytics.track('advantage_meter_toggled', { enabled: Boolean(enabled) });
  updateAdvantageMeterToggleUI();
  syncAdvantageMeter();
}

function toggleAdvantageMeterPreference() {
  applyAdvantageMeterPreference(!userPreferences.getShowAdvantageMeter());
}

function openGameSettingsMenu() {
  updatePieceLetterToggleUI();
  updateAdvantageMeterToggleUI();
  updateThemeUI();
  analytics.track('settings_opened', { screen_name: 'game_settings' });
  gameSettingsOverlay?.classList.remove('hidden');
}

function closeGameSettingsMenu() {
  gameSettingsOverlay?.classList.add('hidden');
}

function leaveCurrentGameToMainMenu() {
  if (gameState && currentState === GAME_STATES.PLAYING && !gameState.isGameOver?.()) {
    analytics.track('game_abandoned', {
      mode: getGameModeForAnalytics(),
      difficulty: gameState?.difficulty || selectedDifficulty,
      ai_persona: gameState?.aiPersonaId || currentGameRecordMeta?.aiPersonaId || 'none',
      ...getAiBotAnalyticsFields(),
      move_count: gameState?.moveHistory?.length || 0,
      elapsed_seconds: getElapsedGameSeconds()
    });
  }

  clearPendingAiTrigger(true);
  closeGameSettingsMenu();
  hideScriptedTutorialCoach();
  hideAnalysisPracticeExplanation();
  closeGameAnalysisOverlay();
  clearAnalysisPracticeSession();
  showScreen(mainMenu);
  currentState = GAME_STATES.MENU;
  resetOnlineMatchState();
  if (boardRenderer) boardRenderer.clear();
  AdManager.showInterstitial();
}

function confirmAndLeaveCurrentGame() {
  if (confirm(i18n.t('dialog.back_confirm'))) {
    leaveCurrentGameToMainMenu();
  }
}

function getGameModeForAnalytics(state = gameState) {
  if (!state) return isOnlineMatch ? 'online' : 'ai';
  if (state.analysisPractice?.enabled) return 'analysis_practice';
  if (state.isPuzzle || state.puzzleObjective) return 'puzzle';
  if (state.isScripted) return 'tutorial';
  if (state.onlineMatch?.enabled || isOnlineMatch) return 'online';
  return 'ai';
}

function getAnalyticsWinner(rawWinner) {
  if (rawWinner === COLORS.WHITE || rawWinner === COLORS.BLACK) return rawWinner;
  return 'draw';
}

function getAnalyticsResultType(resultType) {
  if (resultType === 'stalemate') return 'stalemate_win';
  return resultType || 'draw';
}

function getElapsedGameSeconds() {
  if (!currentGameStartedAt) return 0;
  return Math.max(1, Math.round((Date.now() - currentGameStartedAt) / 1000));
}

function countSpecialEvents(moveHistory = []) {
  return moveHistory.reduce((total, entry) => total + ((entry?.specialTags?.length) || 0), 0);
}

function getAiBotAnalyticsFields(state = gameState, meta = currentGameRecordMeta) {
  const aiBotId = state?.aiBotId || meta?.aiBotId || null;
  if (!aiBotId) return {};

  const aiBotLevel = Number.isFinite(state?.aiBotLevel)
    ? state.aiBotLevel
    : (Number.isFinite(meta?.aiBotLevel) ? meta.aiBotLevel : undefined);
  const aiBotStars = Number.isFinite(state?.aiBotStars)
    ? state.aiBotStars
    : (Number.isFinite(meta?.aiBotStars) ? meta.aiBotStars : undefined);

  return {
    ai_bot_id: aiBotId,
    ai_bot_level: aiBotLevel,
    ai_bot_stars: aiBotStars
  };
}

function createGameRecordMeta({
  mode,
  difficulty,
  formation = null,
  aiPersonaId = null,
  aiBotId = null,
  aiBotLevel = null,
  aiBotStars = null,
  isOnline = false,
  isScripted = false,
  isPuzzle = false,
  timeControl = TIME_CONTROL_IDS.NONE,
  localColor = COLORS.WHITE,
  aiColor = null,
  recordedBy = 'local_player'
} = {}) {
  return {
    gameId: createGameRecordId(),
    createdAt: new Date().toISOString(),
    mode,
    difficulty,
    formation,
    aiPersonaId,
    aiBotId,
    aiBotLevel,
    aiBotStars,
    isOnline,
    isScripted,
    isPuzzle,
    timeControl,
    localColor,
    aiColor,
    recordedBy,
    queuedWithoutAnalysis: false,
    queuedWithAnalysis: false
  };
}

function shouldUploadGameRecord(state = gameState, meta = currentGameRecordMeta) {
  if (!state || !meta) return false;
  if (state.isScripted) return false;
  if (!state.moveHistory?.length) return false;

  if (meta.mode === 'online') {
    return meta.recordedBy === 'host';
  }

  return true;
}

async function queueGameRecordUpload(state = gameState) {
  if (!shouldUploadGameRecord(state)) return false;
  const hasAnalysisSummary = Boolean(state?.analysisReport?.summary);
  if (hasAnalysisSummary && currentGameRecordMeta?.queuedWithAnalysis) return false;
  if (!hasAnalysisSummary && currentGameRecordMeta?.queuedWithoutAnalysis) return false;

  const record = buildGameRecord({
    gameState: state,
    sessionMeta: currentGameRecordMeta,
    locale: i18n.getLocale(),
    installToken: analytics.ensureInstallId(),
    authUid: getCurrentGamesAuthUid(),
    appInfo: appRecordInfo
  });

  if (!record) return false;

  await gameUploadService.enqueue(record);
  if (hasAnalysisSummary) currentGameRecordMeta.queuedWithAnalysis = true;
  else currentGameRecordMeta.queuedWithoutAnalysis = true;
  return true;
}

function getOnlineOpponentColor() {
  return myColor === COLORS.BLACK ? COLORS.WHITE : COLORS.BLACK;
}

function getOppositeColor(color) {
  return color === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
}

function normalizePlayerColor(color) {
  return color === COLORS.BLACK ? COLORS.BLACK : COLORS.WHITE;
}

function getLocalPlayerColor(state = gameState) {
  if (state?.onlineMatch?.enabled && myColor) return myColor;
  if (isOnlineMatch && myColor) return myColor;
  return normalizePlayerColor(state?.playerColor || currentGameRecordMeta?.localColor || selectedPlayerColor);
}

function getLocalAiColor(state = gameState) {
  if (state?.aiColor === COLORS.WHITE || state?.aiColor === COLORS.BLACK) return state.aiColor;
  return getOppositeColor(getLocalPlayerColor(state));
}

function getTopHudColor(state = gameState) {
  if (state?.onlineMatch?.enabled || isOnlineMatch) return getOnlineOpponentColor();
  if (state?.aiColor) return getLocalAiColor(state);
  return COLORS.BLACK;
}

function getBottomHudColor(state = gameState) {
  if (state?.onlineMatch?.enabled || isOnlineMatch) return myColor || COLORS.WHITE;
  if (state?.playerColor) return getLocalPlayerColor(state);
  return COLORS.WHITE;
}

function getBoardPerspectiveColor(state = gameState) {
  const localColor = getBottomHudColor(state);
  return localColor === COLORS.BLACK ? COLORS.BLACK : COLORS.WHITE;
}

function getShortColorLabel(color) {
  return i18n.t(color === COLORS.BLACK ? 'colors.black_short' : 'colors.white_short');
}

function getOfflineTopStatusText() {
  if (gameState?.analysisPractice?.enabled) {
    return i18n.t('analysis.practice_mode');
  }

  if (!gameState?.aiColor) {
    return i18n.t('common.waiting');
  }

  return currentState === GAME_STATES.PLAYING && gameState && gameState.currentTurn === getLocalAiColor(gameState)
    ? i18n.t('common.thinking')
    : i18n.t('common.waiting');
}

function getTurnIndicatorText() {
  if (currentState !== GAME_STATES.PLAYING || !gameState) {
    return i18n.t('common.your_turn');
  }

  if (gameState.analysisPractice?.enabled) {
    return i18n.t('analysis.practice_prompt_short');
  }

  if (!gameState.aiColor && !isOnlineMatch) {
    return gameState.currentTurn === COLORS.WHITE
      ? i18n.t('common.your_turn')
      : i18n.t('common.ai_turn');
  }

  if (isOnlineMatch && myColor) {
    return gameState.currentTurn === myColor
      ? i18n.t('common.your_turn')
      : i18n.t('online.opponent_turn');
  }

  return gameState.currentTurn === getLocalPlayerColor(gameState)
    ? i18n.t('common.your_turn')
    : i18n.t('common.ai_turn');
}

function getAiPersonaNameForHud() {
  const shouldShowPersona =
    !isOnlineMatch
    && currentState === GAME_STATES.PLAYING
    && gameState
    && !gameState.isPuzzle
    && !gameState.isScripted
    && !gameState.analysisPractice?.enabled;

  if (!shouldShowPersona) {
    return i18n.t('players.ai');
  }

  const persona = getAIPersona(gameState.aiPersonaId || selectedAiPersonaId);
  return i18n.t(persona.labelKey);
}

function resetAdvantageMeterState() {
  previousAdvantageScoreForBlack = null;
  latestAdvantageMoveImpact = null;
}

function getAdvantageMoveLabel(movedColor) {
  if (isOnlineMatch || gameState?.onlineMatch?.enabled) {
    return movedColor === myColor ? i18n.t('players.you_online') : i18n.t('players.opponent');
  }

  if (movedColor === getLocalPlayerColor(gameState)) return i18n.t('players.you');
  if (movedColor === getLocalAiColor(gameState)) return getAiPersonaNameForHud();
  return getShortColorLabel(movedColor);
}

function syncAdvantageMeter(context = {}) {
  const shouldShow =
    currentState === GAME_STATES.PLAYING
    && gameState
    && userPreferences.getShowAdvantageMeter()
    && !gameState.isScripted
    && !gameState.isPuzzle
    && !gameState.analysisPractice?.enabled;

  if (!shouldShow) {
    updateAdvantageMeter(advantageMeterElements, gameState, { visible: false });
    return null;
  }

  const model = getAdvantageModelForState(gameState, gameState?.difficulty || selectedDifficulty);
  const moveDetail = context?.moveDetail || null;
  const movedColor = moveDetail?.movedColor || moveDetail?.moveRecord?.color || null;

  if (moveDetail) {
    const impact = calculateMoveImpact(previousAdvantageScoreForBlack, model.scoreForBlack, movedColor);
    latestAdvantageMoveImpact = impact
      ? { ...impact, label: getAdvantageMoveLabel(movedColor) }
      : null;
  }

  updateAdvantageMeter(advantageMeterElements, gameState, {
    visible: shouldShow,
    model,
    profileInput: gameState?.difficulty || selectedDifficulty,
    translate: (key) => i18n.t(key),
    getColorLabel: getShortColorLabel,
    moveImpact: latestAdvantageMoveImpact
  });

  previousAdvantageScoreForBlack = model.scoreForBlack;
  return model;
}

function syncGameHud(advantageContext = {}) {
  const showOfflineColorLabels = Boolean(!isOnlineMatch && gameState?.aiColor);

  if (topPlayerAvatarIcon) {
    topPlayerAvatarIcon.className = isOnlineMatch ? 'fas fa-user' : 'fas fa-robot';
  }

  if (topPlayerName) {
    topPlayerName.textContent = isOnlineMatch
      ? `${i18n.t('players.opponent')} (${getShortColorLabel(getOnlineOpponentColor())})`
      : (showOfflineColorLabels
        ? `${getAiPersonaNameForHud()} (${getShortColorLabel(getLocalAiColor(gameState))})`
        : getAiPersonaNameForHud());
  }

  if (bottomPlayerName) {
    bottomPlayerName.textContent = isOnlineMatch
      ? `${i18n.t('players.you_online')} (${getShortColorLabel(myColor || COLORS.WHITE)})`
      : (showOfflineColorLabels
        ? `${i18n.t('players.you')} (${getShortColorLabel(getLocalPlayerColor(gameState))})`
        : i18n.t('players.you'));
  }

  if (topPlayerStatus) {
    topPlayerStatus.textContent = gameState?.analysisPractice?.enabled
      ? i18n.t('analysis.practice_mode')
      : (isOnlineMatch ? i18n.t('online.connected') : getOfflineTopStatusText());
  }

  if (boardRenderer?.syncTurnIndicator) {
    boardRenderer.syncTurnIndicator();
  } else if (turnIndicator) {
    turnIndicator.textContent = getTurnIndicatorText();
  }

  renderClockDisplay();
  syncAdvantageMeter(advantageContext);
}

function getAnalysisContext(preferredTab = null) {
  return {
    isOnlineMatch,
    myColor,
    playerColor: gameState?.playerColor || myColor || COLORS.WHITE,
    aiColor: gameState?.aiColor || getOppositeColor(gameState?.playerColor || COLORS.WHITE),
    isPracticeMode: Boolean(gameState?.analysisPractice?.enabled),
    allowPractice: true,
    preferredTab
  };
}

function closeGameEndResultOverlay() {
  gameEndResultOverlayElement?.classList.add('hidden');
}

function getGameEndPerspectiveColor(state = gameState) {
  if (!state) return COLORS.WHITE;
  if (state.onlineMatch?.enabled && myColor) return myColor;
  return getLocalPlayerColor(state);
}

function resolveGameEndResultType(state = gameState) {
  if (!state) return 'ongoing';
  if (state.resultType) return state.resultType;

  const lastMove = state.moveHistory?.[state.moveHistory.length - 1];
  if (lastMove?.resultType === 'checkmate') return 'checkmate';
  if (lastMove?.resultType === 'stalemate') return 'stalemate';
  if (lastMove?.resultType === 'royal_capture') return 'royal_capture';
  if (state.winner === 'Draw (Hisar)') return 'citadel_draw';
  if (state.checkmate) return 'checkmate';
  if (state.stalemate) return 'stalemate';
  if (state.winner && !(state.winner === COLORS.WHITE || state.winner === COLORS.BLACK)) return 'draw';
  return state.winner ? 'ongoing' : 'draw';
}

function getGameEndOutcome(state = gameState) {
  if (!state) return 'draw';

  const playerColor = getGameEndPerspectiveColor(state);
  const winner = state.winner;

  if (winner === COLORS.WHITE || winner === COLORS.BLACK) {
    return winner === playerColor ? 'win' : 'loss';
  }

  return 'draw';
}

function renderGameEndResultOverlay() {
  if (!gameState || !gameEndResultOverlayElement) return;

  const resultType = resolveGameEndResultType(gameState);
  const outcome = getGameEndOutcome(gameState);
  const badgeKey = `game_end.result.${outcome}`;
  const badgeClass = outcome === 'win' ? 'is-win' : (outcome === 'loss' ? 'is-loss' : 'is-draw');
  const buttonLabel = gameState.analysisStatus === 'loading'
    ? i18n.t('game_end.analysis_loading')
    : i18n.t('game_end.analysis');

  if (gameEndResultBadge) {
    gameEndResultBadge.textContent = i18n.t(badgeKey);
    gameEndResultBadge.classList.remove('is-win', 'is-loss', 'is-draw');
    gameEndResultBadge.classList.add(badgeClass);
  }

  if (gameEndResultTitle) {
    gameEndResultTitle.textContent = resultType === 'timeout_win'
      ? i18n.t(`game_end.reason.${resultType}`)
      : (gameAnalysisOverlay?._getResultLabel?.({
          winner: gameState.winner,
          resultType
        }) || i18n.t(`game_end.reason.${resultType}`));
  }

  if (gameEndResultSubtitle) {
    gameEndResultSubtitle.textContent = i18n.t(`game_end.reason.${resultType}`);
  }

  if (gameEndResultMetaMoves) {
    gameEndResultMetaMoves.textContent = `${i18n.t('analysis.move_count')}: ${gameState.moveHistory?.length || 0}`;
  }

  if (gameEndResultMetaSpecial) {
    gameEndResultMetaSpecial.textContent = `${i18n.t('analysis.special_count')}: ${countSpecialEvents(gameState?.moveHistory || [])}`;
  }

  if (btnGameEndAnalysis) {
    btnGameEndAnalysis.textContent = buttonLabel;
  }
}

function showGameEndResultOverlay() {
  if (!gameState || gameState.isScripted || !gameEndResultOverlayElement) return;
  renderGameEndResultOverlay();
  gameEndResultOverlayElement.classList.remove('hidden');
}

function closeGameAnalysisOverlay() {
  gameAnalysisOverlay?.hide();
}

function deepClone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function isAnalysisPracticeMode() {
  return Boolean(gameState?.analysisPractice?.enabled && analysisPracticeSession);
}

function isAnalysisPracticeExplanationVisible() {
  return Boolean(
    analysisPracticeExplanation
    && !analysisPracticeExplanation.classList.contains('hidden')
  );
}

function clearAnalysisPracticeSession() {
  analysisPracticeSession = null;
}

function formatPracticeBestMove(bestMove) {
  if (!bestMove) return '';

  const fromLabel = getCoordinateLabel(bestMove.fromRow, bestMove.fromCol);
  const toLabel = getCoordinateLabel(bestMove.toRow, bestMove.toCol);
  const pieceLabel = bestMove.pieceType
    ? i18n.t(`pieces.${bestMove.pieceType}.name`)
    : '';

  return pieceLabel
    ? `${pieceLabel}: ${fromLabel} -> ${toLabel}`
    : `${fromLabel} -> ${toLabel}`;
}

function hideAnalysisPracticeExplanation() {
  analysisPracticeExplanation?.classList.add('hidden');

  if (analysisPracticeBestMove) analysisPracticeBestMove.textContent = '';
  if (analysisPracticeTags) analysisPracticeTags.innerHTML = '';
  if (analysisPracticeReasons) analysisPracticeReasons.innerHTML = '';

  if (gameState?.analysisPractice) {
    gameState.analysisPractice.locked = false;
  }

  boardRenderer?.clearAnalysisHintMove();
}

function renderAnalysisPracticeExplanation() {
  if (!analysisPracticeSession?.analysisEntry || !analysisPracticeExplanation) return;

  const entry = analysisPracticeSession.analysisEntry;
  const explanation = getPracticeExplanationDetails(entry);
  const bestMoveLabel = formatPracticeBestMove(entry.bestMove);

  if (analysisPracticeBestMove) {
    analysisPracticeBestMove.textContent = i18n.t('analysis.explanation.best_move', {
      move: bestMoveLabel
    });
  }

  if (analysisPracticeTags) {
    const bestTags = entry.bestMove?.tags || [];
    analysisPracticeTags.innerHTML = bestTags.map((tag) => `
      <span class="analysis-tag">${i18n.t(`analysis.tag.${tag}`)}</span>
    `).join('');
  }

  if (analysisPracticeReasons) {
    analysisPracticeReasons.innerHTML = explanation.reasons.map((reason) => `
      <li>${i18n.t(reason.key, reason.params || {})}</li>
    `).join('');
  }

  if (gameState?.analysisPractice) {
    gameState.analysisPractice.locked = true;
  }

  boardRenderer?.showAnalysisHintMove(entry.bestMove);
  analysisPracticeExplanation.classList.remove('hidden');
  syncGameHud();
}

function syncBoardWithState(lastMove = null) {
  if (!boardRenderer || !gameState) return;

  boardRenderer.gameState = gameState;
  boardRenderer.moveValidator = new MoveValidator(gameState);
  boardRenderer.selectedCell = null;
  boardRenderer.validMoves = [];
  boardRenderer.lastMove = lastMove;
  boardRenderer.isAnimating = false;
  boardRenderer.setPerspective(getBoardPerspectiveColor(gameState));
  boardRenderer.render();
  syncGameHud();
}

function restoreFinishedGameFromPractice(reopenAnalysis = true) {
  if (!analysisPracticeSession) return;

  hideAnalysisPracticeExplanation();

  const restoredState = buildGameStateFromSnapshot(
    analysisPracticeSession.originalSnapshot,
    analysisPracticeSession.originalSnapshot?.difficulty || selectedDifficulty
  );
  restoredState.moveHistory = deepClone(analysisPracticeSession.originalMoveHistory);
  restoredState.analysisStatus = 'ready';
  restoredState.analysisReport = deepClone(analysisPracticeSession.originalReport);

  gameState = restoredState;
  applyOnlineMatchMetadata(gameState);
  syncBoardWithState(analysisPracticeSession.originalLastMove || null);
  clearAnalysisPracticeSession();

  if (reopenAnalysis) {
    openPostGameAnalysis(false, 'critical');
  }
}

function loadAnalysisPracticePosition(showPrompt = true) {
  if (!analysisPracticeSession) return;

  hideAnalysisPracticeExplanation();

  const practiceState = buildGameStateFromSnapshot(
    analysisPracticeSession.practiceSnapshot,
    analysisPracticeSession.practiceSnapshot?.difficulty || selectedDifficulty
  );
  practiceState.onlineMatch = null;
  practiceState.analysisPractice = {
    enabled: true,
    moveIndex: analysisPracticeSession.moveIndex,
    expectedMove: deepClone(analysisPracticeSession.expectedMove),
    locked: false
  };

  gameState = practiceState;
  syncBoardWithState(null);
  closeGameAnalysisOverlay();
  if (moveLogPanel) moveLogPanel.classList.add('hidden');

  if (showPrompt) {
    showToast(i18n.t('analysis.practice_prompt', { move: `#${analysisPracticeSession.moveIndex}` }), 3000);
  }
}

function startAnalysisPractice(moveIndex) {
  if (!gameState?.analysisReport) return;

  const analysisEntry = gameState.analysisReport.moves.find(entry => entry.index === moveIndex)
    || gameState.analysisReport.criticalMoments.find(entry => entry.index === moveIndex);

  if (!canPracticeAnalysisEntry(analysisEntry)) {
    showToast(i18n.t('analysis.practice_unavailable'));
    return;
  }

  const sourceMove = gameState.moveHistory.find(entry => entry.index === moveIndex);
  if (!sourceMove?.snapshots?.before) {
    showToast(i18n.t('analysis.practice_unavailable'));
    return;
  }

  analysisPracticeSession = {
    moveIndex,
    practiceSnapshot: deepClone(sourceMove.snapshots.before),
    expectedMove: deepClone(analysisEntry.bestMove),
    analysisEntry: deepClone(analysisEntry),
    originalSnapshot: serializeGameStateSnapshot(gameState),
    originalMoveHistory: deepClone(gameState.moveHistory),
    originalReport: deepClone(gameState.analysisReport),
    originalLastMove: boardRenderer?.lastMove ? deepClone(boardRenderer.lastMove) : null
  };

  analytics.track('analysis_practice_started', {
    entry_index: moveIndex,
    quality: analysisEntry?.quality || 'unknown'
  });

  loadAnalysisPracticePosition(true);
}

function handleAnalysisPracticeMove(moveRecord) {
  if (!analysisPracticeSession || !moveRecord) return;

  if (isMatchingExpectedMove(moveRecord, analysisPracticeSession.expectedMove)) {
    analytics.track('analysis_practice_solved', {
      entry_index: analysisPracticeSession.moveIndex,
      quality: analysisPracticeSession.analysisEntry?.quality || 'unknown'
    });
    showToast(i18n.t('analysis.practice_success'), 1800);
    renderAnalysisPracticeExplanation();
    return;
  }

  analytics.track('analysis_practice_failed', {
    entry_index: analysisPracticeSession.moveIndex,
    quality: analysisPracticeSession.analysisEntry?.quality || 'unknown'
  });
  hideAnalysisPracticeExplanation();
  showToast(i18n.t('analysis.practice_retry'), 1800);
  setTimeout(() => loadAnalysisPracticePosition(false), 850);
}

function resetAnalysisState() {
  stopGameClock();
  if (gameState) {
    gameState.analysisStatus = 'idle';
    gameState.analysisReport = null;
    gameState.analysisPromise = null;
  }
  hideAnalysisPracticeExplanation();
  clearAnalysisPracticeSession();
  closeGameEndResultOverlay();
  closeGameAnalysisOverlay();
}

function returnFinishedGameToMainMenu() {
  hideAnalysisPracticeExplanation();
  closeGameEndResultOverlay();
  closeGameAnalysisOverlay();
  closeGameSettingsMenu();
  clearAnalysisPracticeSession();
  showScreen(mainMenu);
  currentState = GAME_STATES.MENU;
  resetOnlineMatchState();
  if (boardRenderer) boardRenderer.clear();
  AdManager.showInterstitial();
}

async function preparePostGameAnalysis(force = false) {
  if (!gameState || gameState.isScripted) return null;

  const activeGameState = gameState;

  if (!force && activeGameState.analysisStatus === 'ready' && activeGameState.analysisReport) {
    return activeGameState.analysisReport;
  }

  if (!force && activeGameState.analysisStatus === 'loading') {
    return activeGameState.analysisPromise || null;
  }

  activeGameState.analysisStatus = 'loading';
  renderGameEndResultOverlay();
  activeGameState.analysisPromise = GameAnalysisEngine.analyzeGame(activeGameState.moveHistory, {
      winner: activeGameState.winner,
      resultType: activeGameState.resultType || null,
      status: activeGameState.status,
      checkmate: Boolean(activeGameState.checkmate),
      stalemate: Boolean(activeGameState.stalemate)
    })
    .then((report) => {
      if (gameState !== activeGameState) return null;

      activeGameState.analysisStatus = 'ready';
      activeGameState.analysisReport = report;
      saveCurrentMatchHistory(activeGameState);
      if (matchHistoryOverlay && !matchHistoryOverlay.classList.contains('hidden')) {
        renderMatchHistoryList();
      }
      void queueGameRecordUpload(activeGameState);
      analytics.track('analysis_generated', {
        mode: getGameModeForAnalytics(activeGameState),
        move_count: activeGameState.moveHistory.length,
        result_type: getAnalyticsResultType(report?.summary?.resultType || 'ongoing')
      });
      renderGameEndResultOverlay();
      return report;
    })
    .catch((error) => {
      console.error('Game analysis failed:', error);

      if (gameState !== activeGameState) return null;

      activeGameState.analysisStatus = 'error';
      renderGameEndResultOverlay();
      return null;
    })
    .finally(() => {
      if (gameState === activeGameState) {
        activeGameState.analysisPromise = null;
      }
    });

  return activeGameState.analysisPromise;
}

async function openPostGameAnalysis(force = false, preferredTab = 'summary') {
  if (!gameState || gameState.isScripted || !gameAnalysisOverlay) return;

  const context = getAnalysisContext(preferredTab);
  const activeGameState = gameState;

  if (!force && activeGameState.analysisStatus === 'ready' && activeGameState.analysisReport) {
    closeGameEndResultOverlay();
    gameAnalysisOverlay.showReport(activeGameState.analysisReport, context);
    void queueGameRecordUpload(activeGameState);
    analytics.track('analysis_viewed', {
      mode: getGameModeForAnalytics(activeGameState),
      move_count: activeGameState.moveHistory.length,
      result_type: getAnalyticsResultType(activeGameState.analysisReport?.summary?.resultType || 'ongoing')
    });
    analytics.track('analysis_tab_opened', {
      analysis_tab: preferredTab,
      result_type: getAnalyticsResultType(activeGameState.analysisReport?.summary?.resultType || 'ongoing'),
      move_count: activeGameState.moveHistory.length
    });
    return;
  }

  closeGameEndResultOverlay();
  gameAnalysisOverlay.showLoading(context);
  if (moveLogPanel) moveLogPanel.classList.add('hidden');

  const report = await preparePostGameAnalysis(force);
  if (gameState !== activeGameState) return;

  if (report) {
    gameAnalysisOverlay.showReport(report, context);
    analytics.track('analysis_viewed', {
      mode: getGameModeForAnalytics(activeGameState),
      move_count: activeGameState.moveHistory.length,
      result_type: getAnalyticsResultType(report?.summary?.resultType || 'ongoing')
    });
    analytics.track('analysis_tab_opened', {
      analysis_tab: preferredTab,
      result_type: getAnalyticsResultType(report?.summary?.resultType || 'ongoing'),
      move_count: activeGameState.moveHistory.length
    });
    return;
  }

  if (activeGameState.analysisStatus === 'error') {
    gameAnalysisOverlay.showError(i18n.t('analysis.error_desc'), context);
  }
}

function applyOnlineMatchMetadata(state) {
  state.onlineMatch = isOnlineMatch ? {
    enabled: true,
    localPlayerColor: myColor,
    isOpponentTurn: () => isOpponentTurn,
    isRemoteSimulation: () => isSimulatingRemoteMove
  } : null;
}

function normalizeCapturedPieces(snapshot) {
  return {
    [COLORS.WHITE]: (snapshot?.capturedPieces?.white || []).map(piece => ({ ...piece })),
    [COLORS.BLACK]: (snapshot?.capturedPieces?.black || []).map(piece => ({ ...piece }))
  };
}

function buildGameStateFromSnapshot(snapshot, difficulty = selectedDifficulty) {
  const state = new GameState(snapshot?.difficulty || difficulty);
  const rawPieces = snapshot?.pieces || snapshot?.board?.pieces || [];
  const pieceTuples = rawPieces.map(piece => [
    piece.type,
    piece.color,
    piece.row,
    piece.col,
    piece.pawnType || null
  ]);

  PieceFactory.setupPuzzleBoard(state.board, pieceTuples);

  rawPieces.forEach(pieceData => {
    const piece = state.board.getPieceAt(pieceData.row, pieceData.col);
    if (!piece) return;
    piece.hasMoved = !!pieceData.hasMoved;
    if (pieceData.stage != null) piece.stage = pieceData.stage;
    piece.isPromoted = !!pieceData.isPromoted;
  });

  state.currentTurn = snapshot?.currentTurn || COLORS.WHITE;
  state.status = snapshot?.status === 'playing' ? null : (snapshot?.status || null);
  state.winner = snapshot?.winner || null;
  state.checkmate = Boolean(snapshot?.checkmate);
  state.stalemate = Boolean(snapshot?.stalemate);
  state.ransomMoveUsed = {
    [COLORS.WHITE]: Boolean(snapshot?.ransomMoveUsed?.white),
    [COLORS.BLACK]: Boolean(snapshot?.ransomMoveUsed?.black)
  };
  state.citadelExchangeUsed = {
    [COLORS.WHITE]: Boolean(snapshot?.citadelExchangeUsed?.white),
    [COLORS.BLACK]: Boolean(snapshot?.citadelExchangeUsed?.black)
  };
  state.capturedPieces = normalizeCapturedPieces(snapshot);
  state.moveHistory = [];
  return state;
}

function syncOnlineSnapshot(snapshot) {
  if (!snapshot) return;

  gameState = buildGameStateFromSnapshot(snapshot, snapshot.difficulty || selectedDifficulty);
  applyOnlineMatchMetadata(gameState);

  if (!boardRenderer) return;

  boardRenderer.gameState = gameState;
  boardRenderer.moveValidator = new MoveValidator(gameState);
  boardRenderer.selectedCell = null;
  boardRenderer.validMoves = [];
  boardRenderer.lastMove = snapshot.lastMove || null;
  boardRenderer.isAnimating = false;
  boardRenderer.setPerspective(getBoardPerspectiveColor(gameState));
  boardRenderer.render();
  syncGameHud();
}

function setupSocketCallbacks() {
  if (!socketManager) return;

  socketManager.onConnectionClosed = ({ manual }) => {
    if (manual || !isOnlineMatch) return;
    analytics.track('online_disconnect', {
      phase: 'match',
      had_reconnect: false
    });
    alert('Bağlantı koptu. Ana menüye dönülüyor.');
    resetOnlineMatchState();
    showScreen(mainMenu);
    currentState = GAME_STATES.MENU;
  };


  socketManager.onRoomCreated = (payload) => {
    currentOnlineRoomCode = payload.joinCode;
    analytics.track('online_room_created', { mode: 'online' });
    if (onlineSetupContainer && onlineWaitingContainer && displayRoomCode) {
      onlineSetupContainer.classList.add('hidden');
      onlineWaitingContainer.classList.remove('hidden');
      displayRoomCode.innerText = payload.joinCode;
    }
    if (window.showToast) window.showToast('Oda kuruldu.', 3000);
  };

  socketManager.onRoomJoined = (payload) => {
    currentOnlineRoomCode = payload.joinCode;
    analytics.track('online_room_joined', { mode: 'online' });
    if (window.showToast) window.showToast('Odaya katildin. Oyun baslatiliyor...', 3000);
  };


  socketManager.onMatchStarted = (payload) => {
    onlineReconnectPending = false;
    isOnlineMatch = true;
    myColor = payload.color;
    isOpponentTurn = payload.snapshot ? payload.snapshot.currentTurn !== myColor : payload.color === COLORS.BLACK;
    currentOnlineRoomCode = payload.joinCode || currentOnlineRoomCode;
    syncGameHud();
    analytics.track('online_match_started', { local_color: payload.color });

    setTimeout(() => {
      startGame(
        payload.formation || FORMATIONS.MASCULINE,
        payload.difficulty || DIFFICULTY.MEDIUM,
        false,
        payload.snapshot || null
      );
    }, 250);
  };


  socketManager.onOpponentMoved = (payload) => {
    if (!boardRenderer || typeof payload.fromRow !== 'number') {
      if (payload.snapshot) {
        isOpponentTurn = payload.snapshot.currentTurn !== myColor;
        syncOnlineSnapshot(payload.snapshot);
      }
      return;
    }

    isSimulatingRemoteMove = true;
    isOpponentTurn = true;
    boardRenderer.handleCellClick(payload.fromRow, payload.fromCol);
    setTimeout(() => {
      boardRenderer.handleCellClick(payload.toRow, payload.toCol);
      setTimeout(() => {
        isSimulatingRemoteMove = false;
        if (payload.snapshot) {
          isOpponentTurn = payload.snapshot.currentTurn !== myColor;
          syncOnlineSnapshot(payload.snapshot);
        } else {
          isOpponentTurn = false;
          syncGameHud();
        }
      }, 450);
    }, 120);
  };

  socketManager.onOpponentDisconnected = (payload) => {
    analytics.track('online_disconnect', {
      phase: isOnlineMatch ? 'match' : 'lobby',
      had_reconnect: false
    });
    alert(payload?.message || 'Rakip oyundan ayrildi. Oda kapatildi.');
    resetOnlineMatchState();
    showScreen(mainMenu);
    currentState = GAME_STATES.MENU;
  };

  socketManager.onErrorMessage = (message) => {
    alert(message || 'Online baglanti hatasi.');
    if (window.showToast) window.showToast('Hata: ' + message, 4000);
  };
}

async function openOnlineMenu() {
  if (!socketManager) socketManager = new SocketManager();
  setupSocketCallbacks();
  
  if (onlineSetupContainer) onlineSetupContainer.classList.remove('hidden');
  if (onlineWaitingContainer) onlineWaitingContainer.classList.add('hidden');
  if (joinRoomCodeInput) joinRoomCodeInput.value = '';

  showScreen(onlineMenu);
}

function markScreenshotReady() {
  if (!screenshotMode.enabled) return;

  if (toast) {
    toast.classList.add('hidden');
  }

  document.body.dataset.screenshotReady = 'true';
  document.body.dataset.screenshotShot = screenshotMode.shot;
  window.__TIMUR_SCREENSHOT_READY__ = true;
}

async function runScreenshotScenario() {
  if (!screenshotMode.enabled) return;

  switch (screenshotMode.shot.toLowerCase()) {
    case 'formation':
      resetOnlineMatchState();
      showScreen(formationMenu);
      break;
    case 'tutorial':
      resetOnlineMatchState();
      showScreen(tutorialOverlay);
      loadLesson(getSavedLessonIndex());
      break;
    case 'puzzles':
      resetOnlineMatchState();
      showScreen(puzzlesOverlay);
      loadPuzzlesList();
      break;
    case 'online':
      resetOnlineMatchState();
      await openOnlineMenu();
      break;
    case 'online_waiting':
      resetOnlineMatchState();
      await openOnlineMenu();
      if (onlineSetupContainer && onlineWaitingContainer && displayRoomCode) {
        onlineSetupContainer.classList.add('hidden');
        onlineWaitingContainer.classList.remove('hidden');
        displayRoomCode.innerText = screenshotMode.roomCode;
      }
      break;
    case 'game':
      resetOnlineMatchState();
      await startGame(selectedFormation, selectedDifficulty, false);
      await waitMs(3400);
      break;
    case 'playlearn':
      resetOnlineMatchState();
      await startGame(FORMATIONS.MASCULINE, DIFFICULTY.EASY, true);
      await waitMs(1400);
      break;
    case 'main':
    default:
      resetOnlineMatchState();
      showScreen(mainMenu);
      break;
  }

  requestBoardScale();
  requestBoardScale(150);
  await waitMs(600);
  markScreenshotReady();
}

function init() {
  themeManager.applyAll();
  applyInitialLocale();
  analytics.setLanguage(i18n.getLocale());
  analytics.startSession('boot');
  analytics.track('app_open', { screen_name: 'boot' });
  lastMatchSetup = loadLastMatchSetup();
  renderAiBotCards();
  applySetupSelection(lastMatchSetup);
  updatePieceLetterToggleUI();
  updateAdvantageMeterToggleUI();
  updateThemeUI();
  syncGameHud();

  if (gameAnalysisOverlayElement) {
    gameAnalysisOverlay = new GameAnalysisOverlay(gameAnalysisOverlayElement, {
      onClose: () => closeGameAnalysisOverlay(),
      onMainMenu: () => returnFinishedGameToMainMenu(),
      onPractice: (moveIndex) => startAnalysisPractice(moveIndex),
      onTabChange: (tab, report) => {
        analytics.track('analysis_tab_opened', {
          analysis_tab: tab,
          result_type: getAnalyticsResultType(report?.summary?.resultType || 'ongoing'),
          move_count: gameState?.moveHistory?.length || 0
        });
      }
    });
  }

  setupEventListeners();
  setupNativeBackHandler();
  setupGlobalErrorTracking();
  setupLanguageSwitcher();
  AdManager.setAnalytics(analytics);
  AIEngine.setAnalytics(analytics);
  GameAnalysisEngine.setAnalytics(analytics);
  gameUploadService.start();
  if (!screenshotMode.enabled) {
    AdManager.initialize();
  }
  console.log(i18n.t('game.title') + ' Initialized');

  // Show onboarding for first-time users
  const onboarding = new OnboardingOverlay();
  if (!screenshotMode.enabled) {
    onboarding.show(() => {
      showScreen(mainMenu);
    });
  }

  // If onboarding was already completed, show menu immediately
  if (screenshotMode.enabled || !onboarding.shouldShow()) {
    showScreen(mainMenu);
  }

  runScreenshotScenario().catch(error => {
    console.error('Screenshot mode failed:', error);
  });
}

function setupLanguageSwitcher() {
  const langButtons = document.querySelectorAll('.lang-btn');
  const currentLocale = i18n.getLocale();

  // Set initial html lang attribute
  document.documentElement.lang = currentLocale;

  langButtons.forEach(btn => {
    if (btn.dataset.lang === currentLocale) btn.classList.add('active');

    btn.addEventListener('click', () => {
      langButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      i18n.setLocale(btn.dataset.lang);
      document.documentElement.lang = btn.dataset.lang;
      analytics.setLanguage(btn.dataset.lang);
      renderAiBotCards();
      updatePieceLetterToggleUI();
      if (currentState === GAME_STATES.PLAYING) {
        boardRenderer?.refreshVisualSettings();
      }
      syncGameHud();
      gameAnalysisOverlay?.refresh();
      if (gameEndResultOverlayElement && !gameEndResultOverlayElement.classList.contains('hidden')) {
        renderGameEndResultOverlay();
      }
      if (isAnalysisPracticeExplanationVisible()) {
        renderAnalysisPracticeExplanation();
      }
    });
  });
}

function setupNativeBackHandler() {
  App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      if (analytics.sessionStartedAt) return;
      analytics.startSession(currentState === GAME_STATES.PLAYING ? 'game_view' : 'main_menu');
      analytics.track('app_open', { screen_name: currentState === GAME_STATES.PLAYING ? 'game_view' : 'main_menu' });
      return;
    }

    analytics.endSession(currentState === GAME_STATES.PLAYING ? 'game_view' : 'main_menu');
  });

  App.addListener('backButton', ({ canGoBack }) => {
    if (gameEndResultOverlayElement && !gameEndResultOverlayElement.classList.contains('hidden')) {
      closeGameEndResultOverlay();
      return;
    }

    if (gameAnalysisOverlayElement && !gameAnalysisOverlayElement.classList.contains('hidden')) {
      closeGameAnalysisOverlay();
      return;
    }

    if (isAnalysisPracticeMode()) {
      restoreFinishedGameFromPractice(true);
      return;
    }

    if (gameSettingsOverlay && !gameSettingsOverlay.classList.contains('hidden')) {
      closeGameSettingsMenu();
      return;
    }

    if (currentState === GAME_STATES.PLAYING) {
      openGameSettingsMenu();
    } else if (currentState === GAME_STATES.MENU) {
      if (!formationMenu.classList.contains('hidden')) {
        showScreen(mainMenu);
      } else if (interactiveTutorialOverlay && !interactiveTutorialOverlay.classList.contains('hidden')) {
        showScreen(tutorialOverlay);
      } else if (!tutorialOverlay.classList.contains('hidden')) {
        showScreen(mainMenu);
      } else {
        App.exitApp();
      }
    } else {
      showScreen(mainMenu);
    }
  });
}

function setupGlobalErrorTracking() {
  window.addEventListener('error', () => {
    analytics.track('app_error', {
      scope: 'window',
      error_code: 'uncaught_error'
    });
  });

  window.addEventListener('unhandledrejection', () => {
    analytics.track('app_error', {
      scope: 'promise',
      error_code: 'unhandled_rejection'
    });
  });
}

function attachScriptedMatchToWindow() {
  // Attach showToast globally since BoardRenderer needs it for tutorial hints
  window.showToast = showToast;
}

function startMatchFromSetup(setup, toastKey = null) {
  const normalized = saveLastMatchSetup(setup);
  applySetupSelection(normalized);
  resetOnlineMatchState();
  if (toastKey) {
    showToast(i18n.t(toastKey), 1800);
  }
  startGame(normalized.formation, normalized.difficulty, false, null, {
    playerColor: normalized.playerColor,
    timeControl: normalized.timeControl,
    aiPersonaId: normalized.aiPersonaId,
    aiBotId: normalized.aiBotId
  });
}

function openBotOpponentMenu() {
  const lastBotId = isAIBotId(lastMatchSetup?.aiBotId) ? lastMatchSetup.aiBotId : null;
  pendingBotMenuId = isAIBotId(selectedAiBotId) ? selectedAiBotId : (lastBotId || getFirstBotMenuId());
  renderAiBotCards();
  selectBotMenuOpponent(pendingBotMenuId);
  showScreen(botMenu);
}

function startBotMatchFromMenu() {
  const botId = isAIBotId(pendingBotMenuId) ? pendingBotMenuId : getFirstBotMenuId();
  const bot = getAIBot(botId);

  startMatchFromSetup({
    ...getCurrentMatchSetup(),
    difficulty: bot.difficulty,
    aiPersonaId: bot.personaId,
    aiBotId: bot.id
  });
}

function formatHistoryDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString(i18n.getLocale() === 'en' ? 'en-US' : 'tr-TR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatHistoryAccuracy(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${Math.round(numeric)}%` : '-';
}

function getHistoryAnalysisLabel(summary = {}) {
  return [
    `${i18n.t('colors.white_short')} ${formatHistoryAccuracy(summary.whiteAccuracy)}`,
    `${i18n.t('colors.black_short')} ${formatHistoryAccuracy(summary.blackAccuracy)}`
  ].join(' - ');
}

function openStoredMatchAnalysis(record) {
  if (!gameAnalysisOverlay || !record?.analysisReport) return;

  const playerColor = record.playerColor || COLORS.WHITE;
  gameAnalysisOverlay.showReport(record.analysisReport, {
    isOnlineMatch: false,
    myColor: playerColor,
    playerColor,
    aiColor: record.aiColor || getOppositeColor(playerColor),
    allowPractice: false,
    isHistoryReport: true,
    preferredTab: 'summary'
  });

  analytics.track('analysis_viewed', {
    mode: 'history',
    move_count: record.moveCount || record.moves?.length || 0,
    result_type: getAnalyticsResultType(record.analysisReport?.summary?.resultType || record.resultType || 'ongoing')
  });
}

function renderMatchHistoryList() {
  if (!matchHistoryList) return;

  matchHistoryList.innerHTML = '';
  const records = getMatchHistoryRecords();

  if (!records.length) {
    const empty = document.createElement('p');
    empty.className = 'match-history-meta';
    empty.textContent = i18n.t('history.empty');
    matchHistoryList.appendChild(empty);
    return;
  }

  records.forEach((record) => {
    const card = document.createElement('article');
    card.className = 'match-history-card';

    const header = document.createElement('div');
    header.className = 'match-history-card-header';

    const titleWrap = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'match-history-title';
    title.textContent = record.resultLabel || i18n.t('analysis.result.ongoing');

    const meta = document.createElement('div');
    meta.className = 'match-history-meta';
    meta.textContent = [
      formatHistoryDate(record.finishedAt || record.createdAt),
      record.difficultyLabel || record.difficulty,
      record.playerColor ? `${i18n.t('player_color.title')}: ${getShortColorLabel(record.playerColor)}` : null,
      record.aiPersonaLabel ? `${i18n.t('history.ai_persona')}: ${record.aiPersonaLabel}` : null,
      `${i18n.t('history.time_control')}: ${getTimeControlLabel(record.timeControl)}`
    ].filter(Boolean).join(' - ');

    titleWrap.append(title, meta);

    const moveCountLabel = document.createElement('span');
    moveCountLabel.className = 'match-history-meta';
    moveCountLabel.textContent = `${i18n.t('history.move_count')}: ${record.moveCount || record.moves?.length || 0}`;

    header.append(titleWrap, moveCountLabel);
    card.appendChild(header);

    if (record.analysisSummary) {
      const analysisSummary = document.createElement('div');
      analysisSummary.className = 'match-history-analysis-summary';
      analysisSummary.textContent = `${i18n.t('history.analysis')}: ${getHistoryAnalysisLabel(record.analysisSummary)}`;
      card.appendChild(analysisSummary);
    }

    if (record.moves?.length) {
      const details = document.createElement('details');
      details.className = 'match-history-moves';
      const summary = document.createElement('summary');
      summary.textContent = i18n.t('history.moves');
      const moveText = document.createElement('p');
      moveText.textContent = record.moves
        .map((move) => `${move.index}. ${move.color === COLORS.BLACK ? i18n.t('colors.black_short') : i18n.t('colors.white_short')} ${move.notation}`)
        .join('  ');
      details.append(summary, moveText);
      card.appendChild(details);
    }

    const actions = document.createElement('div');
    actions.className = 'match-history-actions';
    if (record.analysisReport) {
      const analysisButton = document.createElement('button');
      analysisButton.type = 'button';
      analysisButton.className = 'btn secondary-btn';
      analysisButton.textContent = i18n.t('history.open_analysis');
      analysisButton.addEventListener('click', () => openStoredMatchAnalysis(record));
      actions.appendChild(analysisButton);
    }
    const rematchButton = document.createElement('button');
    rematchButton.type = 'button';
    rematchButton.className = 'btn secondary-btn';
    rematchButton.textContent = i18n.t('history.rematch');
    rematchButton.addEventListener('click', () => {
      startMatchFromSetup({
        formation: record.formation,
        difficulty: record.difficulty,
        playerColor: record.playerColor || COLORS.WHITE,
        timeControl: record.timeControl,
        aiPersonaId: record.aiPersonaId || DEFAULT_AI_PERSONA_ID,
        aiBotId: record.aiBotId || null
      }, 'toast.rematch_started');
    });
    actions.appendChild(rematchButton);
    card.appendChild(actions);

    matchHistoryList.appendChild(card);
  });
}

function openMatchHistoryOverlay() {
  renderMatchHistoryList();
  if (matchHistoryOverlay) {
    showScreen(matchHistoryOverlay);
  }
}

function startRematchFromCurrentGame() {
  const setup = sanitizeMatchSetup({
    formation: currentGameRecordMeta?.formation || gameState?.formation || selectedFormation,
    difficulty: gameState?.difficulty || currentGameRecordMeta?.difficulty || selectedDifficulty,
    playerColor: gameState?.playerColor || currentGameRecordMeta?.localColor || selectedPlayerColor,
    timeControl: gameState?.timeControl || currentGameRecordMeta?.timeControl || selectedTimeControl,
    aiPersonaId: gameState?.aiPersonaId || currentGameRecordMeta?.aiPersonaId || selectedAiPersonaId,
    aiBotId: gameState?.aiBotId || currentGameRecordMeta?.aiBotId || selectedAiBotId
  });

  closeGameEndResultOverlay();
  closeGameAnalysisOverlay();
  startMatchFromSetup(setup, 'toast.rematch_started');
}

function setupEventListeners() {
  attachScriptedMatchToWindow();

  // Main Menu
  btnQuickStart?.addEventListener('click', () => {
    audioManager.playClickSound();
    analytics.track('mode_selected', { mode: 'quick_start' });
    startMatchFromSetup(lastMatchSetup || loadLastMatchSetup(), 'toast.quick_start');
  });

  btnNewGame.addEventListener('click', () => {
    audioManager.playClickSound();
    resetOnlineMatchState();
    analytics.track('mode_selected', { mode: 'ai' });
    applySetupSelection({ ...(lastMatchSetup || loadLastMatchSetup()), aiBotId: null });
    showScreen(formationMenu);
  });

  btnTutorial.addEventListener('click', () => {
    audioManager.playClickSound();
    resetOnlineMatchState();
    analytics.track('mode_selected', { mode: 'tutorial' });
    analytics.track('tutorial_opened', { entry_point: 'main_menu' });
    showScreen(tutorialOverlay);
    loadLesson(getSavedLessonIndex());
  });

  if (btnPuzzles) {
    btnPuzzles.addEventListener('click', () => {
      audioManager.playClickSound();
      resetOnlineMatchState();
      analytics.track('mode_selected', { mode: 'puzzle' });
      showScreen(puzzlesOverlay);
      loadPuzzlesList();
    });
  }

  if (btnClosePuzzles) {
    btnClosePuzzles.addEventListener('click', () => {
      audioManager.playClickSound();
      showScreen(mainMenu);
    });
  }

  btnMatchHistory?.addEventListener('click', () => {
    audioManager.playClickSound();
    analytics.track('mode_selected', { mode: 'match_history' });
    openMatchHistoryOverlay();
  });

  btnCloseMatchHistory?.addEventListener('click', () => {
    audioManager.playClickSound();
    showScreen(mainMenu);
  });

  // Play & Learn (Scripted Match)
  btnInteractiveTutorial.addEventListener('click', () => {
    audioManager.playClickSound();
    resetOnlineMatchState();
    analytics.track('mode_selected', { mode: 'tutorial' });
    analytics.track('tutorial_opened', { entry_point: 'play_learn' });
    startGame(FORMATIONS.MASCULINE, DIFFICULTY.EASY, true);
  });

  // Global Button Sounds
  document.querySelectorAll('.btn, .back-btn, .close-btn, .card-btn').forEach(btn => {
    btn.addEventListener('click', () => audioManager.playClickSound());
  });

  btnOnline.addEventListener('click', () => {
    analytics.track('mode_selected', { mode: 'online' });
    openOnlineMenu();
  });

  privacyPolicyLink?.addEventListener('click', () => {
    analytics.track('privacy_policy_opened', { location: 'main_menu' });
  });

  btnOpenLicenses?.addEventListener('click', () => {
    audioManager.playClickSound();
    analytics.track('settings_opened', { screen_name: 'open_source_licenses' });
    showScreen(licensesOverlay);
  });

  [btnCloseLicenses, btnCloseLicensesSecondary].forEach((button) => {
    button?.addEventListener('click', () => {
      audioManager.playClickSound();
      showScreen(mainMenu);
    });
  });

  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('click', async () => {
      audioManager.playClickSound();
      try {
        await socketManager.createRoom({ formation: selectedFormation, difficulty: selectedDifficulty });
      } catch (error) {
        console.error('Online setup error:', error);
        alert('Sunucuya baglanilamadi. Adres: ' + socketManager.getServerUrl());
      }
    });
  }

  if (btnJoinRoom) {
    btnJoinRoom.addEventListener('click', async () => {
      audioManager.playClickSound();
      const joinCode = (joinRoomCodeInput.value || '').trim().toUpperCase();
      if (!joinCode) return;
      analytics.track('online_room_join_attempted', { mode: 'online' });
      try {
        await socketManager.joinRoom(joinCode);
      } catch (error) {
        console.error('Online setup error:', error);
        alert('Sunucuya baglanilamadi. Adres: ' + socketManager.getServerUrl());
      }
    });
  }

  if (btnBackOnlineMenu) {
    btnBackOnlineMenu.addEventListener('click', () => {
      audioManager.playClickSound();
      resetOnlineMatchState();
      showScreen(mainMenu);
    });
  }

  if (btnCopyCode) {
    btnCopyCode.addEventListener('click', async () => {
      audioManager.playClickSound();
      if (!currentOnlineRoomCode) return;
      try {
        await navigator.clipboard.writeText(currentOnlineRoomCode);
        const originalText = btnCopyCode.innerHTML;
        const successText = i18n.getLocale() === 'en' ? 'Copied!' : 'Kopyalandı!';
        btnCopyCode.innerHTML = `<i class="fas fa-check"></i> <span>${successText}</span>`;
        btnCopyCode.classList.add('success-flash');
        setTimeout(() => {
          btnCopyCode.innerHTML = originalText;
          btnCopyCode.classList.remove('success-flash');
        }, 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    });
  }

  if (btnShareCode) {
    btnShareCode.addEventListener('click', async () => {
      audioManager.playClickSound();
      if (!currentOnlineRoomCode) return;
      
      const shareTitle = i18n.getLocale() === 'en' ? 'Timur Chess - Join My Room' : 'Timurlenk Satrancı - Odaya Katıl';
      const shareText = i18n.getLocale() === 'en' 
        ? `Let's play Timur Chess! My room code is: ${currentOnlineRoomCode}`
        : `Timurlenk Satrancı oynayalım! Oda kodum: ${currentOnlineRoomCode}`;

      try {
        if (navigator.share) {
          await navigator.share({
            title: shareTitle,
            text: shareText
          });
        } else {
          // Fallback if Web Share API is not supported
          await navigator.clipboard.writeText(shareText);
          alert(i18n.getLocale() === 'en' ? 'Link copied to clipboard!' : 'Bağlantı panoya kopyalandı!');
        }
      } catch (err) {
        console.error('Share failed:', err);
      }
    });
  }
    // Removed the dangling if (socketManager) bracket logic since it belongs inside btnBackOnlineMenu.

  if (btnTogglePieceLetters) {
    btnTogglePieceLetters.addEventListener('click', () => {
      togglePieceLetters();
    });
  }

  if (btnToggleAdvantageMeter) {
    btnToggleAdvantageMeter.addEventListener('click', () => {
      toggleAdvantageMeterPreference();
    });
  }

  // Tahta teması seçici
  document.getElementById('board-theme-group')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-board-theme]');
    if (!btn) return;
    themeManager.setBoardTheme(btn.dataset.boardTheme);
    updateThemeUI();
    analytics.track('board_theme_changed', { theme: btn.dataset.boardTheme });
  });

  // Taş skin seçici
  document.getElementById('piece-skin-group')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-piece-skin]');
    if (!btn) return;
    themeManager.setPieceSkin(btn.dataset.pieceSkin);
    PieceRenderer.refreshAllPieces();
    updateThemeUI();
    analytics.track('piece_skin_changed', { skin: btn.dataset.pieceSkin });
  });

  if (btnCloseSettings) {
    btnCloseSettings.addEventListener('click', () => {
      closeGameSettingsMenu();
    });
  }

  if (btnCloseSettingsSecondary) {
    btnCloseSettingsSecondary.addEventListener('click', () => {
      closeGameSettingsMenu();
    });
  }

  if (btnReturnMainMenu) {
    btnReturnMainMenu.addEventListener('click', () => {
      confirmAndLeaveCurrentGame();
    });
  }

  if (gameSettingsOverlay) {
    gameSettingsOverlay.addEventListener('click', (event) => {
      if (event.target === gameSettingsOverlay) {
        closeGameSettingsMenu();
      }
    });
  }


  // Formation Menu
  btnBackMain.addEventListener('click', () => showScreen(mainMenu));

  btnOpenBotMenu?.addEventListener('click', () => {
    audioManager.playClickSound();
    analytics.track('mode_selected', { mode: 'ai_bot' });
    openBotOpponentMenu();
  });

  btnBackFormationFromBots?.addEventListener('click', () => {
    audioManager.playClickSound();
    pendingBotMenuId = null;
    showScreen(formationMenu);
  });

  formationCards.forEach(card => {
    card.addEventListener('click', () => {
      if (card.classList.contains('disabled')) return;

      formationCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedFormation = card.dataset.formation;
    });
  });

  // Difficulty Cards
  difficultyCards.forEach(card => {
    card.addEventListener('click', () => {
      difficultyCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedDifficulty = card.dataset.difficulty;
      selectAiBot('');
      analytics.track('difficulty_selected', { difficulty: selectedDifficulty });
    });
  });

  playerColorCards.forEach(card => {
    card.addEventListener('click', () => {
      playerColorCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPlayerColor = normalizePlayerColor(card.dataset.playerColor);
      analytics.track('player_color_selected', { player_color: selectedPlayerColor });
    });
  });

  aiPersonaCards.forEach(card => {
    card.addEventListener('click', () => {
      aiPersonaCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedAiPersonaId = isAIPersonaId(card.dataset.aiPersona) ? card.dataset.aiPersona : DEFAULT_AI_PERSONA_ID;
      selectAiBot('');
      analytics.track('ai_persona_selected', { ai_persona: selectedAiPersonaId });
    });
  });

  aiBotCardsContainer?.addEventListener('click', (event) => {
    const card = event.target.closest('.ai-bot-card');
    if (!card || !aiBotCardsContainer.contains(card)) return;
    selectBotMenuOpponent(card.dataset.aiBot || '');
  });

  aiBotCardsContainer?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('.ai-bot-card');
    if (!card || !aiBotCardsContainer.contains(card)) return;
    event.preventDefault();
    selectBotMenuOpponent(card.dataset.aiBot || '');
  });

  timeControlCards.forEach(card => {
    card.addEventListener('click', () => {
      timeControlCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTimeControl = card.dataset.timeControl || TIME_CONTROL_IDS.NONE;
      analytics.track('time_control_selected', { time_control: selectedTimeControl });
    });
  });

  btnStartMatch.addEventListener('click', () => {
    startMatchFromSetup({ ...getCurrentMatchSetup(), aiBotId: null });
  });

  btnStartBotMatch?.addEventListener('click', () => {
    audioManager.playClickSound();
    startBotMatchFromMenu();
  });

  // Game View
  btnGameMenu.addEventListener('click', () => {
    if (isAnalysisPracticeMode()) {
      restoreFinishedGameFromPractice(true);
      return;
    }

    if (gameState?.isGameOver?.() && !gameState.isScripted) {
      showGameEndResultOverlay();
      return;
    }

    openGameSettingsMenu();
  });

  btnCloseGameEndResult?.addEventListener('click', () => {
    closeGameEndResultOverlay();
  });

  btnGameEndAnalysis?.addEventListener('click', () => {
    openPostGameAnalysis(gameState?.analysisStatus === 'error');
  });

  btnGameEndRematch?.addEventListener('click', () => {
    startRematchFromCurrentGame();
  });

  btnGameEndMainMenu?.addEventListener('click', () => {
    returnFinishedGameToMainMenu();
  });

  gameEndResultOverlayElement?.addEventListener('click', (event) => {
    if (event.target === gameEndResultOverlayElement) {
      closeGameEndResultOverlay();
    }
  });

  // Tutorial Navigation
  btnCloseTutorial.addEventListener('click', () => showScreen(mainMenu));

  if (btnScriptedHint) {
    btnScriptedHint.addEventListener('click', () => {
      const lang = i18n.getLocale() === 'en' ? 'en' : 'tr';
      const hint = gameState?.scriptData?.hint?.[lang] || gameState?.scriptData?.hint?.tr;
      if (hint) showToast(hint, 4200);
    });
  }

  if (btnScriptedExit) {
    btnScriptedExit.addEventListener('click', () => {
      if (confirm(i18n.t('tutorial.coach.exit_confirm'))) {
        clearPendingAiTrigger(true);
        hideScriptedTutorialCoach();
        showScreen(tutorialOverlay);
        currentState = GAME_STATES.MENU;
        if (boardRenderer) boardRenderer.clear();
      }
    });
  }

  btnPrevLesson.addEventListener('click', () => {
    if (currentLesson > 0) loadLesson(currentLesson - 1);
  });

  btnNextLesson.addEventListener('click', () => {
    if (currentLesson < LESSONS.length - 1) loadLesson(currentLesson + 1);
  });

  if (btnToggleLog) {
    btnToggleLog.addEventListener('click', () => {
      if (moveLogPanel) moveLogPanel.classList.toggle('hidden');
    });
  }

  if (btnCloseLog) {
    btnCloseLog.addEventListener('click', () => {
      if (moveLogPanel) moveLogPanel.classList.add('hidden');
    });
  }

  if (btnPracticeReturnAnalysis) {
    btnPracticeReturnAnalysis.addEventListener('click', () => {
      restoreFinishedGameFromPractice(true);
    });
  }

  tutorialTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      loadLesson(parseInt(tab.dataset.lesson));
    });
  });

  // Listen for moves to trigger AI or Script progression, or Online Send
  document.addEventListener('pieceMoved', (e) => {
    if (gameState && currentState === GAME_STATES.PLAYING) {
      const detail = e.detail || {};

      if (isAnalysisPracticeMode()) {
        handleAnalysisPracticeMove(detail.moveRecord);
        return;
      }

      const shouldSendOnlineMove = isOnlineMatch && !isSimulatingRemoteMove && !isOpponentTurn && detail;

      // Oyuncu hamlesi: kendi turunda oynad?ysa rakibe yolla
      if (shouldSendOnlineMove) {
        const sent = socketManager?.sendMove(detail.fromRow, detail.fromCol, detail.toRow, detail.toCol);
        if (!sent) {
          isOpponentTurn = false;
          syncGameHud();
          alert('Hamle gonderilemedi. Bağlantı kopmuş olabilir.');
          return;
        }

        isOpponentTurn = true; // Sira karsi tarafa gecti
      }

      // Ba?ar? sesi - Bulmaca tamamland???nda
      if (gameState.isPuzzle && gameState.checkmate && gameState.currentTurn === COLORS.BLACK) {
        audioManager.playSuccessSound();
      }

      logMove(detail.moveRecord);

      if (hasClock(gameState.clock) && !gameState.isScripted) {
        if (detail.gameOver) {
          stopClock(gameState.clock);
        } else {
          switchClockAfterMove(gameState.clock, gameState.currentTurn, gameState.timeControl);
        }
        renderClockDisplay();

        if (gameState.clock?.expiredColor) {
          handleClockTimeout(gameState.clock.expiredColor);
          return;
        }
      }

      (detail.specialTags || [])
        .filter((tag) => ['royal_swap', 'citadel_exchange', 'pawn_cycle', 'promotion'].includes(tag))
        .forEach((tag) => {
          analytics.track('special_rule_used', {
            special_rule: tag,
            color: detail.moveRecord?.color || null,
            move_index: detail.moveRecord?.index || 0
          });
        });

      syncGameHud({ moveDetail: detail });

      if (detail.gameOver && !gameState.isScripted) {
        finalizeCurrentGame({
          winner: detail.winner,
          resultType: detail.resultType,
          analysisReady: false
        });
        return;
      }

      if (gameState.isScripted) {
        handleScriptedMoveSequence();
      } else if (!shouldSendOnlineMove) {
        checkAndTriggerAI();
      }
    }
  });
}

function getCoordinate(r, c) {
  if (c === -1 && r === 0) return 'HS'; // Hisar Siyah
  if (c === 11 && r === 9) return 'HB'; // Hisar Beyaz
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'];
  return `${files[c]}${10 - r}`;
}

function logMove(moveRecord) {
  if (!moveList) return;
  if (!moveRecord) return;

  const moveStr = `${moveRecord.from.label} &rarr; ${moveRecord.to.label}`;
  const li = document.createElement('li');
  li.className = 'move-item';
  const isWhite = moveRecord.color === COLORS.WHITE;
  const displayColor = isWhite ? 'var(--text-light)' : 'var(--danger)';
  const pieceColorName = isWhite ? (i18n.getLocale() === 'en' ? 'W' : 'B') : (i18n.getLocale() === 'en' ? 'B' : 'S');
  const specialSuffix = moveRecord.specialTags?.length
    ? ` <span style="opacity:0.7;font-size:0.78em;">[${moveRecord.specialTags.map(tag => i18n.t(`analysis.tag.${tag}`)).join(', ')}]</span>`
    : '';

  li.innerHTML = `<span style="opacity:0.6;font-size:0.8em;margin-right:8px;">${moveCount}.</span> <strong style="color:${displayColor}">${pieceColorName}</strong>: ${moveStr}${specialSuffix}`;
  moveList.appendChild(li);

  const logContent = moveList.parentElement;
  logContent.scrollTop = logContent.scrollHeight;
  moveCount++;
}

function handleScriptedMoveSequence() {
  const stepCount = SCRIPTED_MATCH.length;

  // If it's Black's turn during scripted match, execute AI predetermined move
  if (gameState.currentTurn === COLORS.BLACK) {
    const currentStep = SCRIPTED_MATCH[gameState.scriptStep];

    if (currentStep.aiMove) {
      setTimeout(() => {
        const from = currentStep.aiMove.from;
        const to = currentStep.aiMove.to;

        // Select piece programmatically
        boardRenderer.handleCellClick(from.row, from.col);

        // Execute move programmatically after slight delay to simulate thinking
        setTimeout(() => {
          boardRenderer.handleCellClick(to.row, to.col);

          // Increment script step AFTER AI has finished its move and turn switches back to white
          gameState.scriptStep++;
          if (gameState.scriptStep < stepCount) {
            gameState.scriptData = SCRIPTED_MATCH[gameState.scriptStep];
            // Delay guiding the new step until board settles
            setTimeout(() => {
              boardRenderer.guideScriptedMatch(gameState.scriptData, { announce: false });
              updateScriptedTutorialCoach(gameState.scriptData);
            }, 600);
          }
        }, 400);

      }, 800);
    }
  } else if (gameState.currentTurn === COLORS.WHITE) {
    // Check if we reached the end of the script (Player made the final move)
    if (gameState.scriptStep === stepCount - 1 && !SCRIPTED_MATCH[gameState.scriptStep].aiMove) {
      const finalMsg = SCRIPTED_MATCH[gameState.scriptStep].successMessage;
      const lang = i18n.getLocale() === 'en' ? 'en' : 'tr';

      setTimeout(() => {
        analytics.track('tutorial_completed', { lesson_id: 'interactive_tutorial' });
        updateScriptedTutorialCoach(SCRIPTED_MATCH[gameState.scriptStep], {
          completed: true,
          message: finalMsg[lang] || finalMsg['tr']
        });
        showToast(i18n.t('tutorial.coach.completed'), 3200);
        showScreen(mainMenu);
        currentState = GAME_STATES.MENU;
        hideScriptedTutorialCoach();
        if (boardRenderer) boardRenderer.clear();
      }, 2400);
    }
  }
}

function checkAndTriggerAI() {
  const aiColor = gameState?.aiColor || COLORS.BLACK;
  if (!gameState || isOnlineMatch || gameState.currentTurn !== aiColor || gameState.isScripted || gameState.isGameOver?.()) return;
  clearPendingAiTrigger();
  syncGameHud();

  pendingAiMoveTimeout = setTimeout(() => {
    pendingAiMoveTimeout = null;
    if (boardRenderer && gameState.currentTurn === aiColor && !gameState.isGameOver?.() && currentState === GAME_STATES.PLAYING) {
      AIEngine.makeMove(gameState, boardRenderer);
    }
  }, 500);
}

function showScreen(screenElement) {
  mainMenu.classList.add('hidden');
  formationMenu.classList.add('hidden');
  if (botMenu) botMenu.classList.add('hidden');
  gameView.classList.add('hidden');
  if (gameAnalysisOverlayElement) gameAnalysisOverlayElement.classList.add('hidden');
  if (gameEndResultOverlayElement) gameEndResultOverlayElement.classList.add('hidden');
  if (gameSettingsOverlay) gameSettingsOverlay.classList.add('hidden');
  tutorialOverlay.classList.add('hidden');
  if (interactiveTutorialOverlay) interactiveTutorialOverlay.classList.add('hidden');
  if (puzzlesOverlay) puzzlesOverlay.classList.add('hidden');
  if (matchHistoryOverlay) matchHistoryOverlay.classList.add('hidden');
  if (licensesOverlay) licensesOverlay.classList.add('hidden');
  if (onlineMenu) onlineMenu.classList.add('hidden');

  screenElement.classList.remove('hidden');

  if (screenElement !== gameView || !gameState?.isScripted) {
    hideScriptedTutorialCoach();
  }

  if (screenElement === mainMenu) {
    analytics.track('main_menu_viewed', { screen_name: 'main_menu' });
  }
}

export function showToast(message, duration = 3000) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), duration);
}

async function startGame(formation, difficulty, isScripted = false, onlineSnapshot = null, options = {}) {
  console.log(`Starting game: formation=${formation}, difficulty=${difficulty}, scripted=${isScripted}`);
  clearPendingAiTrigger(true);
  hideAnalysisPracticeExplanation();
  resetAnalysisState();
  resetAdvantageMeterState();
  
  if (boardRenderer) {
      boardRenderer.clear();
  }
  
  currentState = GAME_STATES.PLAYING;
  currentGameStartedAt = Date.now();
  currentPuzzleId = null;
  currentPuzzleAttemptCount = 0;
  showScreen(gameView);

  const isOnlineStart = Boolean(isOnlineMatch || onlineSnapshot);
  const localColor = isOnlineStart
    ? (myColor || onlineSnapshot?.playerColor || COLORS.WHITE)
    : (isScripted ? COLORS.WHITE : normalizePlayerColor(options.playerColor || selectedPlayerColor));
  const aiColor = isOnlineStart || isScripted ? null : getOppositeColor(localColor);
  const mode = isOnlineStart ? 'online' : (isScripted ? 'tutorial' : 'ai');
  const requestedAiBotId = options.aiBotId ?? selectedAiBotId;
  const activeAiBot = isScripted || isOnlineStart || !isAIBotId(requestedAiBotId)
    ? null
    : getAIBot(requestedAiBotId);
  const effectiveDifficulty = activeAiBot?.difficulty || difficulty;
  const activeTimeControl = isScripted || isOnlineStart
    ? TIME_CONTROL_IDS.NONE
    : getTimeControl(options.timeControl || selectedTimeControl).id;
  const activeAiPersonaId = isScripted || isOnlineStart
    ? null
    : (activeAiBot?.personaId || getAIPersona(options.aiPersonaId || selectedAiPersonaId).id);
  analytics.track('game_started', {
    mode,
    difficulty: effectiveDifficulty,
    ai_persona: activeAiPersonaId || 'none',
    ...(activeAiBot ? {
      ai_bot_id: activeAiBot.id,
      ai_bot_level: activeAiBot.level,
      ai_bot_stars: activeAiBot.stars
    } : {}),
    local_color: localColor,
    ai_color: aiColor || 'none',
    is_online: isOnlineStart,
    is_scripted: Boolean(isScripted),
    time_control: activeTimeControl
  });

  currentGameRecordMeta = createGameRecordMeta({
    mode,
    difficulty: effectiveDifficulty,
    formation,
    aiPersonaId: activeAiPersonaId,
    aiBotId: activeAiBot?.id || null,
    aiBotLevel: activeAiBot?.level || null,
    aiBotStars: activeAiBot?.stars || null,
    isOnline: isOnlineStart,
    isScripted,
    isPuzzle: false,
    timeControl: activeTimeControl,
    localColor,
    aiColor,
    recordedBy: isOnlineStart
      ? (localColor === COLORS.WHITE ? 'host' : 'guest')
      : 'local_player'
  });

  const diffLabels = { easy: i18n.t('difficulty.easy'), medium: i18n.t('difficulty.medium'), hard: i18n.t('difficulty.hard') };
  showToast(isScripted ? i18n.t('toast.tutorial_started') : i18n.t('toast.game_started', { level: diffLabels[effectiveDifficulty] || i18n.t('difficulty.medium') }));

  moveCount = 1;
  if (moveList) moveList.innerHTML = '';
  if (moveLogPanel) moveLogPanel.classList.add('hidden');

  // Initialize Game Logic with difficulty
  gameState = onlineSnapshot
    ? buildGameStateFromSnapshot(onlineSnapshot, effectiveDifficulty)
    : await GameState.createInitialState(formation);
  gameState.formation = formation;
  gameState.difficulty = effectiveDifficulty;
  gameState.aiPersonaId = activeAiPersonaId;
  gameState.aiBotId = activeAiBot?.id || null;
  gameState.aiBotLevel = activeAiBot?.level || null;
  gameState.aiBotStars = activeAiBot?.stars || null;
  gameState.playerColor = localColor;
  gameState.aiColor = aiColor;
  gameState.isScripted = isScripted;
  gameState.timeControl = activeTimeControl;
  gameState.clock = createClockState(activeTimeControl, gameState.currentTurn);
  gameState.matchFinalized = false;
  gameState.resultType = null;
  gameState.analysisStatus = 'idle';
  gameState.analysisReport = null;
  gameState.analysisPromise = null;
  applyOnlineMatchMetadata(gameState);

  if (isScripted && SCRIPTED_MATCH.length > 0) {
    setupScriptedMatchBoard(gameState.board);
    gameState.scriptStep = 0;
    gameState.scriptData = SCRIPTED_MATCH[0];
  }

  // Initialize UI Renderer
  const boardContainer = document.getElementById('chess-board');
  boardRenderer = new BoardRenderer(boardContainer, gameState);
  boardRenderer.setPerspective(getBoardPerspectiveColor(gameState));
  boardRenderer.render();
  syncGameHud();
  startClockTicker();

  // Setup dynamic scaling
  setupBoardScaling();

  // Start tutorial sequence if needed
  if (isScripted) {
    setTimeout(() => {
      if (boardRenderer && gameState.scriptData) {
        boardRenderer.guideScriptedMatch(gameState.scriptData, { announce: false });
        updateScriptedTutorialCoach(gameState.scriptData);
      }
    }, 1000);
  } else {
    hideScriptedTutorialCoach();
    // Standard game: trigger AI if it starts as Black
    checkAndTriggerAI();
  }
}

function loadPuzzlesList() {
  if (!puzzleList) return;
  puzzleList.innerHTML = '';
  const lang = i18n.getLocale();
  PUZZLES.forEach((puzzle, index) => {
    const div = document.createElement('div');
    div.className = 'card';
    div.style.marginBottom = '15px';
    div.style.padding = '15px';
    div.style.textAlign = 'left';

    const title = puzzle.title[lang] || puzzle.title['tr'];
    const desc = puzzle.description[lang] || puzzle.description['tr'];
    const btnText = lang === 'en' ? 'Start Solving' : '\u00C7\u00F6zmeye Ba\u015Fla';

    div.innerHTML = `
            <h3 style="margin-top:0; color:var(--text-light); font-size:1.1rem;">${index + 1}. ${title}</h3>
            <p style="color:var(--text-muted); font-size:0.9rem; margin:10px 0;">${desc}</p>
            <button class="btn secondary-btn" style="width:100%;">${btnText}</button>
        `;
    div.querySelector('button').addEventListener('click', () => {
      startPuzzle(puzzle);
    });
    puzzleList.appendChild(div);
  });
}

async function startPuzzle(puzzleData) {
  const lang = i18n.getLocale();
  const title = puzzleData.title[lang] || puzzleData.title['tr'];
  console.log(`Starting puzzle: ${title}`);
  clearPendingAiTrigger(true);
  resetAnalysisState();
  resetAdvantageMeterState();

  if (boardRenderer) {
      boardRenderer.clear();
  }
  
  currentState = GAME_STATES.PLAYING;
  currentGameStartedAt = Date.now();
  currentPuzzleId = puzzleData?.id || 'unknown';
  currentPuzzleAttemptCount = 1;
  showScreen(gameView);

  const toastMsg = lang === 'en' ? `Puzzle: ${title}` : `Bulmaca: ${title}`;
  showToast(toastMsg);
  analytics.track('puzzle_started', { puzzle_id: currentPuzzleId });
  currentGameRecordMeta = createGameRecordMeta({
    mode: 'puzzle',
    difficulty: 'hard',
    formation: 'puzzle',
    isOnline: false,
    isScripted: false,
    isPuzzle: true,
    timeControl: TIME_CONTROL_IDS.NONE,
    localColor: COLORS.WHITE,
    recordedBy: 'local_player'
  });

  moveCount = 1;
  if (moveList) moveList.innerHTML = '';
  if (moveLogPanel) moveLogPanel.classList.add('hidden');

  // Load state and wait for piece initialization
  gameState = await GameState.createPuzzleState(puzzleData);
  gameState.difficulty = 'hard';
  gameState.formation = 'puzzle';
  gameState.timeControl = TIME_CONTROL_IDS.NONE;
  gameState.clock = createClockState(TIME_CONTROL_IDS.NONE, gameState.currentTurn);
  gameState.matchFinalized = false;
  gameState.onlineMatch = null;
  gameState.analysisStatus = 'idle';
  gameState.analysisReport = null;
  gameState.analysisPromise = null;

  const boardContainer = document.getElementById('chess-board');
  boardRenderer = new BoardRenderer(boardContainer, gameState);
  boardRenderer.render();
  syncGameHud();
  setupBoardScaling();

  // Trigger AI if it starts as Black in Puzzle
  checkAndTriggerAI();
}

function scaleBoardToContainer() {
  boardScaleFrame = 0;

  const containerEl = document.querySelector('.board-container');
  if (!containerEl) return;

  const boardEl = document.getElementById('chess-board');
  clearBoardInlineTransformForPerspective(boardEl);

  const availableWidth = containerEl.clientWidth - 4;
  const availableHeight = containerEl.clientHeight - 4;

  if (availableWidth <= 0 || availableHeight <= 0) return;

  const rootStyles = getComputedStyle(document.documentElement);
  const citadelSpan = Number.parseFloat(rootStyles.getPropertyValue('--citadel-span')) || 1;
  const horizontalBoardSpan = 11 + (Math.max(0.5, citadelSpan) * 2);
  const maxCellWidth = availableWidth / horizontalBoardSpan;
  const maxCellHeight = availableHeight / 10;
  let cellSize = Math.min(maxCellWidth, maxCellHeight);
  cellSize = Math.max(cellSize, 20);

  document.documentElement.style.setProperty('--cell-size', `${cellSize}px`);
}

function requestBoardScale(delay = 0) {
  const runScale = () => {
    if (boardScaleFrame) cancelAnimationFrame(boardScaleFrame);
    boardScaleFrame = requestAnimationFrame(scaleBoardToContainer);
  };

  if (delay > 0) {
    clearTimeout(boardScaleFollowUpTimeout);
    boardScaleFollowUpTimeout = setTimeout(runScale, delay);
    return;
  }

  runScale();
}

function setupBoardScaling() {
  if (!boardScaleHandlerInitialized) {
    window.addEventListener('resize', () => {
      clearTimeout(boardScaleResizeTimeout);
      boardScaleResizeTimeout = setTimeout(() => requestBoardScale(), 50);
    });
    boardScaleHandlerInitialized = true;
  }

  requestBoardScale();
  requestBoardScale(100);
}

function loadLesson(index) {
  currentLesson = index;
  saveLessonIndex(index);
  const lang = i18n.getLocale();
  const lesson = LESSONS[index];
  const contentEl = document.getElementById('tutorial-content');
  const counterEl = document.getElementById('lesson-counter');

  // Update tab active state
  tutorialTabs.forEach(tab => {
    tab.classList.toggle('active', parseInt(tab.dataset.lesson) === index);
  });

  const title = lesson.title[lang] || lesson.title['tr'];
  const content = lesson.content[lang] || lesson.content['tr'];
  const hasGuideCards = content.includes('piece-guide-grid');

  // Render lesson content
  contentEl.innerHTML = `
    <div class="tutorial-quick-actions">
      <div class="tutorial-action-card">
        <strong>${i18n.t('tutorial.actions.mini_lessons')}</strong>
        <p>${i18n.t('tutorial.actions.mini_desc')}</p>
        <button class="btn secondary-btn" data-tutorial-action="mini">${i18n.t('tutorial.actions.mini_lessons')}</button>
      </div>
      <div class="tutorial-action-card">
        <strong>${i18n.t('tutorial.actions.scripted_match')}</strong>
        <p>${i18n.t('tutorial.actions.scripted_desc')}</p>
        <button class="btn primary-btn" data-tutorial-action="scripted">${i18n.t('tutorial.actions.scripted_match')}</button>
      </div>
    </div>
    <h3 class="lesson-title">${title}</h3>
    <div class="lesson-body">${content}</div>
    ${lesson.diagram && !hasGuideCards ? `<div class="lesson-diagram">${lesson.diagram}</div>` : ''}
  `;

  contentEl.querySelector('[data-tutorial-action="mini"]')?.addEventListener('click', () => {
    openInteractiveTutorialScreen();
  });

  contentEl.querySelector('[data-tutorial-action="scripted"]')?.addEventListener('click', () => {
    analytics.track('tutorial_opened', { entry_point: 'guide_scripted_match' });
    startGame(FORMATIONS.MASCULINE, DIFFICULTY.EASY, true);
  });

  counterEl.textContent = `${index + 1} / ${LESSONS.length}`;

  // Disable nav buttons at edges
  btnPrevLesson.disabled = index === 0;
  btnNextLesson.disabled = index === LESSONS.length - 1;
}

// Start app
document.addEventListener('DOMContentLoaded', init);
