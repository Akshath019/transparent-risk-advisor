-- Create enum for transaction status
CREATE TYPE transaction_status AS ENUM ('safe', 'suspicious', 'high_risk');

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  location VARCHAR(255),
  merchant_type VARCHAR(100),
  device_info JSONB,
  otp_verified BOOLEAN DEFAULT FALSE,
  ip_address VARCHAR(45),
  card_last_four VARCHAR(4),
  risk_score INTEGER NOT NULL DEFAULT 0,
  status transaction_status NOT NULL DEFAULT 'safe',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create risk_events table for tracking score changes
CREATE TABLE public.risk_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  data_received JSONB NOT NULL,
  rule_triggered VARCHAR(255) NOT NULL,
  score_change INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  explanation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_risk_events_transaction_id ON public.risk_events(transaction_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);

-- Enable Row Level Security (public access for demo - no auth required)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_events ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required per requirements)
CREATE POLICY "Allow public read access on transactions" 
ON public.transactions FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on transactions" 
ON public.transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access on transactions" 
ON public.transactions FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on risk_events" 
ON public.risk_events FOR SELECT USING (true);

CREATE POLICY "Allow public insert access on risk_events" 
ON public.risk_events FOR INSERT WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_transactions_updated_at
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.risk_events;