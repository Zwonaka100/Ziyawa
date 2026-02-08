/**
 * GET BANKS LIST API
 * GET /api/payments/banks
 * 
 * Returns list of South African banks from Paystack
 */

import { NextResponse } from 'next/server';
import { getBankList } from '@/lib/paystack';

// Cache banks list for 24 hours
let cachedBanks: { code: string; name: string }[] | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export async function GET() {
  try {
    // Return cached if fresh
    if (cachedBanks && Date.now() - cacheTime < CACHE_DURATION) {
      return NextResponse.json({ banks: cachedBanks });
    }

    // Fetch from Paystack
    const result = await getBankList(); // South Africa banks
    
    if (!result.status) {
      throw new Error('Failed to fetch banks from Paystack');
    }

    // Format and cache
    cachedBanks = result.data.map((bank: { code: string; name: string }) => ({
      code: bank.code,
      name: bank.name,
    }));
    cacheTime = Date.now();

    return NextResponse.json({ banks: cachedBanks });

  } catch (error) {
    console.error('Banks fetch error:', error);
    
    // Return hardcoded SA banks as fallback
    const fallbackBanks = [
      { code: '632005', name: 'Absa' },
      { code: '470010', name: 'Capitec' },
      { code: '580105', name: 'First National Bank (FNB)' },
      { code: '198765', name: 'Nedbank' },
      { code: '051001', name: 'Standard Bank' },
      { code: '679000', name: 'TymeBank' },
      { code: '460005', name: 'African Bank' },
      { code: '462005', name: 'Bidvest Bank' },
      { code: '430000', name: 'Discovery Bank' },
      { code: '678910', name: 'Bank Zero' },
    ];

    return NextResponse.json({ banks: fallbackBanks });
  }
}
