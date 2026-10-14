//emailVerifyController.js
const { User } = require("../models/userModel.js");
const { Token } = require("../models/tokenModel.js");

const getFrontendBase = () => {
  const base = (
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    process.env.BASE_URL ||
    process.env.APP_URL ||
    "http://localhost:5173"
  )
    .trim()
    .replace(/\/+users\/?$/, "")
    .replace(/\/+$/, "");

  return base;
};

const sendHtmlResponse = (res, statusCode, title, message, actionText, actionUrl) => {
  return res.status(statusCode).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Chatora</title>
  <meta http-equiv="refresh" content="3;url=${actionUrl}">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FFF9F5; color: #241628; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; text-align: center; }
    .card { background: #FFFFFF; border: 1px solid #EAD8CC; padding: 40px 32px; border-radius: 28px; box-shadow: 0 10px 30px -6px rgba(74, 40, 68, 0.15); max-width: 440px; width: 100%; box-sizing: border-box; }
    .icon { width: 64px; height: 64px; border-radius: 20px; background-color: ${statusCode === 200 ? '#ECFDF5' : '#FFF1F2'}; border: 1px solid ${statusCode === 200 ? '#A7F3D0' : '#FECDD3'}; color: ${statusCode === 200 ? '#10B981' : '#F43F5E'}; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 20px auto; }
    h1 { font-size: 22px; font-weight: 800; margin: 0 0 10px 0; color: #241628; letter-spacing: -0.3px; }
    p { font-size: 14px; color: #665063; line-height: 1.6; margin: 0 0 28px 0; font-weight: 500; }
    a { display: inline-block; background: linear-gradient(135deg, #FF6F91 0%, #FF9E79 100%); color: #FFFFFF; text-decoration: none; padding: 13px 32px; border-radius: 16px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 14px rgba(255, 111, 145, 0.35); transition: opacity 0.2s; }
    a:hover { opacity: 0.95; }
    .subtext { font-size: 12px; color: #A67C9B; margin-top: 18px; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${statusCode === 200 ? '✨' : '⚠️'}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="${actionUrl}">${actionText}</a>
    <p class="subtext">Redirecting you in 3 seconds...</p>
  </div>
</body>
</html>`);
};

const verifyEmail = async (req, res) => {
  const acceptsHtml =
    req.headers.accept &&
    req.headers.accept.includes("text/html") &&
    !req.xhr &&
    !req.headers["x-requested-with"];

  const frontendBase = getFrontendBase();

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      if (acceptsHtml) {
        return sendHtmlResponse(
          res,
          400,
          "User Not Found",
          "This account does not exist or was removed.",
          "Register Again 💬",
          `${frontendBase}/register`
        );
      }
      return res.status(400).send({ message: "User doesn't exist" });
    }

    if (user.verified) {
      if (acceptsHtml) {
        return sendHtmlResponse(
          res,
          200,
          "Email Already Verified",
          "Your email address is already verified. You can log in right away!",
          "Proceed to Login 💬",
          `${frontendBase}/login`
        );
      }
      return res
        .status(200)
        .send({ message: "Email already verified. You can log in.", alreadyVerified: true });
    }

    // Find the token for the user
    const token = await Token.findOne({
      userId: user._id,
      token: req.params.token,
    });

    if (!token) {
      if (acceptsHtml) {
        return sendHtmlResponse(
          res,
          400,
          "Invalid Verification Link",
          "This verification link is invalid or has already been used.",
          "Go to Login 💬",
          `${frontendBase}/login`
        );
      }
      return res.status(400).send({ message: "Invalid Link" });
    }

    if (token.expiresAt < Date.now()) {
      user.verificationLinkSent = false;
      await user.save();
      await Token.deleteOne({ _id: token._id });
      if (acceptsHtml) {
        return sendHtmlResponse(
          res,
          400,
          "Verification Link Expired",
          "Your verification link has expired. Please register again to receive a fresh link.",
          "Register Again 💬",
          `${frontendBase}/register`
        );
      }
      return res.status(400).send({ message: "Verification link has expired" });
    }

    user.verified = true;
    user.verificationLinkSent = false;
    await user.save();
    await Token.deleteOne({ _id: token._id });

    if (acceptsHtml) {
      return sendHtmlResponse(
        res,
        200,
        "Email Verified Successfully! ✨",
        "Your Chatora account has been activated. Welcome aboard!",
        "Proceed to Login 💬",
        `${frontendBase}/login`
      );
    }

    res.status(200).send({ message: "Email Verified Successfully" });
  } catch (error) {
    console.error("Error in verifyEmail:", error);
    if (acceptsHtml) {
      return sendHtmlResponse(
        res,
        500,
        "Verification Error",
        "An unexpected error occurred while verifying your account.",
        "Return to Home 💬",
        `${frontendBase}/`
      );
    }
    res.status(500).send({ message: "Internal Server Error" });
  }
};

module.exports = verifyEmail;
