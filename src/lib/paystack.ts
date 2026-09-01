/**
 * ZIYAWA PAYSTACK INTEGRATION
 * Server-side utilities for Paystack API
 * 
 * Documentation: https://paystack.com/docs/api/
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// =====================================================
// TYPES
// =====================================================

export interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

export interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    domain: string;
    status: 'success' | 'failed' | 'abandoned' | 'pending';
    reference: string;
    amount: number; // In kobo/cents
    message: string | null;
    gateway_response: string;
    paid_at: string | null;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, unknown>;
    fees: number;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
    };
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
  };
}

export interface PaystackTransferRecipient {
  status: boolean;
  message: string;
  data: {
    active: boolean;
    createdAt: string;
    currency: string;
    domain: string;
    id: number;
    integration: number;
    name: string;
    recipient_code: string;
    type: string;
    updatedAt: string;
    is_deleted: boolean;
    details: {
      authorization_code: string | null;
      account_number: string;
      account_name: string;
      bank_code: string;
      bank_name: string;
    };
  };
}

export interface PaystackTransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    integration: number;
    domain: string;
    amount: number;
    currency: string;
    source: string;
    reason: string;
    recipient: number;
    status: 'pending' | 'success' | 'failed' | 'reversed';
    transfer_code: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

export interface PaystackBankListResponse {
  status: boolean;
  message: string;
  data: Array<{
    id: number;
    name: string;
    slug: string;
    code: string;
    longcode: string;
    gateway: string | null;
    pay_with_bank: boolean;
    active: boolean;
    country: string;
    currency: string;
    type: string;
    is_deleted: boolean;
  }>;
}

export interface PaystackResolveAccountResponse {
  status: boolean;
  message: string;
  data: {
    account_number: string;
    account_name: string;
    bank_id: number;
  };
}

export interface PaystackWebhookEvent {
  event: string;
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: Record<string, unknown>;
    fees: number;
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
    };
  };
}

// =====================================================
// API HELPER
// =====================================================

async function paystackRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PAYSTACK_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Paystack API error');
  }

  return data as T;
}

// =====================================================
// PAYMENT INITIALIZATION
// =====================================================

/**
 * Initialize a payment transaction
 * Returns a URL to redirect the user to Paystack checkout
 */
export async function initializePayment(params: {
  email: string;
  amount: number; // In cents (ZAR * 100)
  reference: string;
  callback_url?: string;
  metadata?: Record<string, unknown>;
  channels?: ('card' | 'qr' | 'ussd' | 'eft' | 'apple_pay')[];
}): Promise<PaystackInitializeResponse> {
  return paystackRequest<PaystackInitializeResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      callback_url: params.callback_url,
      metadata: params.metadata,
      channels: params.channels || ['card', 'qr', 'eft', 'ussd', 'apple_pay'],
      currency: 'ZAR',
    }),
  });
}

/**
 * Verify a payment transaction
 * Always verify after receiving webhook or callback
 */
export async function verifyPayment(reference: string): Promise<PaystackVerifyResponse> {
  return paystackRequest<PaystackVerifyResponse>(`/transaction/verify/${reference}`);
}

// =====================================================
// TRANSFERS (PAYOUTS)
// =====================================================

/**
 * Create a transfer recipient (bank account for payouts)
 */
export async function createTransferRecipient(params: {
  name: string;
  account_number: string;
  bank_code: string;
  currency?: string;
}): Promise<PaystackTransferRecipient> {
  return paystackRequest<PaystackTransferRecipient>('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: params.name,
      account_number: params.account_number,
      bank_code: params.bank_code,
      currency: params.currency || 'ZAR',
    }),
  });
}

/**
 * Initiate a transfer (payout to bank account)
 */
export async function initiateTransfer(params: {
  amount: number; // In cents
  recipient_code: string;
  reference: string;
  reason?: string;
}): Promise<PaystackTransferResponse> {
  return paystackRequest<PaystackTransferResponse>('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: params.amount,
      recipient: params.recipient_code,
      reference: params.reference,
      reason: params.reason || 'Ziyawa Payout',
    }),
  });
}

export interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data: {
    transaction?: { reference?: string };
    amount: number;
    status: string;
  };
}

