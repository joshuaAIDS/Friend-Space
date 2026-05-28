import React from 'react';
import { Users } from 'lucide-react';
import { cn } from '../lib/utils';

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  showText?: boolean;
}

const BrandLogo = ({ className, imageClassName, showText = true }: BrandLogoProps) => {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "relative shrink-0",
        imageClassName || "w-10 h-10"
      )}>
        <svg 
          viewBox="0 0 100 100" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-xl"
        >
          {/* Connecting Lines */}
          <path d="M50 25 L25 75" stroke="url(#grad-blue-red)" strokeWidth="8" strokeLinecap="round" />
          <path d="M50 25 L75 75" stroke="url(#grad-blue-green)" strokeWidth="8" strokeLinecap="round" />
          <path d="M25 75 L75 75" stroke="url(#grad-red-green)" strokeWidth="8" strokeLinecap="round" />
          
          {/* Speech Bubble Tail on Red Head */}
          <path d="M25 75 L15 90 L35 85" fill="#FF4B6E" />

          {/* Top Head (Blue) */}
          <circle cx="50" cy="25" r="15" fill="url(#grad-blue)" />
          <circle cx="45" cy="22" r="2" fill="white" opacity="0.8" />
          <circle cx="55" cy="22" r="2" fill="white" opacity="0.8" />
          <path d="M45 30 Q50 35 55 30" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

          {/* Bottom Left Head (Red/Pink) */}
          <circle cx="25" cy="75" r="15" fill="url(#grad-red)" />
          <circle cx="20" cy="72" r="2" fill="white" opacity="0.8" />
          <circle cx="30" cy="72" r="2" fill="white" opacity="0.8" />
          <path d="M20 80 Q25 85 30 80" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

          {/* Bottom Right Head (Green/Yellow) */}
          <circle cx="75" cy="75" r="15" fill="url(#grad-green)" />
          <circle cx="70" cy="72" r="2" fill="white" opacity="0.8" />
          <circle cx="80" cy="72" r="2" fill="white" opacity="0.8" />
          <path d="M70 80 Q75 85 80 80" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.8" />

          {/* Gradients */}
          <defs>
            <linearGradient id="grad-blue" x1="50" y1="10" x2="50" y2="40" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4FACFE" />
              <stop offset="1" stopColor="#00F2FE" />
            </linearGradient>
            <linearGradient id="grad-red" x1="25" y1="60" x2="25" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF4B6E" />
              <stop offset="1" stopColor="#F53F3F" />
            </linearGradient>
            <linearGradient id="grad-green" x1="75" y1="60" x2="75" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#42E695" />
              <stop offset="1" stopColor="#3BB2B8" />
            </linearGradient>
            
            <linearGradient id="grad-blue-red" x1="50" y1="25" x2="25" y2="75" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4FACFE" />
              <stop offset="1" stopColor="#FF4B6E" />
            </linearGradient>
            <linearGradient id="grad-blue-green" x1="50" y1="25" x2="75" y2="75" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4FACFE" />
              <stop offset="1" stopColor="#42E695" />
            </linearGradient>
            <linearGradient id="grad-red-green" x1="25" y1="75" x2="75" y2="75" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF4B6E" />
              <stop offset="1" stopColor="#42E695" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {showText && (
        <span className="text-xl font-bold tracking-tight text-white bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
          FriendSpace
        </span>
      )}
    </div>
  );
};

export default BrandLogo;
