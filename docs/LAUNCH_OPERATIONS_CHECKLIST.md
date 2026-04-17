# Launch Operations Checklist

## 1) Daily monitoring

Check these every morning and after every release:

- Vercel deployment status and function logs
- Paystack dashboard for failed charges, failed transfers, and reversed transfers
- Supabase logs for auth, database, and webhook errors
- Ziyawa smoke suite against the live app

## 2) Error-tracking workflow

When an issue is reported:

1. Capture the user ID, transaction reference, and time of incident
2. Check Vercel logs for the matching API route
3. Check Paystack for the exact charge or transfer status
4. Check the `transactions` row state in Supabase
5. Confirm whether the money is in:
   - `wallet_balance`
   - `held_balance`
   - `pending_payout_balance`

## 3) Payout review checklist

Before manually approving or investigating a payout:

- Confirm the event or booking is marked completed
- Confirm the hold window has elapsed
- Check for any open support ticket or dispute
- Confirm there is no recent webhook failure or reversal
- Confirm the user sees the correct status in the wallet

## 4) Refund and dispute checklist

For any dispute or refund request:

- Identify the payment reference
- Confirm the event, booking, or wallet action involved
- Check whether the payout has already been released or settled
- If a bank payout failed or reversed, confirm the wallet was re-credited
- Update the support ticket with the action taken and timestamp

## 5) Live verification command

Run from the project root:

```bash
$env:SMOKE_BASE_URL="https://ziyawa.vercel.app"
npm run test:smoke
```

## 6) Hobby-plan note

The automated payout release cron runs once per day on Vercel Hobby. For more frequent release automation, upgrade to Vercel Pro.
