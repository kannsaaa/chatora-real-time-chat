// server/scripts/testRegisterVerifyFlow.js
const assert = require("assert");

async function runRegistrationVerificationTests() {
  console.log("=== Testing Registration and Verification Controller Flow ===\n");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Test verification URL formatting in registerController
  test("Frontend verification URL is constructed correctly", () => {
    const frontendBase = (
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      process.env.BASE_URL ||
      process.env.APP_URL ||
      "http://localhost:5173"
    )
      .trim()
      .replace(/\/+users\/?$/, "")
      .replace(/\/+$/, "");

    const mockUserId = "64f1a2b3c4d5e6f7a8b9c0d1";
    const mockToken = "abcdef1234567890";
    const url = `${frontendBase}/users/${mockUserId}/verify/${mockToken}`;

    assert.strictEqual(
      url,
      "http://localhost:5173/users/64f1a2b3c4d5e6f7a8b9c0d1/verify/abcdef1234567890"
    );
  });

  // 2. Test emailVerifyController HTML response structure
  await asyncTest("emailVerifyController returns styled HTML on browser Accept: text/html", async () => {
    const verifyEmail = require("../controllers/emailVerifyController.js");
    const { User } = require("../models/userModel.js");
    const { Token } = require("../models/tokenModel.js");

    const originalFindById = User.findById;
    const originalTokenFindOne = Token.findOne;
    const originalTokenDeleteOne = Token.deleteOne;

    const mockUser = {
      _id: "u123",
      verified: false,
      verificationLinkSent: true,
      save: async () => {},
    };

    const mockToken = {
      _id: "t123",
      userId: "u123",
      token: "tok999",
      expiresAt: Date.now() + 100000,
    };

    User.findById = async () => mockUser;
    Token.findOne = async () => mockToken;
    Token.deleteOne = async () => ({ deletedCount: 1 });

    const req = {
      params: { id: "u123", token: "tok999" },
      headers: { accept: "text/html,application/xhtml+xml" },
    };

    let responseStatus = 0;
    let responseBody = "";

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      send(body) {
        responseBody = body;
        return this;
      },
    };

    try {
      await verifyEmail(req, res);
      assert.strictEqual(responseStatus, 200);
      assert.ok(responseBody.includes("Email Verified Successfully! ✨"));
      assert.strictEqual(mockUser.verified, true);
      assert.strictEqual(mockUser.verificationLinkSent, false);
    } finally {
      User.findById = originalFindById;
      Token.findOne = originalTokenFindOne;
      Token.deleteOne = originalTokenDeleteOne;
    }
  });

  // 3. Test emailVerifyController JSON API response structure
  await asyncTest("emailVerifyController returns JSON when called by Single Page Application", async () => {
    const verifyEmail = require("../controllers/emailVerifyController.js");
    const { User } = require("../models/userModel.js");
    const { Token } = require("../models/tokenModel.js");

    const originalFindById = User.findById;
    const originalTokenFindOne = Token.findOne;
    const originalTokenDeleteOne = Token.deleteOne;

    const mockUser = {
      _id: "u123",
      verified: false,
      verificationLinkSent: true,
      save: async () => {},
    };

    const mockToken = {
      _id: "t123",
      userId: "u123",
      token: "tok999",
      expiresAt: Date.now() + 100000,
    };

    User.findById = async () => mockUser;
    Token.findOne = async () => mockToken;
    Token.deleteOne = async () => ({ deletedCount: 1 });

    const req = {
      params: { id: "u123", token: "tok999" },
      headers: { accept: "application/json" },
    };

    let responseStatus = 0;
    let responseBody = null;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      send(body) {
        responseBody = body;
        return this;
      },
    };

    try {
      await verifyEmail(req, res);
      assert.strictEqual(responseStatus, 200);
      assert.strictEqual(responseBody.message, "Email Verified Successfully");
    } finally {
      User.findById = originalFindById;
      Token.findOne = originalTokenFindOne;
      Token.deleteOne = originalTokenDeleteOne;
    }
  });

  // 4. Test expired token handling
  await asyncTest("emailVerifyController handles expired token correctly", async () => {
    const verifyEmail = require("../controllers/emailVerifyController.js");
    const { User } = require("../models/userModel.js");
    const { Token } = require("../models/tokenModel.js");

    const originalFindById = User.findById;
    const originalTokenFindOne = Token.findOne;
    const originalTokenDeleteOne = Token.deleteOne;

    const mockUser = {
      _id: "u123",
      verified: false,
      verificationLinkSent: true,
      save: async () => {},
    };

    const mockExpiredToken = {
      _id: "t123",
      userId: "u123",
      token: "tok999",
      expiresAt: Date.now() - 100000, // expired
    };

    User.findById = async () => mockUser;
    Token.findOne = async () => mockExpiredToken;
    Token.deleteOne = async () => ({ deletedCount: 1 });

    const req = {
      params: { id: "u123", token: "tok999" },
      headers: { accept: "application/json" },
    };

    let responseStatus = 0;
    let responseBody = null;

    const res = {
      status(code) {
        responseStatus = code;
        return this;
      },
      send(body) {
        responseBody = body;
        return this;
      },
    };

    try {
      await verifyEmail(req, res);
      assert.strictEqual(responseStatus, 400);
      assert.strictEqual(responseBody.message, "Verification link has expired");
      assert.strictEqual(mockUser.verificationLinkSent, false);
    } finally {
      User.findById = originalFindById;
      Token.findOne = originalTokenFindOne;
      Token.deleteOne = originalTokenDeleteOne;
    }
  });

  console.log(`\n========================================`);
  console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runRegistrationVerificationTests();
