import nodemailer from "nodemailer";

/* Gmail SMTP transporter — uses App Password, not your real Gmail password.
   To set up: Google Account → Security → 2-Step Verification → App Passwords
   Generate a password for "Mail" and add it to .env.local as GMAIL_APP_PASSWORD */
export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function sendMail(options: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}) {
  const sender = options.fromName ? `${options.fromName} <${process.env.GMAIL_USER}>` : `EduResults <${process.env.GMAIL_USER}>`;
  return transporter.sendMail({
    from: sender,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}
