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

  const emailA = `chaos_a_${rand}@test.com`;
  const emailB = `chaos_b_${rand}@test.com`;
  const emailC = `chaos_c_${rand}@test.com`;

  // 1. Register Users
  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "ChaosUserA",
      lastName: "Test",
      username: `chaosa_${rand}`,
      email: emailA,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailA }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "ChaosUserB",
      lastName: "Test",
      username: `chaosb_${rand}`,
      email: emailB,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailB }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "ChaosUserC",
      lastName: "Test",
      username: `chaosc_${rand}`,
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

  // Make A and B friends (A and C are NOT friends)
  await request(`/api/friends/request/${userB._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userBCookie);
}

async function runTests() {
  console.log("==================================================");
  console.log("CHATORA — CHAOS MODE BACKEND TEST SUITE");
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

  // 1. Unauthenticated request -> 401
  const unauth = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ICEBREAKER", conversationUserId: userB._id }),
  });
  assert(unauth.status === 401, "Unauthenticated request returns 401");

  // 2. Missing/Invalid Mode -> 400
  const invalidMode = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "NOT_A_MODE", conversationUserId: userB._id }),
  }, userACookie);
  assert(invalidMode.status === 400, "Invalid mode returns 400");

  // 3. Malformed user ID -> 400
  const malformedId = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ICEBREAKER", conversationUserId: "not-an-id" }),
  }, userACookie);
  assert(malformedId.status === 400, "Malformed user ID returns 400");

  // 4. Target user is self -> 400
  const selfTarget = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ICEBREAKER", conversationUserId: userA._id }),
  }, userACookie);
  assert(selfTarget.status === 400, "Self target returns 400");

  // 5. Non-friend target (User C) -> 403 Forbidden
  const nonFriend = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ICEBREAKER", conversationUserId: userC._id }),
  }, userACookie);
  assert(nonFriend.status === 403, "Non-friend target returns 403 Forbidden");

  // 6. Blocked user target -> 403 Forbidden
  // Temporarily block B
  await request(`/api/friends/block/${userB._id}`, { method: "POST" }, userACookie);
  const blockedTarget = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ICEBREAKER", conversationUserId: userB._id }),
  }, userACookie);
  assert(blockedTarget.status === 403, "Blocked user target returns 403 Forbidden");

  // Unblock and restore friendship between A and B
  await request(`/api/friends/block/${userB._id}`, { method: "DELETE" }, userACookie);
  await request(`/api/friends/request/${userB._id}`, { method: "POST" }, userACookie);
  await request(`/api/friends/request/${userA._id}/accept`, { method: "POST" }, userBCookie);

  // 7. Mode: RANDOM_QUESTION
  const resQuestion = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "RANDOM_QUESTION", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resQuestion.status === 200 &&
    resQuestion.data.mode === "RANDOM_QUESTION" &&
    typeof resQuestion.data.content === "string" &&
    typeof resQuestion.data.chatText === "string",
    "RANDOM_QUESTION mode returns valid content and chatText"
  );

  // 8. Mode: ICEBREAKER
  const resIce = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ICEBREAKER", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resIce.status === 200 &&
    resIce.data.mode === "ICEBREAKER" &&
    typeof resIce.data.content === "string" &&
    typeof resIce.data.chatText === "string",
    "ICEBREAKER mode returns valid content and chatText"
  );

  // 9. Mode: ROAST
  const resRoast = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "ROAST", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resRoast.status === 200 &&
    resRoast.data.mode === "ROAST" &&
    typeof resRoast.data.content === "string" &&
    resRoast.data.chatText.includes("ROAST"),
    "ROAST mode returns playful banter and chatText"
  );

  // 10. Mode: WOULD_YOU_RATHER
  const resWyr = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "WOULD_YOU_RATHER", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resWyr.status === 200 &&
    resWyr.data.mode === "WOULD_YOU_RATHER" &&
    Array.isArray(resWyr.data.options) &&
    resWyr.data.options.length >= 2,
    "WOULD_YOU_RATHER mode returns options and dilemma"
  );

  // 11. Mode: DEBATE
  const resDebate = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "DEBATE", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resDebate.status === 200 &&
    resDebate.data.mode === "DEBATE" &&
    typeof resDebate.data.content === "string" &&
    resDebate.data.chatText.includes("DEBATE"),
    "DEBATE mode returns debate topic and sides"
  );

  // 12. Mode: CHALLENGE
  const resChallenge = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "CHALLENGE", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resChallenge.status === 200 &&
    resChallenge.data.mode === "CHALLENGE" &&
    typeof resChallenge.data.content === "string" &&
    resChallenge.data.chatText.includes("Challenge"),
    "CHALLENGE mode returns social challenge"
  );

  // 13. Mode: QUIZ
  const resQuiz = await request("/api/chaos/generate", {
    method: "POST",
    body: JSON.stringify({ mode: "QUIZ", conversationUserId: userB._id }),
  }, userACookie);
  assert(
    resQuiz.status === 200 &&
    resQuiz.data.mode === "QUIZ" &&
    Array.isArray(resQuiz.data.options) &&
    resQuiz.data.options.length === 4 &&
    typeof resQuiz.data.answer === "number",
    "QUIZ mode returns 4 options and valid answer index"
  );

  // 14. Rate Limiting Test
  console.log("\nTesting rate limiting under rapid requests...");
  let rateLimited = false;
  for (let i = 0; i < 15; i++) {
    const res = await request("/api/chaos/generate", {
      method: "POST",
      body: JSON.stringify({ mode: "RANDOM_QUESTION", conversationUserId: userB._id }),
    }, userACookie);
    if (res.status === 429) {
      rateLimited = true;
      assert(res.data.message.includes("Slow down"), "429 message contains 'Slow down'");
      break;
    }
  }
  assert(rateLimited, "Excessive rapid requests trigger 429 rate limit");

  console.log("==================================================");
  console.log(`ALL TESTS PASSED: ${passed}/${total}`);
  console.log("==================================================");
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
