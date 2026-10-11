const mongoose = require("mongoose");
const WebSocket = require("ws");

const BASE_URL = "http://localhost:4000/api";
const WS_URL = "ws://localhost:4000";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("==================================================");
  console.log("CHATORA — FRIENDSHIP, UNFRIEND & BLOCK TEST SUITE");
  console.log("==================================================");

  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");
  const friendshipsCollection = mongoose.connection.db.collection("friendships");
  const blocksCollection = mongoose.connection.db.collection("blocks");
  const messagesCollection = mongoose.connection.db.collection("messages");

  // Step 0: Create dedicated test accounts
  const emailA = "friend_user_a@test.com";
  const emailB = "friend_user_b@test.com";
  const emailC = "friend_user_c@test.com";

  await usersCollection.deleteMany({ email: { $in: [emailA, emailB, emailC] } });

  console.log("\n[SETUP] Creating test users A, B, and C...");
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
    if (res.status !== 201) throw new Error(`Registration failed for ${email}`);
    await usersCollection.updateOne({ email }, { $set: { verified: true } });
  };

  await registerUser("FriendA", "Alpha", "frienda_test", emailA);
  await registerUser("FriendB", "Beta", "friendb_test", emailB);
  await registerUser("FriendC", "Charlie", "friendc_test", emailC);

  const loginUser = async (email) => {
    const res = await fetch(`${BASE_URL}/user/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: "Password123!" }),
    });
    if (res.status !== 200) throw new Error(`Login failed for ${email}`);
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

  console.log(`User A ID: ${userA.profile._id}`);
  console.log(`User B ID: ${userB.profile._id}`);
  console.log(`User C ID: ${userC.profile._id}`);

  // Clean any relationships between them
  await friendshipsCollection.deleteMany({});
  await blocksCollection.deleteMany({});
  await messagesCollection.deleteMany({
    $or: [
      { sender: new mongoose.Types.ObjectId(userA.profile._id) },
      { recipient: new mongoose.Types.ObjectId(userA.profile._id) },
      { sender: new mongoose.Types.ObjectId(userB.profile._id) },
      { recipient: new mongoose.Types.ObjectId(userB.profile._id) },
    ],
  });

  // Setup WebSocket clients
  const connectWs = (cookie) => {
    return new Promise((resolve, reject) => {
      const client = new WebSocket(WS_URL, { headers: { Cookie: cookie } });
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
  console.log("WebSocket connections established.");
  await sleep(600);

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
  // TEST 1: NON-FRIENDS CANNOT CHAT (REST & WS)
  // ==========================================
  console.log("\n--- Testing Non-Friends Cannot Chat (Rule Enforcement) ---");

  // REST attempt to message non-friend
  const nonFriendRest = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Hello before friendship" }),
  });
  const nonFriendRestData = await nonFriendRest.json();
  assert(
    "1. REST sending message to non-friend returns 403 Forbidden",
    nonFriendRest.status === 403 &&
      nonFriendRestData.message === "You can only message friends."
  );

  // WebSocket attempt to message non-friend
  wsA.receivedMessages = [];
  wsA.send(
    JSON.stringify({
      recipient: userB.profile._id,
      text: "WS message before friendship",
      tempId: "tmp-1",
    })
  );
  await sleep(400);

  const wsError = wsA.receivedMessages.find(
    (m) => m.type === "message_error" && m.error === "You can only message friends."
  );
  assert("2. WebSocket sending message to non-friend returns safe message_error event", !!wsError);

  // Verify no message saved in DB between userA and userB
  const countPre = await messagesCollection.countDocuments({
    $or: [
      { sender: new mongoose.Types.ObjectId(userA.profile._id) },
      { recipient: new mongoose.Types.ObjectId(userA.profile._id) },
    ],
  });
  assert("3. No message was created in database between userA and userB", countPre === 0);

  // ==========================================
  // TEST 2: RELATIONSHIP STATE IS NOT_CONNECTED
  // ==========================================
  console.log("\n--- Testing Relationship State (NOT_CONNECTED) ---");
  const statusRes1 = await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
    headers: { Cookie: userA.cookie },
  });
  const statusData1 = await statusRes1.json();
  assert("4. Initial relationship status is NOT_CONNECTED", statusData1.status === "NOT_CONNECTED");

  // People API returns relationshipStatus
  const peopleRes = await fetch(`${BASE_URL}/user/people?q=friendb`, {
    headers: { Cookie: userA.cookie },
  });
  const peopleData = await peopleRes.json();
  assert(
    "5. People API returns relationshipStatus: NOT_CONNECTED",
    peopleData.length > 0 && peopleData[0].relationshipStatus === "NOT_CONNECTED"
  );

  // ==========================================
  // TEST 3: SEND FRIEND REQUEST & REAL-TIME NOTIFICATION
  // ==========================================
  console.log("\n--- Testing Friend Request Creation & WS Event ---");
  wsB.receivedMessages = [];

  const reqRes = await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  const reqData = await reqRes.json();
  assert("6. User A sends friend request to B (HTTP 201)", reqRes.status === 201 && reqData.status === "PENDING_SENT");

  // Verify relationship states
  const statusA_pending = await (
    await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  const statusB_pending = await (
    await fetch(`${BASE_URL}/friends/status/${userA.profile._id}`, {
      headers: { Cookie: userB.cookie },
    })
  ).json();

  assert("7. User A sees status: PENDING_SENT", statusA_pending.status === "PENDING_SENT");
  assert("8. User B sees status: PENDING_RECEIVED", statusB_pending.status === "PENDING_RECEIVED");

  // Verify User B received real-time WebSocket notification
  await sleep(400);
  const friendReqEvent = wsB.receivedMessages.find(
    (m) => m.type === "friend_request_received" && m.from._id.toString() === userA.profile._id.toString()
  );
  assert("9. User B immediately receives friend_request_received WebSocket event", !!friendReqEvent);

  // Duplicate request prevention
  const dupReq = await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("10. Sending duplicate friend request returns 400 Bad Request", dupReq.status === 400);

  // Cannot send friend request to yourself
  const selfReq = await fetch(`${BASE_URL}/friends/request/${userA.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("11. Sending friend request to self returns 400 Bad Request", selfReq.status === 400);

  // ==========================================
  // TEST 4: CANCEL SENT FRIEND REQUEST
  // ==========================================
  console.log("\n--- Testing Cancel Friend Request ---");
  const cancelRes = await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("12. User A cancels sent friend request (HTTP 200)", cancelRes.status === 200);

  const statusAfterCancel = await (
    await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert("13. Relationship status returns to NOT_CONNECTED", statusAfterCancel.status === "NOT_CONNECTED");

  // ==========================================
  // TEST 5: DECLINE FRIEND REQUEST
  // ==========================================
  console.log("\n--- Testing Decline Friend Request ---");
  // A sends request again
  await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });

  // B declines request
  const declineRes = await fetch(`${BASE_URL}/friends/request/${userA.profile._id}/decline`, {
    method: "POST",
    headers: { Cookie: userB.cookie },
  });
  assert("14. User B declines friend request (HTTP 200)", declineRes.status === 200);

  const statusAfterDecline = await (
    await fetch(`${BASE_URL}/friends/status/${userA.profile._id}`, {
      headers: { Cookie: userB.cookie },
    })
  ).json();
  assert("15. Relationship status returns to NOT_CONNECTED after decline", statusAfterDecline.status === "NOT_CONNECTED");

  // ==========================================
  // TEST 6: ACCEPT FRIEND REQUEST & MESSAGING
  // ==========================================
  console.log("\n--- Testing Accept Friend Request & Friend Messaging ---");
  wsA.receivedMessages = [];

  // A sends request again
  await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });

  // B accepts request
  const acceptRes = await fetch(`${BASE_URL}/friends/request/${userA.profile._id}/accept`, {
    method: "POST",
    headers: { Cookie: userB.cookie },
  });
  assert("16. User B accepts friend request (HTTP 200)", acceptRes.status === 200);

  // Check WS acceptance event on User A
  await sleep(400);
  const acceptEvent = wsA.receivedMessages.find(
    (m) => m.type === "friend_request_accepted" && m.by._id.toString() === userB.profile._id.toString()
  );
  assert("17. User A receives friend_request_accepted WebSocket event", !!acceptEvent);

  // Check statuses
  const statusA_friends = await (
    await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert("18. Both users now have status FRIENDS", statusA_friends.status === "FRIENDS");

  // Both can now message each other over REST and WS!
  const msgRest = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Hello friend via REST!" }),
  });
  assert("19. User A sends message to friend B via REST (HTTP 201)", msgRest.status === 201);

  // User B sends message to A via WebSocket
  wsA.receivedMessages = [];
  wsB.send(
    JSON.stringify({
      recipient: userA.profile._id,
      text: "Hello friend via WebSocket!",
      tempId: "tmp-friend-ws",
    })
  );
  await sleep(400);

  const receivedWsMsg = wsA.receivedMessages.find(
    (m) => m.text === "Hello friend via WebSocket!"
  );
  assert("20. User B sends message to friend A via WebSocket successfully", !!receivedWsMsg);

  // Check Friends list endpoint
  const friendsList = await (
    await fetch(`${BASE_URL}/friends`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert("21. GET /api/friends returns User B in friends list", friendsList.some((f) => f._id.toString() === userB.profile._id.toString()));

  // ==========================================
  // TEST 7: UNFRIEND USER
  // ==========================================
  console.log("\n--- Testing Unfriend ---");
  const unfriendRes = await fetch(`${BASE_URL}/friends/${userB.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("22. User A unfriends User B (HTTP 200)", unfriendRes.status === 200);

  const statusAfterUnfriend = await (
    await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert("23. Status after unfriend is NOT_CONNECTED", statusAfterUnfriend.status === "NOT_CONNECTED");

  // Verify chat history was NOT deleted!
  const historyAfterUnfriend = await (
    await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert("24. Chat history is preserved after unfriend", historyAfterUnfriend.length >= 2);

  // New messages are rejected again!
  const rejectedRest = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Message after unfriend" }),
  });
  assert("25. New messages rejected after unfriend (HTTP 403)", rejectedRest.status === 403);

  // ==========================================
  // TEST 8: BLOCK AND UNBLOCK
  // ==========================================
  console.log("\n--- Testing Block and Unblock System ---");

  // A blocks B
  const blockRes = await fetch(`${BASE_URL}/friends/block/${userB.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("26. User A blocks User B (HTTP 200)", blockRes.status === 200);

  const statusA_blocked = await (
    await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  const statusB_blocked = await (
    await fetch(`${BASE_URL}/friends/status/${userA.profile._id}`, {
      headers: { Cookie: userB.cookie },
    })
  ).json();

  assert("27. Blocker sees status BLOCKED", statusA_blocked.status === "BLOCKED");
  assert("28. Blocked user sees status BLOCKED_BY_USER", statusB_blocked.status === "BLOCKED_BY_USER");

  // Blocked user cannot send friend request
  const blockedReq = await fetch(`${BASE_URL}/friends/request/${userA.profile._id}`, {
    method: "POST",
    headers: { Cookie: userB.cookie },
  });
  assert("29. Blocked user cannot send friend request (HTTP 403)", blockedReq.status === 403);

  // Blocked user cannot send message via REST
  const blockedMsgRest = await fetch(`${BASE_URL}/messages/${userA.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userB.cookie,
    },
    body: JSON.stringify({ text: "Trying to message blocker" }),
  });
  assert("30. Blocked user cannot send message via REST (HTTP 403)", blockedMsgRest.status === 403);

  // Blocked user cannot send message via WebSocket
  wsB.receivedMessages = [];
  wsB.send(
    JSON.stringify({
      recipient: userA.profile._id,
      text: "Trying WS message to blocker",
      tempId: "tmp-block",
    })
  );
  await sleep(400);
  const wsBlockError = wsB.receivedMessages.find(
    (m) => m.type === "message_error" && m.error.includes("blocked")
  );
  assert("31. Blocked WebSocket message safely rejected", !!wsBlockError);

  // Messages are NOT physically deleted from database
  const historyAfterBlock = await (
    await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert("32. Chat history in database is NOT deleted by blocking", historyAfterBlock.length >= 2);

  // A unblocks B
  const unblockRes = await fetch(`${BASE_URL}/friends/block/${userB.profile._id}`, {
    method: "DELETE",
    headers: { Cookie: userA.cookie },
  });
  assert("33. User A unblocks User B (HTTP 200)", unblockRes.status === 200);

  const statusAfterUnblock = await (
    await fetch(`${BASE_URL}/friends/status/${userB.profile._id}`, {
      headers: { Cookie: userA.cookie },
    })
  ).json();
  assert(
    "34. After unblock, friendship does NOT automatically return (NOT_CONNECTED)",
    statusAfterUnblock.status === "NOT_CONNECTED"
  );

  // Still cannot message until new friend request is accepted
  const postUnblockMsg = await fetch(`${BASE_URL}/messages/${userB.profile._id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: userA.cookie,
    },
    body: JSON.stringify({ text: "Post unblock message" }),
  });
  assert("35. Messaging remains disabled after unblock until friend request (HTTP 403)", postUnblockMsg.status === 403);

  // ==========================================
  // TEST 9: UNAUTHORIZED ACTIONS & BOUNDARIES
  // ==========================================
  console.log("\n--- Testing Unauthorized Actions & Input Validation ---");

  // User A sends request to B
  await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });

  // User C tries to accept request sent between A and B
  const unauthorizedAccept = await fetch(`${BASE_URL}/friends/request/${userA.profile._id}/accept`, {
    method: "POST",
    headers: { Cookie: userC.cookie },
  });
  assert("36. Unauthorized user C cannot accept A-B friend request (HTTP 404)", unauthorizedAccept.status === 404);

  // User C tries to decline request
  const unauthorizedDecline = await fetch(`${BASE_URL}/friends/request/${userA.profile._id}/decline`, {
    method: "POST",
    headers: { Cookie: userC.cookie },
  });
  assert("37. Unauthorized user C cannot decline A-B friend request (HTTP 404)", unauthorizedDecline.status === 404);

  // Malformed ID
  const malformedReq = await fetch(`${BASE_URL}/friends/request/invalid-id`, {
    method: "POST",
    headers: { Cookie: userA.cookie },
  });
  assert("38. Malformed user ID returns 400 Bad Request", malformedReq.status === 400);

  // Unauthenticated request
  const noAuthReq = await fetch(`${BASE_URL}/friends/request/${userB.profile._id}`, {
    method: "POST",
  });
  assert("39. Unauthenticated request returns 401 Unauthorized", noAuthReq.status === 401);

  // Clean up
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
