// utils/sendEmail.js

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

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
 * Sends a transactional email using Brevo (formerly Sendinblue) Transactional Email API.
 * @param {string} email - Destination recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plaintext content or verification URL
 * @param {string} [customHtml] - Optional custom HTML content
 * @returns {Promise<Object>} Brevo API response data
 */
const sendEmail = async (email, subject, text, customHtml) => {
  const apiKey = (process.env.BREVO_API_KEY || "").trim();
  const fromEmail = (process.env.BREVO_FROM_EMAIL || "").trim();

  const isPlaceholder = (val, placeholder) =>
    !val ||
    val === placeholder ||
    val.toLowerCase() === "undefined";

  const isUnconfigured =
    isPlaceholder(apiKey, "your_brevo_api_key_here") ||
    isPlaceholder(fromEmail, "your_verified_sender@example.com") ||
    isPlaceholder(fromEmail, "your_brevo_from_email_here");

  // Safe development fallback: if Brevo credentials are not configured locally
  if (isUnconfigured) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[sendEmail] Brevo API credentials (BREVO_API_KEY, BREVO_FROM_EMAIL) are not fully configured. Development mode: external email was not sent.`
      );
      console.warn(`[sendEmail] Target: ${email} | Subject: "${subject}"`);
      if (text) {
        console.warn(`[sendEmail] Content/Link: ${text}`);
      }
      return { id: "dev-simulated-id", simulated: true };
    }

    console.error(
      "[sendEmail] Brevo API credentials (BREVO_API_KEY, BREVO_FROM_EMAIL) are missing or unconfigured in production environment."
    );
    throw new Error("Email delivery service is not configured. Missing BREVO_API_KEY or BREVO_FROM_EMAIL.");
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

  const payload = {
    sender: {
      name: "Chatora",
      email: fromEmail,
    },
    to: [
      {
        email,
      },
    ],
    subject,
    textContent: plainText || "",
    htmlContent: htmlContent || (plainText ? `<p>${plainText}</p>` : ""),
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let errorData = null;
      let rawText = "";
      try {
        rawText = await response.text();
        errorData = JSON.parse(rawText);
      } catch (_) {
        errorData = { message: rawText || response.statusText };
      }

      const errorMessage =
        errorData?.message ||
        errorData?.error ||
        response.statusText ||
        "Brevo API request failed";

      const errorCode = errorData?.code || response.status;

      // Sanitize logging: NEVER log the Brevo API key
      console.error(`[sendEmail] Brevo API error sending to ${email}:`, {
        status: response.status,
        code: errorCode,
        message: errorMessage,
      });

      throw new Error(`Email delivery failed: ${errorMessage} (status: ${response.status})`);
    }

    const data = await response.json().catch(() => ({}));
    console.log(
      `[sendEmail] Verification email delivered to ${email} (Brevo Message ID: ${data?.messageId || "ok"})`
    );
    return data;
  } catch (err) {
    if (err.message && err.message.startsWith("Email delivery failed:")) {
      throw err;
    }
    // Sanitize logging: NEVER log the Brevo API key
    console.error(`[sendEmail] Brevo request failure sending to ${email}:`, {
      message: err.message || "Network request failed",
    });
    throw new Error(`Email delivery failed: ${err.message || "Network error"}`);
  }
};

sendEmail.getVerificationHtml = getVerificationHtml;
sendEmail.BREVO_API_URL = BREVO_API_URL;

module.exports = sendEmail;
