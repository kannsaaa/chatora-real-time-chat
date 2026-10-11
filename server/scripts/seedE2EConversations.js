const mongoose = require("mongoose");

const BASE_URL = "http://localhost:4000";

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

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const usersCollection = mongoose.connection.db.collection("users");

  const emailA = "alex_chat@test.com";
  const emailB = "beth_chat@test.com";
  const emailC = "carl_chat@test.com";
  const pw = "Password123!";

  await usersCollection.deleteMany({
    email: { $in: [emailA, emailB, emailC] },
  });

  // 1. Register users
  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Alex",
      lastName: "Developer",
      username: "alex_dev",
      email: emailA,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailA }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Beth",
      lastName: "Designer",
      username: "beth_design",
      email: emailB,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailB }, { $set: { verified: true } });

  await request("/api/user/register", {
    method: "POST",
    body: JSON.stringify({
      firstName: "Carl",
      lastName: "Tester",
      username: "carl_qa",
      email: emailC,
      password: pw,
    }),
  });
  await usersCollection.updateOne({ email: emailC }, { $set: { verified: true } });

  // 2. Login
  const loginA = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailA, password: pw }),
  });
  const profA = await request("/api/user/profile", {}, loginA.cookie);

  const loginB = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailB, password: pw }),
  });
  const profB = await request("/api/user/profile", {}, loginB.cookie);

  const loginC = await request("/api/user/login", {
    method: "POST",
    body: JSON.stringify({ email: emailC, password: pw }),
  });
  const profC = await request("/api/user/profile", {}, loginC.cookie);

  // 3. Make friends: Alex <-> Beth and Alex <-> Carl
  await request(`/api/friends/request/${profB.data._id}`, { method: "POST" }, loginA.cookie);
  await request(`/api/friends/request/${profA.data._id}/accept`, { method: "POST" }, loginB.cookie);

  await request(`/api/friends/request/${profC.data._id}`, { method: "POST" }, loginA.cookie);
  await request(`/api/friends/request/${profA.data._id}/accept`, { method: "POST" }, loginC.cookie);

  // 4. Send messages
  await request(`/api/user/messages/${profB.data._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Hey Beth, did you finish the new design?" }),
  }, loginA.cookie);

  await request(`/api/user/messages/${profA.data._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Yes Alex! All Figma components are updated 🎨" }),
  }, loginB.cookie);

  await request(`/api/user/messages/${profA.data._id}`, {
    method: "POST",
    body: JSON.stringify({ text: "Hi Alex, running regression tests now." }),
  }, loginC.cookie);

  console.log("Seed data ready!");
  console.log(`User: ${emailA} / Password: ${pw}`);
  await mongoose.disconnect();
}

main().catch(console.error);
