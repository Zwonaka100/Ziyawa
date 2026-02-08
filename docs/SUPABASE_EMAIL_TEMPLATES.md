# Supabase Email Templates for Ziyawa

Go to: **Supabase Dashboard → Authentication → Email Templates**

Copy and paste each template below into the corresponding section.

**Note:** Supabase free tier blocks certain keywords. These templates use neutral language.

---

## 1. Confirm Signup

**Subject:** Welcome to Ziyawa

**HTML Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 20px;font-family:Arial,sans-serif;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
<span style="color:#fff;font-size:28px;font-weight:bold;">Ziyawa</span>
</td></tr>
<tr><td style="padding:32px;">
<p style="font-size:20px;color:#111;margin:0 0 16px;font-weight:bold;">Welcome aboard</p>
<p style="color:#666;margin:0 0 24px;line-height:1.6;">Click below to verify your email and start exploring events.</p>
<p style="text-align:center;margin:0 0 24px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Verify Email</a>
</p>
<p style="color:#999;font-size:12px;margin:0;text-align:center;">Not you? Ignore this message.</p>
</td></tr>
</table>
</td></tr>
</table>
```

---

## 2. Magic Link

**Subject:** Your Ziyawa login link

**HTML Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 20px;font-family:Arial,sans-serif;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
<span style="color:#fff;font-size:28px;font-weight:bold;">Ziyawa</span>
</td></tr>
<tr><td style="padding:32px;">
<p style="font-size:20px;color:#111;margin:0 0 16px;font-weight:bold;">Sign in to Ziyawa</p>
<p style="color:#666;margin:0 0 24px;line-height:1.6;">Click the button below to log in. This link is valid for 60 minutes.</p>
<p style="text-align:center;margin:0 0 24px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Sign In</a>
</p>
<p style="color:#999;font-size:12px;margin:0;text-align:center;">Not you? Ignore this message.</p>
</td></tr>
</table>
</td></tr>
</table>
```

---

## 3. Change Login Info

**Subject:** Update your Ziyawa account

**HTML Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 20px;font-family:Arial,sans-serif;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
<span style="color:#fff;font-size:28px;font-weight:bold;">Ziyawa</span>
</td></tr>
<tr><td style="padding:32px;">
<p style="font-size:20px;color:#111;margin:0 0 16px;font-weight:bold;">Update requested</p>
<p style="color:#666;margin:0 0 24px;line-height:1.6;">Click below to update your account. This link is valid for 60 minutes.</p>
<p style="text-align:center;margin:0 0 24px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Update Account</a>
</p>
<p style="color:#999;font-size:12px;margin:0;text-align:center;">Not you? Ignore this message.</p>
</td></tr>
</table>
</td></tr>
</table>
```

---

## 4. Change Email Address

**Subject:** Confirm your new email

**HTML Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 20px;font-family:Arial,sans-serif;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
<span style="color:#fff;font-size:28px;font-weight:bold;">Ziyawa</span>
</td></tr>
<tr><td style="padding:32px;">
<p style="font-size:20px;color:#111;margin:0 0 16px;font-weight:bold;">Confirm new email</p>
<p style="color:#666;margin:0 0 24px;line-height:1.6;">Click below to confirm your new email address.</p>
<p style="text-align:center;margin:0 0 24px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Confirm Email</a>
</p>
<p style="color:#999;font-size:12px;margin:0;text-align:center;">Not you? Contact support.</p>
</td></tr>
</table>
</td></tr>
</table>
```

---

## 5. Invite User

**Subject:** Join Ziyawa

**HTML Body:**
```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a2e;padding:40px 20px;font-family:Arial,sans-serif;">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#ec4899);padding:32px;text-align:center;">
<span style="color:#fff;font-size:28px;font-weight:bold;">Ziyawa</span>
</td></tr>
<tr><td style="padding:32px;">
<p style="font-size:20px;color:#111;margin:0 0 16px;font-weight:bold;">You have been invited</p>
<p style="color:#666;margin:0 0 24px;line-height:1.6;">Someone invited you to Ziyawa. Click below to join and discover events in South Africa.</p>
<p style="text-align:center;margin:0 0 24px;">
<a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 40px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;text-decoration:none;border-radius:50px;font-weight:bold;">Accept Invite</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
```

---

## Supabase Settings to Configure

### Site URL
Go to **Authentication → URL Configuration**:
- **Site URL:** `https://ziyawa.vercel.app`

### Redirect URLs
Add these to the allowed redirect URLs:
- `http://localhost:3000/auth/callback`
- `https://ziyawa.vercel.app/auth/callback`

### Blocked Keywords Note
Supabase free tier blocks words like: "password", "reset", "secure", "credentials", "access". 
For full customization, configure custom SMTP in **Project Settings → Authentication → SMTP Settings**.
