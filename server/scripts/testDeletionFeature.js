const mongoose = require("mongoose");
const WebSocket = require("ws");

const BASE_URL = "http://localhost:4000/api/user";
const WS_URL = "ws://localhost:4000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("==================================================");
  console.log("CHATORA — MESSAGE & CONVERSATION DELETION TEST SUITE");
  console.log("==================================================");

  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");
  const messagesCollection = mongoose.connection.db.collection("messages");

  // Step 0: Ensure two test accounts exist
  const emailA = "delete_test_user_a@test.com";
  const emailB = "delete_test_user_b@test.com";
  const emailC = "delete_test_user_c@test.com";

  await usersCollection.deleteMany({
    email: { $in: [emailA, emailB, emailC] },
  });

  console.log("\n[SETUP] Creating test users A, B, and C...");
  const registerUser = async (firstName, lastName, username, email) => {
    const res = await fetch(`${BASE_URL}/register`, {
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
    if (res.status !== 201) {
      throw new Error(`Failed to register ${email}: status ${res.status}`);
    }
    await usersCollection.updateOne({ email }, { $set: { verified: true } });
  };

  await registerUser("UserA", "Alpha", "usera_test", emailA);
  await registerUser("UserB", "Beta", "userb_test", emailB);
  await registerUser("UserC", "Charlie", "userc_test", emailC);

  const loginUser = async (email) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    if (res.status !== 200) {
      throw new Error(`Login failed for ${email}`);
    }
    const rawCookie = res.headers.get("set-cookie");
    const cookie = rawCookie ? rawCookie.split(";")[0] : "";
    const profileRes = await fetch(`${BASE_URL}/profile`, {
      headers: { Cookie: cookie },
    });
    const profile = await profileRes.json();
    return { cookie, profile };
  };

  const userA = await loginUser(emailA);
  const userB = await loginUser(emailB);
  const userC = await loginUser(emailC);

  console.log(`User A ID: ${userA.profile._id}`);
  console.log(`User B ID: ${userB.profile._id}`);
  console.log(`User C ID: ${userC.profile._id}`);

  // Clean existing messages between test users
  await messagesCollection.deleteMany({
    $or: [
      { sender: new mongoose.Types.ObjectId(userA.profile._id) },
      { recipient: new mongoose.Types.ObjectId(userA.profile._id) },
      { sender: new mongoose.Types.ObjectId(userB.profile._id) },
      { recipient: new mongoose.Types.ObjectId(userB.profile._id) },
    ],
  });

  // Ensure User A and User B are friends (new friendship requirement)
  const friendshipsCollection = mongoose.connection.db.collection("friendships");
  await friendshipsCollection.deleteMany({});
  const canonicalPair = [userA.profile._id.toString(), userB.profile._id.toString()].sort().join("_");
  await friendshipsCollection.insertOne({
    requester: new mongoose.Types.ObjectId(userA.profile._id),
    recipient: new mongoose.Types.ObjectId(userB.profile._id),
    status: "ACCEPTED",
    canonicalPair,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Setup WebSocket clients
  const connectWs = (cookie) => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(WS_URL, {
        headers: { Cookie: cookie },
      });
      client.receivedMessages = [];
      client.on("open", () => resolve(client));
      client.on("error", reject);
      client.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          client.receivedMessages.push(parsed);
        } catch (e) {}
      });
    });
  };

  const wsA = await connectWs(userA.cookie);
  const wsB = await connectWs(userB.cookie);
  console.log("WebSocket connections established for User A and User B.");
  await sleep(600); // Allow online announcements

  const fetchHistory = async (authCookie, otherUserId) => {
    const res = await fetch(`${BASE_URL}/messages/${otherUserId}`, {
      headers: { Cookie: authCookie },
    });
    return await res.json();
  };

  // Helper to send WS message and wait for ack/receipt
  const sendWsMessage = async (wsClient, recipientId, text) => {
    const tempId = Date.now().toString();
    wsClient.send(JSON.stringify({ recipient: recipientId, text, tempId }));
    await sleep(300);
    // Find MongoDB ID in ack or in DB
    const latestDoc = await messagesCollection
      .find({
        recipient: new mongoose.Types.ObjectId(recipientId),
        text,
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    return latestDoc[0];
  };

  let passed = 0;
  let total = 0;
  const assert = (desc, condition) => {
    total++;
    if (condition) {
      console.log(`✓ [PASS ${total}] ${desc}`);
      passed++;
    } else {
      console.error(`✗ [FAIL ${total}] ${desc}`);
      throw new Error(`Assertion failed: ${desc}`);
    }
  };

  // ==========================================
  // TESTS 1 - 6: DELETE MESSAGE FOR ME
  // ==========================================
  console.log("\n--- Testing Feature 1: Delete Message For Me (Tests 1-6) ---");

  // 1. User A sends message to B
  const msg1 = await sendWsMessage(wsA, userB.profile._id, "Message 1 from A to B");
  assert("1. User A sends message to B", !!msg1);

  // 2. A deletes message for me
  const delRes1 = await fetch(`${BASE_URL}/messages/${msg1._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  const delData1 = await delRes1.json();
  assert("2. A deletes message for me (HTTP 200)", delRes1.status === 200);

  // 3. Verify A no longer sees it in chat
  const histA1 = await fetchHistory(userA.cookie, userB.profile._id);
  const aSeesMsg1 = histA1.some((m) => m._id.toString() === msg1._id.toString());
  assert("3. Verify A no longer sees it", !aSeesMsg1);

  // 4. Verify B still sees it
  const histB1 = await fetchHistory(userB.cookie, userA.profile._id);
  const bSeesMsg1 = histB1.some((m) => m._id.toString() === msg1._id.toString());
  assert("4. Verify B still sees it", bSeesMsg1);

  // 5 & 6. Refresh A -> Verify message remains hidden
  const histA1_refresh = await fetchHistory(userA.cookie, userB.profile._id);
  const aSeesMsg1_afterRefresh = histA1_refresh.some(
    (m) => m._id.toString() === msg1._id.toString()
  );
  assert("5-6. Refresh A: verify message remains hidden", !aSeesMsg1_afterRefresh);

  // Verify MongoDB document was NOT permanently deleted
  const docInDb1 = await messagesCollection.findOne({ _id: msg1._id });
  assert(
    "MongoDB document still exists with userA in deletedFor",
    !!docInDb1 &&
      docInDb1.deletedFor.some((id) => id.toString() === userA.profile._id.toString())
  );

  // ==========================================
  // TESTS 7 - 12: UNSEND MESSAGE FOR EVERYONE
  // ==========================================
  console.log("\n--- Testing Feature 2 & 3: Unsend Message (Tests 7-12) ---");

  // 7. A sends another message
  wsB.receivedMessages = [];
  const msg2 = await sendWsMessage(wsA, userB.profile._id, "Message 2: to be unsent");
  assert("7. A sends another message", !!msg2);

  // 8. A unsends it
  const unsendRes = await fetch(`${BASE_URL}/messages/${msg2._id}/unsend`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("8. A unsends it (HTTP 200)", unsendRes.status === 200);

  // 9. Verify A sees "Message unsent" (isUnsent === true, text empty)
  const histA2 = await fetchHistory(userA.cookie, userB.profile._id);
  const aMsg2 = histA2.find((m) => m._id.toString() === msg2._id.toString());
  assert(
    "9. Verify A sees isUnsent === true and empty text",
    aMsg2 && aMsg2.isUnsent === true && aMsg2.text === ""
  );

  // 10. Verify B immediately receives real-time WebSocket event
  await sleep(400);
  const wsUnsentEvent = wsB.receivedMessages.find(
    (m) => m.type === "message_unsent" && (m.messageId === msg2._id.toString() || m.id === msg2._id.toString())
  );
  assert("10. Verify B immediately receives WebSocket message_unsent event", !!wsUnsentEvent);

  // 11 & 12. Refresh both -> verify original content never returns
  const histA2_refresh = await fetchHistory(userA.cookie, userB.profile._id);
  const histB2_refresh = await fetchHistory(userB.cookie, userA.profile._id);
  const bMsg2 = histB2_refresh.find((m) => m._id.toString() === msg2._id.toString());
  assert(
    "11-12. Refresh both: original content never returns, isUnsent is true",
    bMsg2 && bMsg2.isUnsent === true && bMsg2.text === "" && histA2_refresh.find((m) => m._id.toString() === msg2._id.toString())?.text === ""
  );

  // ==========================================
  // TESTS 13 - 16: DELETE RECEIVED MESSAGE FOR ME
  // ==========================================
  console.log("\n--- Testing Delete Received Message (Tests 13-16) ---");

  // 13. B sends a message to A
  const msg3 = await sendWsMessage(wsB, userA.profile._id, "Message 3 from B to A");
  assert("13. B sends a message to A", !!msg3);

  // 14. A deletes B's message for me
  const delRes3 = await fetch(`${BASE_URL}/messages/${msg3._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("14. A deletes B's message for me", delRes3.status === 200);

  // 15. Verify A does not see it
  const histA3 = await fetchHistory(userA.cookie, userB.profile._id);
  const aSeesMsg3 = histA3.some((m) => m._id.toString() === msg3._id.toString());
  assert("15. Verify A does not see it", !aSeesMsg3);

  // 16. Verify B still sees it
  const histB3 = await fetchHistory(userB.cookie, userA.profile._id);
  const bSeesMsg3 = histB3.some((m) => m._id.toString() === msg3._id.toString());
  assert("16. Verify B still sees it", bSeesMsg3);

  // ==========================================
  // TESTS 17 - 22: DELETE ENTIRE CONVERSATION
  // ==========================================
  console.log("\n--- Testing Feature 5: Delete Entire Conversation (Tests 17-22) ---");

  // Send a couple more messages from both sides first
  await sendWsMessage(wsA, userB.profile._id, "Extra msg 1 from A");
  await sendWsMessage(wsB, userA.profile._id, "Extra msg 2 from B");
  await sleep(300);

  // 17. A deletes entire conversation
  const delConvRes = await fetch(`${BASE_URL}/conversations/${userB.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  const delConvData = await delConvRes.json();
  assert("17. A deletes entire conversation", delConvRes.status === 200 && delConvData.modifiedCount > 0);

  // 18. Verify A sees empty chat
  const histA_conv = await fetchHistory(userA.cookie, userB.profile._id);
  assert("18. Verify A sees empty chat", histA_conv.length === 0);

  // 19. Verify B still sees entire old conversation
  const histB_conv = await fetchHistory(userB.cookie, userA.profile._id);
  assert("19. Verify B still sees entire old conversation", histB_conv.length >= 3);

  // 20. B sends a new message
  wsA.receivedMessages = [];
  const msgNew = await sendWsMessage(wsB, userA.profile._id, "New message from B after conv deleted");
  assert("20. B sends a new message", !!msgNew);

  // 21. Verify A receives the new message normally
  await sleep(300);
  const histA_new = await fetchHistory(userA.cookie, userB.profile._id);
  assert(
    "21. Verify A receives the new message normally",
    histA_new.length === 1 && histA_new[0].text === "New message from B after conv deleted"
  );

  // 22. Verify old deleted-for-A messages remain hidden for A
  const oldMsgsInA = histA_new.filter((m) => m._id.toString() !== msgNew._id.toString());
  assert("22. Verify old deleted-for-A messages remain hidden", oldMsgsInA.length === 0);

  // ==========================================
  // TESTS 23 - 26: LOGOUT / LOGIN & PERSISTENCE
  // ==========================================
  console.log("\n--- Testing Persistence Across Login/Logout (Tests 23-26) ---");

  // 23 & 24. Logout/login
  const userA_relogin = await loginUser(emailA);
  const histA_relogin = await fetchHistory(userA_relogin.cookie, userB.profile._id);
  assert(
    "23-24. Logout and login again: deletion state persists (only 1 new message visible)",
    histA_relogin.length === 1 && histA_relogin[0]._id.toString() === msgNew._id.toString()
  );

  // 25 & 26. Database state persistence check (simulating backend restart)
  // Ensure the fields in MongoDB strictly reflect deletedFor and isUnsent
  const allDbMessages = await messagesCollection.find({
    sender: { $in: [new mongoose.Types.ObjectId(userA.profile._id), new mongoose.Types.ObjectId(userB.profile._id)] },
  }).toArray();
  const unsentCount = allDbMessages.filter((m) => m.isUnsent).length;
  const deletedForACount = allDbMessages.filter((m) =>
    (m.deletedFor || []).some((id) => id.toString() === userA.profile._id.toString())
  ).length;
  assert(
    "25-26. DB state persistence: unsent documents and deletedFor arrays fully intact",
    unsentCount >= 1 && deletedForACount >= 3
  );

  // ==========================================
  // TESTS 27 - 30: SECURITY, AUTHORIZATION & MALFORMED REQUESTS
  // ==========================================
  console.log("\n--- Testing Security, Auth & Malformed Input (Tests 27-30) ---");

  // 27. Unauthorized deletion: User C tries to delete message between A and B
  const unauthorizedDelRes = await fetch(`${BASE_URL}/messages/${msgNew._id}`, {
    method: "DELETE",
    headers: { Cookie: userC.cookie },
  });
  assert(
    "27. Unauthorized deletion by non-participant returns 403 Forbidden",
    unauthorizedDelRes.status === 403
  );

  // 28. Unauthorized unsend: User A tries to unsend message sent by User B
  const unauthorizedUnsendRes = await fetch(`${BASE_URL}/messages/${msgNew._id}/unsend`, {
    method: "POST",
    headers: { Cookie: userA.cookie }, // msgNew was sent by B!
  });
  assert(
    "28. Recipient cannot unsend sender's message (returns 403 Forbidden)",
    unauthorizedUnsendRes.status === 403
  );

  // 29. Test malformed message and user IDs
  const malformedMsgDel = await fetch(`${BASE_URL}/messages/not-a-valid-id`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("29a. Malformed message ID returns 400 Bad Request", malformedMsgDel.status === 400);

  const malformedMsgUnsend = await fetch(`${BASE_URL}/messages/not-a-valid-id/unsend`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("29b. Malformed unsend message ID returns 400 Bad Request", malformedMsgUnsend.status === 400);

  const malformedConvDel = await fetch(`${BASE_URL}/conversations/invalid-user-id`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("29c. Malformed conversation user ID returns 400 Bad Request", malformedConvDel.status === 400);

  // Unauthenticated requests
  const noAuthDel = await fetch(`${BASE_URL}/messages/${msgNew._id}`, {
    method: "DELETE",
  });
  assert("29d. Unauthenticated request returns 401 Unauthorized", noAuthDel.status === 401);

  // Non-existent ID (valid ObjectId format)
  const nonExistentId = new mongoose.Types.ObjectId();
  const notFoundDel = await fetch(`${BASE_URL}/messages/${nonExistentId}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("29e. Non-existent message ID returns 404 Not Found", notFoundDel.status === 404);

  // 30. Test malformed WebSocket requests
  wsA.send("NOT_VALID_JSON{{{");
  wsA.send(JSON.stringify({ type: "unsend", messageId: "invalid-id" }));
  wsA.send(JSON.stringify({ recipient: "invalid-recipient", text: "hello" }));
  await sleep(300);
  assert("30. Server safely handles malformed WebSocket requests without crashing", wsA.readyState === WebSocket.OPEN);

  // ==========================================
  // TESTS 31 - 34: 20 RAPID MESSAGES & FIFO ORDERING
  // ==========================================
  console.log("\n--- Testing FIFO Ordering & Rapid Messages (Tests 31-34) ---");

  // Clean conversation for FIFO test
  await fetch(`${BASE_URL}/conversations/${userB.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  await fetch(`${BASE_URL}/conversations/${userA.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userB.cookie },
  });

  // 31. Send 20 rapid messages
  const count = 20;
  for (let i = 1; i <= count; i++) {
    wsA.send(
      JSON.stringify({
        recipient: userB.profile._id,
        text: `Rapid message #${i.toString().padStart(2, "0")}`,
        tempId: `rapid-${i}`,
      })
    );
  }
  await sleep(1500); // Allow queue processing

  // 32. Verify FIFO ordering
  const rapidHistB = await fetchHistory(userB.cookie, userA.profile._id);
  assert("31-32. All 20 rapid messages received", rapidHistB.length === 20);

  let isOrdered = true;
  for (let i = 0; i < rapidHistB.length; i++) {
    const expected = `Rapid message #${(i + 1).toString().padStart(2, "0")}`;
    if (rapidHistB[i].text !== expected) {
      isOrdered = false;
      console.error(`Mismatch at ${i}: expected "${expected}", got "${rapidHistB[i].text}"`);
      break;
    }
  }
  assert("32. Verify strict FIFO ordering is preserved across all 20 messages", isOrdered);

  // 33. Delete/unsend one message in the middle (e.g. #10)
  const targetMsg = rapidHistB[9]; // 10th message
  assert("Target middle message is message #10", targetMsg.text === "Rapid message #10");

  const unsendMidRes = await fetch(`${BASE_URL}/messages/${targetMsg._id}/unsend`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("33a. Unsend message in the middle (#10)", unsendMidRes.status === 200);

  // Delete message #15 for User B
  const targetDelMsg = rapidHistB[14]; // 15th message
  const delMidRes = await fetch(`${BASE_URL}/messages/${targetDelMsg._id}`, {
    method: "DELETE",
    headers: { Cookie: userB.cookie },
  });
  assert("33b. Delete message in the middle for User B (#15)", delMidRes.status === 200);

  // 34. Verify remaining messages retain correct FIFO order
  const updatedHistB = await fetchHistory(userB.cookie, userA.profile._id);
  assert(
    "34a. User B sees 19 messages (message #15 deleted for me)",
    updatedHistB.length === 19
  );
  assert(
    "34b. Message #10 is unsent (isUnsent === true, text empty)",
    updatedHistB[9].isUnsent === true && updatedHistB[9].text === ""
  );

  let fifoStillValid = true;
  let expectedIndex = 1;
  for (let m of updatedHistB) {
    if (expectedIndex === 15) {
      expectedIndex++; // Skipped because it was deleted
    }
    const expectedText =
      expectedIndex === 10
        ? ""
        : `Rapid message #${expectedIndex.toString().padStart(2, "0")}`;
    if (m.text !== expectedText) {
      fifoStillValid = false;
      console.error(`FIFO error: expected "${expectedText}", got "${m.text}"`);
      break;
    }
    expectedIndex++;
  }
  assert("34c. Verify remaining messages retain exact original FIFO order", fifoStillValid);

  // Clean up WebSockets and DB connection
  wsA.close();
  wsB.close();
  await mongoose.disconnect();

  console.log("\n==================================================");
  console.log(`ALL TESTS PASSED: ${passed}/${total}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test Suite Error:", err);
  process.exit(1);
});
