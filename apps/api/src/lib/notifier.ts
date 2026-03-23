function encodeBasicAuth(username: string, password: string) {
  return Buffer.from(`${username}:${password}`).toString('base64');
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || 'RestaurantOS <onboarding@example.com>';

  if (!apiKey) {
    console.info(`[email-preview] to=${to} subject="${subject}"\n${html}`);
    return { provider: 'console', delivered: true as const };
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend email failed: ${body}`);
  }

  return { provider: 'resend', delivered: true as const };
}

export async function sendEmailOtp(to: string, code: string) {
  return sendEmail(
    to,
    'Your RestaurantOS demo verification code',
    `<p>Your RestaurantOS verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes.</p>`
  );
}

export async function sendSmsOtp(to: string, code: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    console.info(`[demo-sms-otp] ${to} -> ${code}`);
    return { provider: 'console', delivered: true as const };
  }

  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: `Your RestaurantOS verification code is ${code}. It expires in 10 minutes.`,
  });

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${encodeBasicAuth(accountSid, authToken)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twilio SMS failed: ${body}`);
  }

  return { provider: 'twilio', delivered: true as const };
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
