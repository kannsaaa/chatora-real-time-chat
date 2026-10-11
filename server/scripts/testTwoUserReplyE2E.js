const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const TARGET_URL = "http://localhost:5173";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runTwoUserTest() {
  console.log("==================================================");
  console.log("CHATORA — TWO-USER CONCURRENT REPLY BROWSER TEST");
  console.log("==================================================");

  // 0. Ensure seed data
  execSync("node server/scripts/seedE2EConversations.js", {
    cwd: path.join(__dirname, "../.."),
    stdio: "inherit",
  });

  // Launch Chrome
  const chromeProcess = spawn(CHROME_PATH, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `${TARGET_URL}/login`,
  ]);

  await sleep(1500);

  // Discover Target
  const res = await fetch(`http://localhost:${PORT}/json`);
  const targets = await res.json();
  const pageTarget = targets.find((t) => t.type === "page") || targets[0];
  const wsUrl = pageTarget.webSocketDebuggerUrl;

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

  await new Promise((resolve) => (ws.onopen = resolve));

  const sendCommand = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pendingRequests.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  const evaluate = async (expression) => {
    const r = await sendCommand("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return r.result?.value;
  };

  await sendCommand("Page.enable");
  await sendCommand("Runtime.enable");

  // Step 1: Connect WebSocket client directly for User B (Beth)
  // Get login cookie for Beth
  const loginRes = await fetch("http://localhost:4000/api/user/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "beth_chat@test.com", password: "Password123!" }),
  });
  const bethCookie = loginRes.headers.get("set-cookie").split(";")[0];
  const profileRes = await fetch("http://localhost:4000/api/user/profile", {
    headers: { Cookie: bethCookie },
  });
  const bethProfile = await profileRes.json();
  const bethId = bethProfile._id;

  const bethWs = new WebSocket("ws://localhost:4000", {
    headers: { Cookie: bethCookie },
  });
  await new Promise((resolve) => (bethWs.onopen = resolve));
  const bethIncomingMessages = [];
  bethWs.onmessage = (e) => {
    try {
      bethIncomingMessages.push(JSON.parse(e.data.toString()));
    } catch (_) {}
  };

  // Step 2: Log into Browser as User A (Alex)
  console.log("\n[STEP 1] Logging into browser as User A (Alex)...");
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
    const submitBtn = document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  `);
  await sleep(2500);

  // Open conversation with Beth
  await evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('ul li'));
    const bethRow = rows.find(r => r.textContent.includes('Beth'));
    if (bethRow) bethRow.click();
  })()`);
  await sleep(1200);

  // User A sends Message A in browser
  console.log("\n[STEP 2] User A sends Message A from browser UI...");
  const msgAText = "Message A: What is the launch timeline? " + Date.now();
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
        setVal(input, '${msgAText}');
        const form = input.closest('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    })()
  `);
  await sleep(1000);

  // Verify Beth received Message A
  const msgAOnBeth = bethIncomingMessages.find((m) => m.text && m.text.includes("What is the launch timeline?"));
  if (!msgAOnBeth) {
    throw new Error("User B did not receive Message A via WebSocket");
  }
  console.log("✓ User B immediately received Message A in real time");

  // Step 3: User B replies to Message A via WebSocket
  console.log("\n[STEP 3] User B replies to Message A via WebSocket...");
  const msgBText = "Reply B: We launch tomorrow morning! 🚀";
  bethWs.send(
    JSON.stringify({
      recipient: msgAOnBeth.sender,
      text: msgBText,
      replyTo: msgAOnBeth._id,
      tempId: "beth-reply-" + Date.now(),
    })
  );
  await sleep(1500);

  // Step 4: Verify User A (in the browser) immediately received User B's reply with quoted Message A
  console.log("\n[STEP 4] Verifying User A browser timeline displays quoted Message A and User B's reply...");
  const replyRenderedOnA = await evaluate(`
    (() => {
      return Array.from(document.querySelectorAll('p, div')).some(el => el.textContent && el.textContent.includes('We launch tomorrow morning!'));
    })()
  `);
  if (!replyRenderedOnA) {
    throw new Error("User A browser did not render User B's reply in real time");
  }
  console.log("✓ User A browser immediately rendered User B's reply");

  const quoteRenderedOnA = await evaluate(`
    (() => {
      const quotes = Array.from(document.querySelectorAll('[aria-label="Jump to replied message"]'));
      return quotes.some(q => q.textContent && q.textContent.includes('What is the launch timeline?'));
    })()
  `);
  if (!quoteRenderedOnA) {
    throw new Error("User A browser did not render quoted Message A inside the reply bubble");
  }
  console.log("✓ User A browser rendered compact quote of Message A inside the reply bubble");

  // Step 5: User A in browser replies to User B's reply (nested reply)
  console.log("\n[STEP 5] User A in browser replies to User B's reply (nested reference)...");
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

  const msgCText = "Message C: Sounds like a plan! Let us celebrate tonight. 🎉";
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
        setVal(input, '${msgCText}');
        const form = input.closest('form');
        if (form) form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      }
    })()
  `);
  await sleep(1500);

  // Step 6: Verify User B received Message C with replyTo referencing Message B
  const msgCOnBeth = bethIncomingMessages.find((m) => m.text && m.text.includes("Sounds like a plan!"));
  if (!msgCOnBeth) {
    throw new Error("User B did not receive Message C via WebSocket");
  }
  if (!msgCOnBeth.replyTo || !msgCOnBeth.replyTo.text.includes("We launch tomorrow morning!")) {
    throw new Error("User B's incoming message does not reference Message B");
  }
  console.log("✓ User B received Message C correctly referencing Message B");

  // Step 7: Verify single-level quote rendering in browser (NO recursive quotes)
  console.log("\n[STEP 7] Verifying single-level quote rendering (NO recursive quotes in UI)...");
  const nestedCheck = await evaluate(`
    (() => {
      // Find all quote blocks inside message bubbles
      const quoteBlocks = Array.from(document.querySelectorAll('[aria-label="Jump to replied message"]'));
      // Ensure none of the quote blocks contains another quote block inside it
      const hasRecursiveNesting = quoteBlocks.some(q => q.querySelector('[aria-label="Jump to replied message"]') !== null);
      return { count: quoteBlocks.length, hasRecursiveNesting };
    })()
  `);
  if (nestedCheck.hasRecursiveNesting) {
    throw new Error("Nested quote recursion detected in DOM!");
  }
  console.log(`✓ Single-level quote confirmed across all ${nestedCheck.count} rendered quotes (no recursion)`);

  // Step 8: Check console errors
  console.log("\n[STEP 8] Checking console errors...");
  if (consoleErrors.length > 0) {
    throw new Error(`Console errors recorded: ${JSON.stringify(consoleErrors)}`);
  }
  console.log("✓ Zero console errors during real-time 2-user reply interactions");

  bethWs.close();
  chromeProcess.kill();
  console.log("\n==================================================");
  console.log("TWO-USER REAL-TIME CONCURRENT REPLY TEST PASSED: 100%");
  console.log("==================================================");
}

runTwoUserTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
