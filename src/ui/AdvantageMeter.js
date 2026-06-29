import { evaluateStateForBlack } from '../ai/AiEvaluation.js';
import { COLORS } from '../utils/constants.js';

const SCORE_UNIT = 100;
const SCORE_NORMALIZER = 650;
const MIN_SHARE = 4;
const MAX_SHARE = 96;
const BALANCED_THRESHOLD = 25;
const SLIGHT_THRESHOLD = 120;
const CLEAR_THRESHOLD = 300;
const IMPACT_THRESHOLD = 12;

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function resolveTerminalScore(state) {
    if (!state?.winner) return null;
    if (state.winner === COLORS.BLACK) return 10000;
    if (state.winner === COLORS.WHITE) return -10000;
    return 0;
}

export function calculateAdvantageMeter(scoreForBlack = 0) {
    const safeScore = Number.isFinite(scoreForBlack) ? scoreForBlack : 0;
    const normalized = Math.tanh(safeScore / SCORE_NORMALIZER);
    const blackShare = clamp(50 + (normalized * 50), MIN_SHARE, MAX_SHARE);
    const whiteShare = 100 - blackShare;
    const absScore = Math.abs(safeScore);
    const leader = absScore < BALANCED_THRESHOLD
        ? 'balanced'
        : (safeScore > 0 ? COLORS.BLACK : COLORS.WHITE);

    let tier = 'balanced';
    if (leader !== 'balanced') {
        if (absScore >= CLEAR_THRESHOLD) tier = 'winning';
        else if (absScore >= SLIGHT_THRESHOLD) tier = 'clear';
        else tier = 'slight';
    }

    return {
        scoreForBlack: safeScore,
        leader,
        tier,
        blackShare,
        whiteShare,
        displayScore: absScore / SCORE_UNIT
    };
}

export function getAdvantageModelForState(state, profileInput = 'medium') {
    const terminalScore = resolveTerminalScore(state);
    const scoreForBlack = terminalScore ?? evaluateStateForBlack(state, profileInput || state?.difficulty || 'medium');
    return calculateAdvantageMeter(scoreForBlack);
}

export function calculateMoveImpact(previousScoreForBlack, currentScoreForBlack, movedColor) {
    if (!Number.isFinite(previousScoreForBlack) || !Number.isFinite(currentScoreForBlack)) return null;
    if (![COLORS.WHITE, COLORS.BLACK].includes(movedColor)) return null;

    const rawForMover = movedColor === COLORS.BLACK
        ? currentScoreForBlack - previousScoreForBlack
        : previousScoreForBlack - currentScoreForBlack;

    const absRaw = Math.abs(rawForMover);
    const direction = absRaw < IMPACT_THRESHOLD
        ? 'neutral'
        : (rawForMover > 0 ? 'good' : 'bad');

    return {
        movedColor,
        direction,
        rawForMover,
        displayValue: Math.abs(rawForMover) / SCORE_UNIT
    };
}

function getAdvantageText(model, translate, getColorLabel) {
    const t = typeof translate === 'function' ? translate : (key) => key;
    if (model.leader === 'balanced') return t('advantage.balanced');

    const colorName = typeof getColorLabel === 'function'
        ? getColorLabel(model.leader)
        : (model.leader === COLORS.BLACK ? 'Black' : 'White');
    const tierText = t(`advantage.${model.tier}`);
    return `${colorName} ${tierText}`;
}

function formatImpactText(impact, translate) {
    if (!impact) return '';
    const t = typeof translate === 'function' ? translate : (key) => key;
    const label = impact.label || t('advantage.last_move');
    if (impact.direction === 'neutral') return `${label} 0.0`;
    const sign = impact.direction === 'good' ? '+' : '-';
    return `${label} ${sign}${impact.displayValue.toFixed(1)}`;
}

export function updateAdvantageMeter(elements, state, options = {}) {
    const { meter, blackFill, whiteFill, score, label, impact } = elements || {};
    if (!meter || !blackFill || !whiteFill || !score || !label) return null;

    const isVisible = Boolean(options.visible && state?.board?.pieces?.length);
    meter.classList.toggle('hidden', !isVisible);
    meter.setAttribute('aria-hidden', String(!isVisible));

    if (!isVisible) return null;

    const model = options.model || getAdvantageModelForState(state, options.profileInput || state?.difficulty || 'medium');

    blackFill.style.height = `${model.blackShare}%`;
    whiteFill.style.height = `${model.whiteShare}%`;
    meter.dataset.leader = model.leader;
    meter.dataset.tier = model.tier;

    score.textContent = model.leader === 'balanced'
        ? '0.0'
        : `+${model.displayScore.toFixed(1)}`;
    label.textContent = getAdvantageText(model, options.translate, options.getColorLabel);
    const title = typeof options.translate === 'function' ? options.translate('advantage.title') : 'Advantage';

    if (impact) {
        const moveImpact = options.moveImpact || null;
        impact.textContent = formatImpactText(moveImpact, options.translate);
        impact.classList.toggle('hidden', !moveImpact);
        impact.classList.toggle('is-good', moveImpact?.direction === 'good');
        impact.classList.toggle('is-bad', moveImpact?.direction === 'bad');
        impact.classList.toggle('is-neutral', moveImpact?.direction === 'neutral');
        meter.dataset.impact = moveImpact?.direction || 'none';
    }

    const impactText = impact && !impact.classList.contains('hidden') ? `, ${impact.textContent}` : '';
    meter.setAttribute('aria-label', `${title}: ${label.textContent} ${score.textContent}${impactText}`);

    return model;
}
