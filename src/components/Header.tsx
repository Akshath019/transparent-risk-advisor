import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="border-b border-border/50 bg-card/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <Link to="/" className="flex items-center gap-3 w-fit">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <div className="relative p-2 rounded-lg bg-primary/10 border border-primary/30">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FraudShield</h1>
            <p className="text-xs text-muted-foreground">Explainable Fraud Detection</p>
          </div>
        </Link>
      </div>
    </header>
  );
}
