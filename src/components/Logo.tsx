import React from 'react';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
  className?: string;
}

export function Logo({ size = 32, color = '#FCA311', className, ...props }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 118"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <defs>
        {/* SVG Mask to subtract the gavel and pill cutouts cleanly on any background */}
        <mask id="b-gavel-mask">
          {/* White covers all (keep the outer B shape) */}
          <rect width="100" height="118" fill="white" />
          
          {/* Gavel Handle (splits the left side edge) */}
          <rect x="0" y="52" width="32.5" height="14" fill="black" />
          
          {/* Gavel Head */}
          <rect x="32.5" y="40" width="35" height="38" fill="black" />
          
          {/* Top Pill (Counter) */}
          <rect x="28.5" y="22" width="43" height="12" rx="6" fill="black" />
          
          {/* Bottom Pill (Counter) */}
          <rect x="28.5" y="84" width="43" height="12" rx="6" fill="black" />
        </mask>
      </defs>

      {/* Outer B Silhouette */}
      <path
        d="M 0 14 C 0 5, 5 0, 14 0 L 65 0 C 80 0, 96 10, 96 24 C 96 38, 90 52, 83 59 C 94 65, 100 76, 100 88 C 100 102, 92 118, 76 118 L 39 118 L 27 106 L 15 118 C 5 118, 0 108, 0 92 Z"
        fill={color}
        mask="url(#b-gavel-mask)"
      />
    </svg>
  );
}

export default Logo;
