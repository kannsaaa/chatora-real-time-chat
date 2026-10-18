// utils/sendEmail.js
const { google } = require("googleapis");

/**
 * Generates an HTML verification email template conforming to Chatora's visual style.
 * @param {string} url - Account verification link
 * @returns {string} HTML email string
 */
const getVerificationHtml = (url) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Chatora Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFDF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #4A154B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FFFDF9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 24px; border: 1px solid #FFE4E6; box-shadow: 0 10px 25px -5px rgba(255, 179, 198, 0.2); overflow: hidden; padding: 36px 32px;" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; color: #2D0C30; letter-spacing: -0.5px;">
                Chatora <span style="font-size: 24px;">💬</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #8A4F7D; font-weight: 500;">Real-time sweet chat application</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0; border-top: 1px solid #FDF2F4; border-bottom: 1px solid #FDF2F4;">
              <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #2D0C30;">Verify Your Email Address</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #5C3256;">
                Thank you for joining Chatora! Tap the button below to verify your email and activate your account.
              </p>
              <div align="center" style="margin: 28px 0;">
                <a href="${url}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #FF9EAA 0%, #FFB3C6 100%); color: #2D0C30; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 16px; box-shadow: 0 4px 14px rgba(255, 158, 170, 0.4);">
                  Verify My Account ✨
                </a>
              </div>
              <p style="margin: 20px 0 6px 0; font-size: 13px; line-height: 1.5; color: #8A4F7D;">
                If the button above doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 0; font-size: 12px; line-height: 1.4; word-break: break-all;">
                <a href="${url}" style="color: #FF5E8E; text-decoration: underline;">${url}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 24px;">
              <p style="margin: 0; font-size: 12px; color: #A67C9B;">
                This link will expire in 1 hour. If you didn't create an account on Chatora, you can safely ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Splits a base64 string into RFC 2045 standard 76-character lines.
 * @param {string} b64 - Base64 string
 * @returns {string} Wrapped base64 string
 */
const wrapBase64 = (b64) => {
  if (!b64) return "";
  return (b64.match(/.{1,76}/g) || []).join("\r\n");
};

/**
 * Builds an RFC 2822 MIME message and encodes it as a base64url string for Gmail API.
 * @param {Object} options
 * @param {string} options.from - Sender address (e.g. "Chatora <sender@gmail.com>")
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Subject line
 * @param {string} options.text - Plain text content
 * @param {string} [options.html] - HTML content
 * @returns {string} base64url-encoded MIME message
 */
