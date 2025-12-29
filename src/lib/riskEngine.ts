import { Transaction, DeviceInfo, RiskEvent, getStatusFromScore, RISK_THRESHOLDS } from '@/types/transaction';

interface RiskRule {
  id: string;
  name: string;
  evaluate: (transaction: Transaction, newData?: Record<string, unknown>) => RuleResult | null;
}

interface RuleResult {
  scoreChange: number;
  explanation: string;
  ruleName: string;
}

// Initial transaction rules
const initialRules: RiskRule[] = [
  {
    id: 'high_amount',
    name: 'High Amount Detection',
    evaluate: (tx) => {
      if (tx.amount >= 10000) {
        return {
          scoreChange: 25,
          explanation: `Transaction amount of $${tx.amount.toLocaleString()} exceeds high-value threshold ($10,000). Large transactions require additional verification.`,
          ruleName: 'High Amount Detection',
        };
      }
      if (tx.amount >= 5000) {
        return {
          scoreChange: 15,
          explanation: `Transaction amount of $${tx.amount.toLocaleString()} is above moderate threshold ($5,000). Flagged for monitoring.`,
          ruleName: 'Moderate Amount Detection',
        };
      }
      if (tx.amount >= 1000) {
        return {
          scoreChange: 5,
          explanation: `Transaction amount of $${tx.amount.toLocaleString()} recorded. Within normal range.`,
          ruleName: 'Amount Assessment',
        };
      }
      return {
        scoreChange: 0,
        explanation: `Transaction amount of $${tx.amount.toLocaleString()} is low-risk.`,
        ruleName: 'Low Amount Assessment',
      };
    },
  },
  {
    id: 'unusual_time',
    name: 'Unusual Time Detection',
    evaluate: (tx) => {
      const hour = new Date(tx.created_at).getHours();
      if (hour >= 1 && hour <= 5) {
        return {
          scoreChange: 15,
          explanation: `Transaction initiated at unusual hour (${hour}:00). Late-night transactions have higher fraud correlation.`,
          ruleName: 'Unusual Time Detection',
        };
      }
      return null;
    },
  },
  {
    id: 'location_risk',
    name: 'Location Risk Assessment',
    evaluate: (tx) => {
      if (!tx.location) return null;
      
      const highRiskLocations = ['unknown', 'vpn', 'proxy', 'tor'];
      const locationLower = tx.location.toLowerCase();
      
      if (highRiskLocations.some(loc => locationLower.includes(loc))) {
        return {
          scoreChange: 20,
          explanation: `Location "${tx.location}" is flagged as high-risk (anonymizing service detected).`,
          ruleName: 'High-Risk Location Detection',
        };
      }
      return {
        scoreChange: 0,
        explanation: `Location "${tx.location}" verified and within normal parameters.`,
        ruleName: 'Location Verification',
      };
    },
  },
];

// Merchant type rules
const merchantRules: RiskRule[] = [
  {
    id: 'merchant_category',
    name: 'Merchant Category Risk',
    evaluate: (tx, newData) => {
      const merchantType = (newData?.merchant_type as string) || tx.merchant_type;
      if (!merchantType) return null;

      const highRiskMerchants = ['gambling', 'crypto', 'adult', 'wire_transfer', 'money_order'];
      const mediumRiskMerchants = ['jewelry', 'electronics', 'travel'];
      const lowRiskMerchants = ['grocery', 'utilities', 'subscription', 'retail'];

      const merchantLower = merchantType.toLowerCase();

      if (highRiskMerchants.some(m => merchantLower.includes(m))) {
        return {
          scoreChange: 25,
          explanation: `Merchant category "${merchantType}" is classified as high-risk. These categories have elevated fraud rates.`,
          ruleName: 'High-Risk Merchant Detection',
        };
      }
      if (mediumRiskMerchants.some(m => merchantLower.includes(m))) {
        return {
          scoreChange: 10,
          explanation: `Merchant category "${merchantType}" has moderate risk profile. Added to monitoring.`,
          ruleName: 'Medium-Risk Merchant Detection',
        };
      }
      if (lowRiskMerchants.some(m => merchantLower.includes(m))) {
        return {
          scoreChange: -10,
          explanation: `Merchant category "${merchantType}" is trusted. Risk score reduced.`,
          ruleName: 'Trusted Merchant Recognition',
        };
      }
      return {
        scoreChange: 0,
        explanation: `Merchant category "${merchantType}" has neutral risk profile.`,
        ruleName: 'Merchant Category Assessment',
      };
    },
  },
];

