import { CakeFlavor } from './types';

export const CAKE_FLAVORS: CakeFlavor[] = [
  {
    id: 'strawberry-shortcake',
    name: '草莓鮮奶油蛋糕',
    spongeColor: '#F5D5A7',
    spongeShadow: '#E5BA81',
    fillingColor: '#E86A76',
    frostingColor: '#FFF9F3',
    frostingHighlight: '#FFFFFF',
    accentColor: '#D94E5A',
    toppingType: 'berry',
  },
  {
    id: 'raspberry-rose',
    name: '覆盆子玫瑰慕斯',
    spongeColor: '#F2B8C0',
    spongeShadow: '#DF95A0',
    fillingColor: '#C94257',
    frostingColor: '#FCE9EC',
    frostingHighlight: '#FFF7F8',
    accentColor: '#B83249',
    toppingType: 'piping',
  },
  {
    id: 'matcha-pistachio',
    name: '宇治抹茶開心果',
    spongeColor: '#BFD3A5',
    spongeShadow: '#9CB67D',
    fillingColor: '#6D8C54',
    frostingColor: '#F4F8ED',
    frostingHighlight: '#FFFFFF',
    accentColor: '#7C9A72',
    toppingType: 'pistachio',
  },
  {
    id: 'valrhona-ganache',
    name: '法芙娜生巧甘納許',
    spongeColor: '#8B5A47',
    spongeShadow: '#6C4030',
    fillingColor: '#4A2B20',
    frostingColor: '#5C3729',
    frostingHighlight: '#7C4F3E',
    accentColor: '#E59A3C',
    toppingType: 'choc',
  },
  {
    id: 'salted-caramel',
    name: '焦糖海鹽舒芙蕾',
    spongeColor: '#F0C88B',
    spongeShadow: '#D7A35E',
    fillingColor: '#C87832',
    frostingColor: '#F9E6C8',
    frostingHighlight: '#FFF8EB',
    accentColor: '#D97B29',
    toppingType: 'caramel',
  },
  {
    id: 'blueberry-lemon',
    name: '藍莓香檸乳酪',
    spongeColor: '#F4E29C',
    spongeShadow: '#DEC56F',
    fillingColor: '#7B74B5',
    frostingColor: '#F7F4FC',
    frostingHighlight: '#FFFFFF',
    accentColor: '#5D569B',
    toppingType: 'blueberry',
  },
];

export const BASE_TART_FLAVOR: CakeFlavor = {
  id: 'base-butter-sponge',
  name: '法式奶油基底',
  spongeColor: '#EBC894',
  spongeShadow: '#D4A86B',
  fillingColor: '#C68452',
  frostingColor: '#FFF7EE',
  frostingHighlight: '#FFFFFF',
  accentColor: '#D94E5A',
  toppingType: 'piping',
};

