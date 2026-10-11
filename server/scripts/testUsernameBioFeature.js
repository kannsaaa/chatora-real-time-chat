const mongoose = require("mongoose");
const ws = require("ws");

const BASE_URL = "http://localhost:4000/api/user";
const WS_URL = "ws://localhost:4000";

async function runTests() {
  console.log("=== CHATORA UNIQUE USERNAME + BIO TEST SUITE ===");

  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");
  const messagesCollection = mongoose.connection.db.collection("messages");

  // Clean up any previous test-created accounts for this test run
  await usersCollection.deleteMany({
    email: {
      $in: [
        "newuser1@test.com",
        "newuser2@test.com",
        "newuser3@test.com",
        "newuser4@test.com",
      ],
    },
  });

  // TEST 1: Register Rahul Sharma with username rahulsharma23
  console.log("\n[TEST 1] Register new user with username: rahulsharma23");
  const res1 = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Rahul",
      lastName: "Sharma",
      username: "rahulsharma23",
      email: "newuser1@test.com",
      password: "Password123!",
    }),
  });
  const data1 = await res1.json();
  console.log("Status:", res1.status, data1);
  if (res1.status !== 201) throw new Error("TEST 1 Failed: Expected 201");
  // Auto-verify if needed
  await usersCollection.updateOne(
    { email: "newuser1@test.com" },
    { $set: { verified: true } }
  );

  // TEST 2: Register another user with same username: rahulsharma23
  console.log("\n[TEST 2] Register with duplicate username: rahulsharma23");
  const res2 = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Rahul",
      lastName: "Verma",
      username: "rahulsharma23",
      email: "newuser2@test.com",
      password: "Password123!",
    }),
  });
  const data2 = await res2.json();
  console.log("Status:", res2.status, data2);
  if (res2.status !== 409 || !data2.message.includes("Username is already taken")) {
    throw new Error("TEST 2 Failed: Expected 409 Username is already taken");
  }

  // TEST 3: Case variant duplicate: RAHULSHARMA23
  console.log("\n[TEST 3] Register with uppercase duplicate: RAHULSHARMA23");
  const res3 = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Rahul",
      lastName: "Verma",
      username: "RAHULSHARMA23",
      email: "newuser3@test.com",
      password: "Password123!",
    }),
  });
  const data3 = await res3.json();
  console.log("Status:", res3.status, data3);
  if (res3.status !== 409) {
    throw new Error("TEST 3 Failed: Expected 409 for case-variant duplicate");
  }

  // TEST 4: Invalid characters: 'rahul sharma'
  console.log("\n[TEST 4] Register with invalid username (spaces): 'rahul sharma'");
  const res4 = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Rahul",
      lastName: "Verma",
      username: "rahul sharma",
      email: "newuser4@test.com",
      password: "Password123!",
    }),
  });
  const data4 = await res4.json();
  console.log("Status:", res4.status, data4);
  if (res4.status !== 400) {
    throw new Error("TEST 4 Failed: Expected 400 for spaces in username");
  }

  // TEST 5: Too short: 'ra'
  console.log("\n[TEST 5] Register with short username: 'ra'");
  const res5 = await fetch(`${BASE_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      firstName: "Rahul",
      lastName: "Verma",
      username: "ra",
      email: "newuser4@test.com",
      password: "Password123!",
    }),
  });
  const data5 = await res5.json();
  console.log("Status:", res5.status, data5);
  if (res5.status !== 400) {
    throw new Error("TEST 5 Failed: Expected 400 for short username");
  }

  // Log in as user 1 to get authToken cookie
  console.log("\n[LOGIN] Logging in as Rahul Sharma (newuser1@test.com)");
  const loginRes = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "newuser1@test.com",
      password: "Password123!",
    }),
  });
  if (loginRes.status !== 200) throw new Error("Login failed");
  const rawCookie = loginRes.headers.get("set-cookie");
  const authCookie = rawCookie ? rawCookie.split(";")[0] : "";
  console.log("Got authCookie:", authCookie ? "YES" : "NO");

  // TEST 6: Save Bio
  console.log("\n[TEST 6] Update profile with valid Bio");
  const bioText = "Full-stack developer | React enthusiast 🚀";
  const res6 = await fetch(`${BASE_URL}/profile/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      bio: bioText,
    }),
  });
  const data6 = await res6.json();
  console.log("Status:", res6.status, "Updated bio:", data6.bio);
  if (res6.status !== 200 || data6.bio !== bioText) {
    throw new Error("TEST 6 Failed: Bio not updated correctly");
  }

  // TEST 7: Bio > 160 characters
  console.log("\n[TEST 7] Update profile with bio > 160 characters");
  const longBio = "A".repeat(161);
  const res7 = await fetch(`${BASE_URL}/profile/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      bio: longBio,
    }),
  });
  const data7 = await res7.json();
  console.log("Status:", res7.status, data7);
  if (res7.status !== 400) {
    throw new Error("TEST 7 Failed: Expected 400 for bio > 160 chars");
  }

  // TEST 8: Search by username 'rahulsharma23'
  console.log("\n[TEST 8] Search people by username: rahulsharma23");
  // Log in as another user (e.g. user_qa_b@test.com) to search for Rahul
  const searchLogin = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "user_qa_b@test.com",
      password: "Password123!",
    }),
  });
  const searchCookie = searchLogin.headers.get("set-cookie").split(";")[0];
  const res8 = await fetch(`${BASE_URL}/people?q=rahulsharma23`, {
    headers: { Cookie: searchCookie },
  });
  const data8 = await res8.json();
  console.log("Search results count:", data8.length);
  const found8 = data8.find((u) => u.username === "rahulsharma23");
  if (!found8) throw new Error("TEST 8 Failed: User rahulsharma23 not found");
  console.log("Found user:", found8.firstName, found8.lastName, "@" + found8.username, found8.bio);

  // TEST 9: Search with @ prefix: '@rahulsharma23'
  console.log("\n[TEST 9] Search people by handle: @rahulsharma23");
  const res9 = await fetch(`${BASE_URL}/people?q=@rahulsharma23`, {
    headers: { Cookie: searchCookie },
  });
  const data9 = await res9.json();
  const found9 = data9.find((u) => u.username === "rahulsharma23");
  if (!found9) throw new Error("TEST 9 Failed: User @rahulsharma23 not found");
  console.log("Found user with @:", found9.firstName, "@" + found9.username);

  // TEST 10: Fetch profile of user
  console.log("\n[TEST 10] Fetch user profile");
  const res10 = await fetch(`${BASE_URL}/profile`, {
    headers: { Cookie: authCookie },
  });
  const data10 = await res10.json();
  console.log("Profile loaded:", data10.firstName, "@" + data10.username, data10.bio);
  if (data10.username !== "rahulsharma23") throw new Error("TEST 10 Failed: Username mismatch");

  // TEST 11: Real-time message between two users
  console.log("\n[TEST 11] WebSocket real-time messaging between Rahul and Beta");
  const rahulUser = await usersCollection.findOne({ email: "newuser1@test.com" });
  const betaUser = await usersCollection.findOne({ email: "user_qa_b@test.com" });

  const friendshipsCollection = mongoose.connection.db.collection("friendships");
  const canonicalPair = [rahulUser._id.toString(), betaUser._id.toString()].sort().join("_");
  await friendshipsCollection.updateOne(
    { canonicalPair },
    {
      $set: {
        requester: rahulUser._id,
        recipient: betaUser._id,
        status: "ACCEPTED",
        canonicalPair,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );

  const rahulWs = new ws(WS_URL, { headers: { Cookie: authCookie } });
  const betaWs = new ws(WS_URL, { headers: { Cookie: searchCookie } });

  await Promise.all([
    new Promise((resolve) => rahulWs.on("open", resolve)),
    new Promise((resolve) => betaWs.on("open", resolve)),
  ]);
  console.log("Both WebSockets connected.");

  const messagePromise = new Promise((resolve) => {
    betaWs.on("message", (msg) => {
      const parsed = JSON.parse(msg.toString());
      if (parsed.text === "Hello from Rahul!") {
        resolve(parsed);
      }
    });
  });

  rahulWs.send(
    JSON.stringify({
      recipient: betaUser._id.toString(),
      text: "Hello from Rahul!",
    })
  );

  const receivedMsg = await messagePromise;
  console.log("Beta received message:", receivedMsg.text, "sender:", receivedMsg.sender);
  if (receivedMsg.sender !== rahulUser._id.toString()) {
    throw new Error("TEST 11 Failed: Sender ID did not match internal MongoDB _id");
  }

  // TEST 12: Change username in Profile and verify conversations still work
  console.log("\n[TEST 12] Change username to 'rahul_updated_99'");
  const res12 = await fetch(`${BASE_URL}/profile/update`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Cookie: authCookie,
    },
    body: JSON.stringify({
      username: "rahul_updated_99",
    }),
  });
  const data12 = await res12.json();
  console.log("Updated username:", data12.username);
  if (data12.username !== "rahul_updated_99") throw new Error("TEST 12 Failed: Username not updated");

  // Verify message history still loads by internal MongoDB user ID
  const msgHistoryRes = await fetch(
    `${BASE_URL}/messages/${betaUser._id.toString()}`,
    { headers: { Cookie: authCookie } }
  );
  const msgHistory = await msgHistoryRes.json();
  const lastMsg = msgHistory[msgHistory.length - 1];
  console.log("Last message in history:", lastMsg.text, "sender:", lastMsg.sender);
  if (lastMsg.text !== "Hello from Rahul!") throw new Error("TEST 12 Failed: History missing after username change");

  // TEST 13: Refresh / verify DB state
  console.log("\n[TEST 13] Verify username and bio remain persisted");
  const userInDb = await usersCollection.findOne({ _id: rahulUser._id });
  console.log("DB record:", {
    username: userInDb.username,
    bio: userInDb.bio,
    _id: userInDb._id.toString(),
  });
  if (userInDb.username !== "rahul_updated_99" || userInDb.bio !== bioText) {
    throw new Error("TEST 13 Failed: Data not properly persisted");
  }

  // TEST 14: Logout -> Login and check loaded data
  console.log("\n[TEST 14] Re-login and check profile payload");
  const relogin = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "newuser1@test.com",
      password: "Password123!",
    }),
  });
  const newAuthCookie = relogin.headers.get("set-cookie").split(";")[0];
  const profileAfterLogin = await (
    await fetch(`${BASE_URL}/profile`, { headers: { Cookie: newAuthCookie } })
  ).json();
  console.log("Profile after re-login:", profileAfterLogin.username, profileAfterLogin.bio);
  if (profileAfterLogin.username !== "rahul_updated_99") {
    throw new Error("TEST 14 Failed: Re-login did not return updated username");
  }

  // TEST 15: Existing users have safe migrated usernames
  console.log("\n[TEST 15] Verify all existing users have unique valid usernames");
  const allUsers = await usersCollection.find({}).toArray();
  const usernames = allUsers.map((u) => u.username);
  const uniqueUsernames = new Set(usernames);
  console.log(`Total users in DB: ${allUsers.length}, Unique usernames: ${uniqueUsernames.size}`);
  if (usernames.length !== uniqueUsernames.size) {
    throw new Error("TEST 15 Failed: Duplicate usernames exist in DB");
  }
  for (const u of allUsers) {
    if (!/^[a-z0-9_]{3,20}$/.test(u.username)) {
      throw new Error(`TEST 15 Failed: User ${u._id} has invalid username: ${u.username}`);
    }
  }
  console.log("All existing users have 100% valid unique usernames!");

  // SECTION 22: Rapid FIFO WebSocket Regression
  console.log("\n[REGRESSION] 20 rapid FIFO WebSocket messages");
  let receivedCount = 0;
  const burstReceived = [];

  const burstPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Timeout waiting for 20 rapid messages"));
    }, 10000);

    rahulWs.on("message", (msg) => {
      const parsed = JSON.parse(msg.toString());
      if (parsed.text && parsed.text.startsWith("Rapid #")) {
        burstReceived.push(parsed.text);
        if (burstReceived.length === 20) {
          clearTimeout(timeout);
          resolve(burstReceived);
        }
      }
    });
  });

  for (let i = 1; i <= 20; i++) {
    betaWs.send(
      JSON.stringify({
        recipient: rahulUser._id.toString(),
        text: `Rapid #${i}`,
      })
    );
  }

  const burstResults = await burstPromise;
  console.log("Received all 20 messages in order!");
  for (let i = 1; i <= 20; i++) {
    if (burstResults[i - 1] !== `Rapid #${i}`) {
      throw new Error(`FIFO mismatch at index ${i}: ${burstResults[i - 1]}`);
    }
  }

  rahulWs.close();
  betaWs.close();
  await mongoose.disconnect();

  console.log("\n=======================================================");
  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! ZERO FAILURES!");
  console.log("=======================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
