import React from 'react';

interface TimeEatsLogoProps {
  className?: string;
  variant?: 'vertical' | 'badge' | 'inline' | 'icon';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const SandwichIcon: React.FC<{ className?: string; size?: number }> = ({ 
  className = "", 
  size = 32 
}) => {
  return (
    <svg
      viewBox="0 0 160 100"
      width={size * 1.55}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top Bun with Golden Crust and Highlights */}
      <path
        d="M18 42C18 20 45 10 80 10C115 10 142 20 142 42C142 46 138 48 132 48H28C22 48 18 46 18 42Z"
        fill="#FBBF24"
        stroke="#1E293B"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* 3 Top Incisions / Scoring Slits */}
      <g stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.95">
        <path d="M50 20L64 36" />
        <path d="M74 18L88 36" />
        <path d="M98 20L112 36" />
      </g>
      {/* Bun Shadow / Depth */}
      <path
        d="M24 44C34 38 60 34 80 34C100 34 126 38 136 44"
        stroke="#F59E0B"
        strokeWidth="3.5"
        strokeLinecap="round"
      />

      {/* Tomato / Pepper slices */}
      <g stroke="#1E293B" strokeWidth="4">
        {/* Slice 1 */}
        <path d="M26 50C26 50 34 46 44 46C54 46 58 50 58 50" fill="#EA580C" strokeLinejoin="round" />
        <path d="M26 50H58" stroke="#1E293B" strokeWidth="3" />
        {/* Slice 2 */}
        <path d="M62 50C62 50 70 46 80 46C90 46 98 50 98 50" fill="#EF4444" strokeLinejoin="round" />
        <path d="M62 50H98" stroke="#1E293B" strokeWidth="3" />
        {/* Slice 3 */}
        <path d="M102 50C102 50 110 46 120 46C130 46 134 50 134 50" fill="#EA580C" strokeLinejoin="round" />
        <path d="M102 50H134" stroke="#1E293B" strokeWidth="3" />
      </g>

      {/* Fresh White Cheese / Dressing line */}
      <rect x="22" y="52" width="116" height="5" rx="2.5" fill="#FEF3C7" stroke="#1E293B" strokeWidth="3" />

      {/* Fresh Green Lettuce Waves */}
      <path
        d="M20 60C26 56 32 64 38 60C44 56 50 64 56 60C62 56 68 64 74 60C80 56 86 64 92 60C98 56 104 64 110 60C116 56 122 64 128 60C134 56 138 60 140 60"
        stroke="#16A34A"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom Bun */}
      <path
        d="M22 68H138C143 68 145 74 140 82C130 92 108 94 80 94C52 94 30 92 20 82C15 74 17 68 22 68Z"
        fill="#FBBF24"
        stroke="#1E293B"
        strokeWidth="6"
        strokeLinejoin="round"
      />
      {/* Bottom highlight */}
      <path
        d="M32 86C50 90 110 90 128 86"
        stroke="#F59E0B"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default function TimeEatsLogo({
  className = '',
  variant = 'vertical',
  size = 'sm'
}: TimeEatsLogoProps) {
  // Sizing configurations
  const sizeConfig = {
    xs: { iconSize: 20, text: 'text-[11px]', padding: 'p-1.5' },
    sm: { iconSize: 24, text: 'text-xs', padding: 'px-2 py-1' },
    md: { iconSize: 30, text: 'text-sm', padding: 'px-2.5 py-1.5' },
    lg: { iconSize: 38, text: 'text-lg', padding: 'px-3.5 py-2' },
    xl: { iconSize: 48, text: 'text-2xl', padding: 'px-5 py-3' },
  };

  const { iconSize, text, padding } = sizeConfig[size] || sizeConfig.sm;

  if (variant === 'icon') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <SandwichIcon size={iconSize} />
      </div>
    );
  }

  // Vertical compact format (Logo en haut, texte Time'EATS en dessous)
  if (variant === 'vertical') {
    return (
      <div
        className={`inline-flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/90 border border-blue-500/80 dark:border-blue-400/60 rounded-xl shadow-xs ${padding} select-none transition-transform hover:scale-[1.03] ${className}`}
      >
        <SandwichIcon size={iconSize} />
        <span className={`font-black tracking-tight font-sans ${text} text-blue-600 dark:text-blue-400 leading-tight mt-0.5`}>
          Time<span className="font-bold">’EATS</span>
        </span>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div className={`inline-flex items-center gap-1.5 select-none ${className}`}>
        <SandwichIcon size={iconSize} />
        <span className={`font-black tracking-tight font-sans ${text} text-blue-600 dark:text-blue-400`}>
          Time<span className="font-bold">’EATS</span>
        </span>
      </div>
    );
  }

  // Horizontal badge variant
  return (
    <div
      className={`inline-flex items-center gap-2 bg-white dark:bg-slate-900 border border-blue-600/80 dark:border-blue-500 rounded-2xl shadow-xs ${padding} select-none transition-transform hover:scale-[1.02] ${className}`}
    >
      <SandwichIcon size={iconSize} />
      <span className={`font-black tracking-tight font-sans ${text} text-blue-600 dark:text-blue-400 leading-none`}>
        Time<span className="font-bold">’EATS</span>
      </span>
    </div>
  );
}
