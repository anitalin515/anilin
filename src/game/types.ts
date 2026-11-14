export type GameState = 'TITLE_MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type PowerUpType = 'autoAlign' | 'widen' | 'shield';

export interface PowerUpInventory {
  autoAlign: number;
  widen: number;
  shield: number;
}

export interface ActivePowerUps {
  autoAlignActive: boolean;
  shieldActive: boolean;
}

export type ToppingType =
  | 'berry'
  | 'piping'
  | 'choc'
  | 'pistachio'
  | 'blueberry'
  | 'caramel';

export interface CakeFlavor {
  id: string;
  name: string;
  spongeColor: string;
  spongeShadow: string;
  fillingColor: string;
  frostingColor: string;
  frostingHighlight: string;
  accentColor: string;
  toppingType: ToppingType;
}

export interface CakeLayer {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  flavor: CakeFlavor;
  squash: number;
  squashVel: number;
  isPerfect: boolean;
  perfectGlow: number;
}

export interface SwingingCake {
  mode: 'SWINGING' | 'FALLING' | 'MISSED_FALLING';
  x: number;
  y: number;
  vy: number;
  vx: number;
  width: number;
  height: number;
  angle: number;
  angularVel: number;
  phase: number;
  omega: number;
  amplitude: number;
  pivotX: number;
  pivotY: number;
  ropeLength: number;
  flavor: CakeFlavor;
}

export interface SlicedScrap {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  flavor: CakeFlavor;
  alpha: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  kind: 'crumb' | 'sparkle' | 'cream';
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  subtext?: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface HighScoreData {
  bestScore: number;
  bestLayers: number;
  bestCombo: number;
}

export type FeedbackType =
  | 'perfect'
  | 'sliced'
  | 'widened'
  | 'miss'
  | 'shieldSaved'
  | 'knifeSliced'
  | null;

export interface FallingKnife {
  x: number;
  y: number; // Tip Y in world coordinates
  vx: number;
  vy: number;
  angle: number;
  angularVel: number;
  state: 'WARNING' | 'FALLING' | 'SLICING' | 'DEFLECTED';
  warningTimer: number;
  warningDuration: number;
  sliceSide: 'left' | 'right';
  slicedLayerIds: number[];
  alpha: number;
}

export interface HudSnapshot {
  score: number;
  layers: number;
  combo: number;
  maxCombo: number;
  lastFeedback: FeedbackType;
  widthPercent: number;
  isNewRecord: boolean;
  powerUps: PowerUpInventory;
  activePowerUps: ActivePowerUps;
}
