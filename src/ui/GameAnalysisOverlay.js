import { COLORS } from '../utils/constants.js';
import { getCoordinateLabel } from '../analysis/AnalysisSerialization.js';
import { i18n } from '../utils/i18n.js';
import { ANALYSIS_TABS, DEFAULT_ANALYSIS_TAB, resolveAnalysisTab } from './analysisTabs.js';

export class GameAnalysisOverlay {
    constructor(rootElement, { onClose, onMainMenu, onPractice, onTabChange } = {}) {
        this.rootElement = rootElement;
        this.contentElement = rootElement?.querySelector('#game-analysis-content') || null;
        this.onClose = onClose || (() => {});
        this.onMainMenu = onMainMenu || (() => {});
        this.onPractice = onPractice || (() => {});
        this.onTabChange = onTabChange || (() => {});
        this.report = null;
        this.context = null;
        this.activeTab = DEFAULT_ANALYSIS_TAB;

        this.closeButton = rootElement?.querySelector('#btn-close-analysis') || null;
        this.returnBoardButton = rootElement?.querySelector('#btn-analysis-return-board') || null;
        this.mainMenuButton = rootElement?.querySelector('#btn-analysis-main-menu') || null;

        this._bindEvents();
    }

    _bindEvents() {
        this.closeButton?.addEventListener('click', () => this.onClose());
        this.returnBoardButton?.addEventListener('click', () => this.onClose());
        this.mainMenuButton?.addEventListener('click', () => this.onMainMenu());
        this.rootElement?.addEventListener('click', (event) => {
            if (event.target === this.rootElement) {
                this.onClose();
            }
        });
    }

