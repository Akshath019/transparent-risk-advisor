import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TransactionStatus, RISK_THRESHOLDS } from '@/types/transaction';

interface RiskGaugeProps {
  score: number;
  status: TransactionStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

export function RiskGauge({ 
  score, 
  status, 
  size = 'md', 
  showLabel = true,
  animate = true 
}: RiskGaugeProps) {
  const dimensions = useMemo(() => {
    switch (size) {
      case 'sm':
        return { width: 120, height: 80, strokeWidth: 8, fontSize: 'text-xl' };
      case 'lg':
        return { width: 280, height: 160, strokeWidth: 16, fontSize: 'text-5xl' };
      default:
        return { width: 200, height: 120, strokeWidth: 12, fontSize: 'text-3xl' };
    }
  }, [size]);

  const { width, height, strokeWidth, fontSize } = dimensions;
  const radius = (width - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = () => {
    switch (status) {
      case 'safe':
        return { stroke: 'stroke-risk-safe', text: 'text-risk-safe', glow: 'glow-safe' };
      case 'suspicious':
        return { stroke: 'stroke-risk-suspicious', text: 'text-risk-suspicious', glow: 'glow-suspicious' };
      case 'high_risk':
        return { stroke: 'stroke-risk-high', text: 'text-risk-high', glow: 'glow-high' };
    }
  };

  const colors = getColor();

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={cn("relative", animate && "animate-scale-in")}>
        <svg 
          width={width} 
          height={height} 
          viewBox={`0 0 ${width} ${height}`}
          className={cn("transform -rotate-0", colors.glow)}
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${height - strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height - strokeWidth / 2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="text-muted/30"
          />
          
          {/* Progress arc */}
          <path
            d={`M ${strokeWidth / 2} ${height - strokeWidth / 2} A ${radius} ${radius} 0 0 1 ${width - strokeWidth / 2} ${height - strokeWidth / 2}`}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className={cn(colors.stroke, animate && "transition-all duration-700 ease-out")}
          />

          {/* Threshold markers */}
          <circle
            cx={strokeWidth / 2 + (RISK_THRESHOLDS.SAFE / 100) * (width - strokeWidth)}
            cy={height - strokeWidth / 2 - Math.sin(Math.acos((RISK_THRESHOLDS.SAFE / 100) * 2 - 1)) * radius}
            r={3}
            className="fill-muted-foreground/40"
          />
          <circle
            cx={strokeWidth / 2 + (RISK_THRESHOLDS.SUSPICIOUS / 100) * (width - strokeWidth)}
            cy={height - strokeWidth / 2 - Math.sin(Math.acos((RISK_THRESHOLDS.SUSPICIOUS / 100) * 2 - 1)) * radius}
            r={3}
            className="fill-muted-foreground/40"
          />
        </svg>

        {/* Score display */}
        <div className="absolute inset-0 flex items-end justify-center pb-2">
          <span className={cn(
            "font-mono font-bold",
            fontSize,
            colors.text,
            animate && "animate-score-update"
          )}>
            {score}
          </span>
        </div>
      </div>

      {showLabel && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Risk Score</span>
          <span className={cn("font-medium", colors.text)}>
            / 100
          </span>
        </div>
      )}
    </div>
  );
}
