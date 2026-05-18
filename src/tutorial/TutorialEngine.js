// 8 detailed lessons for Tamerlane Chess Tutorial
import { i18n } from '../utils/i18n.js';

function makeGrid(rows, cols, cells, extraClass = '') {
  const classes = ['mini-board', `grid-${cols}`, extraClass].filter(Boolean).join(' ');
  let html = `<div class="${classes}">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const isDark = (r + c) % 2 === 1;
      const key = `${r},${c}`;
      const cellData = cells[key] || {};
      const cls = [
        'mini-cell',
        isDark ? 'dark' : 'light',
        cellData.highlight ? 'highlight' : '',
        cellData.attack ? 'attack' : '',
        cellData.piece ? 'piece-cell' : ''
      ].filter(Boolean).join(' ');
      html += `<div class="${cls}">${cellData.text || ''}</div>`;
    }
  }
  html += '</div>';
  return html;
}

function makeMoveCard({ icon, name, subtitle, move, capture, note, diagram, labels }) {
  const copy = labels || { move: 'Gider', capture: 'Alır' };
  return `
    <article class="piece-guide-card">
      <div class="piece-guide-copy">
        <span class="piece-guide-icon">${icon}</span>
        <div>
          <h4>${name}</h4>
          <p class="piece-guide-subtitle">${subtitle}</p>
        </div>
      </div>
      <div class="piece-guide-rule piece-guide-move"><strong>${copy.move}:</strong> ${move}</div>
      ${capture ? `<div class="piece-guide-rule piece-guide-capture"><strong>${copy.capture}:</strong> ${capture}</div>` : ''}
      ${note ? `<p class="piece-guide-note">${note}</p>` : ''}
      ${diagram ? `<div class="piece-guide-diagram">${diagram}</div>` : ''}
    </article>
  `;
}

function movementCards(cards, lang = 'tr') {
  const labels = lang === 'en'
    ? { move: 'Moves', capture: 'Captures' }
    : { move: 'Gider', capture: 'Alır' };
  return `<div class="piece-guide-grid">${cards.map((card) => makeMoveCard({ ...card, labels })).join('')}</div>`;
}

function mini(rows, cols, cells) {
  return makeGrid(rows, cols, cells, 'mini-board-compact');
}

export const LESSONS = [
  // Lesson 0: Board Introduction
  {
    title: {
      tr: '🏰 Tahta Tanıtımı',
      en: '🏰 Board Introduction'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '▦',
          name: '10 × 11 Tahta',
          subtitle: 'Timur satrancı standart satrançtan daha geniştir.',
          move: '11 sütun ve 10 satır üzerinde oynanır.',
          note: 'Geniş tahta yüzünden taş yerleşimi ve menzil daha önemlidir.',
          diagram: mini(5, 5, {
            '0,0': { highlight: true }, '0,1': { highlight: true }, '0,2': { highlight: true }, '0,3': { highlight: true }, '0,4': { highlight: true },
            '2,2': { text: '110', piece: true },
            '4,0': { highlight: true }, '4,1': { highlight: true }, '4,2': { highlight: true }, '4,3': { highlight: true }, '4,4': { highlight: true }
          })
        },
        {
          icon: '🏰',
          name: 'Hisar',
          subtitle: 'Tahtanın iki dış köşesindeki özel kareler.',
          move: 'Kraliyet taşı rakip hisara girerse oyun berabere biter.',
          note: 'Kaybeden taraf için savunma şansı, kazanan taraf için dikkat edilmesi gereken risktir.',
          diagram: mini(5, 5, {
            '0,0': { text: '🏰', highlight: true },
            '4,4': { text: '🏰', highlight: true },
            '2,2': { text: '♔', piece: true }
          })
        }
      ])}
      <p>Timurlenk Türk Satrancı, <strong>10 × 11</strong> karelik (110 kare) bir ana ızgara üzerinde oynanır. 
      Buna ek olarak, tahtanın karşılıklı iki köşesinde birer <strong>Hisar (Karargah)</strong> karesi bulunur.</p>
      
      <div class="rule-box">
        Toplam oyun alanı: <strong>112 kare</strong> (110 ana + 2 Hisar)
      </div>
      
      <h4>📐 Koordinat Sistemi</h4>
      <p>Sütunlar <strong>a–k</strong> (11 sütun), satırlar <strong>1–10</strong> (10 satır) ile gösterilir.</p>
      
      <h4>🏰 Hisarlar (Citadels)</h4>
      <ul>
        <li><strong>Beyaz Hisar:</strong> Sağ alt köşe (k sütununun dışında)</li>
        <li><strong>Siyah Hisar:</strong> Sol üst köşe (a sütununun dışında)</li>
      </ul>
      
      <div class="tip-box">
        💡 <strong>İpucu:</strong> Şah rakibin Hisar'ına girerse oyun <strong>berabere</strong> biter!
      </div>
      
      <h4>⚔️ Taş Sayısı</h4>
      <p>Her taraf toplam <strong>28 taş</strong> ile oyuna başlar. Bu, standart satrança göre çok daha büyük bir ordudur!</p>
    `,
      en: `
      ${movementCards([
        {
          icon: '▦',
          name: '10 × 11 Board',
          subtitle: 'Tamerlane chess is wider than standard chess.',
          move: 'Played on 11 files and 10 ranks.',
          note: 'Because the board is large, piece placement and range matter more.',
          diagram: mini(5, 5, {
            '0,0': { highlight: true }, '0,1': { highlight: true }, '0,2': { highlight: true }, '0,3': { highlight: true }, '0,4': { highlight: true },
            '2,2': { text: '110', piece: true },
            '4,0': { highlight: true }, '4,1': { highlight: true }, '4,2': { highlight: true }, '4,3': { highlight: true }, '4,4': { highlight: true }
          })
        },
        {
          icon: '🏰',
          name: 'Citadel',
          subtitle: 'Special outside squares at two opposite corners.',
          move: 'If a royal piece enters the enemy citadel, the game is drawn.',
          note: 'It is a defensive escape for the losing side and a risk for the winning side.',
          diagram: mini(5, 5, {
            '0,0': { text: '🏰', highlight: true },
            '4,4': { text: '🏰', highlight: true },
            '2,2': { text: '♔', piece: true }
          })
        }
      ], 'en')}
      <p>Tamerlane Chess is played on a large <strong>10 × 11</strong> grid (110 squares). 
      In addition, there is a <strong>Citadel (Fortress)</strong> square at two opposite corners of the board.</p>
      
      <div class="rule-box">
        Total game area: <strong>112 squares</strong> (110 main + 2 Citadels)
      </div>
      
      <h4>📐 Coordinate System</h4>
      <p>Columns are labeled <strong>a–k</strong> (11 columns), rows <strong>1–10</strong> (10 rows).</p>
      
      <h4>🏰 Citadels</h4>
      <ul>
        <li><strong>White Citadel:</strong> Bottom right corner (outside column k)</li>
        <li><strong>Black Citadel:</strong> Top left corner (outside column a)</li>
      </ul>
      
      <div class="tip-box">
        💡 <strong>Tip:</strong> If a King enters the opponent's Citadel, the game ends in a <strong>draw</strong>!
      </div>
      
      <h4>⚔️ Piece Count</h4>
      <p>Each side starts with a total of <strong>28 pieces</strong>. This is a much larger army compared to standard chess!</p>
    `
    },
    diagram: makeGrid(5, 7, {
      '0,0': { text: '🏰', highlight: true },
      '0,3': { text: '♚' },
      '2,3': { text: '·', highlight: true },
      '4,3': { text: '♔' },
      '4,6': { text: '🏰', highlight: true },
    })
  },

  // Lesson 1: Basic Pieces
  {
    title: {
      tr: '👑 Temel Taşlar',
      en: '👑 Basic Pieces'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '♔',
          name: 'Şah',
          subtitle: 'En önemli kraliyet taşı.',
          move: 'Her yöne 1 kare.',
          capture: 'Gittiği karede rakip taş varsa alır.',
          note: 'Şahı merkeze açmak risklidir; güvenli kalmalıdır.',
          diagram: mini(3, 3, {
            '0,0': { highlight: true }, '0,1': { highlight: true }, '0,2': { highlight: true },
            '1,0': { highlight: true }, '1,1': { text: '♔', piece: true }, '1,2': { highlight: true },
            '2,0': { highlight: true }, '2,1': { highlight: true }, '2,2': { highlight: true }
          })
        },
        {
          icon: '♕',
          name: 'Vezir',
          subtitle: 'Modern kraliçe değildir.',
          move: 'Yatay veya dikey 1 kare.',
          capture: 'Aynı şekilde 1 kare düz alır.',
          note: 'Kısa menzilli destek taşıdır.',
          diagram: mini(3, 3, {
            '0,1': { highlight: true },
            '1,0': { highlight: true }, '1,1': { text: '♕', piece: true }, '1,2': { highlight: true },
            '2,1': { highlight: true }
          })
        },
        {
          icon: '☆',
          name: 'Bakan',
          subtitle: 'Vezirin çapraz karşılığı.',
          move: 'Çapraz 1 kare.',
          capture: 'Çapraz 1 kare alır.',
          note: 'Vezir ile birlikte şah çevresini tamamlar.',
          diagram: mini(3, 3, {
            '0,0': { highlight: true }, '0,2': { highlight: true },
            '1,1': { text: '☆', piece: true },
            '2,0': { highlight: true }, '2,2': { highlight: true }
          })
        }
      ])}
      <h4>♔ Şah (King)</h4>
      <p>Her yöne <strong>1 kare</strong> hareket eder. Oyunun en önemli taşıdır. Şah mat edilirse oyun biter.</p>
      
      <h4>♕ Vezir (Vizier)</h4>
      <p>Yatay ve dikey yönlerde <strong>1 kare</strong> hareket eder. Modern satranç vezirinden çok daha zayıftır!</p>
      
      <div class="rule-box">
        ⚠️ Timurlenk Veziri modern satranç kraliçesi gibi güçlü DEĞİLDİR. Sadece 1 kare ilerler.
      </div>
      
      <h4>☆ Bakan (General/Ferz)</h4>
      <p>Çapraz yönlerde <strong>1 kare</strong> hareket eder. Vezirin çapraz eşdeğeridir.</p>
      
      <div class="tip-box">
        💡 Vezir ve Bakan birbirini tamamlar: biri düz, diğeri çapraz gider.
      </div>
    `,
      en: `
      ${movementCards([
        {
          icon: '♔',
          name: 'Shah',
          subtitle: 'The most important royal piece.',
          move: '1 square in any direction.',
          capture: 'Captures an enemy on the destination square.',
          note: 'Avoid walking into the center too early.',
          diagram: mini(3, 3, {
            '0,0': { highlight: true }, '0,1': { highlight: true }, '0,2': { highlight: true },
            '1,0': { highlight: true }, '1,1': { text: '♔', piece: true }, '1,2': { highlight: true },
            '2,0': { highlight: true }, '2,1': { highlight: true }, '2,2': { highlight: true }
          })
        },
        {
          icon: '♕',
          name: 'Vizier',
          subtitle: 'Not the modern queen.',
          move: '1 square horizontally or vertically.',
          capture: 'Captures the same way.',
          note: 'A short-range support piece.',
          diagram: mini(3, 3, {
            '0,1': { highlight: true },
            '1,0': { highlight: true }, '1,1': { text: '♕', piece: true }, '1,2': { highlight: true },
            '2,1': { highlight: true }
          })
        },
        {
          icon: '☆',
          name: 'General',
          subtitle: 'Diagonal partner of the Vizier.',
          move: '1 square diagonally.',
          capture: 'Captures 1 square diagonally.',
          note: 'Complements the Vizier around the royal area.',
          diagram: mini(3, 3, {
            '0,0': { highlight: true }, '0,2': { highlight: true },
            '1,1': { text: '☆', piece: true },
            '2,0': { highlight: true }, '2,2': { highlight: true }
          })
        }
      ], 'en')}
      <h4>♔ Shah (King)</h4>
      <p>Moves <strong>1 square</strong> in any direction. The most important piece. If the King is checkmated, the game ends.</p>
      
      <h4>♕ Vizier</h4>
      <p>Moves <strong>1 square</strong> orthogonally (horizontally or vertically). Much weaker than the modern chess queen!</p>
      
      <div class="rule-box">
        ⚠️ The Tamerlane Vizier is NOT as powerful as the modern queen. It only moves 1 square.
      </div>
      
      <h4>☆ General (Ferz)</h4>
      <p>Moves <strong>1 square</strong> diagonally. It is the diagonal counterpart to the Vizier.</p>
      
      <div class="tip-box">
        💡 The Vizier and General complement each other: one moves straight, the other diagonally.
      </div>
    `
    },
    diagram: makeGrid(5, 5, {
      '2,2': { text: '♔', piece: true },
      '1,1': { highlight: true }, '1,2': { highlight: true }, '1,3': { highlight: true },
      '2,1': { highlight: true }, '2,3': { highlight: true },
      '3,1': { highlight: true }, '3,2': { highlight: true }, '3,3': { highlight: true },
    })
  },

  // Lesson 2: Cavalry
  {
    title: {
      tr: '🐴 Süvari Birlikleri',
      en: '🐴 Cavalry Units'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '♞',
          name: 'At',
          subtitle: 'Kısa L sıçrayıcısı.',
          move: '2 kare + 1 kare L şeklinde.',
          capture: 'İndiği karede rakip taş varsa alır.',
          note: 'Aradaki taşları atlar; kapalı konumlarda değerlidir.',
          diagram: mini(5, 5, {
            '0,1': { highlight: true }, '0,3': { highlight: true },
            '1,0': { highlight: true }, '1,4': { highlight: true },
            '2,2': { text: '♞', piece: true },
            '3,0': { highlight: true }, '3,4': { highlight: true },
            '4,1': { highlight: true }, '4,3': { highlight: true }
          })
        },
        {
          icon: '🐫',
          name: 'Deve',
          subtitle: 'Uzun L sıçrayıcısı.',
          move: '3 kare + 1 kare uzun L.',
          capture: 'İndiği karede rakip taş varsa alır.',
          note: 'Uzak taktikleri görür ama hedef kareleri daha sınırlıdır.',
          diagram: mini(7, 7, {
            '0,2': { highlight: true }, '0,4': { highlight: true },
            '2,0': { highlight: true }, '2,6': { highlight: true },
            '3,3': { text: '🐫', piece: true },
            '4,0': { highlight: true }, '4,6': { highlight: true },
            '6,2': { highlight: true }, '6,4': { highlight: true }
          })
        }
      ])}
      <h4>♞ At (Knight)</h4>
      <p>Standart satranç atıyla aynıdır. <strong>L şeklinde</strong> (2+1) hareket eder ve <strong>zıplayabilir</strong> (aradaki taşları atlayabilir).</p>
      
      <h4>🐫 Deve (Camel)</h4>
      <p>Timurlenk'e özgü bir taş! <strong>L şeklinde ama daha uzun:</strong> 3+1 kare hareket eder. Aradaki taşları <strong>zıplar</strong>.</p>
      
      <div class="rule-box">
        🐫 Deve'nin hareketi: 3 kare bir yöne + 1 kare dik yöne (veya tersi)
      </div>
      
      <h4>Farklar</h4>
      <ul>
        <li><strong>At:</strong> 2+1 = Kısa L</li>
        <li><strong>Deve:</strong> 3+1 = Uzun L</li>
        <li>İkisi de aradaki taşları atlayabilir</li>
      </ul>
      
      <div class="tip-box">
        💡 Deve, At'tan daha uzun menzile sahiptir ama daha az kareye ulaşabilir.
      </div>
    `,
      en: `
      ${movementCards([
        {
          icon: '♞',
          name: 'Knight',
          subtitle: 'Short L-shaped jumper.',
          move: '2 squares + 1 square in an L shape.',
          capture: 'Captures on the landing square.',
          note: 'It jumps over blockers and is useful in closed positions.',
          diagram: mini(5, 5, {
            '0,1': { highlight: true }, '0,3': { highlight: true },
            '1,0': { highlight: true }, '1,4': { highlight: true },
            '2,2': { text: '♞', piece: true },
            '3,0': { highlight: true }, '3,4': { highlight: true },
            '4,1': { highlight: true }, '4,3': { highlight: true }
          })
        },
        {
          icon: '🐫',
          name: 'Camel',
          subtitle: 'Long L-shaped jumper.',
          move: '3 squares + 1 square in a long L.',
          capture: 'Captures on the landing square.',
          note: 'It creates distant tactics but reaches fewer target squares.',
          diagram: mini(7, 7, {
            '0,2': { highlight: true }, '0,4': { highlight: true },
            '2,0': { highlight: true }, '2,6': { highlight: true },
            '3,3': { text: '🐫', piece: true },
            '4,0': { highlight: true }, '4,6': { highlight: true },
            '6,2': { highlight: true }, '6,4': { highlight: true }
          })
        }
      ], 'en')}
      <h4>♞ Knight</h4>
      <p>Same as standard chess. Moves in an <strong>L-shape</strong> (2 squares in one direction + 1 square at a right angle) and can <strong>leap</strong> over other pieces.</p>
      
      <h4>🐫 Camel</h4>
      <p>A unique piece to Tamerlane Chess! Moves in a <strong>long L-shape:</strong> 3+1 squares. It also <strong>leaps</strong> over intermediate pieces.</p>
      
      <div class="rule-box">
        🐫 Camel movement: 3 squares in one direction + 1 square orthogonally (or vice versa).
      </div>
      
      <h4>Differences</h4>
      <ul>
        <li><strong>Knight:</strong> 2+1 = Short L</li>
        <li><strong>Camel:</strong> 3+1 = Long L</li>
        <li>Both can leap over intermediate pieces.</li>
      </ul>
      
      <div class="tip-box">
        💡 The Camel has a longer range than the Knight but can reach fewer squares overall.
      </div>
    `
    },
    diagram: makeGrid(7, 7, {
      '3,3': { text: '♞', piece: true },
      '1,2': { highlight: true }, '1,4': { highlight: true },
      '2,1': { highlight: true }, '2,5': { highlight: true },
      '4,1': { highlight: true }, '4,5': { highlight: true },
      '5,2': { highlight: true }, '5,4': { highlight: true },
      '0,2': { attack: true }, '0,4': { attack: true },
      '6,2': { attack: true }, '6,4': { attack: true },
      '2,0': { attack: true }, '2,6': { attack: true },
      '4,0': { attack: true }, '4,6': { attack: true },
    })
  },

  // Lesson 3: Siege Units
  {
    title: {
      tr: '🏗️ Kuşatma Birlikleri',
      en: '🏗️ Siege Units'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '🐘',
          name: 'Fil',
          subtitle: 'Çapraz kuşatma taşı.',
          move: 'Tam 2 kare çapraz sıçrar.',
          capture: 'İndiği karede rakip taş varsa alır.',
          note: '1 kare gidemez; aradaki taşı atlayabilir.',
          diagram: mini(5, 5, {
            '0,0': { highlight: true }, '0,4': { highlight: true },
            '2,2': { text: '🐘', piece: true },
            '4,0': { highlight: true }, '4,4': { highlight: true }
          })
        },
        {
          icon: '⚙️',
          name: 'Dabbaba',
          subtitle: 'Düz kuşatma taşı.',
          move: 'Tam 2 kare yatay veya dikey sıçrar.',
          capture: 'İndiği karede rakip taş varsa alır.',
          note: 'Filin düz karşılığıdır; kısa ama beklenmedik vurur.',
          diagram: mini(5, 5, {
            '0,2': { highlight: true },
            '2,0': { highlight: true }, '2,2': { text: '⚙️', piece: true }, '2,4': { highlight: true },
            '4,2': { highlight: true }
          })
        }
      ])}
      <h4>🐘 Fil (Elephant)</h4>
      <p>Çapraz olarak tam <strong>2 kare</strong> hareket eder. <strong>Zıplama</strong> yeteneğine sahiptir — 
      aradaki taş üzerinden atlayabilir.</p>
      
      <div class="rule-box">
        🐘 Fil tam olarak 2 kare çapraz gider, ne daha az ne daha fazla. Araya taş olsa bile zıplar.
      </div>
      
      <h4>⚙️ Dabbaba (War Engine)</h4>
      <p>Yatay veya dikey yönde tam <strong>2 kare</strong> hareket eder. Fil gibi <strong>zıplama</strong> yeteneği vardır.</p>
      
      <h4>Karşılaştırma</h4>
      <ul>
        <li><strong>Fil:</strong> 2 kare çapraz + zıplama</li>
        <li><strong>Dabbaba:</strong> 2 kare düz + zıplama</li>
        <li>İkisi de kısa menzilli ama zıplama sayesinde güçlüdür</li>
      </ul>
      
      <div class="warning-box">
        ⚠️ Bu taşlar modern satrançtaki fil ve kalelerden çok farklıdır! Sadece 2 kare giderler.
      </div>
    `,
      en: `
      ${movementCards([
        {
          icon: '🐘',
          name: 'Elephant',
          subtitle: 'Diagonal siege piece.',
          move: 'Jumps exactly 2 squares diagonally.',
          capture: 'Captures on the landing square.',
          note: 'It cannot move 1 square; it can jump over the middle square.',
          diagram: mini(5, 5, {
            '0,0': { highlight: true }, '0,4': { highlight: true },
            '2,2': { text: '🐘', piece: true },
            '4,0': { highlight: true }, '4,4': { highlight: true }
          })
        },
        {
          icon: '⚙️',
          name: 'Dabbaba',
          subtitle: 'Orthogonal siege piece.',
          move: 'Jumps exactly 2 squares horizontally or vertically.',
          capture: 'Captures on the landing square.',
          note: 'The straight counterpart of the Elephant.',
          diagram: mini(5, 5, {
            '0,2': { highlight: true },
            '2,0': { highlight: true }, '2,2': { text: '⚙️', piece: true }, '2,4': { highlight: true },
            '4,2': { highlight: true }
          })
        }
      ], 'en')}
      <h4>🐘 Elephant (Pil)</h4>
      <p>Moves exactly <strong>2 squares</strong> diagonally. It has the ability to <strong>leap</strong> — jumping over any intermediate piece.</p>
      
      <div class="rule-box">
        🐘 Elephant goes exactly 2 squares diagonally, no more, no less. It leaps even if a piece is in the way.
      </div>
      
      <h4>⚙️ Dabbaba (War Engine)</h4>
      <p>Moves exactly <strong>2 squares</strong> orthogonally. Like the Elephant, it can <strong>leap</strong> over other pieces.</p>
      
      <h4>Comparison</h4>
      <ul>
        <li><strong>Elephant:</strong> 2 squares diagonal + leap</li>
        <li><strong>Dabbaba:</strong> 2 squares orthogonal + leap</li>
        <li>Both are short-range but powerful due to their leaping ability.</li>
      </ul>
      
      <div class="warning-box">
        ⚠️ These pieces are very different from modern chess bishops and rooks! They move exactly 2 squares.
      </div>
    `
    },
    diagram: makeGrid(5, 5, {
      '2,2': { text: '🐘', piece: true },
      '0,0': { highlight: true }, '0,4': { highlight: true },
      '4,0': { highlight: true }, '4,4': { highlight: true },
    })
  },

  // Lesson 4: Long Range
  {
    title: {
      tr: '🎯 Uzun Menzilli Taşlar',
      en: '🎯 Long Range Pieces'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '♜',
          name: 'Kale',
          subtitle: 'En tanıdık uzun menzil.',
          move: 'Yatay veya dikey sınırsız kare.',
          capture: 'Yol açıksa aynı hat üzerinde alır.',
          note: 'Açık hat bulduğunda en güçlü taşlardan biridir.',
          diagram: mini(7, 7, {
            '0,3': { highlight: true }, '1,3': { highlight: true }, '2,3': { highlight: true },
            '3,0': { highlight: true }, '3,1': { highlight: true }, '3,2': { highlight: true }, '3,3': { text: '♜', piece: true }, '3,4': { highlight: true }, '3,5': { highlight: true }, '3,6': { highlight: true },
            '4,3': { highlight: true }, '5,3': { highlight: true }, '6,3': { highlight: true }
          })
        },
        {
          icon: '👁️',
          name: 'Gözcü',
          subtitle: 'Uzun çapraz baskı taşı.',
          move: 'Çapraz sınırsız gider ama en az 2 kare gitmelidir.',
          capture: 'Açık çapraz hatta alır.',
          note: 'Yan çapraz kareye gidemez; bu fark çok önemlidir.',
          diagram: mini(7, 7, {
            '0,0': { highlight: true }, '0,6': { highlight: true },
            '1,1': { highlight: true }, '1,5': { highlight: true },
            '3,3': { text: '👁️', piece: true },
            '5,1': { highlight: true }, '5,5': { highlight: true },
            '6,0': { highlight: true }, '6,6': { highlight: true }
          })
        },
        {
          icon: '🦒',
          name: 'Zürafa',
          subtitle: 'Oyunun en farklı hareketi.',
          move: 'Önce 1 çapraz, sonra aynı yönde en az 3 düz.',
          capture: 'Yol açık olmalı; zıplayamaz.',
          note: 'Doğru koridoru bulursa çok uzak karelere baskı kurar.',
          diagram: mini(7, 7, {
            '3,3': { text: '🦒', piece: true },
            '2,2': { attack: true }, '2,1': { highlight: true }, '2,0': { highlight: true },
            '4,4': { attack: true }, '4,5': { highlight: true }, '4,6': { highlight: true },
            '2,4': { attack: true }, '1,4': { highlight: true }, '0,4': { highlight: true }
          })
        }
      ])}
      <h4>♜ Kale (Rook)</h4>
      <p>Modern satrançtaki kale ile aynıdır. Yatay ve dikey yönlerde <strong>sınırsız mesafe</strong> gidebilir.</p>
      
      <h4>👁️ Gözcü / Kazık (Picket)</h4>
      <p>Çapraz yönlerde <strong>sınırsız mesafe</strong> gidebilir, ancak minimum <strong>2 kare</strong> gitmelidir. 
      Yani hemen yanı başındaki çapraz kareye gidemez!</p>
      
      <div class="rule-box">
        👁️ Gözcü en az 2 kare çapraz gitmelidir. 1 kare çapraz hareket edemez.
      </div>
      
      <h4>🦒 Zürafa (Giraffe)</h4>
      <p>En ilginç Timurlenk taşı! Hareketi iki aşamalıdır:</p>
      <ol>
        <li>Önce <strong>1 kare çapraz</strong> ilerler</li>
        <li>Sonra aynı yönde <strong>en az 3 kare düz</strong> devam eder</li>
      </ol>
      <p>Yol boyunca hiçbir taş engel olmamalıdır (zıplayamaz).</p>
      
      <div class="tip-box">
        💡 Zürafa, doğru konumda çok güçlü olabilir ama yolu açık olmak zorundadır.
      </div>
    `,
      en: `
      ${movementCards([
        {
          icon: '♜',
          name: 'Rook',
          subtitle: 'The familiar long-range piece.',
          move: 'Any distance horizontally or vertically.',
          capture: 'Captures on the same open line.',
          note: 'One of the strongest pieces when files open.',
          diagram: mini(7, 7, {
            '0,3': { highlight: true }, '1,3': { highlight: true }, '2,3': { highlight: true },
            '3,0': { highlight: true }, '3,1': { highlight: true }, '3,2': { highlight: true }, '3,3': { text: '♜', piece: true }, '3,4': { highlight: true }, '3,5': { highlight: true }, '3,6': { highlight: true },
            '4,3': { highlight: true }, '5,3': { highlight: true }, '6,3': { highlight: true }
          })
        },
        {
          icon: '👁️',
          name: 'Picket',
          subtitle: 'Long diagonal pressure piece.',
          move: 'Any diagonal distance, but at least 2 squares.',
          capture: 'Captures along an open diagonal.',
          note: 'It cannot move to the adjacent diagonal square.',
          diagram: mini(7, 7, {
            '0,0': { highlight: true }, '0,6': { highlight: true },
            '1,1': { highlight: true }, '1,5': { highlight: true },
            '3,3': { text: '👁️', piece: true },
            '5,1': { highlight: true }, '5,5': { highlight: true },
            '6,0': { highlight: true }, '6,6': { highlight: true }
          })
        },
        {
          icon: '🦒',
          name: 'Giraffe',
          subtitle: 'The strangest movement in the game.',
          move: '1 diagonal first, then at least 3 straight in the same direction.',
          capture: 'The path must be clear; it cannot jump.',
          note: 'It creates pressure through long corridors.',
          diagram: mini(7, 7, {
            '3,3': { text: '🦒', piece: true },
            '2,2': { attack: true }, '2,1': { highlight: true }, '2,0': { highlight: true },
            '4,4': { attack: true }, '4,5': { highlight: true }, '4,6': { highlight: true },
            '2,4': { attack: true }, '1,4': { highlight: true }, '0,4': { highlight: true }
          })
        }
      ], 'en')}
      <h4>♜ Rook</h4>
      <p>Identical to the modern chess rook. It moves <strong>any distance</strong> orthogonally (horizontally or vertically).</p>
      
      <h4>👁️ Picket (Tali'ah)</h4>
      <p>Moves <strong>any distance</strong> diagonally, but MUST move at least <strong>2 squares</strong>. It cannot move to the immediate diagonal square!</p>
      
      <div class="rule-box">
        👁️ Picket must move at least 2 squares diagonally. It cannot move just 1 square.
      </div>
      
      <h4>🦒 Giraffe</h4>
      <p>The most unique Tamerlane piece! Its movement has two stages:</p>
      <ol>
        <li>First, move <strong>1 square diagonally</strong>.</li>
        <li>Then, continue <strong>at least 3 squares straight</strong> in the same direction.</li>
      </ol>
      <p>It cannot leap over intermediate pieces; the path must be clear.</p>
      
      <div class="tip-box">
        💡 The Giraffe can be extremely powerful in the right position, but it requires an open path.
      </div>
    `
    },
    diagram: makeGrid(7, 7, {
      '3,3': { text: '♜', piece: true },
      '3,0': { highlight: true }, '3,1': { highlight: true }, '3,2': { highlight: true },
      '3,4': { highlight: true }, '3,5': { highlight: true }, '3,6': { highlight: true },
      '0,3': { highlight: true }, '1,3': { highlight: true }, '2,3': { highlight: true },
      '4,3': { highlight: true }, '5,3': { highlight: true }, '6,3': { highlight: true },
    })
  },

  // Lesson 5: Pawn System
  {
    title: {
      tr: '♟️ Piyon Sistemi',
      en: '♟️ Pawn System'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '♟',
          name: 'Piyon',
          subtitle: 'Yavaş ama terfi tehdidi taşır.',
          move: 'Her zaman ileri 1 kare.',
          capture: 'Çapraz ileri 1 kare alır.',
          note: 'İlk hamlede çift kare yoktur. Karşı sıraya ulaşınca kendi türündeki taşa terfi eder.',
          diagram: mini(5, 5, {
            '3,2': { text: '♟', piece: true },
            '2,2': { highlight: true },
            '2,1': { attack: true },
            '2,3': { attack: true },
            '0,0': { text: '★', highlight: true }, '0,1': { text: '★', highlight: true }, '0,2': { text: '★', highlight: true }, '0,3': { text: '★', highlight: true }, '0,4': { text: '★', highlight: true }
          })
        },
        {
          icon: '👑',
          name: 'Şahın Piyonu',
          subtitle: 'Terfi ettiğinde Prens olur.',
          move: 'Piyon gibi ileri yürür.',
          capture: 'Piyon gibi çapraz alır.',
          note: 'Prens yeni kraliyet taşıdır; oyun sonlarında çok değerlidir.',
          diagram: mini(5, 5, {
            '3,2': { text: '♟', piece: true },
            '2,2': { highlight: true },
            '1,2': { highlight: true },
            '0,2': { text: '♔', piece: true, highlight: true }
          })
        }
      ])}
      <p>Timurlenk satrancında <strong>11 farklı piyon türü</strong> vardır! Her piyon, kendi ismindeki taşa terfi eder.</p>
      
      <h4>Piyon Hareketi</h4>
      <ul>
        <li>İleri <strong>1 kare</strong> hareket eder (ilk hamlede de sadece 1)</li>
        <li>Çapraz <strong>1 kare</strong> ile taş alır</li>
        <li>Geri gidemez</li>
      </ul>
      
      <h4>Terfi Kuralları</h4>
      <p>Piyon karşı sıraya ulaştığında, ismindeki taşa dönüşür:</p>
      <ul>
        <li>🐴 <strong>Atın Piyonu →</strong> At</li>
        <li>🐘 <strong>Filin Piyonu →</strong> Fil</li>
        <li>🐫 <strong>Devenin Piyonu →</strong> Deve</li>
        <li>⚙️ <strong>Dabbabanın Piyonu →</strong> Dabbaba</li>
        <li>🦒 <strong>Zürafanın Piyonu →</strong> Zürafa</li>
        <li>👁️ <strong>Gözcünün Piyonu →</strong> Gözcü</li>
        <li>♜ <strong>Kalenin Piyonu →</strong> Kale</li>
        <li>♕ <strong>Vezirin Piyonu →</strong> Vezir</li>
        <li>☆ <strong>Bakanın Piyonu →</strong> Bakan</li>
        <li>👑 <strong>Şahın Piyonu →</strong> Prens</li>
      </ul>
      
      <div class="warning-box">
        ⚠️ <strong>Piyonların Piyonu</strong> özel bir kurala sahiptir — Ders 7'de detaylı açıklanacak!
      </div>
    `,
      en: `
      ${movementCards([
        {
          icon: '♟',
          name: 'Pawn',
          subtitle: 'Slow, but promotion is dangerous.',
          move: 'Always 1 square forward.',
          capture: 'Captures 1 square diagonally forward.',
          note: 'No two-square first move. It promotes to the piece named by its pawn type.',
          diagram: mini(5, 5, {
            '3,2': { text: '♟', piece: true },
            '2,2': { highlight: true },
            '2,1': { attack: true },
            '2,3': { attack: true },
            '0,0': { text: '★', highlight: true }, '0,1': { text: '★', highlight: true }, '0,2': { text: '★', highlight: true }, '0,3': { text: '★', highlight: true }, '0,4': { text: '★', highlight: true }
          })
        },
        {
          icon: '👑',
          name: 'Pawn of Kings',
          subtitle: 'Promotes into a Prince.',
          move: 'Moves like a pawn.',
          capture: 'Captures like a pawn.',
          note: 'The Prince is a new royal piece and matters a lot in endgames.',
          diagram: mini(5, 5, {
            '3,2': { text: '♟', piece: true },
            '2,2': { highlight: true },
            '1,2': { highlight: true },
            '0,2': { text: '♔', piece: true, highlight: true }
          })
        }
      ], 'en')}
      <p>In Tamerlane Chess, there are <strong>11 different types of pawns</strong>! Each pawn promotes to the specific piece it is named after.</p>
      
      <h4>Pawn Movement</h4>
      <ul>
        <li>Moves <strong>1 square forward</strong> (always 1, even on the first move).</li>
        <li>Captures <strong>1 square diagonally</strong>.</li>
        <li>Cannot move backwards.</li>
      </ul>
      
      <h4>Promotion Rules</h4>
      <p>When a pawn reaches the opponent's back rank, it promotes to its corresponding piece:</p>
      <ul>
        <li>🐴 <strong>Pawn of Knights →</strong> Knight</li>
        <li>🐘 <strong>Pawn of Elephants →</strong> Elephant</li>
        <li>🐫 <strong>Pawn of Camels →</strong> Camel</li>
        <li>⚙️ <strong>Pawn of War Engines →</strong> Dabbaba</li>
        <li>🦒 <strong>Pawn of Giraffes →</strong> Giraffe</li>
        <li>👁️ <strong>Pawn of Pickets →</strong> Picket</li>
        <li>♜ <strong>Pawn of Rooks →</strong> Rook</li>
        <li>♕ <strong>Pawn of Viziers →</strong> Vizier</li>
        <li>☆ <strong>Pawn of Generals →</strong> General</li>
        <li>👑 <strong>Pawn of Kings →</strong> Prince</li>
      </ul>
      
      <div class="warning-box">
        ⚠️ <strong>The Pawn of Pawns</strong> has a special rule — explained in detail in Lesson 7!
      </div>
    `
    },
    diagram: makeGrid(5, 5, {
      '3,2': { text: '♟', piece: true },
      '2,2': { highlight: true },
      '2,1': { attack: true },
      '2,3': { attack: true },
    })
  },

  // Lesson 6: Special Rules
  {
    title: {
      tr: '⚡ Özel Kurallar',
      en: '⚡ Special Rules'
    },
    content: {
      tr: `
      ${movementCards([
        {
          icon: '🔄',
          name: 'Fidye Hamlesi',
          subtitle: 'Şah tehdit altındayken tek kullanımlık kaçış.',
          move: 'Şah, kendi taşlarından biriyle yer değiştirir.',
          note: 'Her oyuncu oyunda sadece 1 kez kullanabilir.',
          diagram: mini(5, 5, {
            '2,1': { text: '♔', piece: true, attack: true },
            '2,3': { text: '♞', piece: true, highlight: true },
            '2,2': { text: '↔' }
          })
        },
        {
          icon: '⚔️',
          name: 'Pat = Zafer',
          subtitle: 'Modern satrançtan farklıdır.',
          move: 'Rakibe legal hamle bırakmazsan kazanırsın.',
          note: 'Bu oyunda pat beraberlik değil, sonuç almanın bir yoludur.',
          diagram: mini(5, 5, {
            '0,2': { text: '♚', piece: true, attack: true },
            '1,1': { highlight: true }, '1,2': { highlight: true }, '1,3': { highlight: true },
            '3,2': { text: '♜', piece: true }
          })
        },
        {
          icon: '🔁',
          name: 'Piyonların Piyonu',
          subtitle: '3 aşamalı özel terfi.',
          move: 'Karşı sıraya ulaştıkça geri döner; 3. ulaşmada Eğreti Şah olur.',
          note: 'Uzun oyunlarda sürpriz kraliyet taşı kazandırır.',
          diagram: mini(5, 5, {
            '4,2': { text: '♟', piece: true },
            '2,2': { text: '↟', highlight: true },
            '0,2': { text: '♔', piece: true, highlight: true }
          })
        }
      ])}
      <h4>🔄 Fidye Hamlesi (Ransom Move)</h4>
      <p>Şah tehdit altındayken, oyun boyunca <strong>1 kez</strong> herhangi bir kendi taşıyla yer değiştirebilir. 
      Bu kural sadece Timurlenk satrancına özgüdür.</p>
      
      <div class="rule-box">
        Her taraf oyun boyunca sadece <strong>1 kez</strong> Fidye Hamlesi yapabilir.
      </div>
      
      <h4>🏰 Hisar Beraberliği</h4>
      <p>Şah (veya Prens/Eğreti Şah) rakibin Hisar karesine girerse oyun <strong>berabere</strong> biter.</p>
      
      <h4>🔁 Piyonların Piyonu — 3 Aşamalı Döngü</h4>
      <p>Piyonların Piyonu karşı sıraya ulaştığında özel bir süreç başlar:</p>
      <ol>
        <li><strong>1. Aşama:</strong> Karşı sıraya ulaşır → Başlangıç sırasına geri ışınlanır</li>
        <li><strong>2. Aşama:</strong> Tekrar karşı sıraya ulaşır → Yine geri ışınlanır</li>
        <li><strong>3. Aşama:</strong> 3. kez karşı sıraya ulaşırsa → <strong>Eğreti Şah</strong>'a dönüşür!</li>
      </ol>
      
      <h4>⚔️ Pat = Zafer!</h4>
      <p>Modern satranç kurallarından farklı olarak, Timurlenk satrancında rakibi <strong>pat</strong> durumuna düşüren 
      oyuncu <strong>kazanır</strong>!</p>
      
      <div class="warning-box">
        ⚠️ Dikkat: Pat = Beraberlik değil, <strong>Pat = Zafer</strong>!
      </div>
      
      <h4>👑 Çoklu Kral Sistemi</h4>
      <p>Aynı anda en fazla <strong>3 kraliyet taşı</strong> olabilir:</p>
      <ul>
        <li>Şah (ana kral)</li>
        <li>Prens (Şahın Piyonu terfi edince)</li>
        <li>Eğreti Şah (Piyonların Piyonu 3. aşama)</li>
      </ul>
    `,
      en: `
      ${movementCards([
        {
          icon: '🔄',
          name: 'Ransom Move',
          subtitle: 'A once-per-game royal escape under threat.',
          move: 'The Shah swaps with one friendly piece.',
          note: 'Each player can use it only once.',
          diagram: mini(5, 5, {
            '2,1': { text: '♔', piece: true, attack: true },
            '2,3': { text: '♞', piece: true, highlight: true },
            '2,2': { text: '↔' }
          })
        },
        {
          icon: '⚔️',
          name: 'Stalemate = Win',
          subtitle: 'Different from modern chess.',
          move: 'If the opponent has no legal move, you win.',
          note: 'Here stalemate is not a draw; it is a winning result.',
          diagram: mini(5, 5, {
            '0,2': { text: '♚', piece: true, attack: true },
            '1,1': { highlight: true }, '1,2': { highlight: true }, '1,3': { highlight: true },
            '3,2': { text: '♜', piece: true }
          })
        },
        {
          icon: '🔁',
          name: 'Pawn of Pawns',
          subtitle: 'A special 3-stage promotion.',
          move: 'It returns after reaching the back rank; on the 3rd arrival it becomes an Adventitious King.',
          note: 'A surprising royal piece in long games.',
          diagram: mini(5, 5, {
            '4,2': { text: '♟', piece: true },
            '2,2': { text: '↟', highlight: true },
            '0,2': { text: '♔', piece: true, highlight: true }
          })
        }
      ], 'en')}
      <h4>🔄 Ransom Move</h4>
      <p>When the King is under threat, it can swap places with any of its own pieces <strong>once per game</strong>. This rule is unique to Tamerlane Chess.</p>
      
      <div class="rule-box">
        Each side can perform the Ransom Move only <strong>once</strong> throughout the game.
      </div>
      
      <h4>🏰 Citadel Draw</h4>
      <p>If a King (or Prince/Adventitious King) enters the opponent's Citadel square, the game ends in a <strong>draw</strong>.</p>
      
      <h4>🔁 Pawn of Pawns — 3 Stage Cycle</h4>
      <p>When the Pawn of Pawns reaches the back rank, a special process begins:</p>
      <ol>
        <li><strong>Stage 1:</strong> Reaches back rank → Teleports back to its starting square.</li>
        <li><strong>Stage 2:</strong> Reaches back rank again → Teleports back to its starting square once more.</li>
        <li><strong>Stage 3:</strong> Reaches back rank for the 3rd time → Promotes to the <strong>Adventitious King</strong>!</li>
      </ol>
      
      <h4>⚔️ Stalemate = Victory!</h4>
      <p>Unlike modern chess, in Tamerlane Chess, the player who puts the opponent in <strong>stalemate wins</strong> the game!</p>
      
      <div class="warning-box">
        ⚠️ Note: Stalemate is not a draw; <strong>Stalemate = Victory</strong>!
      </div>
      
      <h4>👑 Multi-King System</h4>
      <p>A side can have up to <strong>3 royal pieces</strong> simultaneously:</p>
      <ul>
        <li>Shah (The original King)</li>
        <li>Prince (Promoted from the Pawn of Kings)</li>
        <li>Adventitious King (Promoted via 3 stages of the Pawn of Pawns)</li>
      </ul>
    `
    }
  },

  // Lesson 7: Strategy Tips
  {
    title: {
      tr: '🧠 Strateji İpuçları',
      en: '🧠 Strategy Tips'
    },
    content: {
      tr: `
      <h4>🎯 Açılış Stratejisi</h4>
      <ul>
        <li>Piyonları merkeze doğru ilerletin</li>
        <li>At ve Deve'yi erken çıkarın (L hareketi güçlüdür)</li>
        <li>Zürafa'yı açık hatlardan kullanın</li>
        <li>Şahınızı güvende tutun (Hisar'a yakın)</li>
      </ul>
      
      <h4>🏰 Orta Oyun</h4>
      <ul>
        <li><strong>Merkez kontrolü</strong> çok önemlidir — 5. ve 6. sütunlar kritiktir</li>
        <li>Kale ve Gözcüyü açık hatlardan kullanın</li>
        <li>Fidye hamlesini son çare olarak saklayın</li>
        <li>Piyon terfileri büyük avantaj sağlar</li>
      </ul>
      
      <h4>⚔️ Son Oyun</h4>
      <ul>
        <li>Rakibi <strong>pat</strong> durumuna düşürmek bir zaferdir!</li>
        <li>Hisar'a giriş ile beraberlik imkanınız var</li>
        <li>Piyonların Piyonu'nu 3 kez ilerletip Eğreti Şah kazanın</li>
        <li>Sayısal üstünlükle mat arayın</li>
      </ul>
      
      <div class="tip-box">
        💡 <strong>Altın Kural:</strong> Timurlenk satranç, modern satrançtan daha saldırgan bir oyundur. 
        Pasif oynamak yerine aktif taş geliştirmeye odaklanın!
      </div>
      
      <h4>🎖️ Taş Değerleri (Yaklaşık)</h4>
      <ul>
        <li>♜ Kale: ★★★★★</li>
        <li>🦒 Zürafa: ★★★★</li>
        <li>👁️ Gözcü: ★★★★</li>
        <li>🐫 Deve: ★★★</li>
        <li>♞ At: ★★★</li>
        <li>🐘 Fil: ★★</li>
        <li>⚙️ Dabbaba: ★★</li>
        <li>☆ Bakan / ♕ Vezir: ★</li>
      </ul>
    `,
      en: `
      <h4>🎯 Opening Strategy</h4>
      <ul>
        <li>Advance pawns towards the center.</li>
        <li>Develop the Knight and Camel early (L-jumps are powerful).</li>
        <li>Utilize the Giraffe through open files.</li>
        <li>Keep your Shah safe (near your Citadel).</li>
      </ul>
      
      <h4>🏰 Mid-Game</h4>
      <ul>
        <li><strong>Center control</strong> is vital — columns 5 and 6 are critical.</li>
        <li>Use Rooks and Pickets through open lines.</li>
        <li>Save the Ransom Move as a last resort.</li>
        <li>Pawn promotions provide a massive advantage.</li>
      </ul>
      
      <h4>⚔️ Endgame</h4>
      <ul>
        <li>Forcing a <strong>stalemate</strong> is a victory!</li>
        <li>Citadel entry allows for a draw if you're losing.</li>
        <li>Advance the Pawn of Pawns 3 times to gain an Adventitious King.</li>
        <li>Seek checkmate through numerical superiority.</li>
      </ul>
      
      <div class="tip-box">
        💡 <strong>Golden Rule:</strong> Tamerlane Chess is more aggressive than modern chess. Focus on active development rather than passive defense!
      </div>
      
      <h4>🎖️ Piece Values (Approximate)</h4>
      <ul>
        <li>♜ Rook: ★★★★★</li>
        <li>🦒 Giraffe: ★★★★</li>
        <li>👁️ Picket: ★★★★</li>
        <li>🐫 Camel: ★★★</li>
        <li>♞ Knight: ★★★</li>
        <li>🐘 Elephant: ★★</li>
        <li>⚙️ Dabbaba: ★★</li>
        <li>☆ General / ♕ Vizier: ★</li>
      </ul>
    `
    }
  }
];
