import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { patisserieAudio } from '../game/audio';
import { BASE_TART_FLAVOR, drawCakeTier, getFlavorForLayer } from '../game/flavors';
import {
  CakeLayer,
  FallingKnife,
  FeedbackType,
  FloatingText,
  GameState,
  HudSnapshot,
  Particle,
  PowerUpInventory,
  PowerUpType,
  SlicedScrap,
  SwingingCake,
} from '../game/types';

export const LOGICAL_WIDTH = 420;
export const LOGICAL_HEIGHT = 740;

const GROUND_Y = 612;
const STAND_HEIGHT = 38;
const PLATE_TOP_Y = GROUND_Y - STAND_HEIGHT;
const INITIAL_WIDTH = 192;
const MAX_WIDENED_WIDTH = 228;
const CAKE_HEIGHT = 36;
const SCREEN_PIVOT_Y = 20;
const ROPE_LENGTH = 150;
const GRAVITY = 2150;
const TARGET_TOP_SCREEN_Y = 442;

interface RopeRecoil {
  angle: number;
  timer: number;
  duration: number;
}

export interface CakeCanvasHandle {
  activatePowerUp: (type: PowerUpType) => void;
}

interface CakeCanvasStageProps {
  gameState: GameState;
  runId: number;
  bestScore: number;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onGameOver: (finalSnapshot: HudSnapshot) => void;
}

