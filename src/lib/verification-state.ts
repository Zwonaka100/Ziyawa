export type VerificationState = 'verified | 'pending' | 'rejected' | 'none'
export function verificationStateFrom(
   isVerified: boolean | null | undefined,
   latestRequestStatus?: string | null 
  ): VerificationState {
   if (isVerified) return 'verified'
   if (latestRequestStatus === 'pending') return 'pending'
   if (latestRequestStatus === 'rejected') return 'rejected'
   return 'none'
}