    showLoading(context = {}) {
        this._applyContext(context);
        this.report = null;
        this.rootElement?.classList.remove('hidden');
        this._resetScroll();

        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="analysis-loading">
                <div class="analysis-spinner"></div>
                <h3>${i18n.t('analysis.loading')}</h3>
                <p>${i18n.t('analysis.loading_desc')}</p>
            </div>
        `;
    }

    showError(message, context = {}) {
        this._applyContext(context);
        this.report = null;
        this.rootElement?.classList.remove('hidden');
        this._resetScroll();

        if (!this.contentElement) return;

        this.contentElement.innerHTML = `
            <div class="analysis-loading">
                <h3>${i18n.t('analysis.error')}</h3>
                <p>${message}</p>
            </div>
        `;
    }

    showReport(report, context = {}) {
        this.report = report;
        this._applyContext(context);
        this.rootElement?.classList.remove('hidden');
        this._resetScroll();
        this._render();
    }

    hide() {
        this.rootElement?.classList.add('hidden');
    }

    refresh() {
        if (!this.rootElement || this.rootElement.classList.contains('hidden')) return;
        if (this.report) {
            this._render();
        } else {
            this.showLoading(this.context || {});
        }
    }

    _applyContext(context = {}) {
        this.context = context;
        this.activeTab = resolveAnalysisTab(context?.preferredTab ?? this.activeTab);
    }

    _setActiveTab(tab) {
        const nextTab = resolveAnalysisTab(tab);
        if (nextTab === this.activeTab) return;

        this.activeTab = nextTab;
        this.onTabChange(nextTab, this.report);
        this._resetScroll();
        if (this.report) {
            this._render();
        }
    }

    _resetScroll() {
        if (this.contentElement) {
            this.contentElement.scrollTop = 0;
        }
    }

    _render() {
        if (!this.contentElement || !this.report) return;

        this.contentElement.innerHTML = `
            ${this._renderTabBar()}
            <div class="analysis-tab-panel">
                ${this._renderActiveTabContent()}
            </div>
        `;

        this.contentElement.querySelectorAll('[data-analysis-tab]').forEach((button) => {
            button.addEventListener('click', () => {
                this._setActiveTab(button.dataset.analysisTab);
            });
        });

        this.contentElement.querySelectorAll('[data-analysis-practice]').forEach((button) => {
            button.addEventListener('click', () => {
                this.onPractice(Number(button.dataset.analysisPractice));
            });
        });
    }

    _renderTabBar() {
        return `
            <nav class="analysis-tabs" aria-label="${i18n.t('analysis.title')}">
                ${ANALYSIS_TABS.map((tab) => `
                    <button
                        class="analysis-tab-btn ${this.activeTab === tab ? 'is-active' : ''}"
                        type="button"
                        data-analysis-tab="${tab}"
                    >
                        ${i18n.t(`analysis.tab.${tab}`)}
                    </button>
                `).join('')}
            </nav>
        `;
    }

    _renderActiveTabContent() {
        switch (this.activeTab) {
            case 'critical':
                return this._renderCriticalTab();
            case 'timur':
                return this._renderTimurTab();
            case 'timeline':
                return this._renderTimelineTab();
            case 'summary':
            default:
                return this._renderSummaryTab();
        }
    }

    _renderSummaryTab() {
        const summary = this.report.summary || {};

        return `
            <section class="analysis-section">
                <div class="analysis-summary-grid">
                    ${this._renderResultCard(summary)}
                    ${this._renderAccuracyCard(COLORS.WHITE, summary.whiteAccuracy)}
                    ${this._renderAccuracyCard(COLORS.BLACK, summary.blackAccuracy)}
                    ${this._renderSwingCard(summary)}
                </div>
            </section>

            <section class="analysis-section">
                ${this._renderStory(summary)}
            </section>

            <section class="analysis-section">
                <div class="analysis-section-header">
                    <h3>${i18n.t('analysis.section.phases')}</h3>
                </div>
                <div class="analysis-phase-grid">
                    ${this._renderPhaseCards(this.report.phases?.white || [], COLORS.WHITE)}
                    ${this._renderPhaseCards(this.report.phases?.black || [], COLORS.BLACK)}
                </div>
            </section>
        `;
    }

    _renderCriticalTab() {
        const criticalMoments = this.report.criticalMoments || [];

        return `
            <section class="analysis-section">
                <div class="analysis-section-header">
                    <h3>${i18n.t('analysis.section.critical')}</h3>
                </div>
                ${criticalMoments.length
                    ? criticalMoments.map((entry) => this._renderCriticalMoment(entry)).join('')
                    : `<p class="analysis-empty">${i18n.t('analysis.empty_critical')}</p>`}
            </section>
        `;
    }

    _renderTimurTab() {
        const timurInsights = this.report.timurInsights || {};

        return `
            <section class="analysis-section">
                <div class="analysis-section-header">
                    <h3>${i18n.t('analysis.section.timur_signals')}</h3>
                </div>
                <div class="analysis-phase-grid">
                    ${this._renderTimurInsightCard(timurInsights.white, COLORS.WHITE)}
                    ${this._renderTimurInsightCard(timurInsights.black, COLORS.BLACK)}
                </div>
            </section>

            <section class="analysis-section">
                <div class="analysis-section-header">
                    <h3>${i18n.t('analysis.section.commanders')}</h3>
                </div>
                <div class="analysis-phase-grid">
                    ${this._renderPieceEfficiencyCard(timurInsights.white, COLORS.WHITE)}
                    ${this._renderPieceEfficiencyCard(timurInsights.black, COLORS.BLACK)}
                </div>
            </section>

            <section class="analysis-section">
                <div class="analysis-section-header">
                    <h3>${i18n.t('analysis.section.training')}</h3>
                </div>
                <div class="analysis-phase-grid">
                    ${this._renderTrainingCard(timurInsights.white, COLORS.WHITE)}
                    ${this._renderTrainingCard(timurInsights.black, COLORS.BLACK)}
                </div>
            </section>
        `;
    }

    _renderTimelineTab() {
        const moves = this.report.moves || [];

        return `
            <section class="analysis-section">
                <div class="analysis-section-header">
                    <h3>${i18n.t('analysis.section.timeline')}</h3>
                </div>
                <div class="analysis-timeline">
                    ${moves.map((entry) => this._renderMoveEntry(entry)).join('')}
                </div>
            </section>
        `;
    }

    _renderStory(summary) {
        const storyKey = summary.story?.key;
        if (!storyKey) return '';

        return `
            <article class="analysis-story-card">
                <span class="analysis-card-label">${i18n.t('analysis.story_title')}</span>
                <p>${i18n.t(storyKey)}</p>
            </article>
        `;
    }

    _renderResultCard(summary) {
        const specialCount = Object.values(summary.specialCounts || {}).reduce((sum, count) => sum + count, 0);

        return `
            <article class="analysis-card">
                <span class="analysis-card-label">${i18n.t('analysis.result_title')}</span>
                <strong class="analysis-card-value">${this._getResultLabel(summary)}</strong>
                <span class="analysis-card-subtle">${i18n.t('analysis.move_count')}: ${summary.moveCount || 0}</span>
                <span class="analysis-card-subtle">${i18n.t('analysis.special_count')}: ${specialCount}</span>
            </article>
        `;
    }

    _renderAccuracyCard(color, accuracy) {
        return `
            <article class="analysis-card">
                <span class="analysis-card-label">${this._getViewerLabel(color)}</span>
                <strong class="analysis-card-value">${accuracy == null ? '-' : `${accuracy}%`}</strong>
                <span class="analysis-card-subtle">${i18n.t('analysis.accuracy_label')}</span>
            </article>
        `;
    }

    _renderSwingCard(summary) {
        if (!summary.biggestSwingIndex) {
            return `
                <article class="analysis-card">
                    <span class="analysis-card-label">${i18n.t('analysis.turning_point')}</span>
                    <strong class="analysis-card-value">-</strong>
                    <span class="analysis-card-subtle">${i18n.t('analysis.turning_point_empty')}</span>
                </article>
            `;
        }

        return `
            <article class="analysis-card">
                <span class="analysis-card-label">${i18n.t('analysis.turning_point')}</span>
                <strong class="analysis-card-value">#${summary.biggestSwingIndex}</strong>
                <span class="analysis-card-subtle">${this._formatDelta(summary.biggestSwingDelta)}</span>
            </article>
        `;
    }

    _renderPhaseCards(entries, color) {
        return entries.map((entry) => `
            <article class="analysis-phase-card">
                <span class="analysis-phase-owner">${this._getViewerLabel(color)}</span>
                <strong>${i18n.t(`analysis.phase.${entry.phase}`)}</strong>
                <span>${entry.accuracy == null ? '-' : `${entry.accuracy}% ${i18n.t('analysis.accuracy_label')}`}</span>
            </article>
        `).join('');
    }

    _renderCriticalMoment(entry) {
        const tags = this._renderTags(entry.specialTags);
        const practiceButton = entry.bestMove && this.context?.allowPractice !== false ? `
            <button class="btn secondary-btn analysis-practice-btn" type="button" data-analysis-practice="${entry.index}">
                ${i18n.t('analysis.action.try_move')}
            </button>
        ` : '';
        return `
            <article class="analysis-moment-card">
                <div class="analysis-moment-topline">
                    <span class="analysis-move-index">#${entry.index}</span>
                    <span class="analysis-quality-badge quality-${entry.quality}">${i18n.t(`analysis.quality.${entry.quality}`)}</span>
                </div>
                <strong>${this._renderMoveHeadline(entry)}</strong>
                <p>${i18n.t('analysis.score_change')}: ${this._formatDelta(entry.delta)} | ${i18n.t('analysis.loss')}: ${entry.loss}</p>
                ${entry.bestMove ? `<p>${i18n.t('analysis.best_move')}: ${this._renderBestMove(entry.bestMove)}</p>` : ''}
                ${practiceButton}
                ${tags}
            </article>
        `;
    }

    _renderTimurInsightCard(insight = {}, color) {
        return `
            <article class="analysis-phase-card analysis-insight-card">
                <span class="analysis-phase-owner">${this._getViewerLabel(color)}</span>
                <strong>${i18n.t('analysis.insight.title')}</strong>
                <span>${i18n.t('analysis.metric.royal_peak')}: ${insight.royalPeak ?? 0}</span>
                <span>${i18n.t('analysis.metric.citadel_distance')}: ${this._formatDistance(insight.minCitadelDistance, insight.closestCitadelMoment)}</span>
                <span>${i18n.t('analysis.metric.pawn_pressure')}: ${insight.pawnAdvanceScore ?? 0}</span>
                <span>${i18n.t('analysis.metric.pawn_cycle')}: ${insight.pawnCycleCount ?? 0}</span>
                <span>${i18n.t('analysis.metric.signature_activity')}: ${insight.signatureActivity ?? 0}</span>
                <span>${i18n.t('analysis.metric.stalemate_missed')}: ${insight.missedStalemateWins ?? 0}</span>
            </article>
        `;
    }

    _renderPieceEfficiencyCard(insight = {}, color) {
        const pieces = insight.pieceEfficiency || [];

        return `
            <article class="analysis-phase-card analysis-insight-card">
                <span class="analysis-phase-owner">${this._getViewerLabel(color)}</span>
                <strong>${i18n.t('analysis.commander.title')}</strong>
                ${pieces.length
                    ? `<div class="analysis-piece-list">
                        ${pieces.map((piece) => `
                            <div class="analysis-piece-row">
                                <span>${i18n.t(`pieces.${piece.type}.name`)}</span>
                                <span>${i18n.t('analysis.commander.score')}: ${Math.round(piece.score)}</span>
                            </div>
                        `).join('')}
                    </div>`
                    : `<span class="analysis-empty">${i18n.t('analysis.commander.empty')}</span>`}
            </article>
        `;
    }

    _renderTrainingCard(insight = {}, color) {
        const recommendations = insight.recommendations || [];

        return `
            <article class="analysis-phase-card analysis-insight-card">
                <span class="analysis-phase-owner">${this._getViewerLabel(color)}</span>
                <strong>${i18n.t('analysis.training.title')}</strong>
                ${recommendations.length
                    ? `<ul class="analysis-recommendations">
                        ${recommendations.map((key) => `<li>${i18n.t(key)}</li>`).join('')}
                    </ul>`
                    : `<span class="analysis-empty">${i18n.t('analysis.training.empty')}</span>`}
            </article>
        `;
    }

    _renderMoveEntry(entry) {
        const tags = this._renderTags(entry.specialTags);

        return `
            <article class="analysis-move-row">
                <div class="analysis-move-row-header">
                    <div>
                        <span class="analysis-move-index">#${entry.index}</span>
                        <strong>${this._renderMoveHeadline(entry)}</strong>
                    </div>
                    <span class="analysis-quality-badge quality-${entry.quality}">${i18n.t(`analysis.quality.${entry.quality}`)}</span>
                </div>
                <div class="analysis-move-meta">
                    <span>${i18n.t(`analysis.phase.${entry.phase}`)}</span>
                    <span>${i18n.t('analysis.score_change')}: ${this._formatDelta(entry.delta)}</span>
                    <span>${i18n.t('analysis.loss')}: ${entry.loss}</span>
                </div>
                ${entry.bestMove ? `<p class="analysis-move-best">${i18n.t('analysis.best_move')}: ${this._renderBestMove(entry.bestMove)}</p>` : ''}
                ${tags}
            </article>
        `;
    }

    _renderTags(tags = []) {
        if (!tags.length) return '';

        return `
            <div class="analysis-tags">
                ${tags.map((tag) => `<span class="analysis-tag">${i18n.t(`analysis.tag.${tag}`)}</span>`).join('')}
            </div>
        `;
    }

    _renderMoveHeadline(entry) {
        const pieceName = i18n.t(`pieces.${entry.piece.typeAfter || entry.piece.typeBefore}.name`);
        return `${this._getViewerLabel(entry.color)}: ${pieceName} ${entry.from.label} -> ${entry.to.label}`;
    }

    _renderBestMove(bestMove) {
        const pieceName = i18n.t(`pieces.${bestMove.pieceType}.name`);
        return `${pieceName} ${getCoordinateLabel(bestMove.fromRow, bestMove.fromCol)} -> ${getCoordinateLabel(bestMove.toRow, bestMove.toCol)}`;
    }

    _getViewerLabel(color) {
        if (this.context?.isOnlineMatch) {
            if (this.context?.myColor === color) {
                return `${i18n.t('players.you_online')} (${this._getColorLabel(color)})`;
            }

            return `${i18n.t('players.opponent')} (${this._getColorLabel(color)})`;
        }

        if (this.context?.playerColor === color) {
            return `${i18n.t('players.you')} (${this._getColorLabel(color)})`;
        }

        if (this.context?.aiColor === color) {
            return `${i18n.t('players.ai')} (${this._getColorLabel(color)})`;
        }

        if (color === COLORS.WHITE) {
            return `${i18n.t('players.you')} (${this._getColorLabel(color)})`;
        }

        return `${i18n.t('players.ai')} (${this._getColorLabel(color)})`;
    }

    _getColorLabel(color) {
        return color === COLORS.BLACK ? i18n.t('colors.black_short') : i18n.t('colors.white_short');
    }

    _getResultLabel(summary) {
        const winner = summary.winner;
        const winnerLabel = winner === COLORS.WHITE || winner === COLORS.BLACK
            ? this._getViewerLabel(winner)
            : '';

        switch (summary.resultType) {
            case 'checkmate':
                return `${winnerLabel} ${i18n.t('analysis.result.checkmate')}`.trim();
            case 'stalemate':
                return `${winnerLabel} ${i18n.t('analysis.result.stalemate')}`.trim();
            case 'citadel_draw':
                return i18n.t('analysis.result.citadel_draw');
            case 'royal_capture':
                return `${winnerLabel} ${i18n.t('analysis.result.royal_capture')}`.trim();
            case 'timeout_win':
                return `${winnerLabel} ${i18n.t('analysis.result.timeout_win')}`.trim();
            case 'draw':
                return i18n.t('analysis.result.draw');
            default:
                return winnerLabel || i18n.t('analysis.result.ongoing');
        }
    }

    _formatDelta(delta = 0) {
        const rounded = Math.round(delta);
        if (rounded > 0) return `+${rounded}`;
        return `${rounded}`;
    }

    _formatDistance(distance, momentIndex) {
        if (distance == null) return '-';
        if (!momentIndex) return `${distance}`;
        return `${distance} (${i18n.t('analysis.turning_point')} #${momentIndex})`;
    }
}
