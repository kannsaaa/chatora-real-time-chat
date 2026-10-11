const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const TARGET_URL = "http://localhost:5173";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runBrowserTest() {
  console.log("==================================================");
  console.log("CHATORA — REAL CHROME E2E AUTOMATION TEST SUITE");
  console.log("==================================================");

  // Reset and seed data for clean test run
  const { execSync } = require("child_process");
  execSync("node server/scripts/seedE2EConversations.js", { cwd: path.join(__dirname, "../.."), stdio: "inherit" });

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

  // Give Chrome a moment to open debug port
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

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
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

  const screenshot = async (filename) => {
    const res = await sendCommand("Page.captureScreenshot", { format: "png" });
    const buffer = Buffer.from(res.data, "base64");
    const outDir = path.join(__dirname, "../screenshots");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`[SCREENSHOT] Saved: ${outPath}`);
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
    // Navigate to /login or /
    console.log("\n[STEP 1] Navigating to login and authenticating...");
    await evaluate(`window.location.href = "http://localhost:5173/login"`);
    await sleep(1500);

    // Fill login form
    await evaluate(`
      function setVal(el, val) {
        const lastVal = el.value;
        el.value = val;
        const tracker = el._valueTracker;
        if (tracker) {
          tracker.setValue(lastVal);
        }
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const emailInput = document.getElementById('email') || document.querySelector('input[type="email"]');
      const pwInput = document.getElementById('password') || document.querySelector('input[type="password"]');
      if (emailInput) setVal(emailInput, "alex_chat@test.com");
      if (pwInput) setVal(pwInput, "Password123!");
    `);

    // Click submit
    await evaluate(`
      const submitBtn = document.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.click();
    `);
    await sleep(2500);

    // Check if on /chathome
    const currentUrl = await evaluate(`window.location.href`);
    assert(currentUrl.includes("/chathome"), `Successfully navigated to /chathome (current: ${currentUrl})`);

    // Verify conversation list items
    console.log("\n[STEP 2] Verifying conversation list...");
    const conversationsCount = await evaluate(`
      document.querySelectorAll('ul li').length
    `);
    assert(conversationsCount >= 2, `Conversation list rendered with ${conversationsCount} items`);

    const names = await evaluate(`
      Array.from(document.querySelectorAll('ul li p')).map(p => p.textContent.trim())
    `);
    console.log("Rendered contacts:", names);
    assert(names.some(n => n.includes("Beth") || n.includes("Designer")), "Beth is in the conversation list");
    assert(names.some(n => n.includes("Carl") || n.includes("Tester")), "Carl is in the conversation list");

    // Test Right-Click on Beth's conversation
    console.log("\n[STEP 3] Testing Desktop Right-Click context menu...");
    await evaluate(`
      const firstRow = document.querySelector('ul li');
      const rect = firstRow.getBoundingClientRect();
      firstRow.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: rect.left + 50,
        clientY: rect.top + 20
      }));
    `);
    await sleep(300);

    const menuVisible = await evaluate(`
      !!document.querySelector('[role="menu"]')
    `);
    assert(menuVisible, "Custom context menu opened on right-click");

    const menuItems = await evaluate(`
      Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"]')).map(btn => btn.textContent.trim())
    `);
    console.log("Context menu actions:", menuItems);
    assert(menuItems.some(item => item.includes("Pin conversation")), "Context menu contains 'Pin conversation'");
    assert(menuItems.some(item => item.includes("Mute notifications")), "Context menu contains 'Mute notifications'");
    assert(menuItems.some(item => item.includes("Mark as unread")), "Context menu contains 'Mark as unread'");
    assert(menuItems.some(item => item.includes("Delete conversation")), "Context menu contains 'Delete conversation'");

    // Test Escape key closes menu
    console.log("\n[STEP 4] Testing Escape key dismissal...");
    await evaluate(`
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await sleep(200);
    const menuAfterEscape = await evaluate(`
      !!document.querySelector('[role="menu"]')
    `);
    assert(!menuAfterEscape, "Escape key successfully closes context menu");

    // Test Action Button '⋮' on Carl's row
    console.log("\n[STEP 5] Testing '⋮' button and Pinning...");
    await evaluate(`
      const rows = Array.from(document.querySelectorAll('ul li'));
      const carlRow = rows.find(r => r.textContent.includes('Carl'));
      if (carlRow) {
        const dotsBtn = carlRow.querySelector('button[aria-label="Conversation options"]');
        if (dotsBtn) dotsBtn.click();
      }
    `);
    await sleep(300);

    const menuFromDots = await evaluate(`
      !!document.querySelector('[role="menu"]')
    `);
    assert(menuFromDots, "'⋮' button successfully opens context menu");

    // Click 'Pin conversation'
    await evaluate(`
      const pinBtn = Array.from(document.querySelectorAll('[role="menu"] [role="menuitem"]'))
        .find(btn => btn.textContent.includes('Pin conversation'));
      if (pinBtn) pinBtn.click();
    `);
    await sleep(1000);

    // Verify PINNED section header and pin icon appear
    const pinnedHeader = await evaluate(`
      Array.from(document.querySelectorAll('ul span')).some(s => s.textContent.includes('PINNED'))
    `);
    assert(pinnedHeader, "'PINNED' section header is now displayed at top of list");

    const hasPinIcon = await evaluate(`
      !!document.querySelector('li span[title="Pinned conversation"]')
    `);
    assert(hasPinIcon, "Pin icon indicator is rendered on the pinned conversation");

    // Test Muting notifications
    console.log("\n[STEP 6] Testing Mute notifications...");
    const step6Debug = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li'));
      const carlRow = rows.find(r => r.textContent.includes('Carl'));
      const dotsBtn = carlRow ? carlRow.querySelector('button[aria-label="Conversation options"]') : null;
      if (dotsBtn) dotsBtn.click();
      return {
        foundCarl: !!carlRow,
        foundDots: !!dotsBtn
      };
    })()`);
    console.log("Step 6 click dots:", step6Debug);
    await sleep(400);

    const step6Menu = await evaluate(`(() => {
      const menu = document.querySelector('[role="menu"]');
      const items = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).map(b => b.textContent.trim()) : [];
      const muteBtn = items.length ? Array.from(menu.querySelectorAll('[role="menuitem"]')).find(b => b.textContent.includes('Mute')) : null;
      if (muteBtn) muteBtn.click();
      return {
        menuOpen: !!menu,
        items,
        clickedMute: !!muteBtn
      };
    })()`);
    console.log("Step 6 menu state:", step6Menu);
    await sleep(1500);

    const checkMuteDebug = await evaluate(`(() => {
      const carlRow = Array.from(document.querySelectorAll('ul li')).find(r => r.textContent.includes('Carl'));
      const muteSpan = carlRow ? carlRow.querySelector('span[title="Notifications muted"]') : null;
      const allSpans = carlRow ? Array.from(carlRow.querySelectorAll('span')).map(s => s.getAttribute('title') || s.getAttribute('aria-label') || s.textContent) : [];
      return {
        hasMuteSpan: !!muteSpan,
        allSpans,
        carlHTML: carlRow ? carlRow.outerHTML.substring(0, 300) : ''
      };
    })()`);
    console.log("Step 6 mute check:", checkMuteDebug);
    assert(checkMuteDebug.hasMuteSpan, "Muted bell icon is rendered on the muted conversation");

    // Test Mark as Unread on Beth
    console.log("\n[STEP 7] Testing Mark as unread and auto-clearing upon open...");
    const step7Dots = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li'));
      const bethRow = rows.find(r => r.textContent.includes('Beth'));
      const dotsBtn = bethRow ? bethRow.querySelector('button[aria-label="Conversation options"]') : null;
      if (dotsBtn) dotsBtn.click();
      return {
        foundBeth: !!bethRow,
        foundDots: !!dotsBtn
      };
    })()`);
    console.log("Step 7 click dots:", step7Dots);
    await sleep(400);

    const step7Menu = await evaluate(`(() => {
      const menu = document.querySelector('[role="menu"]');
      const items = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).map(b => b.textContent.trim()) : [];
      const unreadBtn = items.length ? Array.from(menu.querySelectorAll('[role="menuitem"]')).find(b => b.textContent.includes('unread')) : null;
      if (unreadBtn) unreadBtn.click();
      return {
        menuOpen: !!menu,
        items,
        clickedUnread: !!unreadBtn
      };
    })()`);
    console.log("Step 7 menu state:", step7Menu);
    await sleep(1500);

    const checkUnreadDebug = await evaluate(`(() => {
      const bethRow = Array.from(document.querySelectorAll('ul li')).find(r => r.textContent.includes('Beth'));
      const unreadSpan = bethRow ? bethRow.querySelector('[aria-label="Unread message"]') : null;
      const allSpans = bethRow ? Array.from(bethRow.querySelectorAll('span')).map(s => s.getAttribute('title') || s.getAttribute('aria-label') || s.textContent) : [];
      return {
        hasUnreadSpan: !!unreadSpan,
        allSpans,
        bethHTML: bethRow ? bethRow.outerHTML.substring(0, 300) : ''
      };
    })()`);
    console.log("Step 7 unread check:", checkUnreadDebug);
    assert(checkUnreadDebug.hasUnreadSpan, "Unread indicator dot is rendered on Beth's conversation");

    // Open Beth's conversation -> unread should clear
    console.log("Opening Beth's conversation...");
    const clickResult = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li'));
      const bethRow = rows.find(r => r.textContent.includes('Beth'));
      if (bethRow) {
        bethRow.click();
        return { clicked: true, text: bethRow.textContent };
      }
      return { clicked: false };
    })()`);
    console.log("Beth click result:", clickResult);
    await sleep(2000);

    const afterOpenDebug = await evaluate(`(() => {
      const bethRow = Array.from(document.querySelectorAll('ul li')).find(r => r.textContent.includes('Beth'));
      const unreadSpan = bethRow ? bethRow.querySelector('[aria-label="Unread message"]') : null;
      const allSpans = bethRow ? Array.from(bethRow.querySelectorAll('span')).map(s => s.getAttribute('title') || s.getAttribute('aria-label') || s.textContent) : [];
      const topBarHeader = document.querySelector('h2')?.textContent;
      return {
        hasUnreadSpan: !!unreadSpan,
        allSpans,
        topBarHeader,
        bethHTML: bethRow ? bethRow.outerHTML.substring(0, 300) : ''
      };
    })()`);
    console.log("Step 7 after open debug:", afterOpenDebug);
    assert(!afterOpenDebug.hasUnreadSpan, "Opening Beth's chat automatically clears the unread indicator");

    // Test Delete Conversation Confirmation Modal
    console.log("\n[STEP 8] Testing Delete Conversation confirmation modal...");
    const step8Dots = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li'));
      const carlRow = rows.find(r => r.textContent.includes('Carl'));
      const dotsBtn = carlRow ? carlRow.querySelector('button[aria-label="Conversation options"]') : null;
      if (dotsBtn) dotsBtn.click();
      return {
        foundCarl: !!carlRow,
        foundDots: !!dotsBtn
      };
    })()`);
    console.log("Step 8 click dots:", step8Dots);
    await sleep(400);

    const step8Del = await evaluate(`(() => {
      const menu = document.querySelector('[role="menu"]');
      const delBtn = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).find(b => b.textContent.includes('Delete')) : null;
      if (delBtn) delBtn.click();
      return {
        menuOpen: !!menu,
        clickedDel: !!delBtn
      };
    })()`);
    console.log("Step 8 click delete:", step8Del);
    await sleep(600);

    const step8Modal = await evaluate(`(() => {
      const modal = document.querySelector('[role="dialog"]');
      const title = document.querySelector('#delete-modal-title')?.textContent?.trim();
      const desc = modal ? modal.querySelector('p')?.textContent?.trim() : '';
      return {
        modalOpen: !!modal,
        title,
        desc
      };
    })()`);
    console.log("Step 8 modal state:", step8Modal);

    assert(step8Modal.title === "Delete conversation?", "Delete confirmation modal title is 'Delete conversation?'");
    assert(
      step8Modal.desc.includes("This will remove the conversation from your Messages list") &&
      step8Modal.desc.includes("The other person will still have their copy of the conversation"),
      "Modal text accurately explains delete-for-me behavior"
    );

    // Test Cancel button
    await evaluate(`
      const cancelBtn = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
    `);
    await sleep(300);

    const carlStillPresent = await evaluate(`
      Array.from(document.querySelectorAll('ul li')).some(r => r.textContent.includes('Carl'))
    `);
    assert(carlStillPresent, "Clicking Cancel leaves conversation in list");

    // Open delete modal again and confirm delete
    console.log("\n[STEP 9] Confirming deletion and verifying immediate sidebar removal...");
    const step9Dots = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li'));
      const carlRow = rows.find(r => r.textContent.includes('Carl'));
      const dotsBtn = carlRow ? carlRow.querySelector('button[aria-label="Conversation options"]') : null;
      if (dotsBtn) dotsBtn.click();
      return {
        foundCarl: !!carlRow,
        foundDots: !!dotsBtn
      };
    })()`);
    console.log("Step 9 click dots:", step9Dots);
    await sleep(400);

    const step9Del = await evaluate(`(() => {
      const menu = document.querySelector('[role="menu"]');
      const delBtn = menu ? Array.from(menu.querySelectorAll('[role="menuitem"]')).find(b => b.textContent.includes('Delete')) : null;
      if (delBtn) delBtn.click();
      return {
        menuOpen: !!menu,
        clickedDel: !!delBtn
      };
    })()`);
    console.log("Step 9 click delete:", step9Del);
    await sleep(400);

    const step9Confirm = await evaluate(`(() => {
      const confirmDeleteBtn = Array.from(document.querySelectorAll('[role="dialog"] button'))
        .find(b => b.textContent.trim() === 'Delete');
      if (confirmDeleteBtn) confirmDeleteBtn.click();
      return {
        foundConfirmBtn: !!confirmDeleteBtn
      };
    })()`);
    console.log("Step 9 confirm click:", step9Confirm);
    await sleep(2000);

    const step9Check = await evaluate(`(() => {
      const rows = Array.from(document.querySelectorAll('ul li')).map(r => r.textContent);
      return {
        rows,
        hasCarl: rows.some(r => r.includes('Carl'))
      };
    })()`);
    console.log("Step 9 remaining rows:", step9Check);
    assert(!step9Check.hasCarl, "Carl's conversation was immediately removed from the sidebar");

    // Test Mobile viewport long-press
    console.log("\n[STEP 10] Testing Mobile Viewport (390px) & Long-Press...");
    await sendCommand("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true,
    });
    await sleep(500);

    // Verify no horizontal overflow
    const bodyScrollWidth = await evaluate(`document.body.scrollWidth`);
    assert(bodyScrollWidth <= 390, `No horizontal scrolling on mobile 390px width (scrollWidth: ${bodyScrollWidth}px)`);

    // Back to conversation list if chat was open
    await evaluate(`
      const backBtn = document.querySelector('button[aria-label="Back to conversations"]');
      if (backBtn) backBtn.click();
    `);
    await sleep(500);

    // Simulate touch long-press on Beth's row
    await evaluate(`
      const row = document.querySelector('ul li');
      if (row) {
        const rect = row.getBoundingClientRect();
        const touch = new Touch({
          identifier: Date.now(),
          target: row,
          clientX: rect.left + 50,
          clientY: rect.top + 20,
          pageX: rect.left + 50,
          pageY: rect.top + 20,
        });
        row.dispatchEvent(new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch],
          targetTouches: [touch],
          changedTouches: [touch]
        }));
      }
    `);

    // Wait for the 550ms long-press timer to fire
    await sleep(700);

    const mobileMenuOpen = await evaluate(`
      !!document.querySelector('[role="menu"]')
    `);
    assert(mobileMenuOpen, "Long-press (550ms hold) successfully triggered mobile context menu");

    // Close menu
    await evaluate(`
      const cancelBtn = Array.from(document.querySelectorAll('[role="menu"] button'))
        .find(b => b.textContent.includes('Cancel'));
      if (cancelBtn) cancelBtn.click();
      else window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    `);
    await sleep(300);

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
  console.error("Test failed:", err);
  process.exit(1);
});
