const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const TARGET_URL = "http://localhost:5173";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserTest() {
  console.log("==================================================");
  console.log("CHATORA — REPLY TO MESSAGES REAL CHROME E2E TEST");
  console.log("==================================================");

  // 0. Ensure seed data
  execSync("node server/scripts/seedE2EConversations.js", {
    cwd: path.join(__dirname, "../.."),
    stdio: "inherit",
  });

  // 1. Launch Chrome
  const chromeProcess = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    TARGET_URL,
  ]);

  chromeProcess.on("error", (err) => {
    console.error("Failed to start Chrome:", err);
    process.exit(1);
  });

  await sleep(1500);

  // 2. Discover WebSocket endpoint
  let targets;
  for (let i = 0; i < 10; i++) {
    try {
      const res = await fetch(`http://localhost:${PORT}/json`);
      targets = await res.json();
      if (targets && targets.length > 0) break;
    } catch (_) {
      await sleep(500);
    }
  }

  if (!targets || targets.length === 0) {
    console.error("Could not find Chrome debug target.");
    chromeProcess.kill();
    process.exit(1);
  }

  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;
  console.log("Connected to Chrome via CDP:", wsUrl);

  const ws = new WebSocket(wsUrl);

  let idCounter = 1;
  const pendingRequests = new Map();
  const consoleErrors = [];

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.consoleAPICalled" && msg.params?.type === "error") {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description).join(" "));
    }
    if (msg.id && pendingRequests.has(msg.id)) {
      const { resolve, reject } = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  await new Promise((resolve) => {
    ws.onopen = resolve;
  });

  const sendCommand = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  const evaluate = async (expression) => {
    const res = await sendCommand("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return res.result?.value;
  };

  await sendCommand("Page.enable");
  await sendCommand("Runtime.enable");
  await sendCommand("DOM.enable");

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [PASS ${total}] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL ${total}] ${message}`);
      chromeProcess.kill();
      process.exit(1);
    }
  }

  try {
    // Navigate to login
    console.log("\n[STEP 1] Authenticating as Alex...");
    await evaluate(`window.location.href = '${TARGET_URL}/login';`);
    await sleep(1500);

    await evaluate(`
      function setVal(el, val) {
        const lastVal = el.value;
        el.value = val;
        const tracker = el._valueTracker;
        if (tracker) tracker.setValue(lastVal);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
      const pwInput = document.getElementById('password') || document.querySelector('input[type="password"]');
      if (emailInput) setVal(emailInput, "alex_chat@test.com");
      if (pwInput) setVal(pwInput, "Password123!");
    `);

    await evaluate(`
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    `);

    await sleep(2500);

    const currentUrl = await evaluate(`window.location.href`);
    assert(
      currentUrl.includes("/chathome"),
      `Successfully navigated to /chathome (current: ${currentUrl})`
    );

    // Open conversation with Beth
    console.log("\n[STEP 2] Opening active conversation with Beth...");
    const openedBeth = await evaluate(`
      (() => {
        const rows = Array.from(document.querySelectorAll('ul li'));
        const bethRow = rows.find(r => r.textContent.includes('Beth'));
        if (bethRow) {
          bethRow.click();
          return true;
        }
        return false;
      })()
    `);
    assert(openedBeth, "Selected conversation partner Beth Designer");
    await sleep(1500);

    // Send an initial message to reply to
    console.log("\n[STEP 3] Sending initial message to establish reply target...");
    const initialText = "Did you check the new wireframes? " + Date.now();
    await evaluate(`
      (() => {
        function setVal(el, val) {
          const lastVal = el.value;
          el.value = val;
          const tracker = el._valueTracker;
          if (tracker) tracker.setValue(lastVal);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const input = document.querySelector('input[placeholder*="Type your message"]');
        if (input) {
          setVal(input, '${initialText}');
          const form = input.closest('form');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      })()
    `);
    await sleep(1000);

    const initialRendered = await evaluate(`
      (() => {
        return Array.from(document.querySelectorAll('p, div')).some(el => el.textContent && el.textContent.includes('${initialText}'));
      })()
    `);
    assert(initialRendered, "Initial message delivered and rendered in timeline");

    // Open message options menu
    console.log("\n[STEP 4] Testing message options menu and Reply button...");
    const openedMenu = await evaluate(`
      (() => {
        const allButtons = Array.from(document.querySelectorAll('button[aria-label="Message options"], button[title="Message options"]'));
        if (allButtons.length > 0) {
          const lastBtn = allButtons[allButtons.length - 1];
          lastBtn.click();
          return true;
        }
        return false;
      })()
    `);
    assert(openedMenu, "Clicked Message options menu button");
    await sleep(500);

    const replyOptionVisible = await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const replyBtn = buttons.find(b => b.textContent && b.textContent.includes('Reply'));
        return !!replyBtn;
      })()
    `);
    assert(replyOptionVisible, "Reply option is visible in message options dropdown");

    // Click Reply
    console.log("\n[STEP 5] Clicking Reply and verifying composer preview banner...");
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const replyBtn = buttons.find(b => b.textContent && b.textContent.includes('Reply'));
        if (replyBtn) replyBtn.click();
      })()
    `);
    await sleep(500);

    const replyBannerRendered = await evaluate(`
      (() => {
        const allText = document.body.innerText;
        const hasReplyingText = allText.includes('Replying to');
        const hasCancelBtn = !!document.querySelector('button[aria-label="Cancel reply"], button[title="Cancel reply"]');
        return hasReplyingText && hasCancelBtn;
      })()
    `);
    assert(replyBannerRendered, "Composer reply preview banner rendered with 'Replying to' and Cancel button");

    // Test Cancel Reply
    console.log("\n[STEP 6] Testing Cancel reply button...");
    await evaluate(`
      (() => {
        const cancelBtn = document.querySelector('button[aria-label="Cancel reply"], button[title="Cancel reply"]');
        if (cancelBtn) cancelBtn.click();
      })()
    `);
    await sleep(500);

    const replyBannerDismissed = await evaluate(`
      (() => {
        return !document.querySelector('button[aria-label="Cancel reply"]');
      })()
    `);
    assert(replyBannerDismissed, "Clicking cancel button cleanly removes reply preview banner");

    // Open Reply again and send a reply message
    console.log("\n[STEP 7] Sending message with replyTo...");
    await evaluate(`
      (() => {
        const allButtons = Array.from(document.querySelectorAll('button[aria-label="Message options"], button[title="Message options"]'));
        if (allButtons.length > 0) {
          allButtons[allButtons.length - 1].click();
        }
      })()
    `);
    await sleep(500);
    await evaluate(`
      (() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const replyBtn = buttons.find(b => b.textContent && b.textContent.includes('Reply'));
        if (replyBtn) replyBtn.click();
      })()
    `);
    await sleep(500);

    const replyText = "Yes, wireframes look pixel-perfect! 🎨";
    await evaluate(`
      (() => {
        function setVal(el, val) {
          const lastVal = el.value;
          el.value = val;
          const tracker = el._valueTracker;
          if (tracker) tracker.setValue(lastVal);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
        const input = document.querySelector('input[placeholder*="Type your message"]');
        if (input) {
          setVal(input, '${replyText}');
          const form = input.closest('form');
          if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      })()
    `);
    await sleep(1000);

    const replyDelivered = await evaluate(`
      (() => {
        return Array.from(document.querySelectorAll('p, div')).some(el => el.textContent && el.textContent.includes('${replyText}'));
      })()
    `);
    assert(replyDelivered, "Reply message successfully sent and rendered in chat");

    const quotedReplyRendered = await evaluate(`
      (() => {
        const quoteBlocks = Array.from(document.querySelectorAll('[aria-label="Jump to replied message"], [role="button"]'));
        return quoteBlocks.some(el => el.textContent && el.textContent.includes('Did you check the new wireframes'));
      })()
    `);
    assert(quotedReplyRendered, "Quoted reply block rendered inside reply message bubble");

    // Test clicking the quoted block to jump and highlight
    console.log("\n[STEP 8] Testing quote click, scroll, and highlight...");
    const quoteClicked = await evaluate(`
      (() => {
        const quoteBlocks = Array.from(document.querySelectorAll('[aria-label="Jump to replied message"]'));
        if (quoteBlocks.length > 0) {
          quoteBlocks[quoteBlocks.length - 1].click();
          return true;
        }
        return false;
      })()
    `);
    assert(quoteClicked, "Clicked quoted reply block");
    await sleep(300);

    const hasHighlight = await evaluate(`
      (() => {
        const highlightedEl = document.querySelector('.ring-indigo-500, [class*="ring-2"]');
        return !!highlightedEl;
      })()
    `);
    assert(hasHighlight, "Original message received temporary smooth scroll and highlight ring");

    // Test Mobile Viewport (390px)
    console.log("\n[STEP 9] Testing mobile viewport responsiveness at 390px...");
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(800);

    const overflowCheck = await evaluate(`
      (() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
          hasOverflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      })()
    `);
    assert(!overflowCheck.hasOverflow, `Zero horizontal overflow at 390px viewport (scrollWidth: ${overflowCheck.scrollWidth}px)`);

    // Console errors check
    console.log("\n[STEP 10] Checking browser console for uncaught errors...");
    assert(
      consoleErrors.length === 0,
      `Zero uncaught JavaScript console errors (found: ${consoleErrors.length})`
    );

    console.log("\n==================================================");
    console.log(`ALL BROWSER E2E TESTS PASSED: ${passed}/${total}`);
    console.log("==================================================");
  } catch (err) {
    console.error("Test failure:", err);
    chromeProcess.kill();
    process.exit(1);
  } finally {
    chromeProcess.kill();
  }
}

runBrowserTest().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
