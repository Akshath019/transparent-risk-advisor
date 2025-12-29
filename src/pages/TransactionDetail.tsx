import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Transaction, RiskEvent, DeviceInfo } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { RiskGauge } from '@/components/RiskGauge';
import { StatusBadge } from '@/components/StatusBadge';
import { Timeline } from '@/components/Timeline';
import { SimulationPanel } from '@/components/SimulationPanel';
import { ArrowLeft, MapPin, Clock, CreditCard, Store, Smartphone, KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, format } from 'date-fns';

export default function TransactionDetail() {
  const { id } = useParams<{ id: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;

    const [txResult, eventsResult] = await Promise.all([
      supabase.from('transactions').select('*').eq('id', id).single(),
      supabase.from('risk_events').select('*').eq('transaction_id', id).order('created_at', { ascending: true }),
    ]);

    if (txResult.data) {
      setTransaction(txResult.data as unknown as Transaction);
    }
    if (eventsResult.data) {
      setEvents(eventsResult.data as unknown as RiskEvent[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Subscribe to realtime updates
    const txChannel = supabase
      .channel(`transaction-${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `id=eq.${id}`,
        },
        () => fetchData()
      )
      .subscribe();

    const eventsChannel = supabase
      .channel(`events-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'risk_events',
          filter: `transaction_id=eq.${id}`,
        },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(eventsChannel);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Transaction Not Found</h2>
          <Link to="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const deviceInfo = transaction.device_info as DeviceInfo | null;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Transaction Header */}
            <div className="glass-card p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-mono text-3xl font-bold">
                      ${transaction.amount.toLocaleString()}
                    </span>
                    <span className="text-muted-foreground">{transaction.currency}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {transaction.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {transaction.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(transaction.created_at), 'PPpp')}
                    </span>
                  </div>
                </div>
                <StatusBadge status={transaction.status} size="lg" />
              </div>
            </div>

            {/* Risk Score Card */}
            <div className="glass-card p-8 flex flex-col items-center">
              <RiskGauge 
                score={transaction.risk_score} 
                status={transaction.status}
                size="lg"
              />
              <p className="mt-4 text-center text-muted-foreground max-w-md">
                {transaction.status === 'safe' && 
                  'This transaction shows normal patterns and low risk indicators.'}
                {transaction.status === 'suspicious' && 
                  'This transaction has some unusual patterns that require monitoring.'}
                {transaction.status === 'high_risk' && 
                  'This transaction shows multiple high-risk indicators and requires review.'}
              </p>
            </div>

            {/* Transaction Details */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-mono font-medium">
                      ${transaction.amount.toLocaleString()} {transaction.currency}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Location</p>
                    <p className="font-medium">{transaction.location || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Merchant Type</p>
                    <p className="font-medium">{transaction.merchant_type || 'Pending'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg">
                  <Smartphone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Device</p>
                    <p className="font-medium">
                      {deviceInfo 
                        ? `${deviceInfo.type || 'Unknown'} (${deviceInfo.os || 'Unknown OS'})`
                        : 'Pending'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-secondary/50 rounded-lg sm:col-span-2">
                  <KeyRound className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">OTP Status</p>
                    <p className={`font-medium ${transaction.otp_verified ? 'text-risk-safe' : 'text-muted-foreground'}`}>
                      {transaction.otp_verified ? 'Verified' : 'Not verified'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-6">Risk Assessment Timeline</h3>
              <Timeline events={events} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <SimulationPanel transaction={transaction} onUpdate={fetchData} />

            {/* Quick Stats */}
            <div className="glass-card p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Risk Events</span>
                  <span className="font-mono font-medium">{events.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Data Points</span>
                  <span className="font-mono font-medium">
                    {[
                      true, // always have amount
                      !!transaction.location,
                      !!transaction.merchant_type,
                      !!transaction.device_info,
                      transaction.otp_verified,
                    ].filter(Boolean).length} / 5
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Last Updated</span>
                  <span className="text-sm">
                    {formatDistanceToNow(new Date(transaction.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
