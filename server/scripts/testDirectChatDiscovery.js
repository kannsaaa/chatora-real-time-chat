const mongoose = require("mongoose");
const assert = require("assert");
const Message = require("../models/messageModel");

const BASE_URL = "http://localhost:4000";

let userACookie = null;
let userBCookie = null;
let userCCookie = null;
let userA = null;
let userB = null;
let userC = null;

async function request(url, options = {}, cookie = null) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (cookie) {
    headers["Cookie"] = cookie;
  }
  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });
  let data = null;
  const setCookie = res.headers.get("set-cookie");
  const cookieHeader = setCookie ? setCookie.split(";")[0] : null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data, cookie: cookieHeader };
}

async function setup() {
  const rand = Math.random().toString(36).substring(2, 7);
  const pw = "Password123!";

  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");
  const messagesCollection = mongoose.connection.db.collection("messages");
  const friendshipsCollection = mongoose.connection.db.collection("friendships");

  const emailA = `discovery_a_${rand}@test.com`;
  const emailB = `discovery_b_${rand}@test.com`;
  const emailC = `discovery_c_${rand}@test.com`;

  // 1. Register Users A, B, and C
  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Alice",
      lastName: "Active",
      username: `alice_${rand}`,
      email: emailA,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailA }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Bob",
      lastName: "Chatter",
      username: `bob_${rand}`,
      email: emailB,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailB }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Charlie",
      lastName: "Newfriend",
      username: `charlie_${rand}`,
      email: emailC,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailC }, { $set: { verified: true } });

  // 2. Login Users
  const loginA = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailA, password: pw }),
  });
  userACookie = loginA.cookie;
  const profA = await request("/api/user/profile", {}, userACookie);
  userA = profA.data;

  const loginB = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailB, password: pw }),
  });
  userBCookie = loginB.cookie;
  const profB = await request("/api/user/profile", {}, userBCookie);
  userB = profB.data;

  const loginC = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailC, password: pw }),
  });
  userCCookie = loginC.cookie;
  const profC = await request("/api/user/profile", {}, userCCookie);
  userC = profC.data;

  // 3. Establish Friendships: Alice <-> Bob AND Alice <-> Charlie
  await request(`/api/friends/request/${userB._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userBCookie);

  await request(`/api/friends/request/${userC._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userCCookie);

  // 4. Send messages ONLY between Alice and Bob
  // Charlie has ZERO messages with Alice
  await request(`/api/messages/${userB._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Hey Bob! How are you?" }),
  }, userACookie);

  await request(`/api/messages/${userA._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Doing great Alice, thanks!" }),
  }, userBCookie);
}

