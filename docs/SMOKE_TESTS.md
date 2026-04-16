# Ziyawa Smoke Tests

These checks cover the critical launch routes:

- Sign in page
- Event discovery on Ziwaphi
- Event details and ticket-purchase visibility
- Organizer booking route protection
- Wallet access
- Support access

## Run locally

1. Start the app:

```bash
npm run dev
```

2. In a second terminal, run:

```bash
npm run test:smoke
```

## Notes

- The smoke suite is intentionally lightweight and safe to run often.
- It does not create bookings or charge cards.
- Protected pages are considered healthy if they redirect anonymous users to sign-in.
