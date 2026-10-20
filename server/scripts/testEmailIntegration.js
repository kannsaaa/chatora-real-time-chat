// server/scripts/testEmailIntegration.js
const assert = require("assert");
const sendEmail = require("../utils/sendEmail.js");

async function runTests() {
  console.log("=== Running Chatora Brevo Email API Integration Tests ===\n");
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

  // Helper to capture all console outputs
  function captureLogs() {
    const logs = [];
    const origLog = console.log;
    const origWarn = console.warn;
    const origError = console.error;

    console.log = (...args) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
      origLog(...args);
    };
    console.warn = (...args) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
      origWarn(...args);
    };
    console.error = (...args) => {
      logs.push(args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" "));
      origError(...args);
    };

    return {
      getLogs: () => logs.join("\n"),
      restore: () => {
        console.log = origLog;
        console.warn = origWarn;
        console.error = origError;
      },
    };
  }

  // 1. HTML template styling
  test("getVerificationHtml generates compliant Chatora styled template", () => {
    const testUrl = "http://localhost:5173/users/usr123/verify/tok456";
    const html = sendEmail.getVerificationHtml(testUrl);
    assert.ok(html.includes("Chatora"), "Contains Chatora title");
    assert.ok(html.includes("Verify Your Email Address"), "Contains verification header");
    assert.ok(html.includes(testUrl), "Contains verification URL");
    assert.ok(html.includes("Verify My Account ✨"), "Contains CTA button text");
    assert.ok(html.includes("This link will expire in 1 hour"), "Contains expiry note");
  });

  // 2. Development mode fallback when unconfigured
  await asyncTest("Development mode fallback when unconfigured returns simulated response", async () => {
    const prevEnv = { ...process.env };
    process.env.NODE_ENV = "development";
    process.env.BREVO_API_KEY = "your_brevo_api_key_here";
    process.env.BREVO_FROM_EMAIL = "your_brevo_from_email_here";

    const res = await sendEmail("dev@example.com", "Test Subject", "https://localhost:5173/verify/1");
    assert.strictEqual(res.simulated, true);
    assert.strictEqual(res.id, "dev-simulated-id");

    process.env = prevEnv;
  });

  // 3. Production mode error when unconfigured
  await asyncTest("Production mode throws error if Brevo credentials are unconfigured", async () => {
    const prevEnv = { ...process.env };
    process.env.NODE_ENV = "production";
    process.env.BREVO_API_KEY = "your_brevo_api_key_here";
    process.env.BREVO_FROM_EMAIL = "your_brevo_from_email_here";

    let errorThrown = false;
    try {
      await sendEmail("prod@example.com", "Test Subject", "https://localhost:5173/verify/1");
    } catch (err) {
      errorThrown = true;
      assert.ok(
        err.message.includes("Email delivery service is not configured"),
        `Expected configuration error, got: ${err.message}`
      );
    }
    assert.ok(errorThrown, "Should throw when credentials are not configured in production");

    process.env = prevEnv;
  });

  // 4. Mock Brevo HTTP request: verify endpoint, headers, sender, recipient, subject, text, HTML, and log sanitization
  await asyncTest(
    "Brevo API request verifies endpoint, api-key header, sender, recipient, subject, text, and html",
    async () => {
      const prevEnv = { ...process.env };
      const secretApiKey = "xkeysib-super-secret-production-key-999888";
      const senderEmail = "chatora-auth@example.com";
      const recipientEmail = "testuser@example.com";
      const testUrl = "https://chatora.onrender.com/users/u123/verify/tokenXYZ";

      process.env.BREVO_API_KEY = secretApiKey;
      process.env.BREVO_FROM_EMAIL = senderEmail;

      let calledUrl = null;
      let calledOptions = null;
      let calledBody = null;

      const originalFetch = global.fetch;
      const logCapture = captureLogs();

      global.fetch = async (url, options) => {
        calledUrl = url;
        calledOptions = options;
        calledBody = JSON.parse(options.body);

        return {
          ok: true,
          status: 201,
          statusText: "Created",
          json: async () => ({ messageId: "<brevo-test-msg-id-123@smtp-relay.brevo.com>" }),
          text: async () => JSON.stringify({ messageId: "<brevo-test-msg-id-123@smtp-relay.brevo.com>" }),
        };
      };

      try {
        const result = await sendEmail(recipientEmail, "Verify Email", testUrl);

        // 1. Correct Brevo endpoint
        assert.strictEqual(
          calledUrl,
          "https://api.brevo.com/v3/smtp/email",
          "Must call Brevo SMTP email endpoint"
        );
        assert.strictEqual(calledOptions.method, "POST", "Method must be POST");

        // 2. Correct API key header & Content-Type
        assert.strictEqual(
          calledOptions.headers["Content-Type"],
          "application/json",
          "Content-Type header must be application/json"
        );
        assert.strictEqual(
          calledOptions.headers["api-key"],
          secretApiKey,
          "api-key header must match process.env.BREVO_API_KEY"
        );

        // 3. Correct sender
        assert.deepStrictEqual(
          calledBody.sender,
          { name: "Chatora", email: senderEmail },
          "Sender must have name 'Chatora' and configured from-email"
        );

        // 4. Correct recipient
        assert.deepStrictEqual(
          calledBody.to,
          [{ email: recipientEmail }],
          "to field must contain recipient email"
        );

        // 5. Correct subject
        assert.strictEqual(calledBody.subject, "Verify Email", "Subject must match");

        // 6. Correct text content
        assert.ok(
          calledBody.textContent.includes("Welcome to Chatora!"),
          "textContent must include greeting"
        );
        assert.ok(
          calledBody.textContent.includes(testUrl),
          "textContent must include verification link"
        );

        // 7. Correct HTML content
        assert.ok(
          calledBody.htmlContent.includes("Verify Your Email Address"),
          "htmlContent must include verification heading"
        );
        assert.ok(
          calledBody.htmlContent.includes(testUrl),
          "htmlContent must include verification URL"
        );
        assert.ok(
          calledBody.htmlContent.includes("Chatora"),
          "htmlContent must include Chatora branding"
        );

        // Return value check
        assert.strictEqual(
          result.messageId,
          "<brevo-test-msg-id-123@smtp-relay.brevo.com>",
          "Returns Brevo response data"
        );

        // 8. No API key is exposed in logs
        const loggedOutput = logCapture.getLogs();
        assert.ok(
          !loggedOutput.includes(secretApiKey),
          "CRITICAL: Brevo API key must NEVER appear in console logs!"
        );
      } finally {
        global.fetch = originalFetch;
        logCapture.restore();
        process.env = prevEnv;
      }
    }
  );

  // 5. Mock Brevo non-2xx error handling: verifies server-side error logging without leaking secrets
  await asyncTest(
    "Brevo API error response (non-2xx) logs sanitized error and throws without leaking API key",
    async () => {
      const prevEnv = { ...process.env };
      const secretApiKey = "xkeysib-secret-error-test-key-54321";
      process.env.BREVO_API_KEY = secretApiKey;
      process.env.BREVO_FROM_EMAIL = "chatora-auth@example.com";

      const originalFetch = global.fetch;
      const logCapture = captureLogs();

      global.fetch = async () => {
        return {
          ok: false,
          status: 401,
          statusText: "Unauthorized",
          text: async () =>
            JSON.stringify({
              code: "unauthorized",
              message: "Key not found or account deactivated",
            }),
        };
      };

      let errorThrown = false;
      try {
        await sendEmail("target@example.com", "Verify Email", "https://localhost:5173/verify/abc");
      } catch (err) {
        errorThrown = true;
        assert.ok(
          err.message.includes("Key not found or account deactivated"),
          `Expected error message from Brevo, got: ${err.message}`
        );
        assert.ok(
          err.message.includes("401"),
          `Expected status 401 in error message, got: ${err.message}`
        );
      } finally {
        global.fetch = originalFetch;
        logCapture.restore();
        process.env = prevEnv;
      }

      assert.ok(errorThrown, "Should throw when Brevo returns non-2xx response");

      // Verify no API key in logs
      const loggedOutput = logCapture.getLogs();
      assert.ok(
        !loggedOutput.includes(secretApiKey),
        "CRITICAL: Brevo API key must NEVER appear in error logs!"
      );
    }
  );

  console.log(`\n========================================`);
  console.log(`Tests Completed: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
