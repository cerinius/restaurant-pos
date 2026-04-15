import nodemailer from 'nodemailer';

// ─── Gmail SMTP (free tier) ──────────────────────────────────────────────────
// Set GMAIL_USER and GMAIL_APP_PASSWORD in .env for free email delivery.
// Generate an app password at: https://myaccount.google.com/apppasswords
// (requires 2-Step Verification to be enabled on the Google account)

function createGmailTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
}

// ─── Email dispatch (Gmail > Resend > console) ───────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  // 1. Try Gmail SMTP (free, just needs GMAIL_USER + GMAIL_APP_PASSWORD)
  const gmailTransport = createGmailTransport();
  if (gmailTransport) {
    await gmailTransport.sendMail({
      from: `RestaurantOS <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { provider: 'gmail', delivered: true as const };
  }

  // 2. Try Resend (paid, but generous free tier of 3,000/month)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const from = process.env.RESEND_FROM_EMAIL || 'RestaurantOS <onboarding@example.com>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend email failed: ${body}`);
    }

    return { provider: 'resend', delivered: true as const };
  }

  // 3. Console fallback (development / no provider configured)
  console.info(`[email-preview] to=${to} subject="${subject}"\n${html}`);
  return { provider: 'console', delivered: true as const };
}

// ─── SMS dispatch (Twilio > console) ────────────────────────────────────────

function encodeBasicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

async function sendSms(to: string, body: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.info(`[sms-preview] to=${to} body="${body}"`);
    return { provider: 'console', delivered: true as const };
  }

  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${encodeBasicAuth(accountSid, authToken)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twilio SMS failed: ${errorBody}`);
  }

  return { provider: 'twilio', delivered: true as const };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function sendEmailOtp(to: string, code: string) {
  return sendEmail(
    to,
    'Your RestaurantOS verification code',
    `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
      <h2 style="color:#0f172a;margin-bottom:8px">RestaurantOS</h2>
      <p style="color:#334155;margin-bottom:24px">Your verification code is:</p>
      <div style="background:#f1f5f9;border-radius:8px;padding:16px 24px;text-align:center;font-size:32px;letter-spacing:8px;font-weight:700;color:#0f172a">${code}</div>
      <p style="color:#64748b;font-size:14px;margin-top:24px">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    </div>`
  );
}

export async function sendSmsOtp(to: string, code: string) {
  return sendSms(to, `Your RestaurantOS verification code is ${code}. It expires in 10 minutes.`);
}

export async function notifySalesInbox(subject: string, message: string) {
  const inbox = process.env.SALES_INBOX_EMAIL;
  if (!inbox) {
    console.info(`[sales-inbox] ${subject}\n${message}`);
    return { provider: 'console', delivered: true as const };
  }
  return sendEmail(inbox, subject, `<pre>${message}</pre>`).catch(() => ({
    provider: 'console',
    delivered: true as const,
  }));
}
