import React from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { GameState, HudSnapshot } from '../game/types';

interface GameHudProps {
  gameState: GameState;
  hud: HudSnapshot;
  bestScore: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onTogglePause: () => void;
}

export const GameHud: React.FC<GameHudProps> = ({
  gameState,
  hud,
  bestScore,
  isMuted,
  onToggleMute,
  onTogglePause,
}) => {
  const showActiveStats = gameState === 'PLAYING' || gameState === 'PAUSED';
  const displayBest = Math.max(bestScore, hud.score);

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-4 pt-[max(14px,env(safe-area-inset-top))]">
      {/* Left: Score & Unboxed Metadata */}
      {showActiveStats ? (
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold leading-none tracking-tight text-[#4A2E2B] tabular-nums">
              {hud.score.toLocaleString()}
            </span>
            {hud.isNewRecord && (
              <span className="text-xs font-semibold text-[#D94E5A]">新紀錄</span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[#7C5C58] tabular-nums">
            <span>{hud.layers} 層</span>
            <span aria-hidden="true">·</span>
            {hud.combo >= 2 ? (
              <span className="font-semibold text-[#B8721E]">連擊 ×{hud.combo}</span>
            ) : (
              <span>最高 {displayBest.toLocaleString()}</span>
            )}
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Right: Mute & Pause Controls (>= 44px touch targets) */}
      <div
        className="pointer-events-auto flex items-center gap-2"
        onPointerDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? '開啟音效' : '靜音'}
          title={isMuted ? '開啟音效' : '靜音'}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4A2E2B]/25 bg-white/95 text-[#4A2E2B] shadow-sm transition-transform duration-150 hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94E5A]"
        >
          {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>

        {showActiveStats && (
          <button
            type="button"
            onClick={onTogglePause}
            aria-label={gameState === 'PAUSED' ? '繼續遊戲' : '暫停遊戲'}
            title={gameState === 'PAUSED' ? '繼續遊戲' : '暫停遊戲'}
            className="flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[#4A2E2B]/25 bg-white/95 px-3.5 text-sm font-semibold text-[#4A2E2B] shadow-sm transition-transform duration-150 hover:bg-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94E5A] whitespace-nowrap"
          >
            {gameState === 'PAUSED' ? (
              <>
                <Play className="h-4 w-4 fill-current" />
                <span>繼續</span>
              </>
            ) : (
              <>
                <Pause className="h-4 w-4" />
                <span>暫停</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
