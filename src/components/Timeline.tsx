import { cn } from '@/lib/utils';
import { RiskEvent } from '@/types/transaction';
import { formatDistanceToNow } from 'date-fns';
import { 
  ArrowUp, 
  ArrowDown, 
  Minus, 
  Clock, 
  CreditCard, 
  Store, 
  Smartphone, 
  KeyRound,
  MapPin
} from 'lucide-react';

interface TimelineProps {
  events: RiskEvent[];
}

export function Timeline({ events }: TimelineProps) {
  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'transaction_created':
        return CreditCard;
      case 'merchant_data':
        return Store;
      case 'device_data':
        return Smartphone;
      case 'otp_verification':
        return KeyRound;
      case 'location_data':
        return MapPin;
      default:
        return Clock;
    }
  };

  const getScoreChangeDisplay = (change: number) => {
    if (change > 0) {
      return {
        icon: ArrowUp,
        color: 'text-risk-high',
        bgColor: 'bg-risk-high/10',
        label: `+${change}`,
      };
    }
    if (change < 0) {
      return {
        icon: ArrowDown,
        color: 'text-risk-safe',
        bgColor: 'bg-risk-safe/10',
        label: `${change}`,
      };
    }
    return {
      icon: Minus,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted/50',
      label: '0',
    };
  };

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Clock className="mr-2 h-5 w-5" />
        No events yet
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {/* Timeline line */}
      <div className="absolute left-5 top-6 bottom-6 w-px bg-border" />

      {events.map((event, index) => {
        const EventIcon = getEventIcon(event.event_type);
        const scoreChange = getScoreChangeDisplay(event.score_change);
        const ScoreIcon = scoreChange.icon;

        return (
          <div 
            key={event.id} 
            className={cn(
              "relative flex gap-4 pb-6 last:pb-0 animate-fade-in",
              { "animation-delay-100": index > 0 }
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Icon node */}
            <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-secondary border border-border">
              <EventIcon className="h-4 w-4 text-foreground" />
            </div>

            {/* Content */}
            <div className="flex-1 space-y-2 pt-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-foreground">
                    {event.rule_triggered}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                  </p>
                </div>

                {/* Score change badge */}
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md font-mono text-sm font-medium",
                  scoreChange.bgColor,
                  scoreChange.color
                )}>
                  <ScoreIcon className="h-3 w-3" />
                  {scoreChange.label}
                </div>
              </div>

              {/* Explanation */}
              <div className="glass-card p-3">
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {event.explanation}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>New Score:</span>
                  <span className="font-mono font-medium text-foreground">
                    {event.new_score}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
