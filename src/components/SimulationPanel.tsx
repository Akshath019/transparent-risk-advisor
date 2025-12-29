import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, Smartphone, KeyRound, Loader2 } from 'lucide-react';
import { Transaction, DeviceInfo, getStatusFromScore } from '@/types/transaction';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  evaluateMerchantData, 
  evaluateDeviceData, 
  evaluateOTPVerification,
  calculateNewScore,
  createRiskEvent 
} from '@/lib/riskEngine';

interface SimulationPanelProps {
  transaction: Transaction;
  onUpdate: () => void;
}

const MERCHANT_TYPES = [
  { value: 'grocery', label: 'Grocery Store', risk: 'low' },
  { value: 'retail', label: 'Retail Shop', risk: 'low' },
  { value: 'electronics', label: 'Electronics', risk: 'medium' },
  { value: 'jewelry', label: 'Jewelry Store', risk: 'medium' },
  { value: 'gambling', label: 'Gambling', risk: 'high' },
  { value: 'crypto', label: 'Crypto Exchange', risk: 'high' },
];

const DEVICE_TYPES = [
  { value: 'known_mobile', label: 'Known Mobile Device', isKnown: true, type: 'mobile', os: 'iOS' },
  { value: 'known_desktop', label: 'Known Desktop', isKnown: true, type: 'desktop', os: 'Windows' },
  { value: 'new_mobile', label: 'New Mobile Device', isKnown: false, type: 'mobile', os: 'Android' },
  { value: 'new_desktop', label: 'New Desktop', isKnown: false, type: 'desktop', os: 'Linux' },
];

