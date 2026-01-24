console.log(JSON.stringify({
  hasSecret: Boolean(process.env.STRIPE_SECRET_KEY && String(process.env.STRIPE_SECRET_KEY).trim()),
  hasWhsec: Boolean(process.env.STRIPE_WEBHOOK_SECRET && String(process.env.STRIPE_WEBHOOK_SECRET).trim()),
  hasMonthly: Boolean(process.env.STRIPE_PRICE_ID_MONTHLY && String(process.env.STRIPE_PRICE_ID_MONTHLY).trim()),
  hasAnnual: Boolean(process.env.STRIPE_PRICE_ID_ANNUAL && String(process.env.STRIPE_PRICE_ID_ANNUAL).trim()),
  publicUrl: String(process.env.KAIROS_PUBLIC_URL ?? "").trim(),
}, null, 2));
