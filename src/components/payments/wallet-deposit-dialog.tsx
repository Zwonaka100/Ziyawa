'use client'

/**
 * WALLET DEPOSIT DIALOG
 * Allows users to add funds to their wallet via Paystack
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { formatCurrency } from '@/lib/helpers'
import { calculateDepositFee, PLATFORM_FEES } from '@/lib/constants'
import { toast } from 'sonner'
import { Loader2, Wallet, Shield, Plus, Minus } from 'lucide-react'

interface WalletDepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
}

const PRESET_AMOUNTS = [100, 250, 500, 1000, 2500, 5000]

export function WalletDepositDialog({ 
  open, 
  onOpenChange, 
  currentBalance 
}: WalletDepositDialogProps) {
  const [amount, setAmount] = useState<number>(500)
  const [customAmount, setCustomAmount] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [useCustom, setUseCustom] = useState(false)

  // Calculate fees
  const depositAmount = useCustom ? (parseFloat(customAmount) || 0) : amount
  const depositAmountCents = depositAmount * 100
  const fees = calculateDepositFee(depositAmountCents)
  const totalCharge = fees.totalToPay / 100 // Convert back to Rands for display

  const handlePresetClick = (presetAmount: number) => {
    setAmount(presetAmount)
    setUseCustom(false)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '')
    setCustomAmount(cleaned)
    setUseCustom(true)
  }

  const handleDeposit = async () => {
    if (depositAmount < 10) {
      toast.error('Minimum deposit is R10')
      return
    }

    if (depositAmount > 50000) {
      toast.error('Maximum deposit is R50,000')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: depositAmountCents,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize deposit')
      }

      // Redirect to Paystack checkout
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      } else {
        throw new Error('No payment URL received')
      }

    } catch (error) {
      console.error('Deposit error:', error)
      toast.error(error instanceof Error ? error.message : 'Deposit failed. Please try again.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      setAmount(500)
      setCustomAmount('')
      setUseCustom(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-purple-600" />
            Add Funds to Wallet
          </DialogTitle>
          <DialogDescription>
            Top up your wallet to make quick payments and receive payouts.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Balance */}
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatCurrency(currentBalance)}
            </p>
          </div>

          {/* Preset Amounts */}
          <div className="space-y-2">
            <Label>Select Amount</Label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={!useCustom && amount === preset ? 'default' : 'outline'}
                  onClick={() => handlePresetClick(preset)}
                  className="h-12"
                >
                  R{preset}
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount">Or enter custom amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R
              </span>
              <Input
                id="custom-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={customAmount}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min: R10 • Max: R50,000
            </p>
          </div>

          <Separator />

          {/* Fee Breakdown */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Deposit Amount</span>
              <span>{formatCurrency(depositAmount)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Processing Fee ({PLATFORM_FEES.wallet.depositPercent}% + R{PLATFORM_FEES.wallet.depositFlatFee / 100})</span>
              <span>{formatCurrency(fees.fee / 100)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>You Pay</span>
              <span>{formatCurrency(totalCharge)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Added to Wallet</span>
              <span>+{formatCurrency(depositAmount)}</span>
            </div>
          </div>

          {/* Security Badge */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-800">Secure Payment</p>
              <p className="text-green-700">
                Processed securely by Paystack
              </p>
            </div>
          </div>

          {/* Payment Button */}
          <Button 
            onClick={handleDeposit} 
            className="w-full" 
            size="lg"
            disabled={loading || depositAmount < 10}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting to Paystack...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add {formatCurrency(depositAmount)} to Wallet
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