const buildMimeMessage = ({ from, to, subject, text, html }) => {
  const boundary = `__chatora_boundary_${Date.now()}_${Math.random().toString(36).substring(2)}__`;
  // RFC 2047 encoded subject to safely handle Unicode/emojis in subject lines
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, "utf-8").toString("base64")}?=`;

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
  ];

  let body = "";

  if (html) {
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    const plainPart = [
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(Buffer.from(text || "", "utf-8").toString("base64")),
    ].join("\r\n");

    const htmlPart = [
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(Buffer.from(html, "utf-8").toString("base64")),
      `--${boundary}--`,
    ].join("\r\n");

    body = `${plainPart}\r\n${htmlPart}`;
  } else {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push("Content-Transfer-Encoding: base64");
    body = wrapBase64(Buffer.from(text || "", "utf-8").toString("base64"));
  }

  const rawMime = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(rawMime, "utf-8").toString("base64url");
};

/**
 * Formats sender address with display name if not already present.
 * @param {string} sender - Sender email or formatted string
 * @returns {string} Formatted sender header
 */
const formatSender = (sender) => {
  const trimmed = (sender || "").trim();
  if (!trimmed) return "Chatora";
  if (trimmed.includes("<") && trimmed.includes(">")) {
    return trimmed;
  }
  return `Chatora <${trimmed}>`;
};

// Cached OAuth2 client instance to preserve active tokens and allow automatic refresh
let cachedOAuth2Client = null;
let cachedCredentialsKey = "";

/**
 * Initializes and returns the google.auth.OAuth2 client with refresh token credentials.
 * @param {string} clientId
 * @param {string} clientSecret
 * @param {string} refreshToken
 * @returns {google.auth.OAuth2}
 */
const getOAuth2Client = (clientId, clientSecret, refreshToken) => {
  const credentialsKey = `${clientId}:${clientSecret}:${refreshToken}`;
  if (cachedOAuth2Client && cachedCredentialsKey === credentialsKey) {
    return cachedOAuth2Client;
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  cachedOAuth2Client = oauth2Client;
  cachedCredentialsKey = credentialsKey;
  return oauth2Client;
};

/**
 * Resets the cached OAuth2 client instance (useful for testing).
 */
const resetClient = () => {
  cachedOAuth2Client = null;
  cachedCredentialsKey = "";
};

/**
 * Sends an email using Google Gmail API Node.js client (googleapis).
 * @param {string} email - Destination recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plaintext content or verification URL
 * @param {string} [customHtml] - Optional custom HTML content
 * @returns {Promise<Object>} Gmail API response data
 */
const sendEmail = async (email, subject, text, customHtml) => {
  const clientId = (process.env.GMAIL_CLIENT_ID || "").trim();
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || "").trim();
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || "").trim();
  const senderEmail = (process.env.GMAIL_SENDER_EMAIL || "").trim();

  const isPlaceholder = (val, placeholder) =>
    !val ||
    val === placeholder ||
    val.toLowerCase() === "undefined";

  const isUnconfigured =
    isPlaceholder(clientId, "your_gmail_client_id_here") ||
    isPlaceholder(clientSecret, "your_gmail_client_secret_here") ||
    isPlaceholder(refreshToken, "your_gmail_refresh_token_here") ||
    isPlaceholder(senderEmail, "your_email@gmail.com") ||
    isPlaceholder(senderEmail, "your_gmail_sender_email_here");

  // Safe development fallback: if Gmail credentials are not configured locally
  if (isUnconfigured) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[sendEmail] Gmail API credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL) are not fully configured. Development mode: external email was not sent.`
      );
      console.warn(`[sendEmail] Target: ${email} | Subject: "${subject}"`);
      if (text) {
        console.warn(`[sendEmail] Verification Link: ${text}`);
      }
      return { id: "dev-simulated-id", simulated: true };
    }

    console.error(
      "[sendEmail] Gmail API credentials are missing or unconfigured in production environment."
    );
    throw new Error("Email delivery service is not configured.");
  }

  // Determine plaintext and HTML contents
  const isUrl =
    typeof text === "string" &&
    (text.startsWith("http://") || text.startsWith("https://"));
  const plainText = isUrl
    ? `Welcome to Chatora!\n\nPlease verify your email by opening the link below:\n${text}\n\nThis link will expire in 1 hour. If you did not create a Chatora account, please ignore this email.`
    : text;
  const htmlContent =
    customHtml || (isUrl ? getVerificationHtml(text) : undefined);

  const fromHeader = formatSender(senderEmail);

  // Encode the MIME message for the Gmail API
  const rawMessage = buildMimeMessage({
    from: fromHeader,
    to: email,
    subject,
    text: plainText,
    html: htmlContent,
  });

  try {
    const oAuth2Client = getOAuth2Client(clientId, clientSecret, refreshToken);
    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    console.log(
      `[sendEmail] Verification email delivered to ${email} (Gmail Message ID: ${response.data?.id})`
    );
    return response.data;
  } catch (err) {
    // Sanitize error logging: log status/code/message without leaking sensitive auth tokens/secrets
    const errorStatus =
      err.response?.status ||
      err.status ||
      err.code ||
      "UNKNOWN_ERROR";
    const errorMessage =
      err.response?.data?.error?.message ||
      err.response?.data?.error_description ||
      err.message ||
      "Gmail API request failed";

    console.error(`[sendEmail] Gmail API error sending to ${email}:`, {
      status: errorStatus,
      message: errorMessage,
    });

    throw new Error(`Email delivery failed: ${errorMessage}`);
  }
};

// Export main sender function and testing utilities
sendEmail.getVerificationHtml = getVerificationHtml;
sendEmail.buildMimeMessage = buildMimeMessage;
sendEmail.formatSender = formatSender;
sendEmail.getOAuth2Client = getOAuth2Client;
sendEmail.resetClient = resetClient;

module.exports = sendEmail;
