const mongoose = require("mongoose");

async function migrate() {
  await mongoose.connect("mongodb://127.0.0.1:27017/chatapp");
  const collection = mongoose.connection.db.collection("users");
  const users = await collection.find({}).toArray();
  const seen = new Set();

  for (const u of users) {
    if (u.username) {
      console.log("Skipping existing username:", u.username);
      seen.add(u.username);
      continue;
    }
    const cleanFirst = (u.firstName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const cleanLast = (u.lastName || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let base = cleanFirst + (cleanLast ? "_" + cleanLast : "");
    if (!base) base = "user";
    const suffix = "_" + u._id.toString().slice(-4);
    const maxBaseLen = 20 - suffix.length;
    base = base.substring(0, maxBaseLen);
    let username = (base + suffix).toLowerCase();

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      throw new Error("Invalid generated username: " + username);
    }
    if (seen.has(username)) {
      throw new Error("Collision in generated username: " + username);
    }
    seen.add(username);

    await collection.updateOne(
      { _id: u._id },
      {
        $set: {
          username: username,
          bio: u.bio !== undefined ? u.bio : "",
        },
      }
    );
    console.log("Migrated user:", u._id.toString(), "-> username:", username);
  }

  // Create unique index on username
  const indexResult = await collection.createIndex({ username: 1 }, { unique: true });
  console.log("Index created successfully:", indexResult);

  const indexes = await collection.indexes();
  console.log("Current collection indexes:", JSON.stringify(indexes, null, 2));

  await mongoose.disconnect();
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