export function getFlavorForLayer(layerIndex: number): CakeFlavor {
  return CAKE_FLAVORS[(layerIndex - 1) % CAKE_FLAVORS.length];
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export function drawCakeTier(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  bottomY: number,
  width: number,
  height: number,
  flavor: CakeFlavor,
  options?: {
    squash?: number;
    angle?: number;
    alpha?: number;
    perfectGlow?: number;
    showToppings?: boolean;
  }
) {
  if (width <= 1 || height <= 1) return;

  const squash = options?.squash ?? 0;
  const angle = options?.angle ?? 0;
  const alpha = options?.alpha ?? 1;
  const perfectGlow = options?.perfectGlow ?? 0;
  const showToppings = options?.showToppings ?? true;

  const scaleY = Math.max(0.75, 1 - squash * 0.22);
  const scaleX = 1 + squash * 0.1;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(centerX, bottomY);
  if (angle !== 0) {
    ctx.rotate(angle);
  }
  ctx.scale(scaleX, scaleY);

  const left = -width / 2;
  const top = -height;
  const cornerR = Math.min(7, width * 0.15);

  // Subtle drop shadow onto tier below
  ctx.fillStyle = 'rgba(74, 46, 43, 0.08)';
  drawRoundedRectPath(ctx, left + 1, -4, width - 2, 5, 2.5);
  ctx.fill();

  // Perfect golden aura glow
  if (perfectGlow > 0.01) {
    ctx.save();
    ctx.strokeStyle = `rgba(229, 154, 60, ${perfectGlow * 0.75})`;
    ctx.lineWidth = 4 * perfectGlow;
    drawRoundedRectPath(ctx, left - 2, top - 2, width + 4, height + 4, cornerR + 2);
    ctx.stroke();
    ctx.restore();
  }

  // Main sponge body
  ctx.fillStyle = flavor.spongeColor;
  drawRoundedRectPath(ctx, left, top + 3, width, height - 3, cornerR);
  ctx.fill();

  // Bottom warm shading band
  ctx.save();
  drawRoundedRectPath(ctx, left, top + 3, width, height - 3, cornerR);
  ctx.clip();

  ctx.fillStyle = flavor.spongeShadow;
  ctx.fillRect(left, -9, width, 9);

  // Center cream/jam filling ribbon
  const fillingY = -height * 0.48;
  const fillingH = Math.max(4, height * 0.14);
  ctx.fillStyle = flavor.fillingColor;
  ctx.fillRect(left, fillingY, width, fillingH);

  // Delicate sponge crumb speckles (deterministic based on width so no flicker)
  ctx.fillStyle = 'rgba(74, 46, 43, 0.09)';
  const dotStep = 14;
  for (let dx = left + 8; dx < left + width - 6; dx += dotStep) {
    const offset = Math.abs(Math.sin(dx * 0.37)) * 6;
    ctx.beginPath();
    ctx.arc(dx, -height * 0.24 - offset * 0.6, 1.1, 0, Math.PI * 2);
    ctx.arc(dx + 5, -height * 0.68 + offset * 0.5, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Scalloped frosting cap along top edge
  const frostBaseH = Math.min(10, height * 0.26);
  ctx.fillStyle = flavor.frostingColor;
  ctx.beginPath();
  ctx.moveTo(left, top + 2);
  ctx.lineTo(left + width, top + 2);
  ctx.lineTo(left + width, top + frostBaseH);

  const scallopWidth = Math.max(12, Math.min(18, width / Math.max(2, Math.round(width / 16))));
  const scallopCount = Math.max(1, Math.round(width / scallopWidth));
  const actualStep = width / scallopCount;

  for (let i = scallopCount; i > 0; i--) {
    const xEnd = left + i * actualStep;
    const xStart = left + (i - 1) * actualStep;
    const xMid = (xStart + xEnd) / 2;
    const dripDepth = i % 2 === 0 ? 5.5 : 3.2;
    ctx.quadraticCurveTo(xMid, top + frostBaseH + dripDepth, xStart, top + frostBaseH);
  }
  ctx.closePath();
  ctx.fill();

  // Top frosting highlight strip
  ctx.fillStyle = flavor.frostingHighlight;
  ctx.fillRect(left + 3, top + 3, Math.max(0, width - 6), 2.5);

  ctx.restore();

  // Hand-drawn cocoa outline around the sponge
  ctx.strokeStyle = 'rgba(74, 46, 43, 0.35)';
  ctx.lineWidth = 1.4;
  drawRoundedRectPath(ctx, left, top + 2, width, height - 2, cornerR);
  ctx.stroke();

  // Subtle decorative toppings along top rim when wide enough
  if (showToppings && width >= 34) {
    const count = Math.min(5, Math.max(1, Math.floor((width - 14) / 34)));
    const spacing = width / (count + 1);
    for (let i = 1; i <= count; i++) {
      const tx = left + spacing * i;
      const ty = top + 2;
      drawToppingAccent(ctx, tx, ty, flavor);
    }
  }

  ctx.restore();
}

function drawToppingAccent(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  flavor: CakeFlavor
) {
  ctx.save();
  switch (flavor.toppingType) {
    case 'berry': {
      // Small whipped dollop + strawberry dot
      ctx.fillStyle = flavor.frostingColor;
      ctx.beginPath();
      ctx.arc(x, y - 1, 4.2, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = flavor.accentColor;
      ctx.beginPath();
      ctx.arc(x, y - 3.5, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7C9A72';
      ctx.fillRect(x - 1.5, y - 7, 3, 1.5);
      break;
    }
    case 'piping': {
      ctx.fillStyle = flavor.frostingColor;
      ctx.strokeStyle = 'rgba(74, 46, 43, 0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y - 1.5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = flavor.accentColor;
      ctx.beginPath();
      ctx.arc(x, y - 3.5, 1.6, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pistachio': {
      ctx.fillStyle = flavor.accentColor;
      ctx.beginPath();
      ctx.ellipse(x, y - 2, 3.2, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'choc': {
      ctx.fillStyle = flavor.accentColor;
      ctx.beginPath();
      ctx.arc(x, y - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'caramel': {
      ctx.fillStyle = flavor.frostingColor;
      ctx.beginPath();
      ctx.arc(x, y - 1.5, 3.4, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = flavor.accentColor;
      ctx.beginPath();
      ctx.arc(x, y - 3.5, 1.8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'blueberry': {
      ctx.fillStyle = flavor.accentColor;
      ctx.beginPath();
      ctx.arc(x, y - 2.2, 2.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath();
      ctx.arc(x - 0.8, y - 3, 0.9, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}
