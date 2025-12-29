import { cn } from '@/lib/utils';
import { TransactionStatus, getStatusLabel } from '@/types/transaction';
import { Shield, AlertTriangle, AlertOctagon } from 'lucide-react';

interface StatusBadgeProps {
  status: TransactionStatus;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function StatusBadge({ status, size = 'md', showIcon = true, className }: StatusBadgeProps) {
  const getStyles = () => {
    const baseStyles = "inline-flex items-center gap-1.5 font-medium border rounded-full";
    
    const sizeStyles = {
      sm: "px-2 py-0.5 text-xs",
      md: "px-3 py-1 text-sm",
      lg: "px-4 py-1.5 text-base",
    };

    const statusStyles = {
      safe: "risk-badge-safe",
      suspicious: "risk-badge-suspicious",
      high_risk: "risk-badge-high",
    };

    return cn(baseStyles, sizeStyles[size], statusStyles[status], className);
  };

  const Icon = () => {
    const iconSize = size === 'sm' ? 12 : size === 'lg' ? 18 : 14;
    
    switch (status) {
      case 'safe':
        return <Shield size={iconSize} />;
      case 'suspicious':
        return <AlertTriangle size={iconSize} />;
      case 'high_risk':
        return <AlertOctagon size={iconSize} />;
    }
  };

  return (
    <span className={getStyles()}>
      {showIcon && <Icon />}
      {getStatusLabel(status)}
    </span>
  );
}
