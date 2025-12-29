import { useEffect, useState } from 'react';
import { Transaction } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { TransactionCard } from '@/components/TransactionCard';
import { CreateTransactionDialog } from '@/components/CreateTransactionDialog';
import { StatusBadge } from '@/components/StatusBadge';
import { Loader2, Activity, TrendingUp, AlertTriangle, Shield } from 'lucide-react';

export default function Dashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'safe' | 'suspicious' | 'high_risk'>('all');

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return;
    }

    setTransactions(data as unknown as Transaction[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTransactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => {
          fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.status === filter);

  const stats = {
    total: transactions.length,
    safe: transactions.filter(t => t.status === 'safe').length,
    suspicious: transactions.filter(t => t.status === 'suspicious').length,
    highRisk: transactions.filter(t => t.status === 'high_risk').length,
  };

  return (
    <div className="min-h-screen">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-4 animate-fade-in">
            <span className="text-gradient">Explainable</span> Fraud Detection
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '100ms' }}>
            Real-time risk assessment with transparent decision-making. 
            Every score change is explained, building trust through transparency.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => setFilter('all')}
            className={`glass-card p-4 text-left transition-all ${filter === 'all' ? 'ring-2 ring-primary' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <span className="text-2xl font-bold font-mono">{stats.total}</span>
          </button>

          <button
            onClick={() => setFilter('safe')}
            className={`glass-card p-4 text-left transition-all ${filter === 'safe' ? 'ring-2 ring-risk-safe' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-risk-safe" />
              <span className="text-sm text-muted-foreground">Safe</span>
            </div>
            <span className="text-2xl font-bold font-mono text-risk-safe">{stats.safe}</span>
          </button>

          <button
            onClick={() => setFilter('suspicious')}
            className={`glass-card p-4 text-left transition-all ${filter === 'suspicious' ? 'ring-2 ring-risk-suspicious' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-risk-suspicious" />
              <span className="text-sm text-muted-foreground">Suspicious</span>
            </div>
            <span className="text-2xl font-bold font-mono text-risk-suspicious">{stats.suspicious}</span>
          </button>

          <button
            onClick={() => setFilter('high_risk')}
            className={`glass-card p-4 text-left transition-all ${filter === 'high_risk' ? 'ring-2 ring-risk-high' : ''}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-risk-high" />
              <span className="text-sm text-muted-foreground">High Risk</span>
            </div>
            <span className="text-2xl font-bold font-mono text-risk-high">{stats.highRisk}</span>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">
            Transactions
            {filter !== 'all' && (
              <StatusBadge status={filter} size="sm" className="ml-2" />
            )}
          </h3>
          <CreateTransactionDialog onTransactionCreated={fetchTransactions} />
        </div>

        {/* Transactions List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-medium mb-2">No transactions yet</h4>
            <p className="text-muted-foreground mb-4">
              Create your first transaction to see the fraud detection system in action.
            </p>
            <CreateTransactionDialog onTransactionCreated={fetchTransactions} />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction, index) => (
              <TransactionCard 
                key={transaction.id} 
                transaction={transaction} 
                index={index}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
