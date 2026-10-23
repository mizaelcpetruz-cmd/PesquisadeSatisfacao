import React from "react";

interface SatisfactionIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number;
}

export function SatisfactionIcon({ className = "size-8", size, ...props }: SatisfactionIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      {...props}
    >
      <defs>
        <linearGradient
          id="petruzGrad"
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#691B6D" />
          <stop offset="50%" stopColor="#4A154B" />
          <stop offset="100%" stopColor="#360C38" />
        </linearGradient>
        <linearGradient
          id="petruzBorder"
          x1="0"
          y1="0"
          x2="48"
          y2="48"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#c084fc" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0.15" />
        </linearGradient>
      </defs>

      {/* Main purple brand badge */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#petruzGrad)" />
      <rect
        x="2.5"
        y="2.5"
        width="43"
        height="43"
        rx="11.5"
        stroke="url(#petruzBorder)"
        strokeWidth="1"
      />

      {/* Petruz Leaf */}
      <path
        d="M26.5 10C28.2 10 30.5 11.5 30 13.8C27.5 13.5 25.2 12.2 24.5 11.5C25.2 10.6 25.8 10 26.5 10Z"
        fill="#ffffff"
      />

      {/* Petruz Açaí Berry Spiral Swirl */}
      <path
        d="M24.5 15.5C31.5 16 35.5 21.5 34.5 28C33.2 35 25.5 38 19.5 35.5C13.5 33 11 25.5 14.5 19.5C17.5 14.5 23.5 14.5 27 16.5C31.2 19 32.5 24.5 30.5 28.5C28.5 32.5 23.5 33.5 20 31C17.2 29 17.5 25 20 23C22 21.5 24.8 22.2 25.5 24.2C25.9 25.5 25 26.8 23.8 26.8C22.8 26.8 22.2 25.8 22.8 25"
        stroke="#ffffff"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Satisfaction Glow Sparkle */}
      <path d="M39 6.5L40 9L42.5 10L40 11L39 13.5L38 11L35.5 10L38 9Z" fill="#facc15" />
    </svg>
  );
}
