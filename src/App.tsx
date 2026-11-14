import { useCallback, useEffect, useRef, useState } from 'react';
import backdropImage from './assets/images/patisserie_atelier_backdrop_1794634998097.jpg';
import { CakeCanvasHandle, CakeCanvasStage } from './components/CakeCanvasStage';
import { GameHud } from './components/GameHud';
import { GameOverModal, PauseModal } from './components/ModalOverlays';
import { PowerUpBar } from './components/PowerUpBar';
import { TitleOverlay } from './components/TitleOverlay';
import { patisserieAudio } from './game/audio';
import { loadHighScores, saveHighScores } from './game/storage';
import { GameState, HighScoreData, HudSnapshot, PowerUpType } from './game/types';

const BACKDROP_IMAGE = backdropImage;

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  layers: 0,
  combo: 0,
  maxCombo: 0,
  lastFeedback: null,
  widthPercent: 100,
  isNewRecord: false,
  powerUps: { autoAlign: 1, widen: 1, shield: 1 },
  activePowerUps: { autoAlignActive: false, shieldActive: false },
};

export default function App() {
  const stageRef = useRef<CakeCanvasHandle | null>(null);
  const [gameState, setGameState] = useState<GameState>('TITLE_MENU');
  const [runId, setRunId] = useState<number>(1);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [finalHud, setFinalHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [records, setRecords] = useState<HighScoreData>(() => loadHighScores());
  const [isNewRecord, setIsNewRecord] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => patisserieAudio.isMuted());
  const [backdropFailed, setBackdropFailed] = useState<boolean>(false);

  const startNewRun = useCallback(() => {
    patisserieAudio.unlock();
    patisserieAudio.playButton();
    setIsNewRecord(false);
    setHud(INITIAL_HUD);
    setRunId((n) => n + 1);
    setGameState('PLAYING');
  }, []);

  const handleGameOver = useCallback((snapshot: HudSnapshot) => {
    setFinalHud(snapshot);
    const { records: updated, isNewScoreRecord } = saveHighScores(
      snapshot.score,
      snapshot.layers,
      snapshot.maxCombo
    );
    setRecords(updated);
    setIsNewRecord(isNewScoreRecord);
    setGameState('GAME_OVER');
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = !patisserieAudio.isMuted();
    patisserieAudio.setMuted(next);
    setIsMuted(next);
    if (!next) {
      patisserieAudio.unlock();
      patisserieAudio.playButton();
    }
  }, []);

  const handleTogglePause = useCallback(() => {
    patisserieAudio.playButton();
    setGameState((prev) => {
      if (prev === 'PLAYING') return 'PAUSED';
      if (prev === 'PAUSED') return 'PLAYING';
      return prev;
    });
  }, []);

  const handleExitToTitle = useCallback(() => {
    patisserieAudio.playButton();
    setRunId((n) => n + 1);
    setHud(INITIAL_HUD);
    setGameState('TITLE_MENU');
  }, []);

  const handleActivatePowerUp = useCallback((type: PowerUpType) => {
    stageRef.current?.activatePowerUp(type);
  }, []);

  // Keyboard shortcuts for Title, Pause, Game Over, and Power-Up slots 1/2/3
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (gameState === 'PLAYING' || gameState === 'PAUSED') {
          e.preventDefault();
          handleTogglePause();
        }
      } else if (e.code === 'Enter' || e.code === 'Space') {
        if (gameState === 'TITLE_MENU' || gameState === 'GAME_OVER') {
          e.preventDefault();
          startNewRun();
        }
      } else if (gameState === 'PLAYING') {
        if (e.code === 'Digit1') {
          e.preventDefault();
          handleActivatePowerUp('autoAlign');
        } else if (e.code === 'Digit2') {
          e.preventDefault();
          handleActivatePowerUp('widen');
        } else if (e.code === 'Digit3') {
          e.preventDefault();
          handleActivatePowerUp('shield');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [gameState, handleActivatePowerUp, handleTogglePause, startNewRun]);

  // Auto-pause when tab loses focus or window blurs during active play
  useEffect(() => {
    const pauseIfPlaying = () => {
      setGameState((prev) => (prev === 'PLAYING' ? 'PAUSED' : prev));
    };
    const onVisibilityChange = () => {
      if (document.hidden) pauseIfPlaying();
    };
    window.addEventListener('blur', pauseIfPlaying);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('blur', pauseIfPlaying);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // Sync exciting BGM playback with game state & mute toggle
  useEffect(() => {
    if (gameState === 'PLAYING' && !isMuted) {
      patisserieAudio.startBgm();
    } else {
      patisserieAudio.stopBgm();
    }
    return () => {
      patisserieAudio.stopBgm();
    };
  }, [gameState, isMuted]);

  // Scale BGM tempo & percussive intensity with stacked layers and combo streak
  useEffect(() => {
    patisserieAudio.setBgmIntensity(hud.layers, hud.combo);
  }, [hud.layers, hud.combo]);

  return (
    <main className="relative flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#F3E5D8]">
      {/* Desktop / Tablet Atmospheric French Patisserie Backdrop */}
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {!backdropFailed && (
          <img
            src={BACKDROP_IMAGE}
            alt="溫暖法式甜點屋背景"
            referrerPolicy="no-referrer"
            onError={() => setBackdropFailed(true)}
            className="h-full w-full object-cover opacity-55"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 50% 45%, rgba(253,248,242,0.55) 0%, rgba(242,226,212,0.82) 100%)',
          }}
        />
      </div>

      {/* Portrait Mobile Stage: Fullscreen on mobile, 9:16 centered stage on desktop */}
      <section
        className="relative h-full w-full overflow-hidden bg-[#FDF8F2] sm:h-[min(92dvh,820px)] sm:w-auto sm:aspect-[9/16] sm:max-w-[440px] sm:rounded-[32px] sm:border sm:border-[#4A2E2B]/15 sm:shadow-[0_28px_64px_-16px_rgba(74,46,43,0.28)]"
        aria-label="法式蛋糕疊疊樂直向舞台"
      >
        <CakeCanvasStage
          ref={stageRef}
          gameState={gameState}
          runId={runId}
          bestScore={records.bestScore}
          onHudUpdate={setHud}
          onGameOver={handleGameOver}
        />

        <GameHud
          gameState={gameState}
          hud={hud}
          bestScore={records.bestScore}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onTogglePause={handleTogglePause}
        />

        {gameState === 'PLAYING' && (
          <PowerUpBar
            powerUps={hud.powerUps}
            activePowerUps={hud.activePowerUps}
            onActivate={handleActivatePowerUp}
          />
        )}

        {gameState === 'TITLE_MENU' && (
          <TitleOverlay records={records} onStart={startNewRun} />
        )}

        {gameState === 'PAUSED' && (
          <PauseModal
            hud={hud}
            onResume={handleTogglePause}
            onRestart={startNewRun}
            onExitToTitle={handleExitToTitle}
          />
        )}

        {gameState === 'GAME_OVER' && (
          <GameOverModal
            finalHud={finalHud}
            records={records}
            isNewRecord={isNewRecord}
            onPlayAgain={startNewRun}
            onExitToTitle={handleExitToTitle}
          />
        )}
      </section>
    </main>
  );
}
