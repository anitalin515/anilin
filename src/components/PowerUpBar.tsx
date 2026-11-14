import React from 'react';
import { Magnet, MoveHorizontal, Shield } from 'lucide-react';
import { ActivePowerUps, PowerUpInventory, PowerUpType } from '../game/types';

interface PowerUpBarProps {
  powerUps: PowerUpInventory;
  activePowerUps: ActivePowerUps;
  onActivate: (type: PowerUpType) => void;
}

export const PowerUpBar: React.FC<PowerUpBarProps> = ({
  powerUps,
  activePowerUps,
  onActivate,
}) => {
  const items: Array<{
    type: PowerUpType;
    label: string;
    shortcut: string;
    count: number;
    isArmed: boolean;
    icon: React.ReactNode;
    armedClass: string;
  }> = [
    {
      type: 'autoAlign',
      label: activePowerUps.autoAlignActive ? '已鎖定' : '自動對齊',
      shortcut: '1',
      count: powerUps.autoAlign,
      isArmed: activePowerUps.autoAlignActive,
      icon: <Magnet className="h-4 w-4 shrink-0" />,
      armedClass: 'border-[#E59A3C] bg-[#FFF5E4] text-[#9A5B13] shadow-[0_0_0_2px_rgba(229,154,60,0.22)]',
    },
    {
      type: 'widen',
      label: '增加寬度',
      shortcut: '2',
      count: powerUps.widen,
      isArmed: false,
      icon: <MoveHorizontal className="h-4 w-4 shrink-0" />,
      armedClass: '',
    },
    {
      type: 'shield',
      label: activePowerUps.shieldActive ? '防護中' : '防護盾',
      shortcut: '3',
      count: powerUps.shield,
      isArmed: activePowerUps.shieldActive,
      icon: <Shield className="h-4 w-4 shrink-0" />,
      armedClass: 'border-[#7C9A72] bg-[#EFF6EC] text-[#44633A] shadow-[0_0_0_2px_rgba(124,154,114,0.24)]',
    },
  ];

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 bottom-0 z-20 px-3.5 pb-[max(12px,env(safe-area-inset-bottom))]"
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => {
          const disabled = !item.isArmed && item.count <= 0;
          return (
            <button
              key={item.type}
              type="button"
              disabled={disabled || item.isArmed}
              onClick={() => onActivate(item.type)}
              aria-label={`${item.label}（剩餘 ${item.count} 個）`}
              className={`relative flex h-12 min-w-0 items-center justify-center gap-1.5 rounded-2xl border px-2.5 text-xs font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D94E5A] whitespace-nowrap ${
                item.isArmed
                  ? item.armedClass
                  : disabled
                    ? 'cursor-not-allowed border-[#4A2E2B]/12 bg-white/65 text-[#4A2E2B]/40'
                    : 'border-[#4A2E2B]/22 bg-white/95 text-[#4A2E2B] shadow-sm hover:bg-white active:scale-[0.97]'
              }`}
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
              <span
                className={`tabular-nums text-[11px] font-bold ${
                  item.isArmed
                    ? 'opacity-90'
                    : item.count > 0
                      ? 'text-[#D94E5A]'
                      : 'text-[#4A2E2B]/35'
                }`}
              >
                ×{item.count}
              </span>
              <span className="hidden sm:inline text-[10px] text-[#7C5C58]/60 font-medium">
                {item.shortcut}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
