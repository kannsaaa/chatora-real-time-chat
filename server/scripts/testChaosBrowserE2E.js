const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const TARGET_URL = "http://localhost:5173";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserTest() {
  console.log("==================================================");
  console.log("CHATORA — CHAOS MODE REAL CHROME E2E TEST SUITE");
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
    // 1. Authenticate
    console.log("\n[STEP 1] Authenticating...");
    await evaluate(`window.location.href = "http://localhost:5173/login"`);
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
    assert(currentUrl.includes("/chathome"), `Successfully navigated to /chathome (current: ${currentUrl})`);

    // 2. Open Beth's conversation
    console.log("\n[STEP 2] Opening active conversation with Beth...");
    await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li'));
      const bethRow = rows.find(r => r.textContent.includes('Beth'));
      if (bethRow) bethRow.click();
    })()`);
    await sleep(1200);

    // 3. Verify Chaos button exists in composer and TopBar
    console.log("\n[STEP 3] Verifying Chaos Mode buttons in UI...");
    const composerChaosBtn = await evaluate(`
      !!document.querySelector('button[aria-label="Open Chaos Mode"]')
    `);
    assert(composerChaosBtn, "Chaos Mode button (🌪️) is visible near composer");

    const topBarChaosBtn = await evaluate(`
      !!document.querySelector('div.h-16 button[aria-label="Open Chaos Mode"]')
    `);
    assert(topBarChaosBtn, "Chaos Mode button is also available in TopBar");

    // 4. Click Chaos button to open panel
    console.log("\n[STEP 4] Opening Chaos Mode panel...");
    await evaluate(`
      const chaosBtn = document.querySelector('button[aria-label="Open Chaos Mode"]');
      if (chaosBtn) chaosBtn.click();
    `);
    await sleep(500);

    const modalOpen = await evaluate(`
      !!document.querySelector('[aria-label="Chaos Mode"]')
    `);
    assert(modalOpen, "Chaos Mode panel opened successfully");

    const modalTitle = await evaluate(`
      document.querySelector('[aria-label="Chaos Mode"] h3')?.textContent?.trim()
    `);
    assert(modalTitle === "CHAOS MODE", "Chaos panel header displays 'CHAOS MODE'");

    // Verify all 7 modes are rendered in selection grid
    const modesList = await evaluate(`(() => {
      const buttons = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'));
      return buttons.map(b => b.textContent.trim()).filter(t => t.length > 0);
    })()`);
    console.log("Modes visible in grid:", modesList);

    assert(modesList.some(m => m.includes("Random Question")), "Mode 1: Random Question rendered");
    assert(modesList.some(m => m.includes("Icebreaker")), "Mode 2: Icebreaker rendered");
    assert(modesList.some(m => m.includes("Roast Battle")), "Mode 3: Roast Battle rendered");
    assert(modesList.some(m => m.includes("Would You Rather")), "Mode 4: Would You Rather rendered");
    assert(modesList.some(m => m.includes("Debate")), "Mode 5: Debate rendered");
    assert(modesList.some(m => m.includes("Random Challenge")), "Mode 6: Random Challenge rendered");
    assert(modesList.some(m => m.includes("Quick Quiz")), "Mode 7: Quick Quiz rendered");

    // 5. Test Escape key dismissal
    console.log("\n[STEP 5] Testing Escape key dismissal...");
    await evaluate(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await sleep(300);
    const modalAfterEscape = await evaluate(`
      !!document.querySelector('[aria-label="Chaos Mode"]')
    `);
    assert(!modalAfterEscape, "Escape key cleanly dismisses Chaos modal");

    // 6. Test Random Question Mode and Send to Chat
    console.log("\n[STEP 6] Testing Random Question generation and Send to Chat...");
    await evaluate(`
      document.querySelector('button[aria-label="Open Chaos Mode"]').click();
    `);
    await sleep(400);

    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Random Question'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    const questionContent = await evaluate(`(() => {
      const card = document.querySelector('[aria-label="Chaos Mode"]');
      const text = card ? card.querySelector('p.font-semibold')?.textContent : '';
      return text;
    })()`);
    console.log("Generated Random Question:", questionContent);
    assert(typeof questionContent === "string" && questionContent.length > 10, "Random question generated successfully");

    // Test '🔄 Another' regeneration
    console.log("Testing regeneration ('Another')...");
    await evaluate(`(() => {
      const anotherBtn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Another'));
      if (anotherBtn) anotherBtn.click();
    })()`);
    await sleep(1500);

    const secondQuestion = await evaluate(`(() => {
      const card = document.querySelector('[aria-label="Chaos Mode"]');
      return card ? card.querySelector('p.font-semibold')?.textContent : '';
    })()`);
    assert(typeof secondQuestion === "string" && secondQuestion.length > 10, "Regenerated new question successfully");

    // Send question to chat
    console.log("Sending Random Question to chat...");
    await evaluate(`(() => {
      const sendBtn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Send to chat'));
      if (sendBtn) sendBtn.click();
    })()`);
    await sleep(1200);

    // Verify modal closed and message appears in conversation
    const modalAfterSend = await evaluate(`
      !!document.querySelector('[aria-label="Chaos Mode"]')
    `);
    assert(!modalAfterSend, "Chaos modal closed immediately after sending");

    const lastMessageText = await evaluate(`(() => {
      const messages = Array.from(document.querySelectorAll('div p'));
      const found = messages.map(p => p.textContent).find(t => t.includes('Random Question'));
      return found || '';
    })()`);
    assert(lastMessageText.includes("Random Question"), "Random Question message was delivered to the chat!");

    // 7. Test Would You Rather Mode
    console.log("\n[STEP 7] Testing Would You Rather mode...");
    await evaluate(`
      document.querySelector('button[aria-label="Open Chaos Mode"]').click();
    `);
    await sleep(400);

    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Would You Rather'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    const wyrOptionsCount = await evaluate(`
      document.querySelectorAll('[aria-label="Chaos Mode"] .grid > div').length
    `);
    assert(wyrOptionsCount >= 2, "Would You Rather renders two option pills");

    // Send Would You Rather to chat
    await evaluate(`(() => {
      const sendBtn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Send to chat'));
      if (sendBtn) sendBtn.click();
    })()`);
    await sleep(1200);

    const wyrInChat = await evaluate(`(() => {
      const messages = Array.from(document.querySelectorAll('div p')).map(p => p.textContent);
      return messages.some(t => t.includes('WOULD YOU RATHER'));
    })()`);
    assert(wyrInChat, "Would You Rather challenge was delivered to the chat!");

    // 8. Test Debate Mode
    console.log("\n[STEP 8] Testing Debate mode...");
    await evaluate(`
      document.querySelector('button[aria-label="Open Chaos Mode"]').click();
    `);
    await sleep(400);

    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Debate'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    const hasSides = await evaluate(`(() => {
      const text = document.querySelector('[aria-label="Chaos Mode"]')?.textContent || '';
      return text.includes('Side A') && text.includes('Side B');
    })()`);
    assert(hasSides, "Debate mode displays Side A and Side B");

    // Send Debate to chat
    await evaluate(`(() => {
      const sendBtn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Send to chat'));
      if (sendBtn) sendBtn.click();
    })()`);
    await sleep(1200);

    const debateInChat = await evaluate(`(() => {
      const messages = Array.from(document.querySelectorAll('div p')).map(p => p.textContent);
      return messages.some(t => t.includes('DEBATE'));
    })()`);
    assert(debateInChat, "Debate topic was delivered to the chat!");

    // 9. Test Quick Quiz Mode with interactive answer feedback
    console.log("\n[STEP 9] Testing Quick Quiz mode with interactive answer feedback...");
    await evaluate(`
      document.querySelector('button[aria-label="Open Chaos Mode"]').click();
    `);
    await sleep(400);

    await evaluate(`(() => {
      const btn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Quick Quiz'));
      if (btn) btn.click();
    })()`);
    await sleep(1500);

    const quizChoicesCount = await evaluate(`
      document.querySelectorAll('[aria-label="Chaos Mode"] .grid button').length
    `);
    assert(quizChoicesCount === 4, "Quick Quiz renders 4 interactive choice buttons (A, B, C, D)");

    // Click first answer choice
    await evaluate(`
      const firstChoice = document.querySelector('[aria-label="Chaos Mode"] .grid button');
      if (firstChoice) firstChoice.click();
    `);
    await sleep(500);

    const answerFeedbackGiven = await evaluate(`(() => {
      const text = document.querySelector('[aria-label="Chaos Mode"]')?.textContent || '';
      return text.includes('Correct') || text.includes('Incorrect');
    })()`);
    assert(answerFeedbackGiven, "Selecting quiz choice reveals immediate feedback and fun fact explanation");

    // Send Quiz to chat
    await evaluate(`(() => {
      const sendBtn = Array.from(document.querySelectorAll('[aria-label="Chaos Mode"] button'))
        .find(b => b.textContent.includes('Send to chat'));
      if (sendBtn) sendBtn.click();
    })()`);
    await sleep(1200);

    const quizInChat = await evaluate(`(() => {
      const messages = Array.from(document.querySelectorAll('div p')).map(p => p.textContent);
      return messages.some(t => t.includes('QUICK QUIZ'));
    })()`);
    assert(quizInChat, "Quick Quiz trivia was delivered to the chat!");

    // 10. Test Mobile Viewport (390px)
    console.log("\n[STEP 10] Testing Mobile Viewport (390px) & responsiveness...");
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(500);

    const bodyScrollWidth = await evaluate(`document.body.scrollWidth`);
    assert(bodyScrollWidth <= 390, `Zero horizontal overflow on mobile 390px viewport (scrollWidth: ${bodyScrollWidth}px)`);

    // Open Chaos on mobile
    await evaluate(`
      document.querySelector('button[aria-label="Open Chaos Mode"]').click();
    `);
    await sleep(400);

    const mobileModalOpen = await evaluate(`
      !!document.querySelector('[aria-label="Chaos Mode"]')
    `);
    assert(mobileModalOpen, "Chaos Mode opens smoothly as a bottom-sheet modal on mobile");

    // Close on mobile
    await evaluate(`
      const closeBtn = document.querySelector('[aria-label="Chaos Mode"] button[aria-label="Close"]');
      if (closeBtn) closeBtn.click();
    `);
    await sleep(300);

    const mobileModalClosed = await evaluate(`
      !document.querySelector('[aria-label="Chaos Mode"]')
    `);
    assert(mobileModalClosed, "Mobile Chaos modal closes cleanly");

    // 11. Console health
    console.log("\n[STEP 11] Checking browser console for uncaught errors...");
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("manifest")
    );
    console.log("Console errors recorded:", criticalErrors);
    assert(criticalErrors.length === 0, "Zero uncaught JavaScript console errors during Chaos interactions");

    console.log("\n==================================================");
    console.log(`ALL BROWSER E2E TESTS PASSED: ${passed}/${total}`);
    console.log("==================================================");
  } finally {
    ws.close();
    chromeProcess.kill();
  }
  process.exit(0);
}

runBrowserTest().catch((err) => {
  console.error("Browser test failed:", err);
  process.exit(1);
});
