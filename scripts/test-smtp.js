require("dotenv").config();
const nodemailer = require("nodemailer");
const emailConfig = require("../config/email");

const recipient = process.argv[2] || emailConfig.emailUser;

const attempts = [
  { label: "587 STARTTLS LOGIN", port: 587, secure: false, requireTLS: true, authMethod: "LOGIN" },
  { label: "587 STARTTLS PLAIN", port: 587, secure: false, requireTLS: true, authMethod: "PLAIN" },
  { label: "465 SSL LOGIN", port: 465, secure: true, authMethod: "LOGIN" },
  { label: "465 SSL PLAIN", port: 465, secure: true, authMethod: "PLAIN" },
];

async function run() {
  console.log("SMTP host:", emailConfig.smtpHost);
  console.log("SMTP user:", emailConfig.emailUser);
  console.log("Test recipient:", recipient);
  console.log("---");

  if (!emailConfig.emailUser || !emailConfig.emailPassword) {
    console.error("ERROR: Set EMAIL_USER and EMAIL_PASSWORD in .env");
    process.exit(1);
  }

  for (const cfg of attempts) {
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtpHost,
      port: cfg.port,
      secure: cfg.secure,
      requireTLS: cfg.requireTLS,
      auth: {
        user: emailConfig.emailUser,
        pass: emailConfig.emailPassword,
      },
      authMethod: cfg.authMethod,
      tls: { minVersion: "TLSv1.2" },
    });

    try {
      await transporter.verify();
      console.log(`VERIFY OK: ${cfg.label}`);

      if (recipient) {
        const info = await transporter.sendMail({
          from: `"BICOMM QA Test" <${emailConfig.emailUser}>`,
          to: recipient,
          subject: "BICOMM QA — SMTP test",
          text: "If you received this, SMTP is configured correctly. OTP emails will work.",
        });
        console.log(`SENT OK via ${cfg.label} -> messageId: ${info.messageId}`);
      }

      process.exit(0);
    } catch (err) {
      console.error(`FAIL: ${cfg.label} ->`, err.message);
    }
  }

  console.error("\nAll SMTP attempts failed.");
  console.error("Fix EMAIL_PASSWORD in .env (use your cPanel mailbox password), then retry.");
  console.error("Or switch to Gmail: EMAIL_PROVIDER=gmail + GMAIL_APP_PASSWORD");
  process.exit(1);
}

run();
