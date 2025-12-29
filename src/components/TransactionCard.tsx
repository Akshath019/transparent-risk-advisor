import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Transaction } from '@/types/transaction';
import { StatusBadge } from './StatusBadge';
import { RiskGauge } from './RiskGauge';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Clock, ChevronRight } from 'lucide-react';

interface TransactionCardProps {
  transaction: Transaction;
  index?: number;
}

export function TransactionCard({ transaction, index = 0 }: TransactionCardProps) {
  return (
    <Link
      to={`/transaction/${transaction.id}`}
      className={cn(
        "group glass-card p-5 flex items-center gap-6 transition-all duration-300",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
        "animate-fade-in"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Risk Gauge */}
      <div className="shrink-0">
        <RiskGauge 
          score={transaction.risk_score} 
          status={transaction.status} 
          size="sm"
          showLabel={false}
          animate={false}
        />
      </div>

      {/* Transaction Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-mono text-xl font-semibold text-foreground">
            ${transaction.amount.toLocaleString()}
          </span>
          <span className="text-muted-foreground text-sm">
            {transaction.currency}
          </span>
          <StatusBadge status={transaction.status} size="sm" />
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {transaction.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {transaction.location}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
          </span>
        </div>

        {transaction.merchant_type && (
          <div className="mt-2">
            <span className="inline-block px-2 py-0.5 bg-secondary rounded text-xs text-muted-foreground">
              {transaction.merchant_type}
            </span>
          </div>
        )}
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}
