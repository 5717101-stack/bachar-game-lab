// ============================================================
// Parkour Princess — Game Engine
// A parkour / endless-runner game for girls
// ============================================================

// ─── Level Definitions ──────────────────────────────────────
const LEVELS = [
  {
    name: "עולם הלבבות",
    emoji: "♥️",
    collectEmoji: "♥️",
    target: 12,
    speed: 3.0,
    bgTop: "#ffe0ec",
    bgBottom: "#ffb6c1",
    platformColor: "#ff69b4",
    platformLight: "#ffb6c1",
    decoEmojis: ["♥️", "💕", "💗", "💖"],
    gapMin: 80,
    gapMax: 150,
    platMin: 90,
    platMax: 180,
  },
  {
    name: "עולם הפפיונים",
    emoji: "🎀",
    collectEmoji: "🎀",
    target: 14,
    speed: 3.3,
    bgTop: "#f3e5f5",
    bgBottom: "#ce93d8",
    platformColor: "#ab47bc",
    platformLight: "#ce93d8",
    decoEmojis: ["🎀", "🎀", "✨", "💜"],
    gapMin: 90,
    gapMax: 160,
    platMin: 85,
    platMax: 170,
  },
  {
    name: "קאפקייקס ונצנצים",
    emoji: "🧁",
    collectEmoji: "🧁",
    target: 16,
    speed: 3.6,
    bgTop: "#fce4ec",
    bgBottom: "#f48fb1",
    platformColor: "#ec407a",
    platformLight: "#f48fb1",
    decoEmojis: ["🧁", "✨", "🍰", "❤️"],
    gapMin: 95,
    gapMax: 170,
    platMin: 80,
    platMax: 160,
  },
  {
    name: "סוכריות צבעוניות",
    emoji: "🍭",
    collectEmoji: "🍭",
    target: 18,
    speed: 3.9,
    bgTop: "#e8f5e9",
    bgBottom: "#a5d6a7",
    platformColor: "#66bb6a",
    platformLight: "#a5d6a7",
    decoEmojis: ["🍭", "🍬", "🌈", "⭐"],
    gapMin: 100,
    gapMax: 175,
    platMin: 75,
    platMax: 155,
  },
  {
    name: "עצבי את הדמות",
    emoji: "👗",
    collectEmoji: "✨",
    target: 8,  // 8 unique clothing items to collect
    speed: 3.8,
    bgTop: "#fff8e1",
    bgBottom: "#ffe082",
    platformColor: "#ffb300",
    platformLight: "#ffe082",
    decoEmojis: ["✨", "💫", "⭐", "🌟"],
    gapMin: 90,
    gapMax: 165,
    platMin: 80,
    platMax: 160,
    isDressUp: true,
    dressUpItems: [
      { emoji: "👗", name: "שמלה",    slot: "dress" },
      { emoji: "👠", name: "נעליים",   slot: "shoes" },
      { emoji: "👜", name: "תיק",     slot: "bag" },
      { emoji: "💍", name: "טבעת",    slot: "ring" },
      { emoji: "👑", name: "כתר",     slot: "crown" },
      { emoji: "💄", name: "איפור",   slot: "makeup" },
      { emoji: "🕶️", name: "משקפיים", slot: "glasses" },
      { emoji: "📿", name: "שרשרת",   slot: "necklace" },
    ],
  },
  {
    name: "עולם האופנה",
    emoji: "👗",
    collectEmoji: "👗",
    target: 22,
    speed: 4.4,
    bgTop: "#f3e5f5",
    bgBottom: "#ba68c8",
    platformColor: "#8e24aa",
    platformLight: "#ba68c8",
    decoEmojis: ["👗", "👠", "💎", "💄"],
    gapMin: 110,
    gapMax: 190,
    platMin: 65,
    platMax: 145,
  },
];

// ─── Game Constants ─────────────────────────────────────────
const W = 800;
const H = 500;
const GRAVITY = 0.55;
const JUMP_VEL = -11.5;
const DOUBLE_JUMP_VEL = -10;
const PLAYER_X = 120;
const PLAT_H = 14;
const DEATH_Y = H + 60;

// ─── Utility ────────────────────────────────────────────────
function rand(min, max) {
  return Math.random() * (max - min) + min;
}
function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

// ─── Audio (simple Web Audio beeps) ─────────────────────────
class SFX {
  constructor() {
    this.ctx = null;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (_) {}
  }
  _play(freq, dur, type = "sine", vol = 0.12) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = vol;
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start();
    o.stop(this.ctx.currentTime + dur);
  }
  jump() {
    this._play(520, 0.12, "sine", 0.08);
  }
  doubleJump() {
    this._play(680, 0.15, "sine", 0.08);
  }
  collect() {
    this._play(880, 0.1, "sine", 0.1);
    setTimeout(() => this._play(1100, 0.15, "sine", 0.08), 60);
  }
  levelUp() {
    [0, 80, 160, 240, 320].forEach((d, i) =>
      setTimeout(() => this._play(600 + i * 100, 0.2, "sine", 0.1), d)
    );
  }
  fall() {
    this._play(200, 0.4, "sawtooth", 0.08);
  }
  victory() {
    [0, 120, 240, 360, 480, 600].forEach((d, i) =>
      setTimeout(() => this._play(523 + i * 80, 0.3, "sine", 0.1), d)
    );
  }
}

