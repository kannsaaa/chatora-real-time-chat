const mongoose = require("mongoose");
const WebSocket = require("ws");

const BASE_URL = "http://localhost:4000/api";
const WS_URL = "ws://localhost:4000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("==================================================");
  console.log("CHATORA — GROUP CHAT BACKEND TEST SUITE");
  console.log("==================================================");

  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");
  const messagesCollection = mongoose.connection.db.collection("messages");
  const friendshipsCollection = mongoose.connection.db.collection("friendships");
  const blocksCollection = mongoose.connection.db.collection("blocks");
  const groupsCollection = mongoose.connection.db.collection("groups");

  // Step 0: Ensure four test accounts exist
  const emailA = "group_test_user_a@test.com";
  const emailB = "group_test_user_b@test.com";
  const emailC = "group_test_user_c@test.com";
  const emailD = "group_test_user_d@test.com";

  await usersCollection.deleteMany({
    email: { $in: [emailA, emailB, emailC, emailD] },
  });

  console.log("\n[SETUP] Creating test users A, B, C, and D...");
  const registerUser = async (firstName, lastName, username, email) => {
    const res = await fetch(`${BASE_URL}/user/register`, {
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

  await registerUser("UserA", "GroupAdmin", "usera_grp", emailA);
  await registerUser("UserB", "MemberOne", "userb_grp", emailB);
  await registerUser("UserC", "MemberTwo", "userc_grp", emailC);
  await registerUser("UserD", "BlockedGuy", "userd_grp", emailD);

  const loginUser = async (email) => {
    const res = await fetch(`${BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    if (res.status !== 200) {
      throw new Error(`Login failed for ${email}`);
    }
    const rawCookie = res.headers.get("set-cookie");
    const cookie = rawCookie ? rawCookie.split(";")[0] : "";
    const profileRes = await fetch(`${BASE_URL}/user/profile`, {
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
  // A & C are FRIENDS
  // B & C are FRIENDS
  // A & D are BLOCKED
  // C & D are NOT_CONNECTED
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
  await groupsCollection.deleteMany({
    members: { $in: testIds },
  });
  await messagesCollection.deleteMany({
    $or: [{ sender: { $in: testIds } }, { recipient: { $in: testIds } }],
  });

  const makeFriends = async (u1, u2) => {
    await friendshipsCollection.insertOne({
      canonicalPair: Friendship.getCanonicalPair(u1.profile._id, u2.profile._id),
      requester: new mongoose.Types.ObjectId(u1.profile._id),
      recipient: new mongoose.Types.ObjectId(u2.profile._id),
      status: "ACCEPTED",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  await makeFriends(userA, userB);
  await makeFriends(userA, userC);
  await makeFriends(userB, userC);

  await blocksCollection.insertOne({
    blocker: new mongoose.Types.ObjectId(userA.profile._id),
    blocked: new mongoose.Types.ObjectId(userD.profile._id),
    createdAt: new Date(),
  });

  console.log("Friendships and blocks configured.");

  // Establish WebSockets for User A, User B, and User C
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
  const wsC = await connectWs(userC.cookie);
  console.log("WebSocket connections established for A, B, and C.");

  const wsMessagesA = [];
  const wsMessagesB = [];
  const wsMessagesC = [];
  wsA.on("message", (d) => {
    try {
      wsMessagesA.push(JSON.parse(d.toString()));
    } catch (_) {}
  });
  wsB.on("message", (d) => {
    try {
      wsMessagesB.push(JSON.parse(d.toString()));
    } catch (_) {}
  });
  wsC.on("message", (d) => {
    try {
      wsMessagesC.push(JSON.parse(d.toString()));
    } catch (_) {}
  });

  let passed = 0;
  let total = 0;
  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`✓ [PASS ${total}] ${message}`);
      passed++;
    } else {
      console.error(`✗ [FAIL ${total}] ${message}`);
      process.exit(1);
    }
  }

  // TEST 1: Unauthenticated group creation -> 401
  const res1 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Dev Team", members: [userB.profile._id] }),
  });
  assert(res1.status === 401, "Unauthenticated group creation returns 401");

  // TEST 2: Missing group name -> 400
  const res2 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({ name: "", members: [userB.profile._id] }),
  });
  assert(res2.status === 400, "Empty group name returns 400");

  // TEST 3: Whitespace group name -> 400
  const res3 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({ name: "   ", members: [userB.profile._id] }),
  });
  assert(res3.status === 400, "Whitespace group name returns 400");

  // TEST 4: Group name > 50 chars -> 400
  const res4 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({
      name: "A".repeat(55),
      members: [userB.profile._id],
    }),
  });
  assert(res4.status === 400, "Group name > 50 characters returns 400");

  // TEST 5: Cannot create group with no friends -> 400
  const res5 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({ name: "Solo Group", members: [] }),
  });
  assert(res5.status === 400, "Creating group with 0 friends returns 400");

  // TEST 6: Reject non-friend member addition -> 403
  // User A and User D are not friends (in fact, blocked)
  const res6 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({ name: "Blocked Group", members: [userD.profile._id] }),
  });
  assert(res6.status === 403, "Cannot add blocked user to group (returns 403)");

  // TEST 7: Valid group creation with User B
  const res7 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({
      name: "🚀 Chatora Devs",
      avatar: "https://avatar.iran.liara.run/public/1",
      members: [userB.profile._id],
    }),
  });
  assert(res7.status === 201, "Valid group created successfully (returns 201)");
  const group1 = await res7.json();
  assert(group1.name === "🚀 Chatora Devs", "Group name matches input");
  assert(
    group1.admins.some((a) => a._id.toString() === userA.profile._id.toString()),
    "Creator automatically becomes ADMIN"
  );
  assert(
    group1.members.length === 2 &&
      group1.members.some((m) => m._id.toString() === userB.profile._id.toString()),
    "Creator and invited friend are both members"
  );

  // TEST 8: GET /api/groups for User A and User B
  const res8A = await fetch(`${BASE_URL}/groups`, {
    headers: { Cookie: userA.cookie },
  });
  const groupsA = await res8A.json();
  assert(
    groupsA.some((g) => g._id.toString() === group1._id.toString()),
    "User A sees created group in their group list"
  );

  const res8B = await fetch(`${BASE_URL}/groups`, {
    headers: { Cookie: userB.cookie },
  });
  const groupsB = await res8B.json();
  assert(
    groupsB.some((g) => g._id.toString() === group1._id.toString()),
    "User B sees group in their group list"
  );

  // User C should NOT see this group
  const res8C = await fetch(`${BASE_URL}/groups`, {
    headers: { Cookie: userC.cookie },
  });
  const groupsC = await res8C.json();
  assert(
    !groupsC.some((g) => g._id.toString() === group1._id.toString()),
    "Non-member User C does not see the group"
  );

  // TEST 9: Non-admin User B cannot add member User C
  const res9 = await fetch(`${BASE_URL}/groups/${group1._id}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookie },
    body: JSON.stringify({ members: [userC.profile._id] }),
  });
  assert(res9.status === 403, "Non-admin cannot add members (returns 403)");

  // TEST 10: Admin User A adds member User C
  const res10 = await fetch(`${BASE_URL}/groups/${group1._id}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({ members: [userC.profile._id] }),
  });
  assert(res10.status === 200, "Admin User A successfully adds User C (returns 200)");
  const groupUpdatedWithC = await res10.json();
  assert(
    groupUpdatedWithC.members.length === 3,
    "Group now contains 3 members (A, B, C)"
  );

  // TEST 11: User A sends group message via WebSocket
  wsMessagesB.length = 0;
  wsMessagesC.length = 0;
  const tempId1 = "group-msg-" + Date.now();
  wsA.send(
    JSON.stringify({
      groupId: group1._id,
      text: "Hello Chatora Devs! Welcome to the group chat.",
      tempId: tempId1,
    })
  );
  await sleep(600);

  const msgOnB = wsMessagesB.find(
    (m) => m.text && m.text.includes("Hello Chatora Devs!")
  );
  assert(!!msgOnB, "User B received group message in real time via WebSocket");
  const msgOnC = wsMessagesC.find(
    (m) => m.text && m.text.includes("Hello Chatora Devs!")
  );
  assert(!!msgOnC, "User C received group message in real time via WebSocket");

  // TEST 12: Group message persistence and GET /api/groups/:groupId/messages
  const resMessages = await fetch(`${BASE_URL}/groups/${group1._id}/messages`, {
    headers: { Cookie: userB.cookie },
  });
  assert(resMessages.status === 200, "Member can fetch group message history");
  const fetchedGroupMsgs = await resMessages.json();
  assert(
    fetchedGroupMsgs.length >= 1 &&
      fetchedGroupMsgs[0].text.includes("Hello Chatora Devs!"),
    "Group message is persistently saved in database"
  );
  const firstGroupMsgId = fetchedGroupMsgs[0]._id;

  // TEST 13: Non-member cannot fetch group messages
  const resUnauthMsgs = await fetch(`${BASE_URL}/groups/${group1._id}/messages`, {
    headers: { Cookie: userD.cookie },
  });
  assert(
    resUnauthMsgs.status === 403,
    "Non-member User D receives 403 trying to fetch group messages"
  );

  // TEST 14: User B replies to User A's message in the group
  wsMessagesA.length = 0;
  wsMessagesC.length = 0;
  const tempId2 = "group-reply-" + Date.now();
  wsB.send(
    JSON.stringify({
      groupId: group1._id,
      text: "Glad to be here! Let us ship this.",
      replyTo: firstGroupMsgId,
      tempId: tempId2,
    })
  );
  await sleep(600);

  const replyOnA = wsMessagesA.find(
    (m) => m.text && m.text.includes("Glad to be here!")
  );
  assert(!!replyOnA, "User A received group reply in real time");
  assert(
    replyOnA &&
      replyOnA.replyTo &&
      replyOnA.replyTo.text.includes("Hello Chatora Devs!"),
    "Group reply contains populated quoted replyTo block"
  );

  // TEST 15: Cross-group reply rejected
  // Create another group between B and C
  const resGroup2 = await fetch(`${BASE_URL}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookie },
    body: JSON.stringify({ name: "Design Team", members: [userC.profile._id] }),
  });
  const group2 = await resGroup2.json();

  // Try to reply to group1 message inside group2
  const resCrossReply = await fetch(`${BASE_URL}/groups/${group2._id}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: userB.cookie },
    body: JSON.stringify({
      text: "Illegal cross-group reply",
      replyTo: firstGroupMsgId,
    }),
  });
  assert(
    resCrossReply.status === 400,
    "Cross-group reply is safely rejected (returns 400)"
  );

  // TEST 16: Delete for me in group message
  const resDeleteForMe = await fetch(
    `${BASE_URL}/user/messages/${firstGroupMsgId}`,
    {
      method: "DELETE",
      headers: { Cookie: userC.cookie },
    }
  );
  assert(resDeleteForMe.status === 200, "User C deleted group message for me");

  const resMessagesAfterDel = await fetch(
    `${BASE_URL}/groups/${group1._id}/messages`,
    {
      headers: { Cookie: userC.cookie },
    }
  );
  const msgsAfterDelC = await resMessagesAfterDel.json();
  assert(
    !msgsAfterDelC.some((m) => m._id.toString() === firstGroupMsgId.toString()),
    "Message is hidden for User C"
  );

  // Message is still visible for User A and User B
  const resMessagesForA = await fetch(
    `${BASE_URL}/groups/${group1._id}/messages`,
    {
      headers: { Cookie: userA.cookie },
    }
  );
  const msgsForA = await resMessagesForA.json();
  assert(
    msgsForA.some((m) => m._id.toString() === firstGroupMsgId.toString()),
    "Message remains visible for User A"
  );

  // TEST 17: Unsend group message
  const resUnsend = await fetch(
    `${BASE_URL}/user/messages/${firstGroupMsgId}/unsend`,
    {
      method: "POST",
      headers: { Cookie: userA.cookie },
    }
  );
  assert(resUnsend.status === 200, "User A unsent their group message");

  const resMsgsAfterUnsend = await fetch(
    `${BASE_URL}/groups/${group1._id}/messages`,
    {
      headers: { Cookie: userB.cookie },
    }
  );
  const msgsAfterUnsendB = await resMsgsAfterUnsend.json();
  const unsentDoc = msgsAfterUnsendB.find(
    (m) => m._id.toString() === firstGroupMsgId.toString()
  );
  assert(
    unsentDoc && unsentDoc.isUnsent && unsentDoc.text === "",
    "Group message is marked unsent and text is sanitized"
  );

  // TEST 18: Admin renames group
  const resRename = await fetch(`${BASE_URL}/groups/${group1._id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: userA.cookie },
    body: JSON.stringify({ name: "🌟 Chatora Elite Devs" }),
  });
  assert(resRename.status === 200, "Admin successfully renamed group");
  const renamedGroup = await resRename.json();
  assert(
    renamedGroup.name === "🌟 Chatora Elite Devs",
    "Renamed group has updated title"
  );

  // Non-admin User B cannot rename group
  const resRenameB = await fetch(`${BASE_URL}/groups/${group1._id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: userB.cookie },
    body: JSON.stringify({ name: "Hacked Name" }),
  });
  assert(resRenameB.status === 403, "Non-admin rename rejected with 403");

  // TEST 19: Admin removes User C
  const resRemoveC = await fetch(
    `${BASE_URL}/groups/${group1._id}/members/${userC.profile._id}`,
    {
      method: "DELETE",
      headers: { Cookie: userA.cookie },
    }
  );
  assert(resRemoveC.status === 200, "Admin removed User C from group");

  // User C can no longer send messages to group1
  const resSendRemoved = await fetch(
    `${BASE_URL}/groups/${group1._id}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: userC.cookie },
      body: JSON.stringify({ text: "I was removed, let me in!" }),
    }
  );
  assert(
    resSendRemoved.status === 403,
    "Removed User C cannot send messages to group (returns 403)"
  );

  // TEST 20: Member User B leaves group
  const resLeaveB = await fetch(`${BASE_URL}/groups/${group1._id}/leave`, {
    method: "POST",
    headers: { Cookie: userB.cookie },
  });
  assert(resLeaveB.status === 200, "Member User B leaves group (returns 200)");

  // User B's group list no longer shows group1
  const resGroupsAfterLeaveB = await fetch(`${BASE_URL}/groups`, {
    headers: { Cookie: userB.cookie },
  });
  const groupsAfterLeaveB = await resGroupsAfterLeaveB.json();
  assert(
    !groupsAfterLeaveB.some((g) => g._id.toString() === group1._id.toString()),
    "Group disappears from User B's active list after leaving"
  );

  // Close WebSockets and Mongo
  wsA.close();
  wsB.close();
  wsC.close();
  await mongoose.disconnect();

  console.log("==================================================");
  console.log(`ALL GROUP BACKEND TESTS PASSED: ${passed}/${total}`);
  console.log("==================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
