import React from 'react';
import { HighScoreData } from '../game/types';

interface TitleOverlayProps {
  records: HighScoreData;
  onStart: () => void;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({ records, onStart }) => {
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-between px-6 pb-[max(28px,env(safe-area-inset-bottom))] pt-20"
      style={{
        background:
          'linear-gradient(180deg, rgba(253,248,242,0.88) 0%, rgba(253,248,242,0.52) 48%, rgba(247,236,228,0.92) 100%)',
      }}
    >
      {/* Top / Center Bespoke Patisserie SVG Title Lockup over calm space */}
      <div className="mt-4 flex flex-col items-center text-center">
        <div className="animate-gentle-float mb-4">
          <svg
            width="92"
            height="84"
            viewBox="0 0 92 84"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Cake stand */}
            <path
              d="M22 74H70M36 74L41 64H51L56 74"
              stroke="#B8875B"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect
              x="16"
              y="60"
              width="60"
              height="6"
              rx="3"
              fill="#FFFBF5"
              stroke="#4A2E2B"
              strokeOpacity="0.38"
              strokeWidth="1.5"
            />
            {/* Bottom sponge tier */}
            <rect
              x="22"
              y="43"
              width="48"
              height="17"
              rx="4"
              fill="#F5D5A7"
              stroke="#4A2E2B"
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            <rect x="23" y="50" width="46" height="3.5" fill="#E86A76" />
            <path
              d="M22 45C22 43.3431 23.3431 42 25 42H67C68.6569 42 70 43.3431 70 45V48C66 50.5 62 47.5 58 49.5C54 51.5 50 47.5 46 49.5C42 51.5 38 47.5 34 49.5C30 51.5 26 48 22 48V45Z"
              fill="#FFF9F3"
            />
            {/* Top mousse tier */}
            <rect
              x="29"
              y="26"
              width="34"
              height="16"
              rx="4"
              fill="#F2B8C0"
              stroke="#4A2E2B"
              strokeOpacity="0.4"
              strokeWidth="1.5"
            />
            <path
              d="M29 28C29 26.3431 30.3431 25 32 25H60C61.6569 25 63 26.3431 63 28V31C59 33.5 54.5 30 50 32C45.5 34 41.5 30 37 32C33 33.5 31 31 29 31V28Z"
              fill="#FCE9EC"
            />
            {/* Strawberry crown */}
            <circle cx="46" cy="20" r="5.5" fill="#D94E5A" />
            <path d="M43.5 14.5L46 16.5L48.5 14.5" stroke="#7C9A72" strokeWidth="2" strokeLinecap="round" />
            {/* Subtle sparkle accents */}
            <path d="M13 24L14.5 20L16 24L20 25.5L16 27L14.5 31L13 27L9 25.5L13 24Z" fill="#E59A3C" />
            <path d="M76 16L77 13L78 16L81 17L78 18L77 21L76 18L73 17L76 16Z" fill="#E59A3C" />
          </svg>
        </div>

        <p className="text-xs font-semibold tracking-[0.18em] text-[#7C5C58]">
          PÂTISSERIE STACK
        </p>
        <h1 className="font-display mt-1.5 text-balance text-4xl font-bold tracking-tight text-[#4A2E2B]">
          法式蛋糕疊疊樂
        </h1>
        <p className="mt-2.5 max-w-[260px] text-sm leading-relaxed text-[#7C5C58]">
          看準鐘擺時機釋放蛋糕層，精準疊合累積完美連擊
        </p>

        {records.bestScore > 0 && (
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-[#7C5C58] tabular-nums">
            <span>最高 {records.bestScore.toLocaleString()} 分</span>
            <span aria-hidden="true">·</span>
            <span>{records.bestLayers} 層</span>
            {records.bestCombo > 1 && (
              <>
                <span aria-hidden="true">·</span>
                <span>最長連擊 ×{records.bestCombo}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom Thumb-Zone CTA + Single Control Hint Line */}
      <div className="w-full max-w-[300px] pb-3 text-center">
        <button
          type="button"
          onClick={onStart}
          className="flex h-13 w-full items-center justify-center rounded-2xl bg-[#D94E5A] px-6 text-base font-semibold text-white shadow-[0_8px_20px_-6px_rgba(217,78,90,0.48)] transition-all duration-150 hover:bg-[#C13D49] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94E5A] whitespace-nowrap"
        >
          開始疊蛋糕
        </button>

        <p className="mt-3.5 text-xs font-medium text-[#7C5C58]">
          點擊螢幕或按空白鍵釋放 · Esc 暫停
        </p>
      </div>
    </div>
  );
};
