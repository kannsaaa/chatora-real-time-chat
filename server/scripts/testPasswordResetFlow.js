// testPasswordResetFlow.js
const assert = require("assert");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Load environment variables
require("dotenv").config();

const { User } = require("../models/userModel.js");
const { PasswordResetToken } = require("../models/passwordResetTokenModel.js");
const passwordResetController = require("../controllers/passwordResetController.js");
const loginController = require("../controllers/loginController.js");
const sendEmail = require("../utils/sendEmail.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Mock response helper
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    send(data) {
      this.body = data;
      return this;
    },
    cookie(name, val, opts) {
      this.headers["set-cookie"] = `${name}=${val}`;
      return this;
    },
    redirect(url) {
      this.statusCode = 302;
      this.redirectUrl = url;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log("=== Running Chatora Password Reset Flow Tests ===\n");

  const dbUri = process.env.DB || "mongodb://127.0.0.1:27017/chatapp";
  await mongoose.connect(dbUri);

  const testEmail = "pw_reset_test@example.com";
  const unverifiedEmail = "pw_unverified_test@example.com";
  const oldPassword = "OldPassword123!";
  const newPassword = "NewSecretPassword123!";

  // Cleanup existing test accounts
  await User.deleteMany({ email: { $in: [testEmail, unverifiedEmail] } });
  await PasswordResetToken.deleteMany({});

  // Setup verified test user
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(oldPassword, salt);
  const testUser = await new User({
    firstName: "ResetTester",
    lastName: "User",
    username: "pw_reset_user",
    email: testEmail,
    password: hashedPassword,
    verified: true,
  }).save();

  // Setup unverified test user
  await new User({
    firstName: "UnverifiedTester",
    lastName: "User",
    username: "pw_unverified_user",
    email: unverifiedEmail,
    password: hashedPassword,
    verified: false,
  }).save();

  // Track sent emails
  const sentEmails = [];
  const originalFetch = global.fetch;

  // Intercept fetch calls to verify Brevo payload
  global.fetch = async (url, opts) => {
    if (url === sendEmail.BREVO_API_URL) {
      const payload = JSON.parse(opts.body);
      sentEmails.push({ url, headers: opts.headers, payload });
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: `<test-brevo-${Date.now()}@smtp-relay.mailin.fr>` }),
      };
    }
    return originalFetch(url, opts);
  };

  try {
    // ---------------------------------------------------------
    // Test 1: Anti-enumeration for non-existent email
    // ---------------------------------------------------------
    {
      const req = { body: { email: "nonexistent_person_9999@test.com" } };
      const res = createMockRes();
      await passwordResetController.requestPasswordReset(req, res);

      assert.strictEqual(res.statusCode, 200, "Must return 200 for non-existent email (anti-enumeration)");
      assert.ok(
        res.body.message.includes("If an account with that email exists"),
        "Message must be generic without disclosing absence"
      );
      const tokenCount = await PasswordResetToken.countDocuments();
      assert.strictEqual(tokenCount, 0, "No token must be generated for non-existent user");
      console.log("✅ PASS 1: Anti-enumeration for non-existent email returns generic 200");
    }

    // ---------------------------------------------------------
    // Test 2: Anti-enumeration for unverified email
    // ---------------------------------------------------------
    {
      const req = { body: { email: unverifiedEmail } };
      const res = createMockRes();
      await passwordResetController.requestPasswordReset(req, res);

      assert.strictEqual(res.statusCode, 200, "Must return 200 for unverified email");
      const tokenCount = await PasswordResetToken.countDocuments();
      assert.strictEqual(tokenCount, 0, "No token must be generated for unverified user");
      console.log("✅ PASS 2: Anti-enumeration for unverified user does not issue reset token");
    }

    // ---------------------------------------------------------
    // Test 3: Valid user requests password reset
    // ---------------------------------------------------------
    let generatedTokenDoc;
    {
      sentEmails.length = 0;
      const req = { body: { email: testEmail } };
      const res = createMockRes();
      await passwordResetController.requestPasswordReset(req, res);

      assert.strictEqual(res.statusCode, 200);
      assert.ok(res.body.message.includes("If an account with that email exists"));

      generatedTokenDoc = await PasswordResetToken.findOne({ userId: testUser._id });
      assert.ok(generatedTokenDoc, "Token must be saved in database");
      assert.ok(generatedTokenDoc.token.length >= 32, "Token must have cryptographic length");
      assert.ok(generatedTokenDoc.expiresAt > Date.now(), "Token expiration must be in the future");

      // Verify email delivery via Brevo
      assert.strictEqual(sentEmails.length, 1, "Exactly one email must be sent via Brevo");
      const emailRecord = sentEmails[0];
      assert.strictEqual(emailRecord.payload.to[0].email, testEmail);
      assert.ok(emailRecord.payload.subject.includes("password"), "Subject should mention password");
      assert.ok(emailRecord.payload.htmlContent.includes(generatedTokenDoc.token), "HTML content must contain the token link");
      assert.ok(emailRecord.payload.htmlContent.includes("Reset Password ✨"), "HTML template must have Chatora CTA");

      console.log("✅ PASS 3: Valid user receives Brevo transactional email with reset token");
    }

    // ---------------------------------------------------------
    // Test 4: Token verification (valid, invalid, tampered)
    // ---------------------------------------------------------
    {
      // Valid token check
      const reqValid = { params: { id: testUser._id.toString(), token: generatedTokenDoc.token }, headers: {} };
      const resValid = createMockRes();
      await passwordResetController.verifyResetToken(reqValid, resValid);
      assert.strictEqual(resValid.statusCode, 200);
      assert.strictEqual(resValid.body.valid, true);

      // Tampered token check
      const reqTampered = { params: { id: testUser._id.toString(), token: "badtoken12345" }, headers: {} };
      const resTampered = createMockRes();
      await passwordResetController.verifyResetToken(reqTampered, resTampered);
      assert.strictEqual(resTampered.statusCode, 400);

      // Invalid ObjectId format
      const reqInvalidId = { params: { id: "not-an-id", token: generatedTokenDoc.token }, headers: {} };
      const resInvalidId = createMockRes();
      await passwordResetController.verifyResetToken(reqInvalidId, resInvalidId);
      assert.strictEqual(resInvalidId.statusCode, 400);

      console.log("✅ PASS 4: Token verification accepts valid token and rejects tampered tokens");
    }

    // ---------------------------------------------------------
    // Test 5: Token expiration
    // ---------------------------------------------------------
    {
      const expiredToken = await new PasswordResetToken({
        userId: testUser._id,
        token: "expired_token_abc_123",
        expiresAt: new Date(Date.now() - 5000), // 5 seconds in the past
      }).save();

      const req = { params: { id: testUser._id.toString(), token: expiredToken.token }, headers: {} };
      const res = createMockRes();
      await passwordResetController.verifyResetToken(req, res);
      assert.strictEqual(res.statusCode, 400, "Expired token must return 400");
      assert.ok(res.body.message.toLowerCase().includes("expired"));

      const stillExists = await PasswordResetToken.findById(expiredToken._id);
      assert.strictEqual(stillExists, null, "Expired token must be cleaned up");

      console.log("✅ PASS 5: Expired tokens are rejected with 400 and removed");
    }

    // ---------------------------------------------------------
    // Test 6: Password complexity rejection
    // ---------------------------------------------------------
    {
      const reqWeak = {
        params: { id: testUser._id.toString(), token: generatedTokenDoc.token },
        body: { password: "weak" },
      };
      const resWeak = createMockRes();
      await passwordResetController.resetPassword(reqWeak, resWeak);
      assert.strictEqual(resWeak.statusCode, 400, "Weak password must be rejected");

      // Verify user's password was NOT changed
      const freshUser = await User.findById(testUser._id);
      const isOldPassword = await bcrypt.compare(oldPassword, freshUser.password);
      assert.strictEqual(isOldPassword, true, "User password must not change on validation error");

      console.log("✅ PASS 6: Password complexity rejection enforces secure password rules");
    }

    // ---------------------------------------------------------
    // Test 7: Successful password update and token invalidation
    // ---------------------------------------------------------
    {
      const req = {
        params: { id: testUser._id.toString(), token: generatedTokenDoc.token },
        body: { password: newPassword },
      };
      const res = createMockRes();
      await passwordResetController.resetPassword(req, res);

      assert.strictEqual(res.statusCode, 200, "Password reset must return 200 on success");
      assert.ok(res.body.message.toLowerCase().includes("successful"));

      // Verify in DB
      const freshUser = await User.findById(testUser._id);
      const isNewPassword = await bcrypt.compare(newPassword, freshUser.password);
      const isOldPassword = await bcrypt.compare(oldPassword, freshUser.password);
      assert.strictEqual(isNewPassword, true, "New password must match stored bcrypt hash");
      assert.strictEqual(isOldPassword, false, "Old password must no longer match");

      // Verify token was deleted
      const tokenCount = await PasswordResetToken.countDocuments({ userId: testUser._id });
      assert.strictEqual(tokenCount, 0, "All reset tokens for the user must be deleted/invalidated");

      console.log("✅ PASS 7: Password update securely hashes password and invalidates token");
    }

    // ---------------------------------------------------------
    // Test 8: Replay attack prevention (token cannot be reused)
    // ---------------------------------------------------------
    {
      const reqReplay = {
        params: { id: testUser._id.toString(), token: generatedTokenDoc.token },
        body: { password: "AnotherPassword123!" },
      };
      const resReplay = createMockRes();
      await passwordResetController.resetPassword(reqReplay, resReplay);
      assert.strictEqual(resReplay.statusCode, 400, "Replay with used token must return 400");

      console.log("✅ PASS 8: Replay attack prevented (used tokens cannot be reused)");
    }

    // ---------------------------------------------------------
    // Test 9: Login authentication with new vs old password
    // ---------------------------------------------------------
    {
      // Attempt login with old password -> must fail
      const reqOld = { body: { email: testEmail, password: oldPassword } };
      const resOld = createMockRes();
      await loginController(reqOld, resOld);
      assert.strictEqual(resOld.statusCode, 401, "Login with old password must fail with 401");

      // Attempt login with new password -> must succeed
      const reqNew = { body: { email: testEmail, password: newPassword } };
      const resNew = createMockRes();
      await loginController(reqNew, resNew);
      assert.strictEqual(resNew.statusCode, 200, "Login with new password must succeed with 200");
      assert.ok(resNew.headers["set-cookie"], "Login must issue session cookie");

      console.log("✅ PASS 9: Login succeeds with new password and fails with old password");
    }

    console.log("\n========================================");
    console.log("Password Reset Tests Completed: 9 passed, 0 failed");
    console.log("========================================\n");
  } finally {
    // Restore global fetch
    global.fetch = originalFetch;
    // Cleanup test users
    await User.deleteMany({ email: { $in: [testEmail, unverifiedEmail] } });
    await PasswordResetToken.deleteMany({});
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("Test failure in testPasswordResetFlow:", err);
  process.exit(1);
});