// ─── Particle ───────────────────────────────────────────────
class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = rand(-3, 3);
    this.vy = rand(-5, -1);
    this.r = rand(2, 5);
    this.color = color;
    this.life = 1;
    this.decay = rand(0.02, 0.05);
  }
  update(speed) {
    this.x -= speed * 0.3;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.1;
    this.life -= this.decay;
  }
  draw(ctx) {
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r * this.life, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  get alive() {
    return this.life > 0;
  }
}

// ─── Sparkle trail behind player ────────────────────────────
class Trail {
  constructor() {
    this.dots = [];
  }
  add(x, y) {
    if (Math.random() < 0.4) {
      this.dots.push({
        x,
        y: y + rand(-4, 4),
        r: rand(1.5, 3.5),
        life: 1,
        decay: rand(0.03, 0.06),
        color: ["#ff69b4", "#ffb6c1", "#fff", "#ffd700"][randInt(0, 3)],
      });
    }
  }
  update(speed) {
    this.dots.forEach((d) => {
      d.x -= speed;
      d.life -= d.decay;
    });
    this.dots = this.dots.filter((d) => d.life > 0);
  }
  draw(ctx) {
    this.dots.forEach((d) => {
      ctx.globalAlpha = d.life * 0.6;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r * d.life, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
}

// ─── Platform ───────────────────────────────────────────────
class Platform {
  constructor(x, y, w, color, lightColor) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = PLAT_H;
    this.color = color;
    this.light = lightColor;
  }
  update(speed) {
    this.x -= speed;
  }
  draw(ctx) {
    const r = 7;
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    roundRect(ctx, this.x + 3, this.y + 3, this.w, this.h, r);
    // Main
    const grad = ctx.createLinearGradient(
      this.x,
      this.y,
      this.x,
      this.y + this.h
    );
    grad.addColorStop(0, this.light);
    grad.addColorStop(1, this.color);
    ctx.fillStyle = grad;
    roundRect(ctx, this.x, this.y, this.w, this.h, r);
    // Shine line
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    roundRect(ctx, this.x + 4, this.y + 2, this.w - 8, 4, 2);
  }
  get right() {
    return this.x + this.w;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

// ─── Collectible ────────────────────────────────────────────
class Collectible {
  constructor(x, y, emoji) {
    this.x = x;
    this.y = y;
    this.emoji = emoji;
    this.baseY = y;
    this.phase = rand(0, Math.PI * 2);
    this.collected = false;
    this.size = 26;
  }
  update(speed, time) {
    this.x -= speed;
    this.y = this.baseY + Math.sin(time * 3 + this.phase) * 6;
  }
  draw(ctx) {
    if (this.collected) return;
    // Glow
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 18, 0, Math.PI * 2);
    ctx.fill();
    // Emoji
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y);
  }
}

// ─── Background decoration (floating emojis) ───────────────
class BgDeco {
  constructor(emoji) {
    this.emoji = emoji;
    this.x = rand(0, W);
    this.y = rand(20, H * 0.6);
    this.size = rand(14, 24);
    this.speedFactor = rand(0.15, 0.4);
    this.phase = rand(0, Math.PI * 2);
    this.alpha = rand(0.1, 0.25);
  }
  update(speed) {
    this.x -= speed * this.speedFactor;
    if (this.x < -30) {
      this.x = W + 30;
      this.y = rand(20, H * 0.6);
    }
  }
  draw(ctx, time) {
    const floatY = Math.sin(time * 1.5 + this.phase) * 8;
    ctx.globalAlpha = this.alpha;
    ctx.font = `${this.size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.x, this.y + floatY);
    ctx.globalAlpha = 1;
  }
}

// ─── Dress-Up Doll (Level 5 special) ────────────────────────
class DressUpDoll {
  constructor(items) {
    this.items = items;         // Array of { emoji, name, slot }
    this.collected = new Set(); // Set of slot names collected
    this.flashSlot = null;      // Slot that just got collected (for animation)
    this.flashTimer = 0;
  }

  reset() {
    this.collected.clear();
    this.flashSlot = null;
    this.flashTimer = 0;
  }

  collectSlot(slot) {
    if (this.collected.has(slot)) return false; // Already have it
    this.collected.add(slot);
    this.flashSlot = slot;
    this.flashTimer = 30; // frames of flash animation
    return true; // New item!
  }

  get uniqueCount() {
    return this.collected.size;
  }

  draw(ctx, time) {
    // Draw panel on the right side
    const px = 650; // panel x
    const py = 70;  // panel y
    const pw = 135;
    const ph = 390;

    // Panel background
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    ctx.beginPath();
    const r = 16;
    ctx.moveTo(px + r, py);
    ctx.lineTo(px + pw - r, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + r);
    ctx.lineTo(px + pw, py + ph - r);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
    ctx.lineTo(px + r, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
    ctx.lineTo(px, py + r);
    ctx.quadraticCurveTo(px, py, px + r, py);
    ctx.closePath();
    ctx.fill();

    // Panel border glow
    ctx.strokeStyle = "rgba(255, 183, 0, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Title
    ctx.fillStyle = "#bf360c";
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✨ עצבי אותה! ✨", px + pw / 2, py + 18);

    // Draw mannequin silhouette
    const mx = px + pw / 2; // mannequin center x
    const my = py + 130;    // mannequin center y

    // Head
    ctx.fillStyle = "#FFD5B4";
    ctx.beginPath();
    ctx.arc(mx, my - 55, 18, 0, Math.PI * 2);
    ctx.fill();

    // Hair (always visible)
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(mx, my - 58, 18, Math.PI * 0.85, Math.PI * 2.15);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx, my - 62, 17, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    // Long hair sides
    ctx.beginPath();
    ctx.moveTo(mx - 17, my - 50);
    ctx.quadraticCurveTo(mx - 22, my - 20, mx - 15, my + 10);
    ctx.lineTo(mx - 10, my + 5);
    ctx.quadraticCurveTo(mx - 16, my - 15, mx - 14, my - 48);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(mx + 17, my - 50);
    ctx.quadraticCurveTo(mx + 22, my - 20, mx + 15, my + 10);
    ctx.lineTo(mx + 10, my + 5);
    ctx.quadraticCurveTo(mx + 16, my - 15, mx + 14, my - 48);
    ctx.fill();

    // Face — eyes
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(mx - 6, my - 55, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + 6, my - 55, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(mx - 5, my - 56, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(mx + 7, my - 56, 1, 0, Math.PI * 2);
    ctx.fill();
    // Blush
    ctx.fillStyle = "rgba(255,130,150,0.3)";
    ctx.beginPath();
    ctx.ellipse(mx - 11, my - 51, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(mx + 11, my - 51, 4, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Smile
    ctx.strokeStyle = "#E91E63";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(mx, my - 50, 5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Body silhouette (if no dress)
    if (!this.collected.has("dress")) {
      // Simple body outline
      ctx.fillStyle = "#FFD5B4";
      ctx.fillRect(mx - 8, my - 35, 16, 30);
      // Legs
      ctx.fillRect(mx - 7, my - 5, 6, 35);
      ctx.fillRect(mx + 1, my - 5, 6, 35);
      // Arms
      ctx.fillRect(mx - 16, my - 33, 6, 22);
      ctx.fillRect(mx + 10, my - 33, 6, 22);
      // Underwear placeholder
      ctx.fillStyle = "#ffcdd2";
      roundRect(ctx, mx - 10, my - 36, 20, 24, 3);
    } else {
      // ── Dress ──
      const isFlash = this.flashSlot === "dress" && this.flashTimer > 0;
      const dg = ctx.createLinearGradient(mx, my - 36, mx, my + 30);
      dg.addColorStop(0, isFlash ? "#ff80ab" : "#e91e63");
      dg.addColorStop(1, isFlash ? "#f48fb1" : "#ad1457");
      ctx.fillStyle = dg;
      // Dress shape — fitted top, flared skirt
      ctx.beginPath();
      ctx.moveTo(mx - 12, my - 36);  // top left
      ctx.lineTo(mx + 12, my - 36);  // top right
      ctx.lineTo(mx + 10, my - 10);  // waist right
      ctx.quadraticCurveTo(mx + 25, my + 25, mx + 22, my + 32); // skirt right
      ctx.lineTo(mx - 22, my + 32);  // skirt bottom
      ctx.quadraticCurveTo(mx - 25, my + 25, mx - 10, my - 10); // skirt left
      ctx.closePath();
      ctx.fill();
      // Dress belt
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillRect(mx - 10, my - 12, 20, 3);
      // Arms (skin color, over dress)
      ctx.fillStyle = "#FFD5B4";
      ctx.fillRect(mx - 18, my - 33, 6, 22);
      ctx.fillRect(mx + 12, my - 33, 6, 22);
      // Legs below dress
      ctx.fillStyle = "#FFD5B4";
      ctx.fillRect(mx - 6, my + 30, 5, 12);
      ctx.fillRect(mx + 1, my + 30, 5, 12);
    }

    // ── Shoes ──
    if (this.collected.has("shoes")) {
      const isFlash = this.flashSlot === "shoes" && this.flashTimer > 0;
      ctx.fillStyle = isFlash ? "#ff6090" : "#d81b60";
      // Left shoe
      ctx.beginPath();
      ctx.ellipse(mx - 4, my + 43, 6, 3, -0.1, 0, Math.PI * 2);
      ctx.fill();
      // Right shoe
      ctx.beginPath();
      ctx.ellipse(mx + 4, my + 43, 6, 3, 0.1, 0, Math.PI * 2);
      ctx.fill();
      // Heels
      ctx.fillRect(mx - 8, my + 41, 2, 4);
      ctx.fillRect(mx + 6, my + 41, 2, 4);
    }

    // ── Crown ──
    if (this.collected.has("crown")) {
      const isFlash = this.flashSlot === "crown" && this.flashTimer > 0;
      ctx.fillStyle = isFlash ? "#ffeb3b" : "#ffd700";
      ctx.beginPath();
      ctx.moveTo(mx - 12, my - 70);
      ctx.lineTo(mx - 9, my - 80);
      ctx.lineTo(mx - 4, my - 72);
      ctx.lineTo(mx, my - 82);
      ctx.lineTo(mx + 4, my - 72);
      ctx.lineTo(mx + 9, my - 80);
      ctx.lineTo(mx + 12, my - 70);
      ctx.closePath();
      ctx.fill();
      // Jewels on crown
      ctx.fillStyle = "#e91e63";
      ctx.beginPath();
      ctx.arc(mx, my - 76, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2196f3";
      ctx.beginPath();
      ctx.arc(mx - 7, my - 74, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(mx + 7, my - 74, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Necklace ──
    if (this.collected.has("necklace")) {
      const isFlash = this.flashSlot === "necklace" && this.flashTimer > 0;
      ctx.strokeStyle = isFlash ? "#ffab40" : "#ffd700";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my - 36, 10, 0.3, Math.PI - 0.3);
      ctx.stroke();
      // Pendant
      ctx.fillStyle = isFlash ? "#ff4081" : "#e91e63";
      ctx.beginPath();
      // Diamond shape
      ctx.moveTo(mx, my - 23);
      ctx.lineTo(mx - 4, my - 28);
      ctx.lineTo(mx, my - 33);
      ctx.lineTo(mx + 4, my - 28);
      ctx.closePath();
      ctx.fill();
    }

    // ── Bag ──
    if (this.collected.has("bag")) {
      const isFlash = this.flashSlot === "bag" && this.flashTimer > 0;
      const bx = mx + 22;
      const by = my + 5;
      ctx.fillStyle = isFlash ? "#ff80ab" : "#c2185b";
      roundRect(ctx, bx, by, 14, 11, 3);
      // Handle
      ctx.strokeStyle = isFlash ? "#ff80ab" : "#c2185b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bx + 7, by, 5, Math.PI, 0);
      ctx.stroke();
      // Clasp
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(bx + 7, by + 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Ring ──
    if (this.collected.has("ring")) {
      const isFlash = this.flashSlot === "ring" && this.flashTimer > 0;
      const rx = mx - 19;
      const ry = my - 14;
      ctx.strokeStyle = isFlash ? "#ffeb3b" : "#ffd700";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(rx, ry, 4, 0, Math.PI * 2);
      ctx.stroke();
      // Gem
      ctx.fillStyle = isFlash ? "#80d8ff" : "#4fc3f7";
      ctx.beginPath();
      ctx.arc(rx, ry - 4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Glasses ──
    if (this.collected.has("glasses")) {
      const isFlash = this.flashSlot === "glasses" && this.flashTimer > 0;
      ctx.strokeStyle = isFlash ? "#7c4dff" : "#4a148c";
      ctx.lineWidth = 2;
      // Left lens
      ctx.beginPath();
      ctx.ellipse(mx - 7, my - 55, 7, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Right lens
      ctx.beginPath();
      ctx.ellipse(mx + 7, my - 55, 7, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Bridge
      ctx.beginPath();
      ctx.moveTo(mx - 1, my - 55);
      ctx.lineTo(mx + 1, my - 55);
      ctx.stroke();
      // Lens tint
      ctx.fillStyle = isFlash ? "rgba(124,77,255,0.2)" : "rgba(74,20,140,0.15)";
      ctx.beginPath();
      ctx.ellipse(mx - 7, my - 55, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mx + 7, my - 55, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Makeup (lipstick + blush enhancement) ──
    if (this.collected.has("makeup")) {
      // Enhanced lips
      ctx.fillStyle = "#e91e63";
      ctx.beginPath();
      ctx.arc(mx, my - 49, 5.5, 0.1, Math.PI - 0.1);
      ctx.fill();
      // Enhanced blush (bigger, more visible)
      ctx.fillStyle = "rgba(255,100,130,0.45)";
      ctx.beginPath();
      ctx.ellipse(mx - 12, my - 51, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(mx + 12, my - 51, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyelashes
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      // Left eye lashes
      ctx.beginPath();
      ctx.moveTo(mx - 9, my - 57);
      ctx.lineTo(mx - 10, my - 60);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx - 7, my - 58);
      ctx.lineTo(mx - 7, my - 61);
      ctx.stroke();
      // Right eye lashes
      ctx.beginPath();
      ctx.moveTo(mx + 9, my - 57);
      ctx.lineTo(mx + 10, my - 60);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(mx + 7, my - 58);
      ctx.lineTo(mx + 7, my - 61);
      ctx.stroke();
    }

    // ── Item checklist at bottom ──
    const startY = py + ph - 85;
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.textAlign = "right";

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const row = Math.floor(i / 2);
      const col = i % 2;
      const ix = px + pw - 10 - col * 65;
      const iy = startY + row * 20;

      const has = this.collected.has(item.slot);
      const isNewFlash = this.flashSlot === item.slot && this.flashTimer > 0;

      if (isNewFlash) {
        // Flash background
        ctx.fillStyle = "rgba(255, 215, 0, 0.4)";
        roundRect(ctx, ix - 55, iy - 9, 60, 17, 4);
      }

      ctx.fillStyle = has ? "#2e7d32" : "#bbb";
      ctx.fillText(
        `${has ? "✅" : "⬜"} ${item.emoji} ${item.name}`,
        ix,
        iy
      );
    }

    // Progress text
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#bf360c";
    ctx.fillText(
      `${this.collected.size} / ${this.items.length} פריטים`,
      px + pw / 2,
      py + ph - 8
    );

    // Decrement flash timer
    if (this.flashTimer > 0) this.flashTimer--;
  }
}

// ─── Player (the princess!) ─────────────────────────────────
class Player {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = PLAYER_X;
    this.y = 300;
    this.w = 30;
    this.h = 42;
    this.vy = 0;
    this.onGround = false;
    this.canDoubleJump = false;
    this.hasDoubleJumped = false;
    this.frame = 0;
    this.alive = true;
  }
  jump() {
    if (this.onGround) {
      this.vy = JUMP_VEL;
      this.onGround = false;
      this.canDoubleJump = true;
      this.hasDoubleJumped = false;
      return "jump";
    } else if (this.canDoubleJump && !this.hasDoubleJumped) {
      this.vy = DOUBLE_JUMP_VEL;
      this.hasDoubleJumped = true;
      return "double";
    }
    return null;
  }
  update() {
    this.vy += GRAVITY;
    this.y += this.vy;
    this.frame += 0.15;
    if (this.y > DEATH_Y) {
      this.alive = false;
    }
  }
  draw(ctx) {
    const x = this.x;
    const y = this.y;
    ctx.save();
    ctx.translate(x, y);

    // Running leg animation
    const legSwing = this.onGround ? Math.sin(this.frame * 6) * 0.5 : 0.3;

    // ── Shadow ──
    ctx.fillStyle = "rgba(0,0,0,0.1)";
    ctx.beginPath();
    ctx.ellipse(15, this.h + 2, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Legs ──
    ctx.save();
    ctx.translate(10, this.h - 14);
    ctx.rotate(legSwing);
    ctx.fillStyle = "#FFD5B4";
    ctx.fillRect(-3, 0, 6, 14);
    ctx.fillStyle = "#FF69B4";
    roundRect(ctx, -4, 11, 8, 5, 2);
    ctx.restore();

    ctx.save();
    ctx.translate(20, this.h - 14);
    ctx.rotate(-legSwing);
    ctx.fillStyle = "#FFD5B4";
    ctx.fillRect(-3, 0, 6, 14);
    ctx.fillStyle = "#FF69B4";
    roundRect(ctx, -4, 11, 8, 5, 2);
    ctx.restore();

    // ── Dress / body ──
    const dressGrad = ctx.createLinearGradient(0, 6, 0, this.h - 10);
    dressGrad.addColorStop(0, "#FF69B4");
    dressGrad.addColorStop(1, "#E91E63");
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(5, 10);
    ctx.lineTo(25, 10);
    ctx.lineTo(29, this.h - 12);
    ctx.lineTo(1, this.h - 12);
    ctx.closePath();
    ctx.fill();

    // Dress decoration — little sparkle
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(15, 20, 2, 0, Math.PI * 2);
    ctx.fill();

    // ── Arms ──
    const armSwing = this.onGround ? Math.sin(this.frame * 6 + 1) * 0.3 : -0.4;
    ctx.save();
    ctx.translate(4, 12);
    ctx.rotate(armSwing);
    ctx.fillStyle = "#FFD5B4";
    ctx.fillRect(-2, 0, 5, 12);
    ctx.restore();

    ctx.save();
    ctx.translate(26, 12);
    ctx.rotate(-armSwing);
    ctx.fillStyle = "#FFD5B4";
    ctx.fillRect(-2, 0, 5, 12);
    ctx.restore();

    // ── Head ──
    ctx.fillStyle = "#FFD5B4";
    ctx.beginPath();
    ctx.arc(15, 2, 11, 0, Math.PI * 2);
    ctx.fill();

    // ── Hair ──
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.arc(15, -1, 11, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();
    // Bangs
    ctx.beginPath();
    ctx.arc(15, -3, 11, Math.PI * 1.1, Math.PI * 1.9);
    ctx.fill();
    // Ponytail
    ctx.beginPath();
    ctx.moveTo(26, 0);
    ctx.quadraticCurveTo(38, 8, 33, 22);
    ctx.quadraticCurveTo(30, 12, 26, 4);
    ctx.fill();
    // Ponytail ribbon
    ctx.fillStyle = "#FF69B4";
    ctx.beginPath();
    ctx.arc(27, 2, 3, 0, Math.PI * 2);
    ctx.fill();

    // ── Eyes ──
    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.arc(11, 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(19, 2, 2, 0, Math.PI * 2);
    ctx.fill();
    // Eye shine
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(11.8, 1.2, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(19.8, 1.2, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // ── Blush ──
    ctx.fillStyle = "rgba(255,130,150,0.35)";
    ctx.beginPath();
    ctx.ellipse(7, 5, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(23, 5, 3.5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // ── Smile ──
    ctx.strokeStyle = "#E91E63";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(15, 4, 4, 0.15, Math.PI - 0.15);
    ctx.stroke();

    // ── Crown (small tiara) ──
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.moveTo(8, -8);
    ctx.lineTo(10, -14);
    ctx.lineTo(13, -9);
    ctx.lineTo(15, -15);
    ctx.lineTo(17, -9);
    ctx.lineTo(20, -14);
    ctx.lineTo(22, -8);
    ctx.closePath();
    ctx.fill();
    // Crown jewel
    ctx.fillStyle = "#FF69B4";
    ctx.beginPath();
    ctx.arc(15, -11, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  get hitbox() {
    return {
      x: this.x + 4,
      y: this.y - 6,
      w: this.w - 8,
      h: this.h + 4,
    };
  }
}

// ─── Main Game ──────────────────────────────────────────────
class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");
    this.canvas.width = W;
    this.canvas.height = H;

    this.sfx = new SFX();
    this.player = new Player();
    this.trail = new Trail();
    this.platforms = [];
    this.collectibles = [];
    this.particles = [];
    this.bgDecos = [];
    this.dressUpDoll = null; // Only used in dress-up levels

    this.levelIdx = 0;
    this.score = 0;
    this.time = 0;
    this.speed = 3;
    this.running = false;
    this.state = "menu"; // menu, playing, levelIntro, levelComplete, gameOver, victory

    // DOM refs
    this.screens = {
      start: document.getElementById("start-screen"),
      level: document.getElementById("level-screen"),
      complete: document.getElementById("complete-screen"),
      gameover: document.getElementById("gameover-screen"),
      victory: document.getElementById("victory-screen"),
      hud: document.getElementById("hud"),
    };

    this._setupInput();
    this._drawMenuBg();
  }

  // ── Input ──
  _setupInput() {
    const doJump = (e) => {
      // Resume audio context on first interaction
      if (this.sfx.ctx && this.sfx.ctx.state === "suspended") {
        this.sfx.ctx.resume();
      }
      if (this.state === "playing") {
        e.preventDefault();
        const result = this.player.jump();
        if (result === "jump") this.sfx.jump();
        else if (result === "double") this.sfx.doubleJump();
      }
    };

    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.code === "ArrowUp") doJump(e);
    });

    this.canvas.addEventListener("pointerdown", (e) => doJump(e));
  }

  // ── Screen management ──
  _showScreen(name) {
    Object.values(this.screens).forEach((s) => s.classList.add("hidden"));
    if (name && this.screens[name]) {
      this.screens[name].classList.remove("hidden");
    }
  }

  // ── Draw a pretty background for menus ──
  _drawMenuBg() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#ffe0ec");
    grad.addColorStop(1, "#ffb6c1");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Start game ──
  start() {
    this.levelIdx = 0;
    this.score = 0;
    this._startLevel();
  }

  // ── Init a level ──
  _startLevel() {
    const lvl = LEVELS[this.levelIdx];
    this.score = 0;
    this.speed = lvl.speed;
    this.time = 0;

    // Reset player
    this.player.reset();
    this.player.y = 300;

    // Init platforms — start with a wide one under the player
    this.platforms = [];
    this.platforms.push(
      new Platform(40, 370, 220, lvl.platformColor, lvl.platformLight)
    );
    let lastPlat = this.platforms[0];
    // Generate ahead
    for (let i = 0; i < 12; i++) {
      lastPlat = this._genNextPlatform(lastPlat, lvl);
    }

    // Dress-up doll (only for dress-up levels)
    if (lvl.isDressUp) {
      this.dressUpDoll = new DressUpDoll(lvl.dressUpItems);
      this._dressUpItemIdx = 0; // cycles through items
    } else {
      this.dressUpDoll = null;
    }

    // Collectibles
    this.collectibles = [];
    this.platforms.forEach((p, i) => {
      if (i > 0 && Math.random() < 0.7) {
        if (lvl.isDressUp) {
          // Cycle through clothing items
          const item = lvl.dressUpItems[this._dressUpItemIdx % lvl.dressUpItems.length];
          this._dressUpItemIdx++;
          const c = new Collectible(
            p.x + p.w / 2,
            p.y - 40 - rand(0, 20),
            item.emoji
          );
          c.slot = item.slot; // attach slot info
          this.collectibles.push(c);
        } else {
          this.collectibles.push(
            new Collectible(
              p.x + p.w / 2,
              p.y - 40 - rand(0, 20),
              lvl.collectEmoji
            )
          );
        }
      }
    });

    // Background decorations
    this.bgDecos = [];
    for (let i = 0; i < 10; i++) {
      this.bgDecos.push(
        new BgDeco(lvl.decoEmojis[randInt(0, lvl.decoEmojis.length - 1)])
      );
    }

    this.particles = [];
    this.trail = new Trail();

    // Show level intro
    this.state = "levelIntro";
    document.getElementById("level-emoji").textContent = lvl.emoji;
    document.getElementById("level-title").textContent = lvl.name;
    if (lvl.isDressUp) {
      document.getElementById("level-goal").textContent = `!אספי 8 פריטי אופנה ועצבי את הדמות`;
    } else {
      document.getElementById("level-goal").textContent = `אספי ${lvl.target} ${lvl.collectEmoji}`;
    }
    this._showScreen("level");
    this._drawLevelBg(lvl);

    this.sfx.levelUp();

    setTimeout(() => {
      if (this.state === "levelIntro") {
        this._showScreen("hud");
        this.state = "playing";
        this.running = true;
        this._updateHUD(lvl);
        requestAnimationFrame((t) => this._loop(t));
      }
    }, 2000);
  }

  _drawLevelBg(lvl) {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, lvl.bgTop);
    grad.addColorStop(1, lvl.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Generate next platform ──
  _genNextPlatform(lastPlat, lvl) {
    const gap = rand(lvl.gapMin, lvl.gapMax);
    const pw = rand(lvl.platMin, lvl.platMax);
    const nx = lastPlat.right + gap;
    // Keep Y within playable range, with variation
    const minY = 180;
    const maxY = 420;
    let ny = lastPlat.y + rand(-60, 60);
    ny = Math.max(minY, Math.min(maxY, ny));
    const p = new Platform(nx, ny, pw, lvl.platformColor, lvl.platformLight);
    this.platforms.push(p);
    return p;
  }

  // ── Main game loop ──
  _loop(timestamp) {
    if (this.state !== "playing") return;

    this.time = timestamp / 1000;
    const lvl = LEVELS[this.levelIdx];

    // ── Update ──
    this.player.update();

    // Platform collision
    this.player.onGround = false;
    const hb = this.player.hitbox;
    for (const p of this.platforms) {
      p.update(this.speed);
      if (
        hb.x + hb.w > p.x &&
        hb.x < p.x + p.w &&
        hb.y + hb.h >= p.y &&
        hb.y + hb.h <= p.y + p.h + 8 &&
        this.player.vy >= 0
      ) {
        this.player.y = p.y - this.player.h + 6;
        this.player.vy = 0;
        this.player.onGround = true;
        this.player.canDoubleJump = true;
        this.player.hasDoubleJumped = false;
      }
    }

    // Collectibles
    for (const c of this.collectibles) {
      c.update(this.speed, this.time);
      if (!c.collected) {
        const dx = this.player.x + 15 - c.x;
        const dy = this.player.y + 15 - c.y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          c.collected = true;

          if (lvl.isDressUp && this.dressUpDoll && c.slot) {
            // Dress-up mode: only count unique items
            const isNew = this.dressUpDoll.collectSlot(c.slot);
            if (isNew) {
              this.score = this.dressUpDoll.uniqueCount;
              this.sfx.levelUp(); // Big fanfare for new clothing item!
              // Extra sparkles for new item
              const colors = ["#ffd700", "#ff69b4", "#fff", "#ffeb3b", "#e040fb"];
              for (let i = 0; i < 20; i++) {
                this.particles.push(
                  new Particle(c.x, c.y, colors[randInt(0, colors.length - 1)])
                );
              }
            } else {
              this.sfx.collect(); // Regular sound for duplicate
              const colors = ["#ff69b4", "#ffd700", "#fff"];
              for (let i = 0; i < 8; i++) {
                this.particles.push(
                  new Particle(c.x, c.y, colors[randInt(0, colors.length - 1)])
                );
              }
            }
          } else {
            // Normal mode
            this.score++;
            this.sfx.collect();
            const colors = ["#ff69b4", "#ffd700", "#fff", "#ff1493", "#da70d6"];
            for (let i = 0; i < 12; i++) {
              this.particles.push(
                new Particle(c.x, c.y, colors[randInt(0, colors.length - 1)])
              );
            }
          }
        }
      }
    }

    // Background decos
    this.bgDecos.forEach((d) => d.update(this.speed));

    // Trail
    this.trail.add(this.player.x + 5, this.player.y + this.player.h - 5);
    this.trail.update(this.speed);

    // Particles
    this.particles.forEach((p) => p.update(this.speed));
    this.particles = this.particles.filter((p) => p.alive);

    // Remove offscreen platforms & generate new ones
    this.platforms = this.platforms.filter((p) => p.right > -50);
    while (this.platforms.length < 14) {
      const last = this.platforms[this.platforms.length - 1];
      const np = this._genNextPlatform(last, lvl);
      // Add collectible
      if (Math.random() < 0.7) {
        if (lvl.isDressUp) {
          const item = lvl.dressUpItems[this._dressUpItemIdx % lvl.dressUpItems.length];
          this._dressUpItemIdx++;
          const c = new Collectible(
            np.x + np.w / 2,
            np.y - 40 - rand(0, 20),
            item.emoji
          );
          c.slot = item.slot;
          this.collectibles.push(c);
        } else {
          this.collectibles.push(
            new Collectible(
              np.x + np.w / 2,
              np.y - 40 - rand(0, 20),
              lvl.collectEmoji
            )
          );
        }
      }
    }
    this.collectibles = this.collectibles.filter((c) => c.x > -50);

    // Death check
    if (!this.player.alive) {
      this.sfx.fall();
      this._gameOver();
      return;
    }

    // Level complete?
    if (this.score >= lvl.target) {
      this._levelComplete(lvl);
      return;
    }

    // ── Render ──
    this._render(lvl);
    this._updateHUD(lvl);

    requestAnimationFrame((t) => this._loop(t));
  }

  _render(lvl) {
    const ctx = this.ctx;

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, lvl.bgTop);
    grad.addColorStop(1, lvl.bgBottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Background decos
    this.bgDecos.forEach((d) => d.draw(ctx, this.time));

    // Trail
    this.trail.draw(ctx);

    // Platforms
    this.platforms.forEach((p) => p.draw(ctx));

    // Collectibles
    this.collectibles.forEach((c) => c.draw(ctx));

    // Particles
    this.particles.forEach((p) => p.draw(ctx));

    // Player
    this.player.draw(ctx);

    // Dress-up doll panel (drawn last, on top)
    if (this.dressUpDoll) {
      this.dressUpDoll.draw(ctx, this.time);
    }
  }

  _updateHUD(lvl) {
    document.getElementById("hud-level").textContent = `שלב ${this.levelIdx + 1}`;
    document.getElementById("hud-level-name").textContent = lvl.name;
    if (lvl.isDressUp && this.dressUpDoll) {
      document.getElementById("hud-score").textContent = `👗 ${this.dressUpDoll.uniqueCount} / ${lvl.target} פריטים`;
    } else {
      document.getElementById("hud-score").textContent = `${lvl.collectEmoji} ${this.score} / ${lvl.target}`;
    }
  }

  // ── Level complete ──
  _levelComplete(lvl) {
    this.state = "levelComplete";
    this.running = false;
    this.sfx.levelUp();

    if (lvl.isDressUp) {
      document.getElementById("complete-msg").textContent = `!עיצבת את הדמות בהצלחה`;
      document.getElementById("complete-score").textContent = `👗 ${this.score} / ${lvl.target} פריטים`;
    } else {
      document.getElementById("complete-msg").textContent = `!סיימת את ${lvl.name}`;
      document.getElementById("complete-score").textContent = `${lvl.collectEmoji} ${this.score} / ${lvl.target}`;
    }

    // Last level?
    if (this.levelIdx >= LEVELS.length - 1) {
      document.getElementById("btn-next").textContent = "🏆 !סיימת את המשחק";
      document.getElementById("btn-next").onclick = () => this._victory();
    } else {
      document.getElementById("btn-next").textContent = "!לשלב הבא ➡️";
      document.getElementById("btn-next").onclick = () => this.nextLevel();
    }

    this._showScreen("complete");
  }

  nextLevel() {
    this.levelIdx++;
    if (this.levelIdx >= LEVELS.length) {
      this._victory();
    } else {
      this._startLevel();
    }
  }

  _victory() {
    this.state = "victory";
    this.sfx.victory();
    this._showScreen("victory");

    // Draw pretty bg
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, "#fce4ec");
    grad.addColorStop(0.5, "#f3e5f5");
    grad.addColorStop(1, "#fff8e1");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Game over ──
  _gameOver() {
    this.state = "gameOver";
    this.running = false;

    const lvl = LEVELS[this.levelIdx];
    document.getElementById("gameover-score").textContent = `${lvl.collectEmoji} ${this.score} / ${lvl.target}`;
    this._showScreen("gameover");
  }

  retry() {
    this._startLevel();
  }

  goToMenu() {
    this.state = "menu";
    this._showScreen("start");
    this._drawMenuBg();
  }
}

// ─── Initialize ─────────────────────────────────────────────
const game = new Game();
