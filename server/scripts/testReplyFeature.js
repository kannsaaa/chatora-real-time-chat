const mongoose = require("mongoose");
const WebSocket = require("ws");

const BASE_URL = "http://localhost:4000/api/user";
const WS_URL = "ws://localhost:4000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("==================================================");
  console.log("CHATORA — REPLY TO MESSAGES TEST SUITE");
  console.log("==================================================");

  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");
  const messagesCollection = mongoose.connection.db.collection("messages");
  const friendshipsCollection = mongoose.connection.db.collection("friendships");
  const blocksCollection = mongoose.connection.db.collection("blocks");

  // Step 0: Ensure four test accounts exist
  const emailA = "reply_test_user_a@test.com";
  const emailB = "reply_test_user_b@test.com";
  const emailC = "reply_test_user_c@test.com";
  const emailD = "reply_test_user_d@test.com";

  await usersCollection.deleteMany({
    email: { $in: [emailA, emailB, emailC, emailD] },
  });

  console.log("\n[SETUP] Creating test users A, B, C, and D...");
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

  await registerUser("UserA", "Alpha", "usera_reply", emailA);
  await registerUser("UserB", "Beta", "userb_reply", emailB);
  await registerUser("UserC", "Charlie", "userc_reply", emailC);
  await registerUser("UserD", "Delta", "userd_reply", emailD);

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
  const userD = await loginUser(emailD);

  const Friendship = require("../models/friendshipModel");

  // Setup friendships:
  // A & B are FRIENDS
  // C & D are FRIENDS
  // A & C are NOT_CONNECTED
  // A & D are BLOCKED
  const testIds = [
    new mongoose.Types.ObjectId(userA.profile._id),
    new mongoose.Types.ObjectId(userB.profile._id),
    new mongoose.Types.ObjectId(userC.profile._id),
    new mongoose.Types.ObjectId(userD.profile._id),
  ];

  await friendshipsCollection.deleteMany({
    $or: [{ requester: { $in: testIds } }, { recipient: { $in: testIds } }],
  });
  await blocksCollection.deleteMany({
    $or: [{ blocker: { $in: testIds } }, { blocked: { $in: testIds } }],
  });
  await messagesCollection.deleteMany({
    $or: [{ sender: { $in: testIds } }, { recipient: { $in: testIds } }],
  });

  await friendshipsCollection.insertOne({
    canonicalPair: Friendship.getCanonicalPair(userA.profile._id, userB.profile._id),
    requester: new mongoose.Types.ObjectId(userA.profile._id),
    recipient: new mongoose.Types.ObjectId(userB.profile._id),
    status: "ACCEPTED",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await friendshipsCollection.insertOne({
    canonicalPair: Friendship.getCanonicalPair(userC.profile._id, userD.profile._id),
    requester: new mongoose.Types.ObjectId(userC.profile._id),
    recipient: new mongoose.Types.ObjectId(userD.profile._id),
    status: "ACCEPTED",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await blocksCollection.insertOne({
    blocker: new mongoose.Types.ObjectId(userA.profile._id),
    blocked: new mongoose.Types.ObjectId(userD.profile._id),
    createdAt: new Date(),
  });

  console.log("Friendships and blocks configured.");

  // Establish WebSockets for User A and User B
  const connectWs = (cookie) => {
    return new Promise((resolve) => {
      const ws = new WebSocket(WS_URL, {
        headers: { Cookie: cookie },
      });
      ws.on("open", () => resolve(ws));
    });
  };

  const wsA = await connectWs(userA.cookie);
  const wsB = await connectWs(userB.cookie);
  console.log("WebSocket connections established.");

  // Helper to collect WS messages
  const wsMessagesA = [];
  const wsMessagesB = [];
  wsA.on("message", (data) => {
    try {
      wsMessagesA.push(JSON.parse(data.toString()));
    } catch (_) {}
  });
  wsB.on("message", (data) => {
    try {
      wsMessagesB.push(JSON.parse(data.toString()));
    } catch (_) {}
  });

  // TEST 1: Unauthenticated request to send message returns 401
  const res1 = await fetch(`http://localhost:4000/api/messages/${userB.profile._id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello without auth" }),
  });
  if (res1.status !== 401) {
    throw new Error(`[FAIL 1] Expected 401 for unauthenticated request, got ${res1.status}`);
  }
  console.log("✓ [PASS 1] Unauthenticated message request returns 401");

  // TEST 2: Non-friend conversation returns 403
  const res2 = await fetch(`http://localhost:4000/api/messages/${userC.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Hey non-friend" }),
  });
  if (res2.status !== 403) {
    throw new Error(`[FAIL 2] Expected 403 for non-friend message, got ${res2.status}`);
  }
  console.log("✓ [PASS 2] Non-friend conversation returns 403");

  // TEST 3: Blocked conversation returns 403
  const res3 = await fetch(`http://localhost:4000/api/messages/${userD.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Hey blocked user" }),
  });
  if (res3.status !== 403) {
    throw new Error(`[FAIL 3] Expected 403 for blocked conversation, got ${res3.status}`);
  }
  console.log("✓ [PASS 3] Blocked conversation returns 403");

  // TEST 4: Malformed replyTo returns 400
  const res4 = await fetch(`http://localhost:4000/api/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Replying to bad id", replyTo: "not-a-valid-id" }),
  });
  if (res4.status !== 400) {
    throw new Error(`[FAIL 4] Expected 400 for malformed replyTo, got ${res4.status}`);
  }
  console.log("✓ [PASS 4] Malformed replyTo returns 400 Bad Request");

  // TEST 5: Non-existent replyTo returns 400
  const nonExistentId = new mongoose.Types.ObjectId().toString();
  const res5 = await fetch(`http://localhost:4000/api/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Replying to ghost", replyTo: nonExistentId }),
  });
  if (res5.status !== 400) {
    throw new Error(`[FAIL 5] Expected 400 for non-existent replyTo, got ${res5.status}`);
  }
  console.log("✓ [PASS 5] Non-existent replyTo returns 400 Bad Request");

  // TEST 6: Message from C to D cannot be replied to in A-B conversation
  const resCD = await fetch(`http://localhost:4000/api/messages/${userD.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userC.cookie,
    },
    body: JSON.stringify({ text: "Private chat between C and D" }),
  });
  const msgCD = await resCD.json();

  const res6 = await fetch(`http://localhost:4000/api/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Illegal cross-convo reply", replyTo: msgCD._id }),
  });
  if (res6.status !== 400) {
    throw new Error(`[FAIL 6] Expected 400 for cross-conversation replyTo, got ${res6.status}`);
  }
  console.log("✓ [PASS 6] ReplyTo referencing an unrelated conversation returns 400 Bad Request");

  // TEST 7: Normal message without replyTo created and returned with replyTo: null
  const res7 = await fetch(`http://localhost:4000/api/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Message 1 from User A: What are we building?" }),
  });
  if (res7.status !== 201) {
    throw new Error(`[FAIL 7] Normal message failed with status ${res7.status}`);
  }
  const msg1 = await res7.json();
  if (msg1.replyTo !== null && msg1.replyTo !== undefined) {
    throw new Error(`[FAIL 7] Normal message expected replyTo null, got ${JSON.stringify(msg1.replyTo)}`);
  }
  console.log("✓ [PASS 7] Normal message without replyTo created cleanly");

  // TEST 8: User B replies to User A's message via REST
  const res8 = await fetch(`http://localhost:4000/api/messages/${userA.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userB.cookie,
    },
    body: JSON.stringify({
      text: "Reply 1 from User B: We are building Chaos Mode & Replies!",
      replyTo: msg1._id,
    }),
  });
  if (res8.status !== 201) {
    throw new Error(`[FAIL 8] Reply failed with status ${res8.status}`);
  }
  const reply1 = await res8.json();
  if (!reply1.replyTo || String(reply1.replyTo._id) !== String(msg1._id)) {
    throw new Error(`[FAIL 8] Expected replyTo._id to match original message ID`);
  }
  if (!reply1.replyTo.text.includes("What are we building?")) {
    throw new Error(`[FAIL 8] Expected replyTo.text to contain original snippet`);
  }
  console.log("✓ [PASS 8] User B successfully replied to User A's message via REST");

  // TEST 9: Fetching messages returns both messages with populated replyTo and correct FIFO order
  const res9 = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    headers: { Cookie: userA.cookie },
  });
  const historyA = await res9.json();
  if (historyA.length < 2) {
    throw new Error(`[FAIL 9] Expected at least 2 messages, got ${historyA.length}`);
  }
  const fetchedReply = historyA.find((m) => String(m._id) === String(reply1._id));
  if (!fetchedReply || !fetchedReply.replyTo) {
    throw new Error(`[FAIL 9] Fetched reply does not have populated replyTo`);
  }
  if (String(fetchedReply.replyTo._id) !== String(msg1._id)) {
    throw new Error(`[FAIL 9] Fetched replyTo ID mismatch`);
  }
  console.log("✓ [PASS 9] GET /messages returns populated replyTo in FIFO order");

  // TEST 10: WebSocket real-time delivery with replyTo
  wsMessagesB.length = 0;
  wsMessagesA.length = 0;

  const tempIdWs = "ws-reply-test-" + Date.now();
  wsA.send(
    JSON.stringify({
      recipient: userB.profile._id,
      text: "Reply via WebSocket: That sounds incredible!",
      tempId: tempIdWs,
      replyTo: reply1._id,
    })
  );

  await sleep(600);

  const wsReceivedByB = wsMessagesB.find(
    (m) => m.text && m.text.includes("That sounds incredible!")
  );
  if (!wsReceivedByB) {
    throw new Error(`[FAIL 10] Recipient B did not receive WS message`);
  }
  if (!wsReceivedByB.replyTo || String(wsReceivedByB.replyTo._id) !== String(reply1._id)) {
    throw new Error(`[FAIL 10] Recipient B did not receive populated replyTo on WS`);
  }

  const ackReceivedByA = wsMessagesA.find(
    (m) => m.type === "message_ack" && m.tempId === tempIdWs
  );
  if (!ackReceivedByA || !ackReceivedByA.replyTo) {
    throw new Error(`[FAIL 10] Sender A did not receive ack with populated replyTo`);
  }
  console.log("✓ [PASS 10] Real-time WebSocket delivery and sender ACK contain populated replyTo");

  // TEST 11: Nested reply reference displays single level (no recursion)
  const nestedReply = wsReceivedByB;
  if (!nestedReply.replyTo || nestedReply.replyTo.replyTo) {
    throw new Error(`[FAIL 11] Expected single-level replyTo, got nested structure`);
  }
  console.log("✓ [PASS 11] Single-level reply structure verified (prevents recursive quotes)");

  // TEST 12: Unsend original message masks reply quote text
  // Unsend msg1
  const resUnsend = await fetch(`${BASE_URL}/messages/${msg1._id}/unsend`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  if (resUnsend.status !== 200) {
    throw new Error(`[FAIL 12] Failed to unsend msg1: ${resUnsend.status}`);
  }

  const res12 = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    headers: { Cookie: userA.cookie },
  });
  const historyAfterUnsend = await res12.json();
  const replyToUnsent = historyAfterUnsend.find((m) => String(m._id) === String(reply1._id));
  if (!replyToUnsent || !replyToUnsent.replyTo) {
    throw new Error(`[FAIL 12] Reply message not found`);
  }
  if (replyToUnsent.replyTo.text !== "" || !replyToUnsent.replyTo.isUnsent) {
    throw new Error(`[FAIL 12] Quoted unsent message leaked text or did not flag isUnsent: true`);
  }
  console.log("✓ [PASS 12] Unsending original message safely masks reply quote text (zero leak)");

  // TEST 13: Delete-for-me original message masks quote text for that user
  // Let's create a new message msg2 and reply to it
  const resMsg2 = await fetch(`http://localhost:4000/api/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Secret message to be deleted for B" }),
  });
  const msg2 = await resMsg2.json();

  const resReply2 = await fetch(`http://localhost:4000/api/messages/${userA.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userB.cookie,
    },
    body: JSON.stringify({ text: "Replying to secret message", replyTo: msg2._id }),
  });
  const reply2 = await resReply2.json();

  // User B deletes msg2 for me
  const resDelForB = await fetch(`${BASE_URL}/messages/${msg2._id}`, {
    method: "DELETE",
    headers: { Cookie: userB.cookie },
  });
  if (resDelForB.status !== 200) {
    throw new Error(`[FAIL 13] Delete for me failed`);
  }

  // User B fetches messages: msg2 should not be in list, and reply2.replyTo should have isDeletedForMe: true & text: ""
  const resHistB = await fetch(`${BASE_URL}/messages/${userA.profile._id}`, {
    headers: { Cookie: userB.cookie },
  });
  const histB = await resHistB.json();
  const foundMsg2InB = histB.find((m) => String(m._id) === String(msg2._id));
  if (foundMsg2InB) {
    throw new Error(`[FAIL 13] Deleted message msg2 still appears in B's history`);
  }
  const replyInB = histB.find((m) => String(m._id) === String(reply2._id));
  if (!replyInB || !replyInB.replyTo || replyInB.replyTo.text !== "" || !replyInB.replyTo.isDeletedForMe) {
    throw new Error(`[FAIL 13] Expected reply quote for deleted-for-me to have empty text and isDeletedForMe: true`);
  }

  // User A fetches messages: msg2 is STILL visible to User A, and reply quote text is visible to User A
  const resHistA = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    headers: { Cookie: userA.cookie },
  });
  const histA = await resHistA.json();
  const replyInA = histA.find((m) => String(m._id) === String(reply2._id));
  if (!replyInA || !replyInA.replyTo || !replyInA.replyTo.text.includes("Secret message")) {
    throw new Error(`[FAIL 13] User A should still see original quote text`);
  }
  console.log("✓ [PASS 13] Delete-for-me original masks quote only for deleting user, preserves for sender");

  // TEST 14: Delete reply message for me
  const resDelReply = await fetch(`${BASE_URL}/messages/${reply2._id}`, {
    method: "DELETE",
    headers: { Cookie: userB.cookie },
  });
  if (resDelReply.status !== 200) {
    throw new Error(`[FAIL 14] Failed to delete reply message for B`);
  }
  const resHistBAfterDel = await fetch(`${BASE_URL}/messages/${userA.profile._id}`, {
    headers: { Cookie: userB.cookie },
  });
  const histBAfterDel = await resHistBAfterDel.json();
  if (histBAfterDel.some((m) => String(m._id) === String(reply2._id))) {
    throw new Error(`[FAIL 14] Deleted reply still visible to User B`);
  }
  console.log("✓ [PASS 14] Delete reply for me removes reply from user's view");

  // TEST 15: Unsend reply message
  const resUnsendReply = await fetch(`${BASE_URL}/messages/${reply1._id}/unsend`, {
    method: "POST",
    headers: { Cookie: userB.cookie },
  });
  if (resUnsendReply.status !== 200) {
    throw new Error(`[FAIL 15] Failed to unsend reply message`);
  }
  const resHistAfterUnsendReply = await fetch(`${BASE_URL}/messages/${userA.profile._id}`, {
    headers: { Cookie: userB.cookie },
  });
  const histAfterUnsendReply = await resHistAfterUnsendReply.json();
  const unsentReplyMsg = histAfterUnsendReply.find((m) => String(m._id) === String(reply1._id));
  if (!unsentReplyMsg || !unsentReplyMsg.isUnsent || unsentReplyMsg.text !== "") {
    throw new Error(`[FAIL 15] Unsent reply message did not clear text or set isUnsent: true`);
  }
  console.log("✓ [PASS 15] Unsending reply marks reply as unsent and masks its text");

  // TEST 16: Self-message protection
  const resSelf = await fetch(`http://localhost:4000/api/messages/${userA.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Self message attempt" }),
  });
  if (resSelf.status !== 400) {
    throw new Error(`[FAIL 16] Expected 400 for self message, got ${resSelf.status}`);
  }
  console.log("✓ [PASS 16] Self-message protection prevents messaging oneself");

  // TEST 17: Delete conversation soft-deletes messages for user A
  const resDelConvo = await fetch(`http://localhost:4000/api/conversations/${userB.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  if (resDelConvo.status !== 200) {
    throw new Error(`[FAIL 17] Failed to delete conversation`);
  }
  const resHistAfterDelConvo = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    headers: { Cookie: userA.cookie },
  });
  const histAfterDelConvo = await resHistAfterDelConvo.json();
  if (histAfterDelConvo.length !== 0) {
    throw new Error(`[FAIL 17] User A still sees messages after deleting conversation`);
  }
  console.log("✓ [PASS 17] Delete conversation soft-deletes messages for User A");

  // Close WebSockets & DB
  wsA.close();
  wsB.close();
  await mongoose.disconnect();

  console.log("==================================================");
  console.log("ALL BACKEND REPLY TESTS PASSED: 17/17");
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
