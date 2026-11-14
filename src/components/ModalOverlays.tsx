import React from 'react';
import { HighScoreData, HudSnapshot } from '../game/types';

interface PauseModalProps {
  hud: HudSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  hud,
  onResume,
  onRestart,
  onExitToTitle,
}) => {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#2C1A18]/42 px-6"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[310px] rounded-3xl border border-[#4A2E2B]/15 bg-[#FDF8F2] p-6 text-center shadow-[0_18px_40px_-12px_rgba(74,46,43,0.28)]">
        <h2 className="font-display text-2xl font-bold text-[#4A2E2B]">遊戲暫停</h2>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium text-[#7C5C58] tabular-nums">
          <span>目前 {hud.score.toLocaleString()} 分</span>
          <span aria-hidden="true">·</span>
          <span>{hud.layers} 層</span>
        </div>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#D94E5A] px-5 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#C13D49] active:scale-[0.98] whitespace-nowrap"
          >
            繼續遊戲
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="flex h-11 w-full items-center justify-center rounded-xl border border-[#4A2E2B]/15 bg-[#F7ECE4] px-5 text-sm font-semibold text-[#4A2E2B] transition-all duration-150 hover:bg-[#EFE0D5] active:scale-[0.98] whitespace-nowrap"
          >
            重新開始
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-[#7C5C58] transition-colors duration-150 hover:text-[#4A2E2B] whitespace-nowrap"
          >
            回主畫面
          </button>
        </div>
      </div>
    </div>
  );
};

interface GameOverModalProps {
  finalHud: HudSnapshot;
  records: HighScoreData;
  isNewRecord: boolean;
  onPlayAgain: () => void;
  onExitToTitle: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  finalHud,
  records,
  isNewRecord,
  onPlayAgain,
  onExitToTitle,
}) => {
  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[#2C1A18]/45 px-6"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-full max-w-[320px] rounded-3xl border border-[#4A2E2B]/15 bg-[#FDF8F2] p-6 text-center shadow-[0_20px_48px_-12px_rgba(74,46,43,0.32)]">
        <p className="text-xs font-semibold tracking-wider text-[#7C5C58]">烘焙結算</p>
        <h2 className="font-display mt-1 text-2xl font-bold text-[#4A2E2B]">
          {isNewRecord ? '刷新甜點塔紀錄！' : '蛋糕塔完成'}
        </h2>

        <div className="mt-5 border-y border-[#4A2E2B]/10 py-4">
          <div className="font-display text-5xl font-bold leading-none text-[#D94E5A] tabular-nums">
            {finalHud.score.toLocaleString()}
          </div>
          <p className="mt-1.5 text-xs font-medium text-[#7C5C58]">總得分</p>

          <div className="mt-4 grid grid-cols-3 gap-2 pt-2 text-center tabular-nums">
            <div>
              <div className="text-lg font-bold text-[#4A2E2B]">{finalHud.layers}</div>
              <div className="text-[11px] text-[#7C5C58]">疊加層數</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#B8721E]">×{finalHud.maxCombo}</div>
              <div className="text-[11px] text-[#7C5C58]">最高連擊</div>
            </div>
            <div>
              <div className="text-lg font-bold text-[#4A2E2B]">
                {records.bestScore.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#7C5C58]">歷史最佳</div>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex h-12 w-full items-center justify-center rounded-xl bg-[#D94E5A] px-6 text-base font-semibold text-white shadow-[0_8px_18px_-6px_rgba(217,78,90,0.45)] transition-all duration-150 hover:bg-[#C13D49] active:scale-[0.98] whitespace-nowrap"
          >
            再玩一次
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-medium text-[#7C5C58] transition-colors duration-150 hover:text-[#4A2E2B] whitespace-nowrap"
          >
            回主畫面
          </button>
        </div>
      </div>
    </div>
  );
};
