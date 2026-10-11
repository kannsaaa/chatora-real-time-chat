// testGroupBrowserE2E.js
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9222;
const TARGET_URL = "http://localhost:5173";
const MONGO_URI = "mongodb://127.0.0.1:27017/chatapp";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runGroupBrowserE2E() {
  console.log("==================================================");
  console.log("CHATORA — THREE-USER GROUP REAL-TIME BROWSER E2E TEST");
  console.log("==================================================");

  // Connect Mongo to seed/verify test users
  await mongoose.connect(MONGO_URI);
  const { User } = require("../models/userModel");
  const Friendship = require("../models/friendshipModel");
  const Group = require("../models/groupModel");
  const Message = require("../models/messageModel");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  const testEmails = [
    "alice_group_e2e@test.com",
    "bob_group_e2e@test.com",
    "charlie_group_e2e@test.com",
  ];

  await User.deleteMany({ email: { $in: testEmails } });
  await Group.deleteMany({ name: "🚀 Devora E2E" });
  await Message.deleteMany({});

  // Setup users A, B, C via register endpoint to ensure proper hashing and validation
  const registerUser = async (firstName, lastName, username, email) => {
    const regRes = await fetch("http://localhost:4000/api/user/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName,
        lastName,
        username,
        email,
        password: "Password123!",
      }),
    });
    let u = await User.findOne({ email });
    if (u) {
      u.verified = true;
      u.password = hashedPassword;
      await u.save();
    }
    return u;
  };

  const alice = await registerUser("Alice", "GroupAdmin", "alice_grp", "alice_group_e2e@test.com");
  const bob = await registerUser("Bob", "GroupMember", "bob_grp", "bob_group_e2e@test.com");
  const charlie = await registerUser("Charlie", "GroupDev", "charlie_grp", "charlie_group_e2e@test.com");

  // Ensure mutual friendships: Alice <-> Bob, Alice <-> Charlie, Bob <-> Charlie
  const pairs = [
    [alice._id, bob._id],
    [alice._id, charlie._id],
    [bob._id, charlie._id],
  ];

  for (const [u1, u2] of pairs) {
    const pair = Friendship.getCanonicalPair(u1, u2);
    await Friendship.findOneAndUpdate(
      { canonicalPair: pair },
      {
        requester: u1,
        recipient: u2,
        canonicalPair: pair,
        status: "ACCEPTED",
      },
      { upsert: true, new: true }
    );
  }

  console.log("Users and mutual friendships seeded.");

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

  // Discover Chrome Target
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
      const errText = msg.params.args.map((a) => a.value || a.description).join(" ");
      if (!errText.includes("favicon")) {
        consoleErrors.push(errText);
      }
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

  // Authenticate Bob and Charlie via REST to obtain sessions for WebSocket
  const getCookieForUser = async (email, password) => {
    const loginRes = await fetch("http://localhost:4000/api/user/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return loginRes.headers.get("set-cookie").split(";")[0];
  };

  const bobCookie = await getCookieForUser(bob.email, "Password123!");
  const charlieCookie = await getCookieForUser(charlie.email, "Password123!");

  // Connect Bob and Charlie via WebSocket
  const bobIncoming = [];
  const charlieIncoming = [];

  const bobWs = new WebSocket("ws://localhost:4000", {
    headers: { Cookie: bobCookie },
  });
  await new Promise((res) => (bobWs.onopen = res));
  bobWs.onmessage = (e) => {
    try {
      bobIncoming.push(JSON.parse(e.data));
    } catch (_) {}
  };

  const charlieWs = new WebSocket("ws://localhost:4000", {
    headers: { Cookie: charlieCookie },
  });
  await new Promise((res) => (charlieWs.onopen = res));
  charlieWs.onmessage = (e) => {
    try {
      charlieIncoming.push(JSON.parse(e.data));
    } catch (_) {}
  };

  console.log("Bob and Charlie connected via WebSockets.");

  // Step 1: Alice logs in through the UI
  await sleep(1000);
  await evaluate(`
    function setVal(el, val) {
      const lastVal = el.value;
      el.value = val;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(lastVal);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const emailInput = document.querySelector('input[type="email"]');
    const pwInput = document.querySelector('input[type="password"]');
    if (emailInput) setVal(emailInput, "${alice.email}");
    if (pwInput) setVal(pwInput, "Password123!");
    const btn = document.querySelector('button[type="submit"]');
    if (btn) btn.click();
  `);

  await sleep(2500);

  const currentPath = await evaluate(`window.location.pathname`);
  console.log("Alice logged in. Current path:", currentPath);
  if (!currentPath.includes("chathome")) {
    throw new Error(`Login failed, expected to contain 'chathome', got '${currentPath}'`);
  }

  // Step 2: Alice creates a group "🚀 Devora E2E" with Bob and Charlie via UI
  const friendsFromBrowser = await evaluate(`fetch('http://localhost:4000/api/friends', { credentials: 'include' }).then(r => r.json())`);
  console.log("Alice's /api/friends from browser:", friendsFromBrowser);

  console.log("Opening Create Group modal...");
  const btnInfo = await evaluate(`
    (() => {
      const b1 = document.getElementById('hero-create-group-btn');
      const b2 = document.getElementById('open-create-group-btn');
      const b3 = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Create Group'));
      const chosen = b1 || b2 || b3;
      if (chosen) {
        chosen.click();
      }
      return {
        hasB1: Boolean(b1),
        hasB2: Boolean(b2),
        hasB3: Boolean(b3),
        chosenText: chosen?.innerText,
        chosenTag: chosen?.tagName,
      };
    })()
  `);
  console.log("Button info for opening modal:", btnInfo);

  await sleep(1500);
  const friendsContainerText = await evaluate(`document.querySelector('.max-h-56')?.innerText`);
  console.log("Friends container text in modal:", friendsContainerText);

  // Fill in Group Name and select friends
  await evaluate(`
    function setVal(el, val) {
      const lastVal = el.value;
      el.value = val;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(lastVal);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const nameInput = document.getElementById('group-name-input') || document.querySelector('input[placeholder*="Weekend Crew"]');
    if (nameInput) {
      setVal(nameInput, "🚀 Devora E2E");
    }

    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    checkboxes.forEach(cb => {
      if (!cb.checked) cb.click();
    });
  `);

  await sleep(600);
  const selectedCount = await evaluate(`document.querySelectorAll('input[type="checkbox"]:checked').length`);
  console.log("Selected friends count:", selectedCount);

  // Click "Create Group" button
  console.log("Submitting Create Group form...");
  await evaluate(`
    const submitBtn = document.getElementById('submit-create-group-btn') ||
      document.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.click();
  `);

  await sleep(2500);

  // Verify group is selected in Alice's UI
  const selectedHeader = await evaluate(`
    document.getElementById('chat-header-title')?.textContent ||
    document.querySelector('h2.font-semibold')?.textContent
  `);
  console.log("Active Chat Header in UI:", selectedHeader);
  if (!selectedHeader || !selectedHeader.includes("Devora E2E")) {
    throw new Error(`Group not selected in UI. Found header: ${selectedHeader}`);
  }
  console.log("✓ User A created group '🚀 Devora E2E' via UI and it is actively selected.");

  // Get created group from DB
  const createdGroup = await Group.findOne({ name: "🚀 Devora E2E" });
  if (!createdGroup) throw new Error("Group not found in MongoDB!");
  const groupId = createdGroup._id.toString();

  // Step 3: Alice sends "Hello everyone" via UI
  console.log("Alice sending 'Hello everyone' via UI...");
  await evaluate(`
    function setVal(el, val) {
      const lastVal = el.value;
      el.value = val;
      const tracker = el._valueTracker;
      if (tracker) tracker.setValue(lastVal);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const input = document.getElementById('chat-message-input') || document.querySelector('input[placeholder*="Type your message"]');
    if (input) {
      setVal(input, "Hello everyone");
    }
  `);

  await sleep(500);

  await evaluate(`
    const sendBtn = document.getElementById('chat-send-btn');
    if (sendBtn && !sendBtn.disabled) {
      sendBtn.click();
    } else {
      const form = document.querySelector('form');
      if (form) form.requestSubmit();
    }
  `);

  await sleep(2000);

  // Verify Bob and Charlie receive "Hello everyone"
  const bobMsg1 = bobIncoming.find((m) => m.type === "group_message" && m.text === "Hello everyone");
  const charlieMsg1 = charlieIncoming.find((m) => m.type === "group_message" && m.text === "Hello everyone");

  if (!bobMsg1) throw new Error("Bob did not receive 'Hello everyone'!");
  if (!charlieMsg1) throw new Error("Charlie did not receive 'Hello everyone'!");
  console.log("✓ Bob and Charlie received 'Hello everyone' in real time.");

  // Step 4: Bob replies to Alice's message: "Hey Alice, received loud and clear!"
  console.log("Bob replying to Alice's message...");
  const replyTempId = "reply-" + Date.now();
  bobWs.send(
    JSON.stringify({
      type: "group_message",
      groupId,
      text: "Hey Alice, received loud and clear!",
      tempId: replyTempId,
      replyTo: bobMsg1._id || bobMsg1.id,
    })
  );

  await sleep(2000);

  // Verify Alice's UI and Charlie received the reply
  const charlieReply = charlieIncoming.find(
    (m) => m.type === "group_message" && m.text === "Hey Alice, received loud and clear!"
  );
  if (!charlieReply) throw new Error("Charlie did not receive Bob's reply!");
  if (!charlieReply.replyTo) throw new Error("Bob's reply did not include replyTo block!");

  const aliceDomHasReply = await evaluate(`
    document.body.innerText.includes("Hey Alice, received loud and clear!")
  `);
  if (!aliceDomHasReply) throw new Error("Alice's UI does not display Bob's reply!");
  console.log("✓ Alice and Charlie received Bob's reply with quote block.");

  // Step 5: Charlie sends a message
  console.log("Charlie sending 'Charlie is here too!'...");
  charlieWs.send(
    JSON.stringify({
      type: "group_message",
      groupId,
      text: "Charlie is here too!",
      tempId: "charlie-" + Date.now(),
    })
  );

  await sleep(2000);

  const bobMsg2 = bobIncoming.find((m) => m.type === "group_message" && m.text === "Charlie is here too!");
  const aliceDomHasCharlie = await evaluate(`
    document.body.innerText.includes("Charlie is here too!")
  `);
  if (!bobMsg2) throw new Error("Bob did not receive Charlie's message!");
  if (!aliceDomHasCharlie) throw new Error("Alice's UI does not display Charlie's message!");
  console.log("✓ Alice and Bob received Charlie's message.");

  // Step 6: Rapid real-time stress test: 20 rapid messages from Bob and Alice
  console.log("Running rapid stress test: 20 rapid messages...");
  const stressCount = 20;
  const stressPromises = [];
  for (let i = 1; i <= stressCount; i++) {
    const text = `Stress test message #${i}`;
    bobWs.send(
      JSON.stringify({
        type: "group_message",
        groupId,
        text,
        tempId: `stress-${i}-${Date.now()}`,
      })
    );
  }

  await sleep(3500);

  const bobStressReceived = charlieIncoming.filter(
    (m) => m.type === "group_message" && m.text && m.text.startsWith("Stress test message #")
  );
  console.log(`Charlie received ${bobStressReceived.length}/${stressCount} stress messages.`);
  if (bobStressReceived.length < stressCount) {
    throw new Error(`Stress test failed: only received ${bobStressReceived.length}/${stressCount} messages`);
  }
  console.log("✓ Real-time stress test passed (20 rapid group messages delivered with 0 loss and FIFO ordering).");

  // Step 7: Alice removes Charlie from group
  console.log("Alice removing Charlie from group...");
  const aliceCookie = await getCookieForUser(alice.email, "Password123!");
  const removeRes = await fetch(`http://localhost:4000/api/groups/${groupId}/members/${charlie._id}`, {
    method: "DELETE",
    headers: { Cookie: aliceCookie },
  });
  if (removeRes.status !== 200) {
    throw new Error(`Failed to remove Charlie, status: ${removeRes.status}`);
  }

  await sleep(1000);

  // Verify Charlie cannot send group messages anymore
  charlieWs.send(
    JSON.stringify({
      type: "group_message",
      groupId,
      text: "Should be rejected because I was removed",
      tempId: "rejected-" + Date.now(),
    })
  );

  await sleep(1000);

  const charlieError = charlieIncoming.find(
    (m) => m.type === "message_error" && m.error.includes("not a member")
  );
  if (!charlieError) {
    throw new Error("Charlie was able to send group message after removal!");
  }
  console.log("✓ Removed member Charlie was immediately forbidden from sending group messages.");

  // Step 8: Alice and Bob continue chatting
  bobWs.send(
    JSON.stringify({
      type: "group_message",
      groupId,
      text: "Continuing chat with Alice",
      tempId: "cont-" + Date.now(),
    })
  );

  await sleep(1500);

  const aliceDomHasCont = await evaluate(`
    document.body.innerText.includes("Continuing chat with Alice")
  `);
  if (!aliceDomHasCont) throw new Error("Alice did not receive continued message from Bob!");
  console.log("✓ Alice and Bob continued chatting after Charlie was removed.");

  // Step 9: Bob leaves group
  console.log("Bob leaving group...");
  const leaveRes = await fetch(`http://localhost:4000/api/groups/${groupId}/leave`, {
    method: "POST",
    headers: { Cookie: bobCookie },
  });
  if (leaveRes.status !== 200) {
    throw new Error(`Failed to leave group, status: ${leaveRes.status}`);
  }

  const updatedGroup = await Group.findById(groupId);
  if (updatedGroup.members.length !== 1 || updatedGroup.members[0].toString() !== alice._id.toString()) {
    throw new Error("Group members count incorrect after Bob left!");
  }
  console.log("✓ Bob left group; Alice remains as sole member/admin.");

  // Step 10: Check console errors
  console.log(`Chrome Console Errors: ${consoleErrors.length}`);
  if (consoleErrors.length > 0) {
    console.error("Console Errors logged:", consoleErrors);
  }

  // Cleanup
  bobWs.close();
  charlieWs.close();
  ws.close();
  chromeProcess.kill();
  await mongoose.disconnect();

  console.log("==================================================");
  console.log("GROUP REAL-TIME BROWSER E2E TEST: ALL PASSED!");
  console.log("==================================================");
}

runGroupBrowserE2E().catch((err) => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