export function SimulationPanel({ transaction, onUpdate }: SimulationPanelProps) {
  const [merchantType, setMerchantType] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [loadingMerchant, setLoadingMerchant] = useState(false);
  const [loadingDevice, setLoadingDevice] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const { toast } = useToast();

  const handleMerchantSubmit = async () => {
    if (!merchantType) return;
    setLoadingMerchant(true);

    try {
      const result = evaluateMerchantData(transaction, merchantType);
      if (!result) {
        toast({ title: 'No rule triggered', description: 'Merchant type has neutral risk.' });
        return;
      }

      const newScore = calculateNewScore(transaction.risk_score, result.scoreChange);
      const newStatus = getStatusFromScore(newScore);

      // Create risk event
      const riskEvent = createRiskEvent(
        transaction.id,
        'merchant_data',
        { merchant_type: merchantType },
        result,
        newScore
      );

      const { error: eventError } = await supabase
        .from('risk_events')
        .insert([riskEvent as any]);


      if (eventError) throw eventError;

      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          merchant_type: merchantType,
          risk_score: newScore,
          status: newStatus,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      toast({
        title: 'Merchant Data Added',
        description: result.explanation,
      });

      onUpdate();
      setMerchantType('');
    } catch (error) {
      console.error('Error updating merchant:', error);
      toast({ title: 'Error', description: 'Failed to update merchant data.', variant: 'destructive' });
    } finally {
      setLoadingMerchant(false);
    }
  };

  const handleDeviceSubmit = async () => {
    if (!deviceType) return;
    setLoadingDevice(true);

    try {
      const selectedDevice = DEVICE_TYPES.find(d => d.value === deviceType);
      if (!selectedDevice) return;

      const deviceInfo: DeviceInfo = {
        type: selectedDevice.type,
        os: selectedDevice.os,
        is_known: selectedDevice.isKnown,
      };

      const result = evaluateDeviceData(transaction, deviceInfo);
      if (!result) {
        toast({ title: 'No rule triggered', description: 'Device has neutral risk.' });
        return;
      }

      const newScore = calculateNewScore(transaction.risk_score, result.scoreChange);
      const newStatus = getStatusFromScore(newScore);

      // Create risk event
      const riskEvent = createRiskEvent(
        transaction.id,
        'device_data',
        { device_info: deviceInfo },
        result,
        newScore
      );

      const { error: eventError } = await supabase
        .from('risk_events')
        .insert([riskEvent as any]);

      if (eventError) throw eventError;

      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          device_info: deviceInfo as any,
          risk_score: newScore,
          status: newStatus,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      toast({
        title: 'Device Data Added',
        description: result.explanation,
      });

      onUpdate();
      setDeviceType('');
    } catch (error) {
      console.error('Error updating device:', error);
      toast({ title: 'Error', description: 'Failed to update device data.', variant: 'destructive' });
    } finally {
      setLoadingDevice(false);
    }
  };

  const handleOtpVerification = async () => {
    if (transaction.otp_verified) return;
    setLoadingOtp(true);

    try {
      const result = evaluateOTPVerification(transaction);
      if (!result) return;

      const newScore = calculateNewScore(transaction.risk_score, result.scoreChange);
      const newStatus = getStatusFromScore(newScore);

      // Create risk event
      const riskEvent = createRiskEvent(
        transaction.id,
        'otp_verification',
        { otp_verified: true },
        result,
        newScore
      );

      const { error: eventError } = await supabase
        .from('risk_events')
        .insert([riskEvent as any]);

      if (eventError) throw eventError;

      // Update transaction
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          otp_verified: true,
          risk_score: newScore,
          status: newStatus,
        })
        .eq('id', transaction.id);

      if (updateError) throw updateError;

      toast({
        title: 'OTP Verified',
        description: result.explanation,
      });

      onUpdate();
    } catch (error) {
      console.error('Error verifying OTP:', error);
      toast({ title: 'Error', description: 'Failed to verify OTP.', variant: 'destructive' });
    } finally {
      setLoadingOtp(false);
    }
  };

  const getRiskIndicator = (risk: string) => {
    switch (risk) {
      case 'low':
        return <span className="h-2 w-2 rounded-full bg-risk-safe" />;
      case 'medium':
        return <span className="h-2 w-2 rounded-full bg-risk-suspicious" />;
      case 'high':
        return <span className="h-2 w-2 rounded-full bg-risk-high" />;
      default:
        return null;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg">Simulate Data Arrival</CardTitle>
        <CardDescription>
          Add new data to see how the risk score updates in real-time
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Merchant Type */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-muted-foreground" />
            <Label>Merchant Type</Label>
          </div>
          {transaction.merchant_type ? (
            <p className="text-sm text-muted-foreground">
              Already set: <span className="text-foreground">{transaction.merchant_type}</span>
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={merchantType} onValueChange={setMerchantType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select merchant type" />
                </SelectTrigger>
                <SelectContent>
                  {MERCHANT_TYPES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <div className="flex items-center gap-2">
                        {getRiskIndicator(m.risk)}
                        {m.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleMerchantSubmit} 
                disabled={!merchantType || loadingMerchant}
                size="icon"
              >
                {loadingMerchant ? <Loader2 className="h-4 w-4 animate-spin" /> : '+'}
              </Button>
            </div>
          )}
        </div>

        {/* Device Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <Label>Device Information</Label>
          </div>
          {transaction.device_info ? (
            <p className="text-sm text-muted-foreground">
              Already set: <span className="text-foreground">
                {(transaction.device_info as DeviceInfo).type} ({(transaction.device_info as DeviceInfo).os})
              </span>
            </p>
          ) : (
            <div className="flex gap-2">
              <Select value={deviceType} onValueChange={setDeviceType}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      <div className="flex items-center gap-2">
                        {d.isKnown ? (
                          <span className="h-2 w-2 rounded-full bg-risk-safe" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-risk-suspicious" />
                        )}
                        {d.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleDeviceSubmit} 
                disabled={!deviceType || loadingDevice}
                size="icon"
              >
                {loadingDevice ? <Loader2 className="h-4 w-4 animate-spin" /> : '+'}
              </Button>
            </div>
          )}
        </div>

        {/* OTP Verification */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-muted-foreground" />
            <Label>OTP Verification</Label>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {transaction.otp_verified 
                ? 'Verified successfully' 
                : 'Simulate successful OTP verification'}
            </span>
            {transaction.otp_verified ? (
              <span className="text-sm text-risk-safe">Verified</span>
            ) : (
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOtpVerification}
                disabled={loadingOtp}
              >
                {loadingOtp ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify OTP
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
