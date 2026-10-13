// scripts/testEmailVerificationFlow.js
const http = require("http");
const mongoose = require("mongoose");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");

// Load models
const { User } = require("../models/userModel.js");
const { Token } = require("../models/tokenModel.js");
const registerController = require("../controllers/registerController.js");
const loginController = require("../controllers/loginController.js");
const verifyEmail = require("../controllers/emailVerifyController.js");
const profileController = require("../controllers/profileController.js");

const TEST_PORT = 4055;
const TEST_DB = process.env.TEST_DB || "mongodb://127.0.0.1:27017/chatapp_verification_test";

async function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: parsed,
          raw: data,
        });
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(typeof postData === "string" ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTest() {
  console.log("=================================================");
  console.log("   CHATORA EMAIL VERIFICATION FLOW E2E TEST      ");
  console.log("=================================================\n");

  // Configure test environment variables
  process.env.JWT_KEY = "test_jwt_secret_key_verification";
  process.env.JWTPRIVATEKEY = "test_jwt_secret_key_verification";
  process.env.SALT = "10";
  process.env.NODE_ENV = "test";
  process.env.BASE_URL = "http://localhost:5173";
  process.env.FRONTEND_URL = "http://localhost:5173";

  // 1. Connect to Database
  console.log("[1/8] Connecting to MongoDB...");
  await mongoose.connect(TEST_DB);
  console.log("  ✓ MongoDB Connected to", TEST_DB);

  // 2. Setup Express test server
  console.log("\n[2/8] Bootstrapping Express test app with verification routes...");
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  // Mount backend routes matching server/index.js
  app.post("/api/user/register", registerController);
  app.post("/api/user/login", loginController);
  app.get("/api/user/:id/verify/:token", verifyEmail);
  app.get("/users/:id/verify/:token", verifyEmail); // direct route alias
  app.get("/api/user/profile", profileController.profileController);

  const server = app.listen(TEST_PORT, "0.0.0.0");
  console.log(`  ✓ Express test server listening on 0.0.0.0:${TEST_PORT}`);

  const testEmail = `verify_test_${Date.now()}@example.com`;
  const testUsername = `user_${Date.now()}`.substring(0, 15);
  const testPassword = "Password123!";

  try {
    // 3. Attempt Login Before Registration
    console.log("\n[3/8] Attempting login before registration...");
    const preRegLogin = await makeRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/user/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: testPassword }
    );
    console.log(`  Status: ${preRegLogin.statusCode} | Response:`, preRegLogin.data);
    if (preRegLogin.statusCode !== 401) {
      throw new Error(`Expected 401 for unregistered user, got ${preRegLogin.statusCode}`);
    }
    console.log("  ✓ Correctly rejected unauthenticated login");

    // 4. Register New User
    console.log(`\n[4/8] Registering new user (${testEmail}, @${testUsername})...`);
    const regRes = await makeRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/user/register",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      {
        firstName: "Test",
        lastName: "Verification",
        username: testUsername,
        email: testEmail,
        password: testPassword,
        bio: "Testing email verification flow",
      }
    );
    console.log(`  Status: ${regRes.statusCode} | Response:`, regRes.data);
    if (regRes.statusCode !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
    }
    console.log("  ✓ Registration succeeded (201 Created)");

    // Query database for user and token
    const user = await User.findOne({ email: testEmail });
    if (!user) throw new Error("User record not found in MongoDB!");
    console.log(`  ✓ User created in DB: _id=${user._id}, verified=${user.verified}`);
    if (user.verified !== false) {
      throw new Error("Expected user.verified to be false immediately after registration");
    }

    const tokenDoc = await Token.findOne({ userId: user._id });
    if (!tokenDoc) throw new Error("Verification token record not found in MongoDB!");
    console.log(`  ✓ Token generated: token=${tokenDoc.token}, expiresAt=${new Date(tokenDoc.expiresAt).toISOString()}`);

    // 5. Attempt Login Before Verification
    console.log("\n[5/8] Attempting login before email verification...");
    const unverifiedLogin = await makeRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/user/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: testPassword }
    );
    console.log(`  Status: ${unverifiedLogin.statusCode} | Response:`, unverifiedLogin.data);
    if (unverifiedLogin.statusCode !== 400 || !unverifiedLogin.data?.message?.includes("verify your email")) {
      throw new Error(`Expected 400 unverified error, got ${unverifiedLogin.statusCode}: ${JSON.stringify(unverifiedLogin.data)}`);
    }
    console.log("  ✓ Correctly blocked unverified user from logging in");

    // 6. Execute Email Verification API Call (Simulation of frontend VerifyEmail.jsx request)
    console.log(`\n[6/8] Executing verification request (GET /api/user/${user._id}/verify/${tokenDoc.token})...`);
    const verifyRes = await makeRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/user/${user._id}/verify/${tokenDoc.token}`,
      method: "GET",
      headers: { Accept: "application/json" },
    });
    console.log(`  Status: ${verifyRes.statusCode} | Response:`, verifyRes.data);
    if (verifyRes.statusCode !== 200) {
      throw new Error(`Verification failed with status ${verifyRes.statusCode}: ${JSON.stringify(verifyRes.data)}`);
    }
    console.log("  ✓ Verification API endpoint returned 200 OK");

    // Check DB status
    const verifiedUser = await User.findById(user._id);
    if (!verifiedUser.verified) {
      throw new Error("User was not marked verified in the database!");
    }
    console.log(`  ✓ Database updated: verified=${verifiedUser.verified}`);

    // Test duplicate verification call (e.g. StrictMode double mount or link re-click)
    console.log("\n    Testing duplicate verification call (idempotency)...");
    const duplicateVerifyRes = await makeRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/api/user/${user._id}/verify/${tokenDoc.token}`,
      method: "GET",
      headers: { Accept: "application/json" },
    });
    console.log(`    Status: ${duplicateVerifyRes.statusCode} | Response:`, duplicateVerifyRes.data);
    if (duplicateVerifyRes.statusCode !== 200 || !duplicateVerifyRes.data?.alreadyVerified) {
      throw new Error(`Expected 200 with alreadyVerified: true, got ${duplicateVerifyRes.statusCode}`);
    }
    console.log("    ✓ Duplicate verification call handled gracefully without error");

    // Test direct browser navigation with HTML Accept header
    console.log("\n    Testing direct browser navigation (GET /users/:id/verify/:token with HTML Accept header)...");
    const browserNavRes = await makeRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: `/users/${user._id}/verify/${tokenDoc.token}`,
      method: "GET",
      headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" },
    });
    console.log(`    Status: ${browserNavRes.statusCode} | Content-Type: ${browserNavRes.headers["content-type"]}`);
    if (browserNavRes.statusCode !== 200 || !browserNavRes.raw.includes("<!DOCTYPE html>")) {
      throw new Error("Direct browser navigation did not return HTML confirmation page");
    }
    console.log("    ✓ Browser navigation returned styled HTML page with auto-redirect");

    // 7. Login After Verification
    console.log("\n[7/8] Attempting login AFTER email verification...");
    const verifiedLogin = await makeRequest(
      {
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path: "/api/user/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: testEmail, password: testPassword }
    );
    console.log(`  Status: ${verifiedLogin.statusCode} | Response:`, verifiedLogin.data);
    if (verifiedLogin.statusCode !== 200) {
      throw new Error(`Login failed for verified user: ${JSON.stringify(verifiedLogin.data)}`);
    }

    const cookies = verifiedLogin.headers["set-cookie"] || [];
    const authCookie = cookies.find((c) => c.startsWith("authToken="));
    if (!authCookie) {
      throw new Error("Login succeeded but authToken cookie was not set in headers!");
    }
    console.log("  ✓ Login succeeded (200 OK) with authToken cookie set!");

    // 8. Test Authenticated User Profile Access
    console.log("\n[8/8] Verifying authenticated session via GET /api/user/profile...");
    const cookieHeader = authCookie.split(";")[0];
    const profileRes = await makeRequest({
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: "/api/user/profile",
      method: "GET",
      headers: { Cookie: cookieHeader },
    });
    console.log(`  Status: ${profileRes.statusCode} | Profile:`, profileRes.data);
    const returnedEmail = profileRes.data?.user?.email || profileRes.data?.email;
    const returnedUsername = profileRes.data?.user?.username || profileRes.data?.username;
    if (profileRes.statusCode !== 200 || returnedEmail !== testEmail) {
      throw new Error(`Profile check failed: ${JSON.stringify(profileRes.data)}`);
    }
    console.log(`  ✓ Successfully retrieved authenticated profile for @${returnedUsername}`);

    console.log("\n=================================================");
    console.log("   🎉 ALL EMAIL VERIFICATION TESTS PASSED!      ");
    console.log("=================================================\n");
  } finally {
    // Cleanup
    console.log("Cleaning up test database records...");
    try {
      await User.deleteOne({ email: testEmail });
      await Token.deleteMany({ userId: user?._id });
    } catch (e) {}
    server.close();
    await mongoose.disconnect();
    console.log("Disconnected and test server closed.");
  }
}

runTest().catch((err) => {
  console.error("\n❌ TEST FAILED:", err);
  process.exit(1);
});