// Device info rules
const deviceRules: RiskRule[] = [
  {
    id: 'device_recognition',
    name: 'Device Recognition',
    evaluate: (tx, newData) => {
      const deviceInfo = (newData?.device_info as DeviceInfo) || tx.device_info;
      if (!deviceInfo) return null;

      if (deviceInfo.is_known === true) {
        return {
          scoreChange: -15,
          explanation: `Device recognized from previous verified transactions. Trusted device confirmation reduces risk.`,
          ruleName: 'Known Device Recognition',
        };
      }
      if (deviceInfo.is_known === false) {
        return {
          scoreChange: 15,
          explanation: `New device detected (${deviceInfo.type || 'unknown type'}, ${deviceInfo.os || 'unknown OS'}). First-time device usage increases risk.`,
          ruleName: 'New Device Detection',
        };
      }
      return {
        scoreChange: 5,
        explanation: `Device info received: ${deviceInfo.type || 'unknown'} on ${deviceInfo.os || 'unknown OS'}. Pending verification.`,
        ruleName: 'Device Info Received',
      };
    },
  },
];

// OTP verification rules
const otpRules: RiskRule[] = [
  {
    id: 'otp_verification',
    name: 'OTP Verification',
    evaluate: (tx, newData) => {
      const otpVerified = newData?.otp_verified ?? tx.otp_verified;
      
      if (otpVerified === true) {
        return {
          scoreChange: -25,
          explanation: `OTP verification successful. Strong authentication confirmed. Significantly reduces fraud risk.`,
          ruleName: 'OTP Verification Success',
        };
      }
      return null;
    },
  },
];

export function evaluateInitialRisk(transaction: Transaction): RuleResult[] {
  const results: RuleResult[] = [];
  
  for (const rule of initialRules) {
    const result = rule.evaluate(transaction);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
}

export function evaluateMerchantData(transaction: Transaction, merchantType: string): RuleResult | null {
  for (const rule of merchantRules) {
    const result = rule.evaluate(transaction, { merchant_type: merchantType });
    if (result) return result;
  }
  return null;
}

export function evaluateDeviceData(transaction: Transaction, deviceInfo: DeviceInfo): RuleResult | null {
  for (const rule of deviceRules) {
    const result = rule.evaluate(transaction, { device_info: deviceInfo });
    if (result) return result;
  }
  return null;
}

export function evaluateOTPVerification(transaction: Transaction): RuleResult | null {
  for (const rule of otpRules) {
    const result = rule.evaluate(transaction, { otp_verified: true });
    if (result) return result;
  }
  return null;
}

export function calculateNewScore(currentScore: number, change: number): number {
  return Math.max(0, Math.min(100, currentScore + change));
}

export function createRiskEvent(
  transactionId: string,
  eventType: string,
  dataReceived: Record<string, unknown>,
  ruleResult: RuleResult,
  newScore: number
): Omit<RiskEvent, 'id' | 'created_at'> {
  return {
    transaction_id: transactionId,
    event_type: eventType,
    data_received: dataReceived,
    rule_triggered: ruleResult.ruleName,
    score_change: ruleResult.scoreChange,
    new_score: newScore,
    explanation: ruleResult.explanation,
  };
}