export const CakeCanvasStage = forwardRef<CakeCanvasHandle, CakeCanvasStageProps>(
  ({ gameState, runId, bestScore, onHudUpdate, onGameOver }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const gameStateRef = useRef<GameState>(gameState);
    gameStateRef.current = gameState;

    const bestScoreRef = useRef<number>(bestScore);
    bestScoreRef.current = bestScore;

    const callbacksRef = useRef({ onHudUpdate, onGameOver });
    callbacksRef.current = { onHudUpdate, onGameOver };

    // Mutable simulation state kept strictly outside React render cycle
    const simRef = useRef<{
      layers: CakeLayer[];
      swinging: SwingingCake | null;
      scraps: SlicedScrap[];
      particles: Particle[];
      floatingTexts: FloatingText[];
      ropeRecoil: RopeRecoil | null;
      cameraShiftY: number;
      targetCameraShiftY: number;
      shakeIntensity: number;
      hitstopTimer: number;
      score: number;
      combo: number;
      maxCombo: number;
      isNewRecord: boolean;
      gameOverPending: boolean;
      gameOverDelayTimer: number;
      spawnPopProgress: number;
      powerUps: PowerUpInventory;
      autoAlignActive: boolean;
      shieldActive: boolean;
      shieldPulse: number;
      knives: FallingKnife[];
      knifeCooldownTimer: number;
      dustMotes: Array<{ x: number; y: number; r: number; speed: number; alpha: number }>;
    }>({
      layers: [],
      swinging: null,
      scraps: [],
      particles: [],
      floatingTexts: [],
      ropeRecoil: null,
      cameraShiftY: 0,
      targetCameraShiftY: 0,
      shakeIntensity: 0,
      hitstopTimer: 0,
      score: 0,
      combo: 0,
      maxCombo: 0,
      isNewRecord: false,
      gameOverPending: false,
      gameOverDelayTimer: 0,
      spawnPopProgress: 1,
      powerUps: { autoAlign: 1, widen: 1, shield: 1 },
      autoAlignActive: false,
      shieldActive: false,
      shieldPulse: 0,
      knives: [],
      knifeCooldownTimer: 4.8,
      dustMotes: Array.from({ length: 18 }, (_, i) => ({
        x: ((i * 73) % LOGICAL_WIDTH) + 10,
        y: (i * 47) % LOGICAL_HEIGHT,
        r: 1.2 + (i % 3) * 0.7,
        speed: 7 + (i % 4) * 3,
        alpha: 0.16 + (i % 3) * 0.08,
      })),
    });

    const emitHud = (feedback: FeedbackType = null) => {
      const sim = simRef.current;
      const topLayer = sim.layers[sim.layers.length - 1];
      const stackedCount = Math.max(0, sim.layers.length - 1);
      callbacksRef.current.onHudUpdate({
        score: sim.score,
        layers: stackedCount,
        combo: sim.combo,
        maxCombo: sim.maxCombo,
        lastFeedback: feedback,
        widthPercent: Math.round(((topLayer?.width ?? INITIAL_WIDTH) / INITIAL_WIDTH) * 100),
        isNewRecord: sim.isNewRecord,
        powerUps: { ...sim.powerUps },
        activePowerUps: {
          autoAlignActive: sim.autoAlignActive,
          shieldActive: sim.shieldActive,
        },
      });
    };

    const spawnBurst = (
      x: number,
      y: number,
      colors: string[],
      count: number,
      kind: Particle['kind'],
      spreadX = 90
    ) => {
      const sim = simRef.current;
      for (let i = 0; i < count; i++) {
        sim.particles.push({
          x: x + (Math.random() - 0.5) * 14,
          y: y + (Math.random() - 0.5) * 6,
          vx: (Math.random() - 0.5) * spreadX * 2,
          vy: -40 - Math.random() * 140,
          size: kind === 'sparkle' ? 2.5 + Math.random() * 2.5 : 2 + Math.random() * 2.8,
          color: colors[i % colors.length],
          life: 0,
          maxLife: 0.45 + Math.random() * 0.35,
          kind,
        });
      }
    };

    const createSwingingCake = (
      layerIndex: number,
      width: number,
      cameraShiftY: number,
      startPhase?: number
    ): SwingingCake => {
      const speedFactor = 1 - Math.exp(-layerIndex * 0.045);
      const omega = 2.05 + speedFactor * 1.95;
      const amplitude = 0.72 + Math.min(0.16, layerIndex * 0.005);

      const phase = startPhase ?? (layerIndex % 2 === 0 ? -Math.PI * 0.36 : Math.PI * 0.36);
      const angle = amplitude * Math.sin(phase);
      const pivotX = LOGICAL_WIDTH / 2;
      const pivotY = SCREEN_PIVOT_Y - cameraShiftY;

      return {
        mode: 'SWINGING',
        x: pivotX + Math.sin(angle) * ROPE_LENGTH,
        y: pivotY + Math.cos(angle) * ROPE_LENGTH + CAKE_HEIGHT,
        vy: 0,
        vx: 0,
        width,
        height: CAKE_HEIGHT,
        angle: 0,
        angularVel: 0,
        phase,
        omega,
        amplitude,
        pivotX,
        pivotY,
        ropeLength: ROPE_LENGTH,
        flavor: getFlavorForLayer(layerIndex),
      };
    };

    const resetSimulation = () => {
      const sim = simRef.current;
      const baseLayer: CakeLayer = {
        id: 0,
        x: LOGICAL_WIDTH / 2,
        y: PLATE_TOP_Y,
        width: INITIAL_WIDTH,
        height: CAKE_HEIGHT + 2,
        flavor: BASE_TART_FLAVOR,
        squash: 0,
        squashVel: 0,
        isPerfect: false,
        perfectGlow: 0,
      };

      sim.layers = [baseLayer];
      sim.scraps = [];
      sim.particles = [];
      sim.floatingTexts = [];
      sim.ropeRecoil = null;
      sim.cameraShiftY = 0;
      sim.targetCameraShiftY = 0;
      sim.shakeIntensity = 0;
      sim.hitstopTimer = 0;
      sim.score = 0;
      sim.combo = 0;
      sim.maxCombo = 0;
      sim.isNewRecord = false;
      sim.gameOverPending = false;
      sim.gameOverDelayTimer = 0;
      sim.spawnPopProgress = 1;
      sim.powerUps = { autoAlign: 1, widen: 1, shield: 1 };
      sim.autoAlignActive = false;
      sim.shieldActive = false;
      sim.shieldPulse = 0;
      sim.knives = [];
      sim.knifeCooldownTimer = 4.8;
      sim.swinging = createSwingingCake(1, INITIAL_WIDTH, 0);

      emitHud(null);
    };

    useImperativeHandle(ref, () => ({
      activatePowerUp: (type: PowerUpType) => {
        if (gameStateRef.current !== 'PLAYING') return;
        const sim = simRef.current;
        if (sim.gameOverPending) return;
        const topLayer = sim.layers[sim.layers.length - 1];
        if (!topLayer) return;

        patisserieAudio.unlock();

        if (type === 'autoAlign') {
          if (sim.powerUps.autoAlign <= 0 || sim.autoAlignActive) return;
          if (!sim.swinging || sim.swinging.mode === 'MISSED_FALLING') return;

          sim.powerUps.autoAlign -= 1;
          sim.autoAlignActive = true;
          patisserieAudio.playPowerUp('autoAlign');

          spawnBurst(
            sim.swinging.x,
            sim.swinging.y - CAKE_HEIGHT / 2,
            ['#E59A3C', '#FFF7EE', '#F7C97E'],
            12,
            'sparkle',
            70
          );
          sim.floatingTexts.push({
            x: sim.swinging.x,
            y: sim.swinging.y - CAKE_HEIGHT - 14,
            vy: -28,
            text: '自動對齊啟動！',
            color: '#B8721E',
            life: 0,
            maxLife: 0.85,
          });
          emitHud();
        } else if (type === 'widen') {
          if (sim.powerUps.widen <= 0) return;
          const currentSwingingW =
            sim.swinging && sim.swinging.mode !== 'MISSED_FALLING'
              ? sim.swinging.width
              : topLayer.width;
          const baseW = Math.max(topLayer.width, currentSwingingW);
          if (topLayer.width >= MAX_WIDENED_WIDTH && currentSwingingW >= MAX_WIDENED_WIDTH) {
            return;
          }

          sim.powerUps.widen -= 1;
          const nextWidth = Math.min(MAX_WIDENED_WIDTH, baseW + 46);
          const halfW = nextWidth / 2;
          topLayer.width = nextWidth;
          topLayer.x = Math.max(halfW + 14, Math.min(LOGICAL_WIDTH - halfW - 14, topLayer.x));
          topLayer.squash = 0.65;
          topLayer.perfectGlow = 1;

          if (sim.swinging && sim.swinging.mode !== 'MISSED_FALLING') {
            sim.swinging.width = nextWidth;
          }

          patisserieAudio.playPowerUp('widen');
          spawnBurst(
            topLayer.x,
            topLayer.y - topLayer.height,
            ['#D94E5A', '#FFF7EE', '#F5D5A7'],
            14,
            'sparkle',
            100
          );
          sim.floatingTexts.push({
            x: topLayer.x,
            y: topLayer.y - topLayer.height - 16,
            vy: -32,
            text: '蛋糕加寬！',
            color: '#D94E5A',
            life: 0,
            maxLife: 0.85,
          });
          emitHud();
        } else if (type === 'shield') {
          if (sim.powerUps.shield <= 0 || sim.shieldActive) return;

          sim.powerUps.shield -= 1;
          sim.shieldActive = true;
          patisserieAudio.playPowerUp('shield');

          spawnBurst(
            topLayer.x,
            topLayer.y - topLayer.height,
            ['#7C9A72', '#E59A3C', '#FFFFFF'],
            14,
            'sparkle',
            95
          );
          sim.floatingTexts.push({
            x: topLayer.x,
            y: topLayer.y - topLayer.height - 20,
            vy: -30,
            text: '防護盾啟動！',
            color: '#44633A',
            life: 0,
            maxLife: 0.9,
          });
          emitHud();
        }
      },
    }));

    // Reset whenever runId increments
    useEffect(() => {
      resetSimulation();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [runId]);

    const releaseCake = () => {
      if (gameStateRef.current !== 'PLAYING') return;
      const sim = simRef.current;
      if (!sim.swinging || sim.swinging.mode !== 'SWINGING' || sim.gameOverPending) return;

      patisserieAudio.unlock();
      patisserieAudio.playRelease();

      const currentAngle = sim.swinging.amplitude * Math.sin(sim.swinging.phase);
      sim.ropeRecoil = {
        angle: currentAngle,
        timer: 0,
        duration: 0.24,
      };

      sim.swinging.mode = 'FALLING';
      sim.swinging.vy = 110;
      sim.swinging.angle = 0;
    };

    // Keyboard bindings for Space / Enter during active play
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.repeat) return;
        if (e.code === 'Space' || e.code === 'Enter') {
          if (gameStateRef.current === 'PLAYING') {
            e.preventDefault();
            releaseCake();
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Main 60fps simulation and rendering loop
    useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let dpr = Math.min(window.devicePixelRatio || 1, 2);

      const resizeCanvas = () => {
        const rect = container.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const targetW = Math.max(1, Math.floor(rect.width * dpr));
        const targetH = Math.max(1, Math.floor(rect.height * dpr));
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }
      };

      resizeCanvas();
      const resizeObserver = new ResizeObserver(resizeCanvas);
      resizeObserver.observe(container);

      let rafId = 0;
      let lastTime = performance.now();

      const maybeAwardMilestonePowerUp = (layerCount: number, anchorX: number, anchorY: number) => {
        const sim = simRef.current;
        if (layerCount <= 0 || layerCount % 6 !== 0) return;

        const order: PowerUpType[] = ['autoAlign', 'widen', 'shield'];
        // Pick the power-up with the lowest inventory count (< 3)
        let chosen: PowerUpType | null = null;
        let minVal = 3;
        for (const key of order) {
          if (sim.powerUps[key] < minVal) {
            minVal = sim.powerUps[key];
            chosen = key;
          }
        }
        if (!chosen) return;

        sim.powerUps[chosen] += 1;
        const label =
          chosen === 'autoAlign'
            ? '+1 自動對齊'
            : chosen === 'widen'
              ? '+1 增加寬度'
              : '+1 防護盾';
        sim.floatingTexts.push({
          x: anchorX,
          y: anchorY - 42,
          vy: -36,
          text: label,
          color: '#7C9A72',
          life: 0,
          maxLife: 1.05,
        });
      };

      const handleLanding = () => {
        const sim = simRef.current;
        const falling = sim.swinging;
        if (!falling) return;

        const prevLayer = sim.layers[sim.layers.length - 1];
        const landedTopY = prevLayer.y - prevLayer.height;
        const layerCount = sim.layers.length;

        const usedAutoAlign = sim.autoAlignActive;
        if (usedAutoAlign) {
          falling.x = prevLayer.x;
          sim.autoAlignActive = false;
        }

        const prevLeft = prevLayer.x - prevLayer.width / 2;
        const prevRight = prevLayer.x + prevLayer.width / 2;
        const currLeft = falling.x - falling.width / 2;
        const currRight = falling.x + falling.width / 2;

        const delta = falling.x - prevLayer.x;
        const perfectTolerance = Math.max(4.4, 6.2 - layerCount * 0.04);

        if (usedAutoAlign || Math.abs(delta) <= perfectTolerance) {
          // PERFECT ALIGNMENT
          const nextCombo = sim.combo + 1;
          sim.combo = nextCombo;
          sim.maxCombo = Math.max(sim.maxCombo, nextCombo);

          let newWidth = falling.width;
          let widened = false;
          if (nextCombo % 5 === 0 && newWidth < INITIAL_WIDTH) {
            newWidth = Math.min(INITIAL_WIDTH, newWidth + 14);
            widened = true;
          }

          const halfW = newWidth / 2;
          const clampedX = Math.max(halfW + 16, Math.min(LOGICAL_WIDTH - halfW - 16, prevLayer.x));

          const placedLayer: CakeLayer = {
            id: layerCount,
            x: clampedX,
            y: landedTopY,
            width: newWidth,
            height: CAKE_HEIGHT,
            flavor: falling.flavor,
            squash: 1,
            squashVel: 0,
            isPerfect: true,
            perfectGlow: 1,
          };
          sim.layers.push(placedLayer);
          prevLayer.squash = Math.max(prevLayer.squash, 0.45);

          const points = 15 + nextCombo * 5 + (widened ? 20 : 0);
          sim.score += points;
          if (bestScoreRef.current > 0 && sim.score > bestScoreRef.current) {
            sim.isNewRecord = true;
          }

          sim.hitstopTimer = 0.038;
          patisserieAudio.playLand(true, nextCombo, widened);

          spawnBurst(
            clampedX,
            landedTopY,
            ['#E59A3C', '#FFF7EE', '#F7C97E', falling.flavor.accentColor],
            16,
            'sparkle',
            120
          );

          sim.floatingTexts.push({
            x: clampedX,
            y: landedTopY - CAKE_HEIGHT - 12,
            vy: -42,
            text: usedAutoAlign
              ? '磁吸對齊！'
              : widened
                ? '完美連擊 · 蛋糕加寬!'
                : nextCombo > 1
                  ? `PERFECT ×${nextCombo}`
                  : 'PERFECT!',
            subtext: `+${points}`,
            color: widened ? '#D94E5A' : '#B8721E',
            life: 0,
            maxLife: 0.95,
          });

          maybeAwardMilestonePowerUp(layerCount, clampedX, landedTopY - CAKE_HEIGHT);

          const newTopWorldY = landedTopY - CAKE_HEIGHT;
          sim.targetCameraShiftY = Math.max(0, TARGET_TOP_SCREEN_Y - newTopWorldY);

          sim.swinging = createSwingingCake(layerCount + 1, newWidth, sim.targetCameraShiftY);
          sim.spawnPopProgress = 0;

          const feedback: FeedbackType = widened ? 'widened' : 'perfect';
          emitHud(feedback);
          return;
        }

        // Compute overlap interval
        const overlapLeft = Math.max(prevLeft, currLeft);
        const overlapRight = Math.min(prevRight, currRight);
        const overlapWidth = overlapRight - overlapLeft;

        if (overlapWidth <= 3) {
          // Check Protective Shield before triggering Game Over!
          if (sim.shieldActive) {
            sim.shieldActive = false;
            sim.shakeIntensity = 5;
            patisserieAudio.playShieldSave();

            spawnBurst(
              prevLayer.x,
              landedTopY,
              ['#7C9A72', '#E59A3C', '#FFFFFF', '#F5D5A7'],
              20,
              'sparkle',
              130
            );

            sim.floatingTexts.push({
              x: prevLayer.x,
              y: landedTopY - 22,
              vy: -36,
              text: '防護盾救援！',
              subtext: '免於結束',
              color: '#44633A',
              life: 0,
              maxLife: 1.05,
            });

            sim.swinging = createSwingingCake(
              layerCount,
              prevLayer.width,
              sim.targetCameraShiftY
            );
            sim.spawnPopProgress = 0;

            emitHud('shieldSaved');
            return;
          }

          // MISS: Cake falls past the edge
          sim.combo = 0;
          sim.gameOverPending = true;
          sim.gameOverDelayTimer = 0.48;
          sim.shakeIntensity = 9;

          falling.mode = 'MISSED_FALLING';
          falling.vx = delta >= 0 ? 52 : -52;
          falling.angularVel = delta >= 0 ? 2.5 : -2.5;
          falling.vy = Math.max(falling.vy * 0.45, 90);

          patisserieAudio.playMiss();

          sim.floatingTexts.push({
            x: Math.max(60, Math.min(LOGICAL_WIDTH - 60, falling.x)),
            y: landedTopY - 24,
            vy: -26,
            text: '哎呀！滑落了',
            color: '#D94E5A',
            life: 0,
            maxLife: 0.9,
          });

          emitHud('miss');
          return;
        }

        // PARTIAL OVERLAP: Slice off overhanging section
        const remainingCenterX = (overlapLeft + overlapRight) / 2;
        const placedLayer: CakeLayer = {
          id: layerCount,
          x: remainingCenterX,
          y: landedTopY,
          width: overlapWidth,
          height: CAKE_HEIGHT,
          flavor: falling.flavor,
          squash: 0.8,
          squashVel: 0,
          isPerfect: false,
          perfectGlow: 0,
        };
        sim.layers.push(placedLayer);
        prevLayer.squash = Math.max(prevLayer.squash, 0.35);

        const hungLeft = currLeft < prevLeft;
        const scrapWidth = hungLeft ? prevLeft - currLeft : currRight - prevRight;
        const scrapCenterX = hungLeft ? currLeft + scrapWidth / 2 : prevRight + scrapWidth / 2;
        const cutSeamX = hungLeft ? prevLeft : prevRight;

        if (scrapWidth > 1) {
          sim.scraps.push({
            x: scrapCenterX,
            y: landedTopY - CAKE_HEIGHT / 2,
            width: scrapWidth,
            height: CAKE_HEIGHT,
            vx: (hungLeft ? -1 : 1) * (54 + Math.random() * 28),
            vy: -35,
            angle: 0,
            angularVel: (hungLeft ? -1 : 1) * (2.8 + Math.random() * 1.4),
            flavor: falling.flavor,
            alpha: 1,
          });
        }

        sim.combo = 0;
        const points = 10;
        sim.score += points;
        if (bestScoreRef.current > 0 && sim.score > bestScoreRef.current) {
          sim.isNewRecord = true;
        }
        sim.shakeIntensity = Math.max(sim.shakeIntensity, 2.5);

        patisserieAudio.playLand(false, 0, false);

        spawnBurst(
          cutSeamX,
          landedTopY - CAKE_HEIGHT * 0.45,
          [falling.flavor.spongeColor, falling.flavor.frostingColor, falling.flavor.fillingColor],
          11,
          'crumb',
          75
        );

        sim.floatingTexts.push({
          x: remainingCenterX,
          y: landedTopY - CAKE_HEIGHT - 10,
          vy: -34,
          text: `+${points}`,
          color: '#6C4A45',
          life: 0,
          maxLife: 0.65,
        });

        maybeAwardMilestonePowerUp(layerCount, remainingCenterX, landedTopY - CAKE_HEIGHT);

        const newTopWorldY = landedTopY - CAKE_HEIGHT;
        sim.targetCameraShiftY = Math.max(0, TARGET_TOP_SCREEN_Y - newTopWorldY);

        sim.swinging = createSwingingCake(layerCount + 1, overlapWidth, sim.targetCameraShiftY);
        sim.spawnPopProgress = 0;

        emitHud('sliced');
      };

      const stepSimulation = (rawDt: number) => {
        const dt = Math.min(rawDt, 0.05);
        const sim = simRef.current;
        const state = gameStateRef.current;

        if (state !== 'PAUSED') {
          sim.shieldPulse += dt * 3.5;
          for (const mote of sim.dustMotes) {
            mote.y -= mote.speed * dt;
            if (mote.y < -10) {
              mote.y = LOGICAL_HEIGHT + 10;
            }
          }
        }

        if (state === 'PAUSED') return;

        if (sim.hitstopTimer > 0) {
          sim.hitstopTimer = Math.max(0, sim.hitstopTimer - dt);
          return;
        }

        sim.cameraShiftY += (sim.targetCameraShiftY - sim.cameraShiftY) * Math.min(1, dt * 6.5);

        if (sim.shakeIntensity > 0.05) {
          sim.shakeIntensity *= Math.pow(0.001, dt);
        } else {
          sim.shakeIntensity = 0;
        }

        if (sim.spawnPopProgress < 1) {
          sim.spawnPopProgress = Math.min(1, sim.spawnPopProgress + dt * 6.5);
        }

        if (sim.ropeRecoil) {
          sim.ropeRecoil.timer += dt;
          if (sim.ropeRecoil.timer >= sim.ropeRecoil.duration) {
            sim.ropeRecoil = null;
          }
        }

        for (const layer of sim.layers) {
          if (layer.squash > 0.001) {
            layer.squash *= Math.pow(0.0005, dt);
          } else {
            layer.squash = 0;
          }
          if (layer.perfectGlow > 0.001) {
            layer.perfectGlow = Math.max(0, layer.perfectGlow - dt * 1.6);
          }
        }

        if (sim.swinging) {
          const cake = sim.swinging;
          cake.pivotY = SCREEN_PIVOT_Y - sim.cameraShiftY;

          if (cake.mode === 'SWINGING') {
            const effectiveOmega = state === 'TITLE_MENU' ? 1.25 : cake.omega;
            const effectiveAmp = state === 'TITLE_MENU' ? 0.42 : cake.amplitude;
            cake.phase += effectiveOmega * dt;
            const angle = effectiveAmp * Math.sin(cake.phase);
            cake.x = cake.pivotX + Math.sin(angle) * cake.ropeLength;
            cake.y = cake.pivotY + Math.cos(angle) * cake.ropeLength + cake.height;
            cake.angle = 0;
          } else if (cake.mode === 'FALLING') {
            cake.vy += GRAVITY * dt;
            cake.y += cake.vy * dt;

            const topLayer = sim.layers[sim.layers.length - 1];
            if (sim.autoAlignActive && topLayer) {
              cake.x += (topLayer.x - cake.x) * Math.min(1, dt * 16);
            }

            const targetLandY = topLayer.y - topLayer.height;
            if (cake.y >= targetLandY) {
              cake.y = targetLandY;
              handleLanding();
            }
          } else if (cake.mode === 'MISSED_FALLING') {
            cake.vy += GRAVITY * dt;
            cake.x += cake.vx * dt;
            cake.y += cake.vy * dt;
            cake.angle += cake.angularVel * dt;
          }
        }

        for (let i = sim.scraps.length - 1; i >= 0; i--) {
          const scrap = sim.scraps[i];
          scrap.vy += GRAVITY * 0.88 * dt;
          scrap.x += scrap.vx * dt;
          scrap.y += scrap.vy * dt;
          scrap.angle += scrap.angularVel * dt;
          if (scrap.y + sim.cameraShiftY > LOGICAL_HEIGHT + 120) {
            sim.scraps.splice(i, 1);
          }
        }

        for (let i = sim.particles.length - 1; i >= 0; i--) {
          const p = sim.particles[i];
          p.life += dt;
          if (p.life >= p.maxLife) {
            sim.particles.splice(i, 1);
            continue;
          }
          p.vy += (p.kind === 'sparkle' ? 120 : 520) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
        }

        for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
          const ft = sim.floatingTexts[i];
          ft.life += dt;
          if (ft.life >= ft.maxLife) {
            sim.floatingTexts.splice(i, 1);
            continue;
          }
          ft.y += ft.vy * dt;
          ft.vy *= Math.pow(0.2, dt);
        }

        // Periodic falling pastry knife hazard once at least 2 cake tiers are stacked
        if (state === 'PLAYING' && !sim.gameOverPending && sim.layers.length >= 3) {
          if (sim.knives.length === 0) {
            sim.knifeCooldownTimer -= dt;
            if (sim.knifeCooldownTimer <= 0) {
              const topLayer = sim.layers[sim.layers.length - 1];
              if (topLayer && topLayer.width > 54) {
                const sliceSide: 'left' | 'right' = Math.random() < 0.5 ? 'left' : 'right';
                const cutStrip = Math.min(topLayer.width * 0.34, 20 + Math.random() * 20);
                const knifeX =
                  sliceSide === 'left'
                    ? topLayer.x - topLayer.width / 2 + cutStrip
                    : topLayer.x + topLayer.width / 2 - cutStrip;

                sim.knives.push({
                  x: knifeX,
                  y: 112 - sim.cameraShiftY,
                  vx: 0,
                  vy: 0,
                  angle: 0,
                  angularVel: 0,
                  state: 'WARNING',
                  warningTimer: 0,
                  warningDuration: 1.0,
                  sliceSide,
                  slicedLayerIds: [],
                  alpha: 1,
                });
                patisserieAudio.playKnifeWarning();
              }
              sim.knifeCooldownTimer =
                Math.max(4.4, 8.2 - sim.layers.length * 0.14) + Math.random() * 2.4;
            }
          }
        }

        // Update active falling knives
        for (let i = sim.knives.length - 1; i >= 0; i--) {
          const knife = sim.knives[i];
          const topLayer = sim.layers[sim.layers.length - 1];
          if (!topLayer) {
            sim.knives.splice(i, 1);
            continue;
          }

          if (knife.state === 'WARNING') {
            knife.warningTimer += dt;
            const enterT = Math.min(1, knife.warningTimer / 0.24);
            const easedY = 48 + (142 - 48) * (1 - Math.pow(1 - enterT, 3));
            knife.y = easedY - sim.cameraShiftY;
            if (knife.warningTimer >= knife.warningDuration) {
              knife.state = 'FALLING';
              knife.vy = 1480;
              patisserieAudio.playKnifeSlice();
            }
          } else if (knife.state === 'FALLING') {
            knife.y += knife.vy * dt;
            const topSurfaceY = topLayer.y - topLayer.height;
            if (knife.y >= topSurfaceY) {
              if (sim.shieldActive) {
                sim.shieldActive = false;
                knife.state = 'DEFLECTED';
                knife.vx = knife.sliceSide === 'left' ? -210 : 210;
                knife.vy = -340;
                knife.angularVel = knife.sliceSide === 'left' ? -11 : 11;
                sim.shakeIntensity = 5;
                patisserieAudio.playKnifeDeflect();
                spawnBurst(
                  knife.x,
                  topSurfaceY,
                  ['#7C9A72', '#E59A3C', '#FFFFFF'],
                  16,
                  'sparkle',
                  110
                );
                sim.floatingTexts.push({
                  x: topLayer.x,
                  y: topSurfaceY - 22,
                  vy: -34,
                  text: '防護盾擋下插刀！',
                  color: '#44633A',
                  life: 0,
                  maxLife: 1.0,
                });
                emitHud('shieldSaved');
              } else {
                knife.state = 'SLICING';
                sim.hitstopTimer = 0.03;
                sim.shakeIntensity = Math.max(sim.shakeIntensity, 4.5);
              }
            }
          } else if (knife.state === 'SLICING') {
            knife.y += knife.vy * dt;

            // Slice up to the top 2 stacked layers (never cut base layer 0)
            const minLayerIdx = Math.max(1, sim.layers.length - 2);
            let deepestSlicedBottomY = topLayer.y;
            for (let li = sim.layers.length - 1; li >= minLayerIdx; li--) {
              const layer = sim.layers[li];
              deepestSlicedBottomY = Math.max(deepestSlicedBottomY, layer.y);
              if (knife.slicedLayerIds.includes(layer.id)) continue;

              const layerTopY = layer.y - layer.height;
              if (knife.y >= layerTopY + 8) {
                knife.slicedLayerIds.push(layer.id);
                const layerLeft = layer.x - layer.width / 2;
                const layerRight = layer.x + layer.width / 2;

                if (knife.x > layerLeft + 5 && knife.x < layerRight - 5) {
                  const leftPart = knife.x - layerLeft;
                  const rightPart = layerRight - knife.x;
                  const cutLeft = leftPart <= rightPart;
                  const scrapW = cutLeft ? leftPart : rightPart;
                  const remainW = cutLeft ? rightPart : leftPart;

                  if (remainW >= 22 && scrapW >= 4) {
                    const scrapX = cutLeft ? layerLeft + scrapW / 2 : knife.x + scrapW / 2;
                    layer.width = remainW;
                    layer.x = cutLeft ? knife.x + remainW / 2 : layerLeft + remainW / 2;
                    layer.squash = 0.55;

                    sim.scraps.push({
                      x: scrapX,
                      y: layer.y - layer.height / 2,
                      width: scrapW,
                      height: layer.height,
                      vx: (cutLeft ? -1 : 1) * (66 + Math.random() * 24),
                      vy: -42,
                      angle: 0,
                      angularVel: (cutLeft ? -1 : 1) * (3.2 + Math.random() * 1.4),
                      flavor: layer.flavor,
                      alpha: 1,
                    });

                    spawnBurst(
                      knife.x,
                      layer.y - layer.height / 2,
                      [layer.flavor.spongeColor, layer.flavor.frostingColor, '#FFFFFF'],
                      10,
                      'crumb',
                      75
                    );

                    if (li === sim.layers.length - 1) {
                      sim.floatingTexts.push({
                        x: knife.x,
                        y: layerTopY - 14,
                        vy: -32,
                        text: '插刀切落！',
                        color: '#D94E5A',
                        life: 0,
                        maxLife: 0.85,
                      });
                      emitHud('knifeSliced');
                    }
                  }
                }
              }
            }

            if (knife.y > deepestSlicedBottomY + 26) {
              knife.alpha -= dt * 3.8;
              if (knife.alpha <= 0) {
                sim.knives.splice(i, 1);
              }
            }
          } else if (knife.state === 'DEFLECTED') {
            knife.vy += GRAVITY * 0.7 * dt;
            knife.x += knife.vx * dt;
            knife.y += knife.vy * dt;
            knife.angle += knife.angularVel * dt;
            knife.alpha -= dt * 1.4;
            if (knife.alpha <= 0 || knife.y + sim.cameraShiftY > LOGICAL_HEIGHT + 120) {
              sim.knives.splice(i, 1);
            }
          }
        }

        if (sim.gameOverPending) {
          sim.gameOverDelayTimer -= dt;
          if (sim.gameOverDelayTimer <= 0) {
            sim.gameOverPending = false;
            const topLayer = sim.layers[sim.layers.length - 1];
            callbacksRef.current.onGameOver({
              score: sim.score,
              layers: Math.max(0, sim.layers.length - 1),
              combo: 0,
              maxCombo: sim.maxCombo,
              lastFeedback: 'miss',
              widthPercent: Math.round(((topLayer?.width ?? 0) / INITIAL_WIDTH) * 100),
              isNewRecord: sim.isNewRecord,
              powerUps: { ...sim.powerUps },
              activePowerUps: {
                autoAlignActive: sim.autoAlignActive,
                shieldActive: sim.shieldActive,
              },
            });
          }
        }
      };

      const renderScene = () => {
        const sim = simRef.current;
        const w = canvas.width;
        const h = canvas.height;
        ctx.save();
        ctx.clearRect(0, 0, w, h);

        const scaleX = w / LOGICAL_WIDTH;
        const scaleY = h / LOGICAL_HEIGHT;
        const scale = Math.min(scaleX, scaleY);
        const offsetX = (w - LOGICAL_WIDTH * scale) / 2;
        const offsetY = (h - LOGICAL_HEIGHT * scale) / 2;

        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#FDF8F2');
        bgGrad.addColorStop(0.65, '#F8ECE3');
        bgGrad.addColorStop(1, '#F1DFD2');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        ctx.translate(offsetX, offsetY);
        ctx.scale(scale, scale);

        if (sim.shakeIntensity > 0.1) {
          const sx = (Math.random() - 0.5) * sim.shakeIntensity * 1.4;
          const sy = (Math.random() - 0.5) * sim.shakeIntensity * 1.4;
          ctx.translate(sx, sy);
        }

        // 1. Patisserie wallpaper vertical stripes
        ctx.fillStyle = 'rgba(229, 198, 178, 0.22)';
        for (let x = 22; x < LOGICAL_WIDTH; x += 56) {
          ctx.fillRect(x, 0, 20, LOGICAL_HEIGHT);
        }

        const sunGrad = ctx.createLinearGradient(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT * 0.8);
        sunGrad.addColorStop(0, 'rgba(255, 252, 245, 0.52)');
        sunGrad.addColorStop(0.5, 'rgba(255, 245, 230, 0.18)');
        sunGrad.addColorStop(1, 'rgba(255, 245, 230, 0)');
        ctx.fillStyle = sunGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(250, 0);
        ctx.lineTo(LOGICAL_WIDTH, 420);
        ctx.lineTo(LOGICAL_WIDTH, 600);
        ctx.lineTo(0, 190);
        ctx.closePath();
        ctx.fill();

        // Floor height markers
        ctx.save();
        const markerOffset = sim.cameraShiftY * 0.55;
        ctx.strokeStyle = 'rgba(124, 92, 88, 0.12)';
        ctx.fillStyle = 'rgba(124, 92, 88, 0.28)';
        ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
        for (let floor = 5; floor <= 120; floor += 5) {
          const worldMarkerY = PLATE_TOP_Y - floor * CAKE_HEIGHT;
          const screenMarkerY = worldMarkerY + sim.cameraShiftY;
          if (screenMarkerY > 70 && screenMarkerY < LOGICAL_HEIGHT - 68) {
            ctx.beginPath();
            ctx.setLineDash([4, 5]);
            ctx.moveTo(24, screenMarkerY);
            ctx.lineTo(LOGICAL_WIDTH - 24, screenMarkerY);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillText(`${floor}F`, 26, screenMarkerY - 5);
          }
        }
        ctx.fillStyle = 'rgba(198, 156, 114, 0.08)';
        for (let y = -80 + (markerOffset % 160); y < LOGICAL_HEIGHT + 80; y += 160) {
          ctx.fillRect(0, y, LOGICAL_WIDTH, 2);
        }
        ctx.restore();

        for (const mote of sim.dustMotes) {
          ctx.fillStyle = `rgba(255, 250, 236, ${mote.alpha})`;
          ctx.beginPath();
          ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
          ctx.fill();
        }

        // World camera transform
        ctx.save();
        ctx.translate(0, sim.cameraShiftY);

        // 2. Patisserie Wooden Counter & Ceramic Cake Stand
        const tableScreenTop = GROUND_Y + sim.cameraShiftY;
        if (tableScreenTop < LOGICAL_HEIGHT + 80) {
          ctx.fillStyle = '#E8D0B9';
          ctx.fillRect(-40, GROUND_Y, LOGICAL_WIDTH + 80, 180);

          ctx.fillStyle = '#C9A27E';
          ctx.fillRect(-40, GROUND_Y, LOGICAL_WIDTH + 80, 8);
          ctx.fillStyle = 'rgba(74, 46, 43, 0.14)';
          ctx.fillRect(-40, GROUND_Y + 8, LOGICAL_WIDTH + 80, 3);

          const standX = LOGICAL_WIDTH / 2;
          ctx.fillStyle = 'rgba(74, 46, 43, 0.14)';
          ctx.beginPath();
          ctx.ellipse(standX, GROUND_Y + 4, 82, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#B8875B';
          ctx.beginPath();
          ctx.moveTo(standX - 52, GROUND_Y);
          ctx.quadraticCurveTo(standX - 18, GROUND_Y - 12, standX - 16, PLATE_TOP_Y + 10);
          ctx.lineTo(standX + 16, PLATE_TOP_Y + 10);
          ctx.quadraticCurveTo(standX + 18, GROUND_Y - 12, standX + 52, GROUND_Y);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(74, 46, 43, 0.35)';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          const plateW = INITIAL_WIDTH + 34;
          ctx.fillStyle = '#FFFBF5';
          ctx.beginPath();
          ctx.roundRect(standX - plateW / 2, PLATE_TOP_Y, plateW, 12, 6);
          ctx.fill();
          ctx.strokeStyle = 'rgba(74, 46, 43, 0.32)';
          ctx.stroke();

          ctx.fillStyle = '#FFFFFF';
          const laceCount = 11;
          const laceStep = (plateW - 18) / laceCount;
          for (let i = 0; i < laceCount; i++) {
            ctx.beginPath();
            ctx.arc(
              standX - (plateW - 18) / 2 + laceStep * (i + 0.5),
              PLATE_TOP_Y + 1,
              laceStep * 0.48,
              Math.PI,
              0
            );
            ctx.fill();
          }
        }

        // 3. Stacked Cake Layers
        for (const layer of sim.layers) {
          const screenBottom = layer.y + sim.cameraShiftY;
          if (screenBottom < -60 || screenBottom - layer.height > LOGICAL_HEIGHT + 80) {
            continue;
          }
          drawCakeTier(ctx, layer.x, layer.y, layer.width, layer.height, layer.flavor, {
            squash: layer.squash,
            perfectGlow: layer.perfectGlow,
            showToppings: layer.id === sim.layers.length - 1,
          });
        }

        const topLayer = sim.layers[sim.layers.length - 1];

        // 3b. Auto-Align Golden Magnetic Guide Rails
        if (sim.autoAlignActive && topLayer && gameStateRef.current === 'PLAYING') {
          const topY = topLayer.y - topLayer.height;
          ctx.save();
          ctx.strokeStyle = 'rgba(229, 154, 60, 0.55)';
          ctx.lineWidth = 1.8;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(topLayer.x - topLayer.width / 2, topY);
          ctx.lineTo(topLayer.x - topLayer.width / 2, topY - 190);
          ctx.moveTo(topLayer.x + topLayer.width / 2, topY);
          ctx.lineTo(topLayer.x + topLayer.width / 2, topY - 190);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }

        // 3c. Protective Shield Cloche Halo around Top Cake Tier
        if (sim.shieldActive && topLayer) {
          const topY = topLayer.y - topLayer.height;
          const pulse = 0.5 + 0.5 * Math.sin(sim.shieldPulse);
          const padX = 14 + pulse * 3;
          const domeTop = topY - 20 - pulse * 2;
          const domeBottom = topLayer.y + 4;
          const left = topLayer.x - topLayer.width / 2 - padX;
          const right = topLayer.x + topLayer.width / 2 + padX;

          ctx.save();
          ctx.fillStyle = `rgba(124, 154, 114, ${0.12 + pulse * 0.06})`;
          ctx.strokeStyle = `rgba(124, 154, 114, ${0.62 + pulse * 0.2})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(left, domeTop, right - left, domeBottom - domeTop, 22);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // 4. Sliced Overhang Scraps
        for (const scrap of sim.scraps) {
          drawCakeTier(
            ctx,
            scrap.x,
            scrap.y + scrap.height / 2,
            scrap.width,
            scrap.height,
            scrap.flavor,
            {
              angle: scrap.angle,
              alpha: scrap.alpha,
              showToppings: false,
            }
          );
        }

        // 5. Pendulum Rope & Swinging/Falling Cake
        if (sim.swinging) {
          const cake = sim.swinging;
          const pivotX = cake.pivotX;
          const pivotY = cake.pivotY;

          if (cake.mode === 'SWINGING') {
            const hookX = cake.x;
            const hookY = cake.y - cake.height;

            ctx.save();
            ctx.strokeStyle = '#9C7355';
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(hookX, hookY);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(255, 248, 240, 0.55)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(pivotX, pivotY);
            ctx.lineTo(hookX, hookY);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#E59A3C';
            ctx.strokeStyle = 'rgba(74, 46, 43, 0.4)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(hookX, hookY, 4.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            if (topLayer && gameStateRef.current === 'PLAYING') {
              const topY = topLayer.y - topLayer.height;
              ctx.fillStyle = sim.autoAlignActive
                ? 'rgba(229, 154, 60, 0.25)'
                : 'rgba(74, 46, 43, 0.06)';
              ctx.fillRect(
                cake.x - 1,
                hookY + cake.height + 8,
                2,
                Math.max(0, topY - (hookY + cake.height + 12))
              );
            }
            ctx.restore();

            const popScale =
              sim.spawnPopProgress < 1
                ? 0.65 + 0.35 * (1 - Math.pow(1 - sim.spawnPopProgress, 3))
                : 1;

            ctx.save();
            if (popScale < 1) {
              ctx.translate(cake.x, cake.y - cake.height / 2);
              ctx.scale(popScale, popScale);
              ctx.translate(-cake.x, -(cake.y - cake.height / 2));
            }
            drawCakeTier(ctx, cake.x, cake.y, cake.width, cake.height, cake.flavor, {
              angle: cake.angle,
              perfectGlow: sim.autoAlignActive ? 0.9 : 0,
              showToppings: true,
            });
            ctx.restore();
          } else {
            if (sim.ropeRecoil) {
              const t = sim.ropeRecoil.timer / sim.ropeRecoil.duration;
              const recoilLen = ROPE_LENGTH * (1 - t * 0.72);
              const recoilAngle = sim.ropeRecoil.angle * (1 - t) * Math.cos(t * Math.PI * 2);
              const rx = pivotX + Math.sin(recoilAngle) * recoilLen;
              const ry = pivotY + Math.cos(recoilAngle) * recoilLen;

              ctx.save();
              ctx.globalAlpha = Math.max(0, 1 - t);
              ctx.strokeStyle = '#9C7355';
              ctx.lineWidth = 2.2;
              ctx.beginPath();
              ctx.moveTo(pivotX, pivotY);
              ctx.lineTo(rx, ry);
              ctx.stroke();
              ctx.restore();
            }

            drawCakeTier(ctx, cake.x, cake.y, cake.width, cake.height, cake.flavor, {
              angle: cake.angle,
              perfectGlow: sim.autoAlignActive ? 0.9 : 0,
              showToppings: true,
            });
          }

          ctx.save();
          ctx.fillStyle = '#C98A3B';
          ctx.strokeStyle = 'rgba(74, 46, 43, 0.45)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(pivotX, pivotY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // 5b. Falling Pastry Knives & Cut-Line Telegraphs
        for (const knife of sim.knives) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, knife.alpha);

          if (knife.state === 'WARNING' && topLayer) {
            const topSurfaceY = topLayer.y - topLayer.height;
            const blink = 0.45 + 0.55 * Math.abs(Math.sin(knife.warningTimer * 14));

            // Dashed crimson cut-line telegraph down to the cake surface
            ctx.strokeStyle = `rgba(217, 78, 90, ${0.42 + blink * 0.35})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(knife.x, knife.y + 4);
            ctx.lineTo(knife.x, topSurfaceY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Subtle target tick on top of cake
            ctx.fillStyle = `rgba(217, 78, 90, ${0.65 + blink * 0.35})`;
            ctx.beginPath();
            ctx.arc(knife.x, topSurfaceY, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          const shakeX =
            knife.state === 'WARNING' ? Math.sin(knife.warningTimer * 48) * 1.8 : 0;

          ctx.translate(knife.x + shakeX, knife.y);
          if (knife.angle !== 0) {
            ctx.rotate(knife.angle);
          }

          // Hand-crafted French Patisserie Bread/Pastry Knife (tip pointing down at 0,0)
          // Steel blade
          ctx.fillStyle = '#E8EEF2';
          ctx.strokeStyle = '#4A2E2B';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(6.5, -14, 6, -64);
          ctx.lineTo(-5.5, -64);
          ctx.lineTo(-5.5, -14);
          ctx.quadraticCurveTo(-4.5, -5, 0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Metallic sheen along blade spine
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(-3.8, -60, 2.6, 44);

          // Brass bolster collar
          ctx.fillStyle = '#E59A3C';
          ctx.beginPath();
          ctx.roundRect(-6.5, -70, 13, 6.5, 2);
          ctx.fill();
          ctx.stroke();

          // Warm rosewood handle with brass rivets
          ctx.fillStyle = '#7A4235';
          ctx.beginPath();
          ctx.roundRect(-5, -104, 10, 34, 4.5);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#E59A3C';
          ctx.beginPath();
          ctx.arc(0, -80, 1.6, 0, Math.PI * 2);
          ctx.arc(0, -92, 1.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();
        }

        // 6. Crumb & Sparkle Particles
        for (const p of sim.particles) {
          const progress = p.life / p.maxLife;
          const alpha = 1 - progress;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          if (p.kind === 'sparkle') {
            ctx.translate(p.x, p.y);
            ctx.rotate(progress * 3);
            ctx.beginPath();
            ctx.moveTo(0, -p.size * 1.4);
            ctx.lineTo(p.size * 0.45, -p.size * 0.45);
            ctx.lineTo(p.size * 1.4, 0);
            ctx.lineTo(p.size * 0.45, p.size * 0.45);
            ctx.lineTo(0, p.size * 1.4);
            ctx.lineTo(-p.size * 0.45, p.size * 0.45);
            ctx.lineTo(-p.size * 1.4, 0);
            ctx.lineTo(-p.size * 0.45, -p.size * 0.45);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * (1 - progress * 0.3), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // 7. Floating Score / Feedback Text
        for (const ft of sim.floatingTexts) {
          const progress = ft.life / ft.maxLife;
          const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;
          ctx.save();
          ctx.globalAlpha = Math.max(0, alpha);
          ctx.textAlign = 'center';
          ctx.font = '700 16px "Plus Jakarta Sans", "Noto Sans TC", sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(ft.text, ft.x, ft.y + 1.5);
          ctx.fillStyle = ft.color;
          ctx.fillText(ft.text, ft.x, ft.y);

          if (ft.subtext) {
            ctx.font = '700 13px "Plus Jakarta Sans", sans-serif';
            ctx.fillStyle = '#4A2E2B';
            ctx.fillText(ft.subtext, ft.x, ft.y + 17);
          }
          ctx.restore();
        }

        ctx.restore();
        ctx.restore();
      };

      const tick = (now: number) => {
        const rawDt = (now - lastTime) / 1000;
        lastTime = now;
        stepSimulation(rawDt);
        renderScene();
        rafId = requestAnimationFrame(tick);
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(rafId);
        resizeObserver.disconnect();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (gameStateRef.current === 'PLAYING') {
        e.preventDefault();
        releaseCake();
      }
    };

    return (
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        className="relative h-full w-full touch-none select-none overflow-hidden cursor-pointer"
        aria-label="蛋糕疊疊樂遊戲舞台"
      >
        <canvas ref={canvasRef} className="block h-full w-full" />
      </div>
    );
  }
);

CakeCanvasStage.displayName = 'CakeCanvasStage';
