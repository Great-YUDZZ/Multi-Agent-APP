import React from 'react';

interface CubesLogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const CubesLogo: React.FC<CubesLogoProps> = ({
  size = 20,
  className = '',
  withGlow = true,
}) => {
  return (
    <div
      className={`inline-flex items-center justify-center relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src="/logo.png"
        alt="3 Cubes Multi-Agent Logo"
        className="w-full h-full object-contain pointer-events-none transition-transform duration-200"
        style={{
          filter: withGlow
            ? 'drop-shadow(0 0 6px rgba(99, 102, 241, 0.35)) drop-shadow(0 0 12px rgba(6, 182, 212, 0.2))'
            : undefined,
        }}
      />
    </div>
  );
};
