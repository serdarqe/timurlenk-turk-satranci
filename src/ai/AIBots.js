export const DEFAULT_AI_BOT_ID = 'bot_07_ulug_bey';

function clampNumber(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function roundTo(value, decimals = 2) {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

function getBotLevelProgress(level) {
    return clampNumber(((Number(level) || 1) - 1) / 14, 0, 1);
}

function estimateBotRating(bot) {
    const level = Number(bot.level) || 1;
    const stars = Number(bot.stars) || 1;
    return 400 + (level * 100) + (stars * 10);
}

function buildBotCalibration(bot) {
    const level = Number(bot.level) || 1;
    const progress = getBotLevelProgress(level);
    const isTrainingHardBot = bot.difficulty === 'hard' && level < 13;
    const depthBonus = level <= 2
        ? -1
        : (level <= 8 ? 0 : (level <= 12 ? 1 : 2));

    return Object.freeze({
        strengthScore: level * 100,
        search: Object.freeze({
            depthBonus,
            rootMoveScale: roundTo(0.72 + (progress * 0.5)),
            branchMoveScale: roundTo(0.62 + (progress * 0.58))
        }),
        selection: Object.freeze({
            preferBestProbabilityDelta: roundTo(-0.18 + (progress * 0.25)),
            scoreWindowDelta: Math.round(14 - (progress * 22)),
            poolSizeDelta: level <= 3 ? 1 : (level >= 13 ? -1 : 0),
            maxDangerLevelDelta: level <= 3 ? 1 : (level >= 10 ? -1 : 0),
            maxRepetitionSeverityDelta: level <= 2 ? 1 : (level >= 12 ? -1 : 0),
            maxReplyCaptureValueDelta: Math.round(30 - (progress * 44)),
            unsafeScoreToleranceDelta: Math.round(-4 + (progress * 18)),
            alwaysPickBest: level >= 13,
            mode: level >= 13 ? 'best' : 'biased',
            scoreWindowOverride: isTrainingHardBot ? Math.max(2, 14 - level) : null,
            poolSizeOverride: isTrainingHardBot ? 2 : null,
            preferBestProbabilityOverride: isTrainingHardBot
                ? roundTo(clampNumber(0.9 + ((level - 10) * 0.03), 0.9, 0.97))
                : null
        }),
        weights: Object.freeze({
            endgameScale: roundTo(0.68 + (progress * 0.62)),
            safetyScale: roundTo(0.72 + (progress * 0.5)),
            mobilityScale: roundTo(0.75 + (progress * 0.35)),
            repetitionScale: roundTo(0.8 + (progress * 0.5)),
            pressureScale: roundTo(0.76 + (progress * 0.5))
        })
    });
}

function freezeBot(bot) {
    const rating = Number.isFinite(bot.rating) ? bot.rating : estimateBotRating(bot);
    const calibration = bot.calibration || buildBotCalibration(bot);

    return Object.freeze({
        ...bot,
        rating,
        calibration,
        labels: Object.freeze({ ...bot.labels }),
        descriptions: Object.freeze({ ...bot.descriptions }),
        openingBookPreferences: Object.freeze([...(bot.openingBookPreferences || [])]),
        engineModifiers: Object.freeze({ ...(bot.engineModifiers || {}) })
    });
}

export const AI_BOTS = Object.freeze([
    freezeBot({
        id: 'bot_01_cirak_alp',
        level: 1,
        stars: 1,
        difficulty: 'easy',
        personaId: 'timur',
        labels: { tr: 'Çırak Alp', en: 'Apprentice Alp' },
        descriptions: {
            tr: 'Yeni öğrenir, açık hatalar yapar.',
            en: 'A beginner bot that makes visible mistakes.'
        },
        openingBookPreferences: ['center_pawn'],
        engineModifiers: { precision: 0.65, safety: 0.7, bookTrust: 0.55 }
    }),
    freezeBot({
        id: 'bot_02_kale_nobetcisi',
        level: 2,
        stars: 1,
        difficulty: 'easy',
        personaId: 'saray_veziri',
        labels: { tr: 'Kale Nöbetçisi', en: 'Castle Guard' },
        descriptions: {
            tr: 'Savunur ama fırsat kaçırır.',
            en: 'Defends, but misses opportunities.'
        },
        openingBookPreferences: ['pawn_fortress'],
        engineModifiers: { precision: 0.7, safety: 0.78, bookTrust: 0.6 }
    }),
    freezeBot({
        id: 'bot_03_toy_akinci',
        level: 3,
        stars: 1,
        difficulty: 'easy',
        personaId: 'beyazid',
        labels: { tr: 'Toy Akıncı', en: 'Young Raider' },
        descriptions: {
            tr: 'Cesur oynar, taş bırakabilir.',
            en: 'Bold, but can drop material.'
        },
        openingBookPreferences: ['double_knight_pressure'],
        engineModifiers: { precision: 0.74, pressure: 0.85, bookTrust: 0.62 }
    }),
    freezeBot({
        id: 'bot_04_otag_muhafizi',
        level: 4,
        stars: 2,
        difficulty: 'easy',
        personaId: 'saray_veziri',
        labels: { tr: 'Otağ Muhafızı', en: 'Camp Guardian' },
        descriptions: {
            tr: 'Basit tehditleri görür.',
            en: 'Sees simple threats.'
        },
        openingBookPreferences: ['pawn_fortress', 'center_pawn'],
        engineModifiers: { precision: 0.82, safety: 0.88, bookTrust: 0.72 }
    }),
    freezeBot({
        id: 'bot_05_bozkir_suvarisi',
        level: 5,
        stars: 2,
        difficulty: 'medium',
        personaId: 'beyazid',
        labels: { tr: 'Bozkır Süvarisi', en: 'Steppe Cavalry' },
        descriptions: {
            tr: 'Tempo ve saldırı arar.',
            en: 'Looks for tempo and attacks.'
        },
        openingBookPreferences: ['double_knight_pressure', 'active_camel'],
        engineModifiers: { precision: 0.82, pressure: 1.0, bookTrust: 0.76 }
    }),
    freezeBot({
        id: 'bot_06_genc_emir',
        level: 6,
        stars: 2,
        difficulty: 'medium',
        personaId: 'timur',
        labels: { tr: 'Genç Emir', en: 'Young Emir' },
        descriptions: {
            tr: 'Dengeli gelişir, bazen acele eder.',
            en: 'Develops steadily, sometimes rushes.'
        },
        openingBookPreferences: ['center_pawn', 'timur_siege'],
        engineModifiers: { precision: 0.88, safety: 0.92, bookTrust: 0.82 }
    }),
    freezeBot({
        id: 'bot_07_ulug_bey',
        level: 7,
        stars: 3,
        difficulty: 'medium',
        personaId: 'ulu_bey',
        labels: { tr: 'Uluğ Bey', en: 'Ulugh Beg' },
        descriptions: {
            tr: 'Hesaplı ve öğretici oynar.',
            en: 'Calculated and instructive.'
        },
        openingBookPreferences: ['active_camel', 'pawn_fortress'],
        engineModifiers: { precision: 1.0, safety: 1.0, bookTrust: 0.9 }
    }),
    freezeBot({
        id: 'bot_08_saray_veziri',
        level: 8,
        stars: 3,
        difficulty: 'medium',
        personaId: 'saray_veziri',
        labels: { tr: 'Saray Veziri', en: 'Palace Vizier' },
        descriptions: {
            tr: 'Taş güvenliğini önemser.',
            en: 'Values piece safety.'
        },
        openingBookPreferences: ['pawn_fortress', 'center_pawn'],
        engineModifiers: { precision: 1.02, safety: 1.1, bookTrust: 0.92 }
    }),
    freezeBot({
        id: 'bot_09_beyazid',
        level: 9,
        stars: 3,
        difficulty: 'medium',
        personaId: 'beyazid',
        labels: { tr: 'Beyazıd', en: 'Bayezid' },
        descriptions: {
            tr: 'Saldırgan ve tempolu oynar.',
            en: 'Aggressive and tempo-oriented.'
        },
        openingBookPreferences: ['double_knight_pressure', 'rook_corridor'],
        engineModifiers: { precision: 1.04, pressure: 1.14, bookTrust: 0.9 }
    }),
    freezeBot({
        id: 'bot_10_demir_pence',
        level: 10,
        stars: 4,
        difficulty: 'hard',
        personaId: 'timur',
        labels: { tr: 'Demir Pençe', en: 'Iron Claw' },
        descriptions: {
            tr: 'Fırsatları sert cezalandırır.',
            en: 'Punishes opportunities firmly.'
        },
        openingBookPreferences: ['timur_siege', 'double_knight_pressure'],
        engineModifiers: { precision: 1.08, safety: 1.08, pressure: 1.08, bookTrust: 0.95 }
    }),
    freezeBot({
        id: 'bot_11_kusatma_ustasi',
        level: 11,
        stars: 4,
        difficulty: 'hard',
        personaId: 'timur',
        labels: { tr: 'Kuşatma Ustası', en: 'Siege Master' },
        descriptions: {
            tr: 'Mat ağı ve baskı kurar.',
            en: 'Builds pressure and mate nets.'
        },
        openingBookPreferences: ['timur_siege', 'rook_corridor'],
        engineModifiers: { precision: 1.12, conversion: 1.12, pressure: 1.12, bookTrust: 0.98 }
    }),
    freezeBot({
        id: 'bot_12_hisar_bekcisi',
        level: 12,
        stars: 4,
        difficulty: 'hard',
        personaId: 'saray_veziri',
        labels: { tr: 'Hisar Bekçisi', en: 'Citadel Keeper' },
        descriptions: {
            tr: 'Güvenli ve sabırlı kazanır.',
            en: 'Wins safely and patiently.'
        },
        openingBookPreferences: ['pawn_fortress', 'active_camel'],
        engineModifiers: { precision: 1.14, safety: 1.18, conversion: 1.08, bookTrust: 0.96 }
    }),
    freezeBot({
        id: 'bot_13_timur',
        level: 13,
        stars: 5,
        difficulty: 'hard',
        personaId: 'timur',
        labels: { tr: 'Timur', en: 'Timur' },
        descriptions: {
            tr: 'Üstünlüğü kazanca çevirmeye odaklanır.',
            en: 'Focused on converting advantages.'
        },
        openingBookPreferences: ['timur_siege', 'rook_corridor', 'center_pawn'],
        engineModifiers: { precision: 1.2, safety: 1.18, conversion: 1.2, bookTrust: 1.0 }
    }),
    freezeBot({
        id: 'bot_14_cihan_fatihi',
        level: 14,
        stars: 5,
        difficulty: 'hard',
        personaId: 'timur',
        labels: { tr: 'Cihan Fatihi', en: 'World Conqueror' },
        descriptions: {
            tr: 'Derin hesap ve baskı oyunudur.',
            en: 'Deep calculation and pressure.'
        },
        openingBookPreferences: ['timur_siege', 'double_knight_pressure', 'rook_corridor'],
        engineModifiers: { precision: 1.26, pressure: 1.24, safety: 1.2, bookTrust: 1.02 }
    }),
    freezeBot({
        id: 'bot_15_aksak_demir',
        level: 15,
        stars: 5,
        difficulty: 'hard',
        personaId: 'timur',
        labels: { tr: 'Aksak Demir', en: 'Iron Timur' },
        descriptions: {
            tr: 'En acımasız bot; basit fırsat kaçırmaz.',
            en: 'The hardest bot; rarely misses simple chances.'
        },
        openingBookPreferences: ['timur_siege', 'rook_corridor', 'active_camel'],
        engineModifiers: { precision: 1.35, pressure: 1.28, safety: 1.25, conversion: 1.28, bookTrust: 1.04 }
    })
]);

export function isAIBotId(id) {
    return Boolean(id && AI_BOTS.some((bot) => bot.id === id));
}

export function getAIBot(id = DEFAULT_AI_BOT_ID) {
    return AI_BOTS.find((bot) => bot.id === id)
        || AI_BOTS.find((bot) => bot.id === DEFAULT_AI_BOT_ID);
}

export function getAllAIBots() {
    return AI_BOTS;
}

export function getAIBotSelectionCards(locale = 'tr') {
    const lang = locale === 'en' ? 'en' : 'tr';
    const levelPrefix = lang === 'en' ? 'Level' : 'Seviye';
    const starSuffix = lang === 'en' ? 'stars' : 'yıldız';

    return Object.freeze([
        Object.freeze({
            id: '',
            isClassic: true,
            labelKey: 'ai.bot.classic',
            descriptionKey: 'ai.bot.classic_desc',
            iconClass: 'fas fa-sliders-h',
            iconColor: '#F59E0B'
        }),
        ...AI_BOTS.map((bot) => Object.freeze({
            id: bot.id,
            isClassic: false,
            label: bot.labels?.[lang] || bot.labels?.tr || bot.id,
            description: bot.descriptions?.[lang] || bot.descriptions?.tr || '',
            level: bot.level,
            stars: bot.stars,
            rating: bot.rating,
            levelText: `${levelPrefix} ${bot.level}`,
            ratingText: `ELO ${bot.rating}`,
            starsLabel: `${bot.stars} ${starSuffix}`,
            starsText: `${'★'.repeat(bot.stars)}${'☆'.repeat(Math.max(0, 5 - bot.stars))}`,
            difficulty: bot.difficulty,
            personaId: bot.personaId,
            iconClass: 'fas fa-robot',
            iconColor: bot.stars >= 5 ? '#F59E0B' : bot.stars >= 4 ? '#F97316' : '#38BDF8'
        }))
    ]);
}
