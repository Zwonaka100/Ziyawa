'use client'

/**
 * WALLET WITHDRAWAL DIALOG
 * Allows users to withdraw funds from their wallet to their bank account
 */

import { useState, useEffect } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency } from '@/lib/helpers'
import { calculateWithdrawalFee, PLATFORM_FEES } from '@/lib/constants'
import { toast } from 'sonner'
import { Loader2, Wallet, ArrowDownToLine, Building2, AlertCircle } from 'lucide-react'

interface BankInfo {
  code: string
  name: string
}

interface WalletWithdrawDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
  onSuccess?: () => void
}

export function WalletWithdrawDialog({ 
  open, 
  onOpenChange, 
  currentBalance,
  onSuccess
}: WalletWithdrawDialogProps) {
  const [amount, setAmount] = useState<string>('')
  const [bankCode, setBankCode] = useState<string>('')
  const [accountNumber, setAccountNumber] = useState<string>('')
  const [accountName, setAccountName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [banks, setBanks] = useState<BankInfo[]>([])
  const [loadingBanks, setLoadingBanks] = useState(false)

  // Calculate fees
  const withdrawAmount = parseFloat(amount) || 0
  const withdrawAmountCents = withdrawAmount * 100
  const fees = calculateWithdrawalFee(withdrawAmountCents)
  const netPayout = fees.netAmount / 100

  // Minimum withdrawal
  const MIN_WITHDRAWAL = 50
  const canWithdraw = withdrawAmount >= MIN_WITHDRAWAL && withdrawAmount <= currentBalance

  // Load banks on mount
  useEffect(() => {
    if (open && banks.length === 0) {
      loadBanks()
    }
  }, [open])

  // Verify account when bank and account number are provided
  useEffect(() => {
    if (bankCode && accountNumber.length === 10) {
      verifyAccount()
    } else {
      setAccountName('')
    }
  }, [bankCode, accountNumber])

  const loadBanks = async () => {
    setLoadingBanks(true)
    try {
      const response = await fetch('/api/payments/banks')
      const data = await response.json()
      
      if (response.ok && data.banks) {
        setBanks(data.banks)
      }
    } catch (error) {
      console.error('Failed to load banks:', error)
    } finally {
      setLoadingBanks(false)
    }
  }

  const verifyAccount = async () => {
    setVerifying(true)
    setAccountName('')
    
    try {
      const response = await fetch('/api/payments/verify-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber,
          bankCode,
        }),
      })
      
      const data = await response.json()
      
      if (response.ok && data.accountName) {
        setAccountName(data.accountName)
      } else {
        toast.error('Could not verify account. Please check your details.')
      }
    } catch (error) {
      console.error('Account verification failed:', error)
    } finally {
      setVerifying(false)
    }
  }

  const handleWithdraw = async () => {
    if (!canWithdraw) {
      toast.error(`Minimum withdrawal is R${MIN_WITHDRAWAL}`)
      return
    }

    if (!accountName) {
      toast.error('Please verify your bank account first')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/payments/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: withdrawAmountCents,
          bankCode,
          accountNumber,
          accountName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed')
      }

      toast.success('Withdrawal initiated! Funds will arrive within 24 hours.')
      onSuccess?.()
      handleClose()

    } catch (error) {
      console.error('Withdrawal error:', error)
      toast.error(error instanceof Error ? error.message : 'Withdrawal failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      setAmount('')
      setBankCode('')
      setAccountNumber('')
      setAccountName('')
    }
  }

  const handleAmountChange = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, '')
    setAmount(cleaned)
  }

  const handleWithdrawAll = () => {
    const maxWithdraw = currentBalance
    setAmount(maxWithdraw.toString())
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowDownToLine className="h-5 w-5 text-purple-600" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Transfer funds from your wallet to your bank account.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Current Balance */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Available Balance</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(currentBalance)}
                </p>
              </div>
              <Wallet className="h-10 w-10 text-purple-200" />
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={handleWithdrawAll}
                className="text-purple-600 h-auto py-0"
              >
                Withdraw All
              </Button>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R
              </span>
              <Input
                id="withdraw-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-8"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Min: R{MIN_WITHDRAWAL} • Fee: R{PLATFORM_FEES.wallet.withdrawalFlatFee / 100}
            </p>
          </div>

          {/* Bank Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank">Bank</Label>
            <Select value={bankCode} onValueChange={setBankCode}>
              <SelectTrigger>
                <SelectValue placeholder={loadingBanks ? "Loading banks..." : "Select your bank"} />
              </SelectTrigger>
              <SelectContent>
                {banks.map((bank) => (
                  <SelectItem key={bank.code} value={bank.code}>
                    {bank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account-number">Account Number</Label>
            <Input
              id="account-number"
              type="text"
              inputMode="numeric"
              placeholder="Enter 10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              maxLength={10}
            />
          </div>

          {/* Account Verification */}
          {(verifying || accountName) && (
            <div className={`rounded-lg p-3 flex items-center gap-3 ${
              accountName ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
            }`}>
              {verifying ? (
                <>
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                  <span className="text-sm text-gray-600">Verifying account...</span>
                </>
              ) : (
                <>
                  <Building2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-green-800">{accountName}</p>
                    <p className="text-xs text-green-600">Account verified</p>
                  </div>
                </>
              )}
            </div>
          )}

          <Separator />

          {/* Fee Breakdown */}
          {withdrawAmount > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Withdrawal Amount</span>
                <span>{formatCurrency(withdrawAmount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Withdrawal Fee</span>
                <span>-{formatCurrency(fees.fee / 100)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>You Receive</span>
                <span className="text-green-600">{formatCurrency(netPayout)}</span>
              </div>
            </div>
          )}

          {/* Warning for insufficient balance */}
          {withdrawAmount > currentBalance && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <p className="text-red-700">
                Insufficient balance. Maximum you can withdraw is {formatCurrency(currentBalance)}.
              </p>
            </div>
          )}

          {/* Withdraw Button */}
          <Button 
            onClick={handleWithdraw} 
            className="w-full" 
            size="lg"
            disabled={loading || !canWithdraw || !accountName}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Withdraw {withdrawAmount > 0 ? formatCurrency(netPayout) : ''}
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Withdrawals are typically processed within 24 hours.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
