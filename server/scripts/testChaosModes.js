// server/scripts/testChaosModes.js
const assert = require("assert");
const { generateChaos, CHAOS_POOLS } = require("../controllers/chaosController");
const Group = require("../models/groupModel");
const Friendship = require("../models/friendshipModel");
const Block = require("../models/blockModel");
const jwt = require("jsonwebtoken");

async function runChaosRegressionTests() {
  console.log("=== Running Chatora Chaos Mode Regression Tests ===\n");
  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    try {
      fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function asyncTest(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(err);
      failed++;
    }
  }

  // 1. Verify all 7 modes exist in static pools with valid content
  const requiredModes = [
    "RANDOM_QUESTION",
    "ICEBREAKER",
    "ROAST",
    "WOULD_YOU_RATHER",
    "DEBATE",
    "CHALLENGE",
    "QUIZ",
  ];

  requiredModes.forEach((mode) => {
    test(`Static pool for ${mode} has items`, () => {
      assert.ok(CHAOS_POOLS[mode], `Pool ${mode} must exist`);
      assert.ok(Array.isArray(CHAOS_POOLS[mode]), `Pool ${mode} must be an array`);
      assert.ok(CHAOS_POOLS[mode].length > 0, `Pool ${mode} must have at least 1 item`);
    });
  });

  // 2. Specific test for WOULD_YOU_RATHER pool structure
  test("WOULD_YOU_RATHER pool items have content and exactly 2 options", () => {
    CHAOS_POOLS.WOULD_YOU_RATHER.forEach((item, idx) => {
      assert.ok(item.content, `Item ${idx} has dilemma content`);
      assert.ok(Array.isArray(item.options), `Item ${idx} has options array`);
      assert.strictEqual(item.options.length, 2, `Item ${idx} has exactly 2 options`);
    });
  });

  // 3. Test generateChaos handler for all 7 modes with mock authenticated request
  const mockUserId = "64f1a2b3c4d5e6f7a8b9c0d1";
  const mockFriendId = "64f1a2b3c4d5e6f7a8b9c0d2";
  const mockGroupId = "64f1a2b3c4d5e6f7a8b9c0d3";

  // Mock protect middleware token / cookie
  process.env.JWTPRIVATEKEY = process.env.JWTPRIVATEKEY || "test_secret_key";
  const token = jwt.sign(
    { _id: mockUserId, username: "tester" },
    process.env.JWTPRIVATEKEY
  );

  // Mock Mongoose models
  const origBlockFindOne = Block.findOne;
  const origFriendshipFindOne = Friendship.findOne;
  const origGroupFindById = Group.findById;

  Block.findOne = async () => null; // No blocks
  Friendship.findOne = async () => ({ status: "ACCEPTED" }); // Friends
  Group.findById = async () => ({
    _id: mockGroupId,
    members: [mockUserId, mockFriendId],
  }); // Group with user as member

  const createMockReqRes = (body) => {
    const req = {
      cookies: { authToken: token },
      body,
    };
    let statusCode = 200;
    let jsonBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        jsonBody = data;
        return this;
      },
    };
    return { req, res, getStatus: () => statusCode, getBody: () => jsonBody };
  };

  try {
    for (const mode of requiredModes) {
      const modeUserId = `64f1a2b3c4d5e6f7a8b9c0${mode.substring(0, 2).charCodeAt(0).toString(16)}`;
      const modeToken = jwt.sign(
        { _id: modeUserId, username: "tester" },
        process.env.JWTPRIVATEKEY
      );

      Group.findById = async () => ({
        _id: mockGroupId,
        members: [modeUserId, mockFriendId],
      });

      await asyncTest(`generateChaos handler generates content for 1-to-1 mode: ${mode}`, async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
          mode,
          conversationUserId: mockFriendId,
        });
        req.cookies.authToken = modeToken;

        await generateChaos(req, res);
        assert.strictEqual(getStatus(), 200, `Expected 200 status for ${mode}`);
        const body = getBody();
        assert.ok(body, `Response body must exist for ${mode}`);
        assert.strictEqual(body.mode, mode);
        assert.ok(body.title, `Response has title for ${mode}`);
        assert.ok(body.chatText, `Response has chatText for ${mode}`);

        if (mode === "WOULD_YOU_RATHER") {
          assert.ok(Array.isArray(body.options), "WOULD_YOU_RATHER has options array");
          assert.strictEqual(body.options.length, 2, "WOULD_YOU_RATHER has 2 options");
          assert.ok(body.chatText.includes("WOULD YOU RATHER"), "chatText contains header");
        } else if (mode === "DEBATE") {
          assert.ok(body.sideA && body.sideB, "DEBATE has sideA and sideB");
        } else if (mode === "QUIZ") {
          assert.ok(Array.isArray(body.options), "QUIZ has options array");
          assert.strictEqual(body.options.length, 4, "QUIZ has 4 options");
        }
      });

      await asyncTest(`generateChaos handler generates content for group mode: ${mode}`, async () => {
        const { req, res, getStatus, getBody } = createMockReqRes({
          mode,
          groupId: mockGroupId,
        });
        req.cookies.authToken = modeToken;

        await generateChaos(req, res);
        assert.strictEqual(getStatus(), 200, `Expected 200 status for group ${mode}`);
        const body = getBody();
        assert.ok(body.chatText, `Group response has chatText for ${mode}`);
      });
    }

    // 4. Test error handling
    await asyncTest("Rejects invalid mode with 400", async () => {
      const { req, res, getStatus } = createMockReqRes({
        mode: "INVALID_MODE",
        conversationUserId: mockFriendId,
      });
      await generateChaos(req, res);
      assert.strictEqual(getStatus(), 400);
    });

    await asyncTest("Rejects self-chat with 400", async () => {
      const { req, res, getStatus } = createMockReqRes({
        mode: "WOULD_YOU_RATHER",
        conversationUserId: mockUserId,
      });
      await generateChaos(req, res);
      assert.strictEqual(getStatus(), 400);
    });

    await asyncTest("Rejects non-group-member with 403", async () => {
      Group.findById = async () => ({
        _id: mockGroupId,
        members: ["other_user_1", "other_user_2"], // current user not member
      });
      const { req, res, getStatus } = createMockReqRes({
        mode: "WOULD_YOU_RATHER",
        groupId: mockGroupId,
      });
      await generateChaos(req, res);
      assert.strictEqual(getStatus(), 403);
    });

  } finally {
    Block.findOne = origBlockFindOne;
    Friendship.findOne = origFriendshipFindOne;
    Group.findById = origGroupFindById;
  }

  console.log(`\n========================================`);
  console.log(`Chaos Mode Tests Completed: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runChaosRegressionTests();
