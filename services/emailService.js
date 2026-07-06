const nodemailer = require("nodemailer");
const emailConfig = require("../config/email");

const isDev = process.env.NODE_ENV !== "production";

const buildTransport = (options) =>
  nodemailer.createTransport({
    host: options.host || emailConfig.smtpHost,
    port: options.port,
    secure: options.secure,
    requireTLS: options.requireTLS ?? false,
    auth: {
      user: emailConfig.emailUser,
      pass: emailConfig.emailPassword,
    },
    authMethod: options.authMethod,
    tls: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: options.rejectUnauthorized ?? true,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });

const transportAttempts = () => {
  const host = emailConfig.smtpHost;
  const attempts = [
    { label: "587 STARTTLS LOGIN", port: 587, secure: false, requireTLS: true, authMethod: "LOGIN" },
    { label: "587 STARTTLS PLAIN", port: 587, secure: false, requireTLS: true, authMethod: "PLAIN" },
    { label: "465 SSL LOGIN", port: 465, secure: true, requireTLS: false, authMethod: "LOGIN" },
    { label: "465 SSL PLAIN", port: 465, secure: true, requireTLS: false, authMethod: "PLAIN" },
  ];

  if (emailConfig.provider === "gmail") {
    return [{ label: "Gmail 587", port: 587, secure: false, requireTLS: true, authMethod: "LOGIN", host: "smtp.gmail.com" }];
  }
  if (emailConfig.provider === "brevo") {
    return [{ label: "Brevo 587", port: 587, secure: false, requireTLS: true, authMethod: "LOGIN", host: "smtp-relay.brevo.com" }];
  }

  return attempts.map((a) => ({ ...a, host }));
};

const assertEmailConfigured = () => {
  if (!emailConfig.emailUser || !emailConfig.emailPassword) {
    throw new Error("Email service is not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env");
  }
};

/** Dev-only: print OTP to terminal when EMAIL_DEV_LOG=true (never used for normal sends) */
const logOtpToConsole = (email, otp, expiryMinutes, reason) => {
  console.log("\n========================================");
  console.log(`[OTP ${reason}]`);
  console.log(`  To:      ${email}`);
  console.log(`  OTP:     ${otp}`);
  console.log(`  Expires: ${expiryMinutes} minutes`);
  console.log("========================================\n");
};

const sendWithTransporters = async (mailOptions) => {
  let lastError;

  for (const attempt of transportAttempts()) {
    const transporter = buildTransport(attempt);
    try {
      await transporter.sendMail(mailOptions);
      if (isDev) {
        console.log(`OTP email sent via ${attempt.label} to ${mailOptions.to}`);
      }
      return;
    } catch (err) {
      lastError = err;
      if (isDev) {
        console.error(`SMTP ${attempt.label} failed:`, err.message);
      }
    }
  }

  throw lastError || new Error("Failed to send email");
};

/**
 * Verify SMTP credentials at startup (optional).
 * Returns { ok: true } or { ok: false, message }.
 */
exports.verifyEmailConnection = async () => {
  if (emailConfig.devLogOnly) {
    return { ok: true, mode: "dev-log-only" };
  }

  assertEmailConfigured();

  let lastError;
  for (const attempt of transportAttempts()) {
    const transporter = buildTransport(attempt);
    try {
      await transporter.verify();
      return { ok: true, mode: attempt.label };
    } catch (err) {
      lastError = err;
    }
  }

  return {
    ok: false,
    message: lastError?.message || "SMTP verification failed",
  };
};

/**
 * Send password-reset OTP to the user's registered email address.
 * OTP is NEVER logged unless EMAIL_DEV_LOG=true (explicit debug mode).
 */
exports.sendOtpEmail = async (email, otp, expiresInSeconds = 600) => {
  const expiryMinutes = Math.round(expiresInSeconds / 60);
  const recipient = email.trim().toLowerCase();

  if (emailConfig.devLogOnly) {
    logOtpToConsole(recipient, otp, expiryMinutes, "EMAIL_DEV_LOG");
    return { delivered: true, mode: "dev-log" };
  }

  assertEmailConfigured();

  const fromAddress =
    process.env.EMAIL_FROM?.trim() ||
    `"BICOMM QA" <${emailConfig.emailUser}>`;

  const mailOptions = {
    from: fromAddress.includes("<") ? fromAddress : `"BICOMM QA" <${fromAddress}>`,
    to: recipient,
    subject: "Your Password Reset OTP — BICOMM QA",
    text: [
      "You requested to reset your password.",
      "",
      `Your one-time password (OTP) is: ${otp}`,
      "",
      `This code expires in ${expiryMinutes} minutes.`,
      "Do not share this code with anyone.",
      "",
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#2575fc;margin-top:0;">Password Reset OTP</h2>
        <p>You requested to reset your password for <strong>${recipient}</strong>.</p>
        <p>Your one-time password is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;text-align:center;padding:16px;background:#f8fafc;border-radius:8px;">${otp}</p>
        <p>This OTP expires in <strong>${expiryMinutes} minutes</strong>.</p>
        <p style="color:#64748b;font-size:13px;">Do not share this code with anyone. If you did not request a reset, ignore this email.</p>
      </div>
    `,
  };

  await sendWithTransporters(mailOptions);
  return { delivered: true, mode: "smtp" };
};

/**
 * Send user invite email with signup link.
 */
exports.sendInviteEmail = async (email, inviteUrl, role) => {
  const recipient = email.trim().toLowerCase();
  const roleLabel = role.replace(/_/g, " ");

  if (emailConfig.devLogOnly) {
    console.log("\n========================================");
    console.log("[INVITE EMAIL — DEV LOG]");
    console.log(`  To:   ${recipient}`);
    console.log(`  Role: ${roleLabel}`);
    console.log(`  Link: ${inviteUrl}`);
    console.log("========================================\n");
    return { delivered: true, mode: "dev-log" };
  }

  assertEmailConfigured();

  const fromAddress =
    process.env.EMAIL_FROM?.trim() ||
    `"BICOMM QA" <${emailConfig.emailUser}>`;

  const mailOptions = {
    from: fromAddress.includes("<") ? fromAddress : `"BICOMM QA" <${fromAddress}>`,
    to: recipient,
    subject: "You're invited to BICOMM QA",
    text: [
      "You have been invited to join BICOMM QA.",
      "",
      `Role: ${roleLabel}`,
      "",
      "Click the link below to set your password and activate your account:",
      inviteUrl,
      "",
      "This link expires in 7 days.",
      "If you did not expect this email, you can ignore it.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
        <h2 style="color:#2575fc;margin-top:0;">You're invited!</h2>
        <p>You have been invited to join <strong>BICOMM QA</strong> as <strong>${roleLabel}</strong>.</p>
        <p>Click the button below to set your password and activate your account:</p>
        <p style="text-align:center;margin:28px 0;">
          <a href="${inviteUrl}" style="background:linear-gradient(90deg,#2575fc,#6a11cb);color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Accept Invite</a>
        </p>
        <p style="color:#64748b;font-size:13px;">Or copy this link: ${inviteUrl}</p>
        <p style="color:#64748b;font-size:13px;">This link expires in 7 days.</p>
      </div>
    `,
  };

  await sendWithTransporters(mailOptions);
  return { delivered: true, mode: "smtp" };
};