/**
 * Reverse a charge back to the card it came from.
 *
 * This is deliberately NOT a transfer. A transfer moves money to a bank account
 * and costs about R3 every time, charged even when it fails; crediting a buyer's
 * balance and paying it out later would incur exactly that, per person, for no
 * reason. A refund reverses the original authorization and Paystack charges
 * nothing extra for it.
 *
 * Omit `amount` for a full refund. Pass it — in cents — for a partial one,
 * which is how we return the ticket price while retaining the booking fee that
 * already paid for the processing.
 *
 * What we do NOT get back either way is Paystack's original fee: "if you have
 * to refund a customer, we will not return what we charged to process that
 * transaction." Covering that is the booking fee's job, see calculateBookingFee.
 */
export async function refundPayment(params: {
  reference: string;
  amount?: number; // in cents; omit to refund the full original charge
}): Promise<PaystackRefundResponse> {
  return paystackRequest<PaystackRefundResponse>('/refund', {
    method: 'POST',
    body: JSON.stringify({
      transaction: params.reference,
      ...(params.amount != null ? { amount: params.amount } : {}),
    }),
  });
}

/**
 * Get transfer status
 */
export async function getTransfer(id: string): Promise<PaystackTransferResponse> {
  return paystackRequest<PaystackTransferResponse>(`/transfer/${id}`);
}

// =====================================================
// BANK UTILITIES
// =====================================================

/**
 * Get list of South African banks
 */
export async function getBankList(): Promise<PaystackBankListResponse> {
  return paystackRequest<PaystackBankListResponse>('/bank?country=south africa&currency=ZAR');
}

/**
 * Resolve/verify a bank account
 */
export async function resolveAccount(params: {
  account_number: string;
  bank_code: string;
}): Promise<PaystackResolveAccountResponse> {
  return paystackRequest<PaystackResolveAccountResponse>(
    `/bank/resolve?account_number=${params.account_number}&bank_code=${params.bank_code}`
  );
}

// =====================================================
// WEBHOOK VERIFICATION
// =====================================================

import crypto from 'crypto';
import { logOpsEvent } from './monitoring';

/**
 * Verify a webhook or transfer-approval signature from Paystack.
 *
 * This is the only thing standing between the open internet and the money
 * paths: a request that passes here can mint tickets (charge.success), mark a
 * payout settled and move balances (transfer.success), or approve an outgoing
 * transfer. So it fails CLOSED in production.
 *
 * The local-dev bypass is deliberately gated on NODE_ENV rather than just on a
 * missing secret. Previously a missing secret returned true everywhere, which
 * meant one unset or renamed env var would silently disable payment
 * authentication in production while everything still looked healthy — the
 * failure mode most likely to appear during exactly the kind of gateway
 * migration this project has been through.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret?: string
): boolean {
  const webhookSecret = secret || process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      logOpsEvent('paystack-signature', 'error', 'No Paystack signing secret is set - rejecting the request', {
        hint: 'Set PAYSTACK_WEBHOOK_SECRET (or PAYSTACK_SECRET_KEY). Until then every webhook and transfer approval is refused.',
      });
      return false;
    }

    console.warn('No Paystack signing secret is set - skipping signature verification (development only)');
    return true;
  }

  const hash = crypto
    .createHmac('sha512', webhookSecret)
    .update(payload)
    .digest('hex');

  // Length first: timingSafeEqual throws on mismatched buffers, and a wrong
  // length is public information anyway (SHA-512 hex is always 128 chars).
  if (typeof signature !== 'string' || signature.length !== hash.length) {
    return false;
  }

  // Compare the hex text rather than decoded bytes: Buffer.from(x, 'hex')
  // silently drops invalid characters, so a malformed signature could decode to
  // a shorter buffer and compare equal to a truncated expectation.
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'utf8'),
    Buffer.from(signature, 'utf8')
  );
}

// =====================================================
// REFERENCE GENERATORS
// =====================================================

/**
 * Generate a unique payment reference
 */
export function generatePaymentReference(prefix: string = 'ZIY'): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate a ticket code
 */
export function generateTicketCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ZIY-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
