'use client';

/**
 * PAYMENT CALLBACK PAGE
 * /payments/callback
 * 
 * Handles redirect after Paystack payment
 * Verifies payment and shows appropriate result
 */

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Ticket,
  Wallet,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

type PaymentStatus = 'verifying' | 'success' | 'failed' | 'pending';
type PaymentType = 'ticket_purchase' | 'wallet_deposit' | 'booking_payment';

interface PaymentDetails {
  type: PaymentType;
  reference: string;
  amount: number;
  eventName?: string;
  quantity?: number;
  ticketCodes?: string[];
}

function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [status, setStatus] = useState<PaymentStatus>('verifying');
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reference = searchParams.get('reference');
  const trxref = searchParams.get('trxref');

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentRef = reference || trxref;
      
      if (!paymentRef) {
        setStatus('failed');
        setError('No payment reference found');
        return;
      }

      try {
        // Call our verification endpoint
        const response = await fetch(`/api/payments/verify?reference=${paymentRef}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        setDetails(data.payment);
        setStatus(data.payment.status === 'success' ? 'success' : 'pending');

      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('failed');
        setError(err instanceof Error ? err.message : 'Payment verification failed');
      }
    };

    verifyPayment();
  }, [reference, trxref]);

  // Render based on status
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {status === 'verifying' && (
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-purple-600 mx-auto animate-spin" />
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Verifying Payment
            </h1>
            <p className="mt-2 text-gray-600">
              Please wait while we confirm your payment...
            </p>
          </div>
        )}

        {status === 'success' && details && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Payment Successful!
            </h1>
            
            <p className="mt-2 text-gray-600">
              {getSuccessMessage(details.type)}
            </p>

            {/* Payment Details */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4 text-left">
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Reference</span>
                <span className="font-mono text-sm">{details.reference}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-t">
                <span className="text-gray-600">Amount</span>
                <span className="font-semibold">
                  R{(details.amount / 100).toFixed(2)}
                </span>
              </div>
              
              {details.eventName && (
                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-gray-600">Event</span>
                  <span className="font-medium">{details.eventName}</span>
                </div>
              )}
              
              {details.quantity && (
                <div className="flex items-center justify-between py-2 border-t">
                  <span className="text-gray-600">Tickets</span>
                  <span className="font-medium">{details.quantity}x</span>
                </div>
              )}
            </div>

            {/* Ticket Codes */}
            {details.ticketCodes && details.ticketCodes.length > 0 && (
              <div className="mt-4 bg-purple-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-purple-900 mb-2">
                  Your Ticket Code{details.ticketCodes.length > 1 ? 's' : ''}
                </h3>
                <div className="space-y-2">
                  {details.ticketCodes.map((code, i) => (
                    <div key={i} className="bg-white rounded px-3 py-2 font-mono text-lg text-center">
                      {code}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-purple-700 mt-2">
                  Save these codes! You&apos;ll need them at the event.
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="mt-6">
              <Link
                href={getRedirectPath(details.type)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
              >
                {getActionIcon(details.type)}
                {getActionText(details.type)}
              </Link>
            </div>
          </div>
        )}

        {status === 'pending' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100">
              <Loader2 className="h-10 w-10 text-yellow-600 animate-spin" />
            </div>
            
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Payment Processing
            </h1>
            
            <p className="mt-2 text-gray-600">
              Your payment is being processed. This may take a few moments.
            </p>

            <div className="mt-6">
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              Payment Failed
            </h1>
            
            <p className="mt-2 text-gray-600">
              {error || 'There was an issue processing your payment.'}
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition"
              >
                Try Again
              </button>
              <Link
                href="/dashboard"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getSuccessMessage(type: PaymentType): string {
  switch (type) {
    case 'ticket_purchase':
      return 'Your tickets have been booked successfully!';
    case 'wallet_deposit':
      return 'Funds have been added to your wallet!';
    case 'booking_payment':
      return 'Your booking has been confirmed!';
    default:
      return 'Your payment was successful!';
  }
}

function getActionIcon(type: PaymentType) {
  switch (type) {
    case 'ticket_purchase':
      return <Ticket className="h-5 w-5" />;
    case 'wallet_deposit':
      return <Wallet className="h-5 w-5" />;
    case 'booking_payment':
      return <Calendar className="h-5 w-5" />;
    default:
      return null;
  }
}

function getActionText(type: PaymentType): string {
  switch (type) {
    case 'ticket_purchase':
      return 'View My Tickets';
    case 'wallet_deposit':
      return 'View Wallet';
    case 'booking_payment':
      return 'View Booking';
    default:
      return 'Continue';
  }
}

function getRedirectPath(type: PaymentType): string {
  switch (type) {
    case 'ticket_purchase':
      return '/dashboard/tickets';
    case 'wallet_deposit':
      return '/profile';
    case 'booking_payment':
      return '/dashboard/organizer';
    default:
      return '/dashboard';
  }
}

// Main export with Suspense boundary for useSearchParams
export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="h-12 w-12 text-purple-600 animate-spin" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}
