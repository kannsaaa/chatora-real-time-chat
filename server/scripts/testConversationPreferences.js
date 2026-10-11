const mongoose = require("mongoose");

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

  const emailA = `pref_a_${rand}@test.com`;
  const emailB = `pref_b_${rand}@test.com`;
  const emailC = `pref_c_${rand}@test.com`;

  // 1. Register Users
  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "PrefUserA",
      lastName: "Test",
      username: `prefa_${rand}`,
      email: emailA,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailA }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "PrefUserB",
      lastName: "Test",
      username: `prefb_${rand}`,
      email: emailB,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailB }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "PrefUserC",
      lastName: "Test",
      username: `prefc_${rand}`,
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

  // Make A and B friends
  await request(`/api/friends/request/${userB._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userBCookie);

  // Make A and C friends
  await request(`/api/friends/request/${userC._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userCCookie);

  // Send messages: A -> B and A -> C
  await request(`/api/user/messages/${userB._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Hello User B" }),
  }, userACookie);

  await request(`/api/user/messages/${userC._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Hello User C" }),
  }, userACookie);
}

async function runTests() {
  console.log("==================================================");
  console.log("CHATORA — CONVERSATION PREFERENCES & LIST TEST SUITE");
  console.log("==================================================");

  await setup();

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

  // 1. Auth required
  const unauthRes = await request("/api/conversations");
  assert(unauthRes.status === 401, "GET /api/conversations without auth returns 401");

  // 2. Fetch conversations for User A
  const convRes = await request("/api/conversations", {}, userACookie);
  assert(convRes.status === 200, "GET /api/conversations returns 200");
  assert(Array.isArray(convRes.data) && convRes.data.length === 2, "User A has 2 active conversations (B and C)");

  // 3. Pin conversation with User B
  const pinRes1 = await request(`/api/conversations/${userB._id}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ isPinned: true }),
  }, userACookie);
  assert(pinRes1.status === 200 && pinRes1.data.isPinned === true, "User A pins User B (HTTP 200, isPinned: true)");

  // 4. Verify pinned conversation appears first
  const listAfterPin = await request("/api/conversations", {}, userACookie);
  assert(String(listAfterPin.data[0].userId) === String(userB._id) && listAfterPin.data[0].isPinned === true, "Pinned User B appears first in conversation list");

  // 5. Unpin conversation with User B
  const unpinRes = await request(`/api/conversations/${userB._id}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ isPinned: false }),
  }, userACookie);
  assert(unpinRes.status === 200 && unpinRes.data.isPinned === false, "User A unpins User B (HTTP 200, isPinned: false)");

  // 6. Mute notifications for User C
  const muteRes = await request(`/api/conversations/${userC._id}/mute`, {
    method: "PATCH",
    body: JSON.stringify({ isMuted: true }),
  }, userACookie);
  assert(muteRes.status === 200 && muteRes.data.isMuted === true, "User A mutes User C (HTTP 200, isMuted: true)");

  // 7. Check list reflects muted state
  const listAfterMute = await request("/api/conversations", {}, userACookie);
  const convC = listAfterMute.data.find(c => String(c.userId) === String(userC._id));
  assert(convC && convC.isMuted === true, "User C conversation reflects isMuted: true");

  // 8. Unmute notifications for User C
  const unmuteRes = await request(`/api/conversations/${userC._id}/mute`, {
    method: "PATCH",
    body: JSON.stringify({ isMuted: false }),
  }, userACookie);
  assert(unmuteRes.status === 200 && unmuteRes.data.isMuted === false, "User A unmutes User C (HTTP 200, isMuted: false)");

  // 9. Mark conversation with User B as unread
  const unreadRes = await request(`/api/conversations/${userB._id}/unread`, {
    method: "PATCH",
    body: JSON.stringify({ isUnread: true }),
  }, userACookie);
  assert(unreadRes.status === 200 && unreadRes.data.isUnread === true, "User A marks User B conversation as unread (HTTP 200, isUnread: true)");

  // 10. Verify list reflects isUnread
  const listAfterUnread = await request("/api/conversations", {}, userACookie);
  const convB = listAfterUnread.data.find(c => String(c.userId) === String(userB._id));
  assert(convB && convB.isUnread === true, "User B conversation reflects isUnread: true");

  // 11. Mark conversation with User B as read
  const readRes = await request(`/api/conversations/${userB._id}/unread`, {
    method: "PATCH",
    body: JSON.stringify({ isUnread: false }),
  }, userACookie);
  assert(readRes.status === 200 && readRes.data.isUnread === false, "User A marks User B conversation as read (HTTP 200, isUnread: false)");

  // 12. Delete conversation with User B
  const delRes = await request(`/api/conversations/${userB._id}`, {
    method: "DELETE",
  }, userACookie);
  assert(delRes.status === 200, "DELETE /api/conversations/:userId deletes conversation for User A");

  // 13. Verify User B is removed from User A's conversation list
  const listAfterDel = await request("/api/conversations", {}, userACookie);
  assert(listAfterDel.data.length === 1 && String(listAfterDel.data[0].userId) === String(userC._id), "User B is no longer in User A's conversation list");

  // 14. Verify User B still sees the conversation with User A
  const listB = await request("/api/conversations", {}, userBCookie);
  assert(listB.data.some(c => String(c.userId) === String(userA._id)), "User B still has conversation with User A intact");

  // 15. Verify friendship between A and B is STILL ACCEPTED
  const friendStatusRes = await request(`/api/friends/status/${userB._id}`, {}, userACookie);
  assert(friendStatusRes.data.status === "FRIENDS", "Deleting conversation did NOT unfriend User A and User B");

  // 16. Test validation: cannot pin yourself
  const pinSelf = await request(`/api/conversations/${userA._id}/pin`, {
    method: "PATCH",
    body: JSON.stringify({ isPinned: true }),
  }, userACookie);
  assert(pinSelf.status === 400, "Cannot pin conversation with oneself returns 400");

  // 17. Test validation: malformed userId returns 400
  const malformedPin = await request("/api/conversations/not-a-valid-id/pin", {
    method: "PATCH",
    body: JSON.stringify({ isPinned: true }),
  }, userACookie);
  assert(malformedPin.status === 400, "Malformed userId returns 400");

  console.log("==================================================");
  console.log(`ALL TESTS PASSED: ${passed}/${total}`);
  console.log("==================================================");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed with exception:", err);
  process.exit(1);
});
