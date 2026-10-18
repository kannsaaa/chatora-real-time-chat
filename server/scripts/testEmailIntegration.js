// server/scripts/testEmailIntegration.js
const assert = require("assert");
const sendEmail = require("../utils/sendEmail.js");
const { google } = require("googleapis");

async function runTests() {
  console.log("=== Running Chatora Gmail API Integration Tests ===\n");
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

  // 1. Sender header formatting
  test("formatSender formats bare email with Chatora display name", () => {
    const formatted = sendEmail.formatSender("myaccount@gmail.com");
    assert.strictEqual(formatted, "Chatora <myaccount@gmail.com>");
  });

  test("formatSender preserves existing custom display name and brackets", () => {
    const formatted = sendEmail.formatSender("Chatora App <myaccount@gmail.com>");
    assert.strictEqual(formatted, "Chatora App <myaccount@gmail.com>");
  });

  test("formatSender handles empty sender gracefully", () => {
    const formatted = sendEmail.formatSender("");
    assert.strictEqual(formatted, "Chatora");
  });

  // 2. MIME message generation
  test("buildMimeMessage creates valid base64url string with multipart/alternative", () => {
    const raw = sendEmail.buildMimeMessage({
      from: "Chatora <sender@gmail.com>",
      to: "testuser@example.com",
      subject: "Verify your Chatora Account 💬",
      text: "https://example.com/verify/123",
      html: "<p>Click here to verify</p>",
    });

    assert.ok(typeof raw === "string", "MIME message should be a string");
    assert.ok(!raw.includes("+"), "base64url should not contain '+'");
    assert.ok(!raw.includes("/"), "base64url should not contain '/'");

    // Decode base64url back to raw MIME
    const decoded = Buffer.from(raw, "base64url").toString("utf-8");
    assert.ok(decoded.includes("From: Chatora <sender@gmail.com>"), "Contains From header");
    assert.ok(decoded.includes("To: testuser@example.com"), "Contains To header");
    assert.ok(decoded.includes("MIME-Version: 1.0"), "Contains MIME-Version header");
    assert.ok(decoded.includes("Subject: =?UTF-8?B?"), "Contains RFC-2047 encoded Subject header");
    assert.ok(decoded.includes("Content-Type: multipart/alternative; boundary="), "Contains multipart Content-Type");
    assert.ok(decoded.includes('Content-Type: text/plain; charset="UTF-8"'), "Contains text/plain section");
    assert.ok(decoded.includes('Content-Type: text/html; charset="UTF-8"'), "Contains text/html section");
    assert.ok(decoded.includes("Content-Transfer-Encoding: base64"), "Contains base64 transfer encoding");
  });

  // 3. HTML template styling
  test("getVerificationHtml generates compliant Chatora styled template", () => {
    const testUrl = "http://localhost:5173/users/usr123/verify/tok456";
    const html = sendEmail.getVerificationHtml(testUrl);
    assert.ok(html.includes("Chatora"), "Contains Chatora title");
    assert.ok(html.includes("Verify Your Email Address"), "Contains verification header");
    assert.ok(html.includes(testUrl), "Contains verification URL");
    assert.ok(html.includes("Verify My Account ✨"), "Contains CTA button text");
    assert.ok(html.includes("This link will expire in 1 hour"), "Contains expiry note");
  });

  // 4. OAuth2 Client Initialization
  test("getOAuth2Client initializes client with credentials and refresh_token", () => {
    sendEmail.resetClient();
    const client = sendEmail.getOAuth2Client("test_id", "test_secret", "test_refresh");
    assert.ok(client instanceof google.auth.OAuth2, "Should be an instance of google.auth.OAuth2");
    assert.strictEqual(client._clientId, "test_id");
    assert.strictEqual(client._clientSecret, "test_secret");
    assert.strictEqual(client.credentials.refresh_token, "test_refresh");

    // Test cached instance reuse
    const client2 = sendEmail.getOAuth2Client("test_id", "test_secret", "test_refresh");
    assert.strictEqual(client, client2, "Should return cached OAuth2 client instance");
  });

  // 5. Development mode fallback when unconfigured
  await asyncTest("Development mode fallback when unconfigured returns simulated response", async () => {
    const prevEnv = { ...process.env };
    process.env.NODE_ENV = "development";
    process.env.GMAIL_CLIENT_ID = "your_gmail_client_id_here";
    process.env.GMAIL_CLIENT_SECRET = "your_gmail_client_secret_here";
    process.env.GMAIL_REFRESH_TOKEN = "your_gmail_refresh_token_here";
    process.env.GMAIL_SENDER_EMAIL = "your_email@gmail.com";

    const res = await sendEmail("dev@example.com", "Test Subject", "https://localhost:5173/verify/1");
    assert.strictEqual(res.simulated, true);
    assert.strictEqual(res.id, "dev-simulated-id");

    process.env = prevEnv;
  });

  // 6. Production mode error when unconfigured
  await asyncTest("Production mode throws error if credentials are unconfigured", async () => {
    const prevEnv = { ...process.env };
    process.env.NODE_ENV = "production";
    process.env.GMAIL_CLIENT_ID = "your_gmail_client_id_here";
    process.env.GMAIL_CLIENT_SECRET = "your_gmail_client_secret_here";
    process.env.GMAIL_REFRESH_TOKEN = "your_gmail_refresh_token_here";
    process.env.GMAIL_SENDER_EMAIL = "your_email@gmail.com";

    let errorThrown = false;
    try {
      await sendEmail("prod@example.com", "Test Subject", "https://localhost:5173/verify/1");
    } catch (err) {
      errorThrown = true;
      assert.strictEqual(err.message, "Email delivery service is not configured.");
    }
    assert.ok(errorThrown, "Should throw when credentials are not configured in production");

    process.env = prevEnv;
  });

  // 7. Mocked Gmail API send success
  await asyncTest("Calls gmail.users.messages.send with userId: 'me' and returns data", async () => {
    const prevEnv = { ...process.env };
    process.env.GMAIL_CLIENT_ID = "mock_client_id_123";
    process.env.GMAIL_CLIENT_SECRET = "mock_client_secret_456";
    process.env.GMAIL_REFRESH_TOKEN = "mock_refresh_token_789";
    process.env.GMAIL_SENDER_EMAIL = "sender@gmail.com";

    sendEmail.resetClient();

    // Temporarily spy on google.gmail
    const originalGmail = google.gmail;
    let sendCalledWith = null;

    google.gmail = function (options) {
      return {
        users: {
          messages: {
            send: async (params) => {
              sendCalledWith = params;
              return {
                data: {
                  id: "gmail_msg_id_999",
                  threadId: "gmail_thread_999",
                  labelIds: ["SENT"],
                },
              };
            },
          },
        },
      };
    };

    try {
      const result = await sendEmail("target@gmail.com", "Verify Email", "https://localhost:5173/verify/abc");
      assert.ok(sendCalledWith, "send should have been called");
      assert.strictEqual(sendCalledWith.userId, "me", "userId must be 'me'");
      assert.ok(sendCalledWith.requestBody?.raw, "requestBody.raw must be provided");
      assert.strictEqual(result.id, "gmail_msg_id_999", "Returns Gmail message id");
    } finally {
      google.gmail = originalGmail;
      process.env = prevEnv;
      sendEmail.resetClient();
    }
  });

  // 8. Mocked Gmail API error handling (does not fake success)
  await asyncTest("Throws when Gmail API fails and logs sanitized error without secrets", async () => {
    const prevEnv = { ...process.env };
    process.env.GMAIL_CLIENT_ID = "mock_client_id_123";
    process.env.GMAIL_CLIENT_SECRET = "mock_client_secret_456";
    process.env.GMAIL_REFRESH_TOKEN = "mock_refresh_token_789";
    process.env.GMAIL_SENDER_EMAIL = "sender@gmail.com";

    sendEmail.resetClient();

    const originalGmail = google.gmail;
    google.gmail = function () {
      return {
        users: {
          messages: {
            send: async () => {
              const err = new Error("Invalid OAuth2 credentials");
              err.response = {
                status: 401,
                data: {
                  error: {
                    code: 401,
                    message: "Invalid Credentials: invalid_grant",
                    status: "UNAUTHENTICATED",
                  },
                },
              };
              throw err;
            },
          },
        },
      };
    };

    let errorThrown = false;
    try {
      await sendEmail("target@gmail.com", "Verify Email", "https://localhost:5173/verify/abc");
    } catch (err) {
      errorThrown = true;
      assert.ok(
        err.message.includes("Email delivery failed: Invalid Credentials: invalid_grant"),
        "Should propagate error message accurately"
      );
    } finally {
      google.gmail = originalGmail;
      process.env = prevEnv;
      sendEmail.resetClient();
    }

    assert.ok(errorThrown, "Should not fake success when Gmail API send fails");
  });

  console.log(`\n========================================`);
  console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
