const stripQuotes = (value = "") =>
  value.trim().replace(/^['"]|['"]$/g, "");

const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

const gmailConfig = {
  smtpHost: "smtp.gmail.com",
  smtpPort: 587,
  smtpSecure: false,
  requireTLS: true,
  emailUser: stripQuotes(process.env.GMAIL_USER || process.env.EMAIL_USER || ""),
  emailPassword: stripQuotes(
    process.env.GMAIL_APP_PASSWORD || process.env.EMAIL_PASSWORD || ""
  ),
};

const brevoConfig = {
  smtpHost: "smtp-relay.brevo.com",
  smtpPort: 587,
  smtpSecure: false,
  requireTLS: true,
  emailUser: stripQuotes(process.env.BREVO_LOGIN || process.env.EMAIL_USER || ""),
  emailPassword: stripQuotes(process.env.BREVO_SMTP_KEY || process.env.EMAIL_PASSWORD || ""),
};

const smtpConfig = {
  smtpHost: process.env.SMTP_HOST || "mail.bicommunications.net",
  smtpPort: Number(process.env.SMTP_PORT) || 465,
  smtpSecure: process.env.SMTP_SECURE !== "false",
  requireTLS: process.env.SMTP_PORT === "587",
  emailUser: stripQuotes(process.env.EMAIL_USER || ""),
  emailPassword: stripQuotes(process.env.EMAIL_PASSWORD || ""),
};

const providerMap = {
  gmail: gmailConfig,
  brevo: brevoConfig,
  smtp: smtpConfig,
};

const active = providerMap[provider] || smtpConfig;

module.exports = {
  provider,
  smtpHost: active.smtpHost,
  smtpPort: active.smtpPort,
  smtpSecure: active.smtpSecure,
  requireTLS: active.requireTLS || false,
  emailUser: active.emailUser,
  emailPassword: active.emailPassword,
  devLogOnly: process.env.EMAIL_DEV_LOG === "true",
  devFallback: process.env.EMAIL_DEV_FALLBACK === "true",
};
