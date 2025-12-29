export type TransactionStatus = 'safe' | 'suspicious' | 'high_risk';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  location: string | null;
  merchant_type: string | null;
  device_info: DeviceInfo | null;
  otp_verified: boolean;
  ip_address: string | null;
  card_last_four: string | null;
  risk_score: number;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
}

export interface DeviceInfo {
  type?: string;
  os?: string;
  browser?: string;
  is_known?: boolean;
  fingerprint?: string;
}

export interface RiskEvent {
  id: string;
  transaction_id: string;
  event_type: string;
  data_received: Record<string, unknown>;
  rule_triggered: string;
  score_change: number;
  new_score: number;
  explanation: string;
  created_at: string;
}

export interface CreateTransactionInput {
  amount: number;
  currency?: string;
  location?: string;
}

export interface UpdateTransactionInput {
  merchant_type?: string;
  device_info?: DeviceInfo;
  otp_verified?: boolean;
  ip_address?: string;
}

export const RISK_THRESHOLDS = {
  SAFE: 30,
  SUSPICIOUS: 70,
} as const;

export function getStatusFromScore(score: number): TransactionStatus {
  if (score <= RISK_THRESHOLDS.SAFE) return 'safe';
  if (score <= RISK_THRESHOLDS.SUSPICIOUS) return 'suspicious';
  return 'high_risk';
}

export function getStatusLabel(status: TransactionStatus): string {
  switch (status) {
    case 'safe':
      return 'Safe';
    case 'suspicious':
      return 'Suspicious';
    case 'high_risk':
      return 'High Risk';
  }
}
