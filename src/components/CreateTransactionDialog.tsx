import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { evaluateInitialRisk, calculateNewScore, createRiskEvent } from '@/lib/riskEngine';
import { Transaction, getStatusFromScore } from '@/types/transaction';

interface CreateTransactionDialogProps {
  onTransactionCreated?: (transaction: Transaction) => void;
}

export function CreateTransactionDialog({ onTransactionCreated }: CreateTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [location, setLocation] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid transaction amount.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Create the transaction first
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          amount: parsedAmount,
          location: location || null,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Evaluate initial risk
      const typedTransaction = transaction as unknown as Transaction;
      const riskResults = evaluateInitialRisk(typedTransaction);
      
      let currentScore = 0;
      const riskEvents = [];

      for (const result of riskResults) {
        const newScore = calculateNewScore(currentScore, result.scoreChange);
        riskEvents.push(
          createRiskEvent(
            transaction.id,
            'transaction_created',
            { amount: parsedAmount, location: location || null },
            result,
            newScore
          )
        );
        currentScore = newScore;
      }

      // Insert risk events
      if (riskEvents.length > 0) {
        const { error: eventsError } = await supabase
          .from('risk_events')
          .insert(riskEvents);

        if (eventsError) throw eventsError;
      }

      // Update transaction with final score
      const finalStatus = getStatusFromScore(currentScore);
      const { data: updatedTx, error: updateError } = await supabase
        .from('transactions')
        .update({
          risk_score: currentScore,
          status: finalStatus,
        })
        .eq('id', transaction.id)
        .select()
        .single();

      if (updateError) throw updateError;

      toast({
        title: 'Transaction Created',
        description: `Initial risk score: ${currentScore} (${finalStatus.replace('_', ' ')})`,
      });

      if (onTransactionCreated) {
        onTransactionCreated(updatedTx as unknown as Transaction);
      }

      setOpen(false);
      setAmount('');
      setLocation('');
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Error',
        description: 'Failed to create transaction. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location (Optional)</Label>
            <Input
              id="location"
              placeholder="e.g., New York, USA"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Try "VPN" or "Proxy" to see high-risk location detection
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create Transaction'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