async function runTests() {
  console.log("==================================================");
  console.log("CHATORA — DIRECT CHAT DISCOVERY & FRIEND MERGE TESTS");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  function recordPass(desc) {
    passed++;
    total++;
    console.log(`✓ [PASS ${total}] ${desc}`);
  }

  await setup();

  const messagesCollection = mongoose.connection.db.collection("messages");

  // -------------------------------------------------------------
  // TEST 1: Friend with existing conversation appears correctly
  // -------------------------------------------------------------
  const convRes = await request("/api/conversations?includeFriends=true", {}, userACookie);
  assert.strictEqual(convRes.status, 200, "GET /api/conversations?includeFriends=true returns 200");

  const bobEntry = convRes.data.find((c) => String(c.userId) === String(userB._id));
  assert.ok(bobEntry, "Friend with existing conversation (Bob) is present");
  assert.strictEqual(bobEntry.lastMessage?.text, "Doing great Alice, thanks!", "Bob entry shows the latest message text");
  assert.ok(bobEntry.lastMessage?.createdAt, "Bob entry shows a valid createdAt timestamp");
  recordPass("1. Friend with existing conversation appears correctly with latest message and timestamp");

  // -------------------------------------------------------------
  // TEST 2: Friend without conversation appears under DIRECT CHATS
  // -------------------------------------------------------------
  const charlieEntry = convRes.data.find((c) => String(c.userId) === String(userC._id));
  assert.ok(charlieEntry, "Friend without conversation (Charlie) is present in direct chat list");
  assert.strictEqual(charlieEntry.lastMessage, null, "Charlie entry has lastMessage: null (no messages yet)");
  assert.strictEqual(charlieEntry.noMessagesYet, true, "Charlie entry has noMessagesYet: true");

  // Verify that Charlie appears UNDERNEATH Bob (existing conversation first)
  const bobIndex = convRes.data.findIndex((c) => String(c.userId) === String(userB._id));
  const charlieIndex = convRes.data.findIndex((c) => String(c.userId) === String(userC._id));
  assert.ok(bobIndex < charlieIndex, "Existing conversation (Bob) appears before friend without conversation (Charlie)");

  // Verify NO fake messages were inserted in database
  const charlieDbMessages = await Message.countDocuments({
    $or: [
      { sender: userA._id, recipient: userC._id },
      { sender: userC._id, recipient: userA._id },
    ],
  });
  assert.strictEqual(charlieDbMessages, 0, "Zero messages in database between Alice and Charlie (no fake messages created)");
  recordPass("2. Friend without conversation appears under DIRECT CHATS underneath existing conversations with no fake messages");

  // -------------------------------------------------------------
  // TEST 3: Existing conversation is not duplicated
  // -------------------------------------------------------------
  const bobOccurrences = convRes.data.filter((c) => String(c.userId) === String(userB._id));
  assert.strictEqual(bobOccurrences.length, 1, "Bob appears exactly once (no duplicates)");

  const charlieOccurrences = convRes.data.filter((c) => String(c.userId) === String(userC._id));
  assert.strictEqual(charlieOccurrences.length, 1, "Charlie appears exactly once (no duplicates)");

  assert.strictEqual(convRes.data.length, 2, "Total direct chats count is exactly 2 (Bob + Charlie)");
  recordPass("3. Existing conversation is not duplicated when merging with friends");

  // -------------------------------------------------------------
  // TEST 4: Clicking a friend without a conversation opens the chat correctly
  // -------------------------------------------------------------
  // Query messages between Alice and Charlie
  const charlieMessagesRes = await request(`/api/user/messages/${userC._id}`, {}, userACookie);
  assert.strictEqual(charlieMessagesRes.status, 200, "Fetching messages for Charlie returns 200");
  assert.ok(Array.isArray(charlieMessagesRes.data) && charlieMessagesRes.data.length === 0, "Messages array is empty []");

  // Check relationship status
  const charlieStatusRes = await request(`/api/friends/status/${userC._id}`, {}, userACookie);
  assert.strictEqual(charlieStatusRes.data.status, "FRIENDS", "Relationship status with Charlie is FRIENDS");

  // Database must still have 0 messages before any message is sent
  const charlieDbMessagesBeforeSend = await Message.countDocuments({
    $or: [
      { sender: userA._id, recipient: userC._id },
      { sender: userC._id, recipient: userA._id },
    ],
  });
  assert.strictEqual(charlieDbMessagesBeforeSend, 0, "Database still contains 0 messages before user sends anything");

  // Sending a message now creates the conversation
  const sendRes = await request(`/api/messages/${userC._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Hello Charlie! Welcome to Chatora!" }),
  }, userACookie);
  assert.strictEqual(sendRes.status, 201, "Sending message to Charlie succeeds with 201 Created");

  const charlieDbMessagesAfterSend = await Message.countDocuments({
    $or: [
      { sender: userA._id, recipient: userC._id },
      { sender: userC._id, recipient: userA._id },
    ],
  });
  assert.strictEqual(charlieDbMessagesAfterSend, 1, "Database now has 1 message after message is sent");

  // Conversations list now reflects Charlie as an active conversation with message
  const updatedConvRes = await request("/api/conversations?includeFriends=true", {}, userACookie);
  const updatedCharlie = updatedConvRes.data.find((c) => String(c.userId) === String(userC._id));
  assert.strictEqual(updatedCharlie.lastMessage?.text, "Hello Charlie! Welcome to Chatora!", "Charlie now has active lastMessage preview");
  recordPass("4. Selecting friend without conversation opens chat cleanly; conversation created only when message sent");

  // -------------------------------------------------------------
  // TEST 5: Search still works
  // -------------------------------------------------------------
  // Helper simulating the client search filter logic in OnlineUserList.jsx
  const searchConversations = (list, query) => {
    const cleanSearch = query.trim().toLowerCase();
    const strippedSearch = cleanSearch.replace(/^@/, "");
    return list.filter((conv) => {
      if (!cleanSearch) return true;
      const fullName = `${conv.firstName || ""} ${conv.lastName || ""}`.trim().toLowerCase();
      const username = (conv.username || "").toLowerCase();
      const handle = (conv.userHandle || conv.username || "").toLowerCase();
      const lastMsgText = (conv.lastMessage?.text || "").toLowerCase();

      return (
        fullName.includes(cleanSearch) ||
        username.includes(cleanSearch) ||
        handle.includes(strippedSearch) ||
        lastMsgText.includes(cleanSearch)
      );
    });
  };

  // Search by name
  const nameSearch = searchConversations(convRes.data, "Bob");
  assert.strictEqual(nameSearch.length, 1, "Searching by name 'Bob' finds Bob");
  assert.strictEqual(String(nameSearch[0].userId), String(userB._id));

  const charlieNameSearch = searchConversations(convRes.data, "Charlie");
  assert.strictEqual(charlieNameSearch.length, 1, "Searching by name 'Charlie' finds Charlie");
  assert.strictEqual(String(charlieNameSearch[0].userId), String(userC._id));

  // Search by handle with @
  const handleSearch = searchConversations(convRes.data, `@${userB.username}`);
  assert.strictEqual(handleSearch.length, 1, "Searching by handle with '@' finds user");

  // Search by message content
  const msgSearch = searchConversations(convRes.data, "Doing great");
  assert.strictEqual(msgSearch.length, 1, "Searching by message content finds Bob's conversation");

  // Non-matching query returns empty
  const noMatch = searchConversations(convRes.data, "NonExistentUser12345");
  assert.strictEqual(noMatch.length, 0, "Non-matching search returns 0 results");

  recordPass("5. Search works across friend names, @handles, and message contents");

  // -------------------------------------------------------------
  // TEST 6: Group chats remain unaffected
  // -------------------------------------------------------------
  // Create a group with Alice and Bob
  const groupRes = await request("/api/groups", {
    method: "POST",
    body: JSON.stringify({
      name: "Chatora Testers Club",
      members: [userB._id],
    }),
  }, userACookie);
  assert.strictEqual(groupRes.status, 201, "Group created successfully (HTTP 201)");
  const createdGroup = groupRes.data;

  // Alice fetches groups
  const groupsListRes = await request("/api/groups", {}, userACookie);
  assert.strictEqual(groupsListRes.status, 200, "Fetching groups returns 200");
  assert.ok(groupsListRes.data.some((g) => String(g._id) === String(createdGroup._id)), "Created group appears in groups list");

  // Direct conversations list is completely unaffected by group
  const convsAfterGroup = await request("/api/conversations?includeFriends=true", {}, userACookie);
  assert.strictEqual(convsAfterGroup.data.length, 2, "Direct chats count remains exactly 2");
  assert.ok(!convsAfterGroup.data.some((c) => String(c.userId) === String(createdGroup._id)), "Group is not in direct chats list");

  recordPass("6. Group chats remain unaffected and separated from direct chats");

  // -------------------------------------------------------------
  // TEST 7: REGRESSION TEST: Friend with existing message history must not be displayed as noMessagesYet
  // -------------------------------------------------------------
  // 1. Send a group message (which sets recipient: null in DB)
  // This verifies that group messages do not cause getConversations to crash on null recipient.
  const groupMsgRes = await request(`/api/groups/${createdGroup._id}/messages`, {
    method: "POST",
    body: JSON.stringify({ text: "Hello team in group!" }),
  }, userACookie);
  assert.strictEqual(groupMsgRes.status, 201, "Alice sent group message successfully");

  // 2. Register Dana (Friend D) who has accepted friendship with Alice but ZERO messages
  const randD = Math.random().toString(36).substring(2, 7);
  const emailD = `discovery_d_${randD}@test.com`;
  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Dana",
      lastName: "Nomessages",
      username: `dana_${randD}`,
      email: emailD,
      password: "Password123!",
    }),
  });
  const usersCollection = mongoose.connection.db.collection("users");
  await usersCollection.updateOne({ email: emailD }, { $set: { verified: true } });
  const loginD = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailD, password: "Password123!" }),
  });
  const userDCookie = loginD.cookie;
  const profD = await request("/api/user/profile", {}, userDCookie);
  const userD = profD.data;

  // Establish friendship Alice <-> Dana
  await request(`/api/friends/request/${userD._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userDCookie);

  // 3. Query direct conversations via API
  const convsAfterGroupMsg = await request("/api/conversations?includeFriends=true", {}, userACookie);
  assert.strictEqual(convsAfterGroupMsg.status, 200, "getConversations succeeds with HTTP 200 after group messages");

  // Bob (friend with message history) MUST NOT have noMessagesYet: true
  const bobAfterGroupMsg = convsAfterGroupMsg.data.find((c) => String(c.userId) === String(userB._id));
  assert.ok(bobAfterGroupMsg, "Bob exists in direct conversations");
  assert.strictEqual(bobAfterGroupMsg.noMessagesYet, false, "Bob (with messages) MUST have noMessagesYet: false");
  assert.ok(bobAfterGroupMsg.lastMessage, "Bob MUST have lastMessage object populated");
  assert.ok(bobAfterGroupMsg.lastMessage.text.length > 0, "Bob lastMessage.text must not be empty");
  assert.ok(bobAfterGroupMsg.lastMessage.createdAt, "Bob lastMessage must have createdAt timestamp");

  // Charlie (friend who received message in test 4) MUST NOT have noMessagesYet: true
  const charlieAfterGroupMsg = convsAfterGroupMsg.data.find((c) => String(c.userId) === String(userC._id));
  assert.ok(charlieAfterGroupMsg, "Charlie exists in direct conversations");
  assert.strictEqual(charlieAfterGroupMsg.noMessagesYet, false, "Charlie (with message from test 4) MUST have noMessagesYet: false");
  assert.ok(charlieAfterGroupMsg.lastMessage?.text, "Charlie has lastMessage populated");

  // Dana (friend with NO messages) MUST have noMessagesYet: true
  const danaAfterGroupMsg = convsAfterGroupMsg.data.find((c) => String(c.userId) === String(userD._id));
  assert.ok(danaAfterGroupMsg, "Dana exists in direct conversations");
  assert.strictEqual(danaAfterGroupMsg.noMessagesYet, true, "Dana (with NO messages) MUST have noMessagesYet: true");
  assert.strictEqual(danaAfterGroupMsg.lastMessage, null, "Dana lastMessage must be null");

  // 4. Test client-side merge simulation from OnlineUserList.jsx
  const friendsListRes = await request("/api/friends", {}, userACookie);
  assert.strictEqual(friendsListRes.status, 200, "GET /api/friends returns 200");
  const friendsFromApi = friendsListRes.data;

  // Run the exact merge logic from OnlineUserList.jsx
  const getContactId = (item) => String(item?.userId || item?._id || "");
  const convMap = new Map();
  for (const c of convsAfterGroupMsg.data || []) {
    const id = getContactId(c);
    if (!id) continue;
    const existing = convMap.get(id);
    if (!existing || (c.lastMessage && !existing.lastMessage)) {
      convMap.set(id, { ...c, _id: id, userId: id });
    }
  }

  const friendsWithoutConvs = [];
  for (const f of friendsFromApi || []) {
    const fId = getContactId(f);
    if (!fId || convMap.has(fId)) continue;
    friendsWithoutConvs.push({
      _id: fId,
      userId: fId,
      noMessagesYet: true,
      lastMessage: null,
    });
  }

  const allConvEntries = Array.from(convMap.values());
  const existingWithMessages = allConvEntries.filter(
    (c) => !c.noMessagesYet && Boolean(c.lastMessage && (c.lastMessage.text || c.lastMessage.isUnsent))
  );
  const convsWithoutMessages = allConvEntries.filter(
    (c) => c.noMessagesYet || !c.lastMessage || (!c.lastMessage.text && !c.lastMessage.isUnsent)
  );
  const mergedActiveConversations = [
    ...existingWithMessages,
    ...convsWithoutMessages,
    ...friendsWithoutConvs.filter(
      (f) => !convsWithoutMessages.some((c) => getContactId(c) === getContactId(f))
    ),
  ];

  // Assert Bob is in existingWithMessages and NOT marked noMessagesYet
  const bobMerged = mergedActiveConversations.find((c) => getContactId(c) === String(userB._id));
  assert.ok(bobMerged, "Bob exists in merged active conversations");
  assert.strictEqual(bobMerged.noMessagesYet, false, "Bob has noMessagesYet: false in merged list");
  assert.ok(bobMerged.lastMessage && bobMerged.lastMessage.text, "Bob has lastMessage in merged list");

  // Assert Charlie is in existingWithMessages and NOT marked noMessagesYet
  const charlieMerged = mergedActiveConversations.find((c) => getContactId(c) === String(userC._id));
  assert.ok(charlieMerged, "Charlie exists in merged active conversations");
  assert.strictEqual(charlieMerged.noMessagesYet, false, "Charlie has noMessagesYet: false in merged list");

  // Assert Dana is marked noMessagesYet: true
  const danaMerged = mergedActiveConversations.find((c) => getContactId(c) === String(userD._id));
  assert.ok(danaMerged, "Dana exists in merged active conversations");
  assert.strictEqual(danaMerged.noMessagesYet, true, "Dana has noMessagesYet: true in merged list");

  recordPass("7. Friend with existing message history must not be displayed as noMessagesYet (regression verified)");

  console.log("==================================================");
  console.log(`ALL DIRECT CHAT DISCOVERY TESTS PASSED: ${passed}/${total}`);
  console.log("==================================================");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
