// src/ui/PieceSVGs_Warrior.js
// Savaşçı Skin — eski tarihî figürin taşlar (src/assets/pieces PNG'leri).
// Beyaz: orijinal görsel. Siyah: CSS invert filtresi (bkz. themes.css warrior bloğu).

import WHITE_KING from '../assets/pieces/white_king.png';
import WHITE_VIZIER from '../assets/pieces/white_vizier.png';
import WHITE_GENERAL from '../assets/pieces/white_general.png';
import WHITE_KNIGHT from '../assets/pieces/white_knight.png';
import WHITE_ELEPHANT from '../assets/pieces/white_elephant.png';
import WHITE_CAMEL from '../assets/pieces/white_camel.png';
import WHITE_DABBABA from '../assets/pieces/white_dabbaba.png';
import WHITE_GIRAFFE from '../assets/pieces/white_giraffe.png';
import WHITE_PICKET from '../assets/pieces/white_picket.png';
import WHITE_ROOK from '../assets/pieces/white_rook.png';
import WHITE_PAWN from '../assets/pieces/white_pawn.png';
import WHITE_PRINCE from '../assets/pieces/white_prince.png';

const img = (src) => `<img src="${src}" alt="" draggable="false">`;

// 12 özgün görsel; eksik 5 taş buildSVGMap içinde paylaşıyor
// (sea_monster->vizier, lion->knight, bull->camel, revealer->general).
export const PIECE_SVGS_WARRIOR = {
    KING: img(WHITE_KING),
    VIZIER: img(WHITE_VIZIER),
    GENERAL: img(WHITE_GENERAL),
    KNIGHT: img(WHITE_KNIGHT),
    ELEPHANT: img(WHITE_ELEPHANT),
    CAMEL: img(WHITE_CAMEL),
    DABBABA: img(WHITE_DABBABA),
    GIRAFFE: img(WHITE_GIRAFFE),
    PICKET: img(WHITE_PICKET),
    ROOK: img(WHITE_ROOK),
    PAWN: img(WHITE_PAWN),
    PRINCE: img(WHITE_PRINCE),
    ADVENTITIOUS_KING: img(WHITE_KING)
};
