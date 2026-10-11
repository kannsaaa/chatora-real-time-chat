// chaosController.js
const mongoose = require("mongoose");
const protect = require("../middleware/protect");
const Friendship = require("../models/friendshipModel");
const Block = require("../models/blockModel");

// In-memory rate limiting map: userId -> [timestamp1, timestamp2, ...]
const userRequestTimestamps = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 12; // 12 requests per minute

const checkRateLimit = (userId) => {
  const now = Date.now();
  let timestamps = userRequestTimestamps.get(userId.toString()) || [];
  // Filter out timestamps older than the window
  timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    userRequestTimestamps.set(userId.toString(), timestamps);
    return false;
  }
  timestamps.push(now);
  userRequestTimestamps.set(userId.toString(), timestamps);
  return true;
};

// Curated high-quality static chaos pools for instant response and offline fallback
const CHAOS_POOLS = {
  RANDOM_QUESTION: [
    "What is one thing you would do if money didn't matter at all?",
    "If you could instantly master one skill without practicing, what would it be?",
    "What is the most ridiculous or irrational fear you have?",
    "If you could have dinner with any historical figure, who would it be and why?",
    "What is something that is considered normal today, but will be viewed as weird in 50 years?",
    "If your life was turned into a movie, which actor would play you?",
    "What is the best piece of advice you've ever received that actually changed how you think?",
    "If you could witness any event in human history past or future, what would you choose?",
    "What is a hill you are absolutely willing to die on?",
    "If you had to live in a video game or fantasy world for a year, which one would it be?",
    "What's the weirdest food combination that you secretly love?",
    "If you could eliminate one inconvenience from daily life forever, what would it be?",
    "What is something you believed for way too long before finding out it wasn't true?",
    "If you had a warning label on you, what would it say?",
    "What's the best random purchase under $20 you've ever made?",
  ],

  ICEBREAKER: [
    "What is a place you've always dreamed of visiting and what's stopping you?",
    "What project would you build if you had unlimited time and zero deadlines?",
    "What is your most unexpected or random talent?",
    "What's a topic or rabbit hole you're currently obsessed with?",
    "What was your first computer or technology setup like?",
    "Are you more of an early bird, a night owl, or a permanently exhausted pigeon?",
    "What is the most underrated movie, show, or game that everyone should know about?",
    "If you could switch lives with someone for exactly 24 hours, who would it be?",
    "What's the story behind your favorite piece of clothing or accessory?",
    "If you had to teach a class on something right now with zero preparation, what would it be?",
    "What music do you listen to when you need to get in the zone?",
    "What's the coolest gadget or app you discovered recently?",
    "If you could live in any city in the world for one year, where are you packing your bags for?",
    "What is the most memorable concert, trip, or event you've ever attended?",
    "What's your go-to comfort food after a ridiculously long day?",
  ],

  ROAST: [
    "Your GitHub contribution graph has more gaps than your sleep schedule.",
    "You have 47 browser tabs open right now and you're lying to yourself if you think you'll read them.",
    "Your code comments say 'temporary fix' but that commit was made during the Obama administration.",
    "You spend more time configuring your IDE theme and fonts than actually writing code.",
    "Your coffee-to-code ratio is technically a medical emergency.",
    "You've rewritten your personal portfolio three times and it still has 'Lorem Ipsum' in the footer.",
    "You say you're 'agile', but you move at the speed of a Windows Vista update.",
    "Your commit messages look like: 'fix', 'fix2', 'pls work', 'asdfghjk', 'actual fix'.",
    "You have three different todo apps installed and you haven't opened any of them since January.",
    "You treat Stack Overflow like your primary co-pilot and ChatGPT like your therapist.",
    "Your screen time report comes in on Sundays and looks like a personal indictment.",
    "You claim you're a minimalist, but your downloads folder has 2,400 unorganized files.",
    "Your Wi-Fi password is more complicated than your actual production architecture.",
    "You will spend 6 hours automating a task that takes 30 seconds to do manually.",
    "You have a gym membership that gets less usage than the 'Terms of Service' page.",
  ],

  WOULD_YOU_RATHER: [
    {
      content: "Would you rather travel the world for free for a year or own your dream house outright?",
      options: ["Travel the world for free ✈️", "Own dream house outright 🏡"],
    },
    {
      content: "Would you rather speak all spoken human languages or communicate with all animals?",
      options: ["Speak all human languages 🗣️", "Communicate with animals 🐾"],
    },
    {
      content: "Would you rather always be 15 minutes late or 20 minutes early to everything?",
      options: ["Always 15 minutes late ⏰", "Always 20 minutes early ⌛"],
    },
    {
      content: "Would you rather have unlimited battery on all your devices or free gigabit Wi-Fi everywhere on earth?",
      options: ["Infinite battery life 🔋", "Free gigabit Wi-Fi everywhere 📶"],
    },
    {
      content: "Would you rather only be able to whisper or only be able to shout for the next week?",
      options: ["Only whisper 🤫", "Only shout 📢"],
    },
    {
      content: "Would you rather never have to sleep again (with no fatigue) or eat whatever you want with zero calories?",
      options: ["Never sleep again ⚡", "Eat anything zero calories 🍕"],
    },
    {
      content: "Would you rather explore the deepest uncharted ocean or visit an inhabited alien planet?",
      options: ["Deepest ocean 🌊", "Alien planet 🪐"],
    },
    {
      content: "Would you rather lose the ability to use search engines or lose the ability to use social media forever?",
      options: ["No search engines 🔍", "No social media 📱"],
    },
    {
      content: "Would you rather have a pause button for your life or a rewind button?",
      options: ["Pause button ⏸️", "Rewind button ⏪"],
    },
    {
      content: "Would you rather live without music or live without movies and TV shows?",
      options: ["Live without music 🎵", "Live without TV/movies 🎬"],
    },
  ],

  DEBATE: [
    {
      topic: "Remote work is fundamentally superior to office work.",
      sideA: "Remote work wins — freedom, zero commute, and higher productivity.",
      sideB: "Office wins — spontaneous collaboration, social bonding, and work-life separation.",
    },
    {
      topic: "AI will make engineers significantly more productive, not replace them.",
      sideA: "Productivity multiplier — AI handles boilerplate while humans architect.",
      sideB: "Replacement threat — rapidly automating core dev roles and shrinking junior hiring.",
    },
    {
      topic: "College degrees are becoming obsolete in tech and creative industries.",
      sideA: "Obsolete — portfolios, open source, and proof of work matter far more.",
      sideB: "Essential — foundational theory, structured discipline, and alumni networks.",
    },
    {
      topic: "Tabs vs Spaces: The eternal formatting war.",
      sideA: "Tabs — accessible, customizable indentation width for each developer.",
      sideB: "Spaces — pixel-perfect consistency across all terminals, editors, and environments.",
    },
    {
      topic: "Physical books are vastly superior to e-readers and tablets.",
      sideA: "Physical books — tactile feel, smell, focus without notifications, and shelf aesthetic.",
      sideB: "E-readers — carrying 5,000 books in your pocket with instant dictionary and night mode.",
    },
    {
      topic: "Social media has done more harm than good for human connection.",
      sideA: "More harm — attention erosion, algorithm addiction, and shallow relationships.",
      sideB: "More good — global communities, democratized knowledge, and staying in touch effortlessly.",
    },
  ],

  CHALLENGE: [
    "Describe your entire day so far using only 5 emojis. No words allowed!",
    "Find the weirdest or funniest meme currently saved on your phone and send it.",
    "Explain your current job or favorite movie in one sentence, but explain it badly.",
    "Type out a complete sentence answering this challenge without using the letter 'E'!",
    "Give the other person a 2-sentence movie pitch featuring Nicolas Cage as a barista.",
    "Send a voice note or message making the sound effect of a failing server or broken car.",
    "Rank the following from best to worst right now: Tacos, Pizza, Burgers, Sushi.",
    "Tell one totally true fact about yourself and one convincing lie. I'll guess which is which!",
    "Write a haiku (5-7-5 syllables) about debugging code or being sleepy.",
    "Recommend one song that you think I've never heard before, but will love immediately.",
  ],

  QUIZ: [
    {
      question: "Which planet in our solar system has the most confirmed moons?",
      options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
      answer: 1, // Saturn (146 moons)
      explanation: "Saturn has 146 recognized moons, surpassing Jupiter's 95!",
    },
    {
      question: "In what year was the first version of JavaScript created?",
      options: ["1991", "1995", "1998", "2001"],
      answer: 1, // 1995
      explanation: "Brendan Eich created JavaScript at Netscape in just 10 days in May 1995!",
    },
    {
      question: "Which data structure operates on a First-In, First-Out (FIFO) principle?",
      options: ["Stack", "Queue", "Binary Tree", "Hash Map"],
      answer: 1, // Queue
      explanation: "A Queue operates on FIFO, while a Stack operates on LIFO!",
    },
    {
      question: "What was Google's original name when Larry Page and Sergey Brin started it?",
      options: ["BackRub", "Googol", "SearchEngine One", "PageRank"],
      answer: 0, // BackRub
      explanation: "Google was originally nicknamed 'BackRub' because it analyzed backlinks!",
    },
    {
      question: "Which animal is known to have the highest blood pressure?",
      options: ["Elephant", "Giraffe", "Blue Whale", "Cheetah"],
      answer: 1, // Giraffe
      explanation: "Giraffes have blood pressure twice as high as humans to pump blood up their 6-foot necks!",
    },
    {
      question: "What does the 'HTTP' acronym stand for?",
      options: [
        "HyperText Transfer Protocol",
        "High Technology Transmission Path",
        "Hyper Transfer Text Platform",
        "Home Tool Transfer Package",
      ],
      answer: 0, // HyperText Transfer Protocol
      explanation: "HTTP stands for HyperText Transfer Protocol, the foundation of the World Wide Web!",
    },
    {
      question: "Which element has the chemical symbol 'Au'?",
      options: ["Silver", "Gold", "Copper", "Platinum"],
      answer: 1, // Gold
      explanation: "'Au' comes from the Latin word 'aurum', meaning shining dawn or gold!",
    },
    {
      question: "Who is widely considered the world's first computer programmer?",
      options: ["Alan Turing", "Ada Lovelace", "Grace Hopper", "Charles Babbage"],
      answer: 1, // Ada Lovelace
      explanation: "Ada Lovelace wrote the first algorithm intended for Charles Babbage's Analytical Engine in 1843!",
    },
  ],
};

// Helper: pick random item
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Optional: Call Gemini if API key is provided in environment
const generateWithGemini = async (mode) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const promptInstructions = {
      RANDOM_QUESTION:
        "Generate a single, deeply engaging, unique and thought-provoking question for two friends chatting. Return JSON with format: {\"title\": \"Random Question\", \"content\": \"...question text...\"}",
      ICEBREAKER:
        "Generate a fun, warm, creative conversation starter for two people. Return JSON with format: {\"title\": \"Icebreaker\", \"content\": \"...starter text...\"}",
      ROAST:
        "Generate a clever, lighthearted, harmless and playful banter roast for friends. Strictly no hate, no vulgarity, no harassment, no protected class insults. Return JSON with format: {\"title\": \"Roast Battle\", \"content\": \"...roast text...\"}",
      WOULD_YOU_RATHER:
        "Generate a fascinating Would You Rather dilemma with two options. Return JSON with format: {\"title\": \"Would You Rather\", \"content\": \"...dilemma...\", \"options\": [\"Option 1 with emoji\", \"Option 2 with emoji\"]}",
      DEBATE:
        "Generate a fun, lively debate topic for friends. Return JSON with format: {\"title\": \"Debate\", \"topic\": \"...topic statement...\", \"sideA\": \"...argument for Side A...\", \"sideB\": \"...argument for Side B...\"}",
      CHALLENGE:
        "Generate a harmless, hilarious, quick social challenge to do right now in chat. No danger or humiliation. Return JSON with format: {\"title\": \"Random Challenge\", \"content\": \"...challenge text...\"}",
    };

    const instruction = promptInstructions[mode];
    if (!instruction) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${instruction}. Only output valid JSON.` }] }],
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 250,
            responseMimeType: "application/json",
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!res.ok) return null;
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed = JSON.parse(text);
    return parsed;
  } catch (err) {
    // If Gemini fails or times out, gracefully return null to use curated pool
    return null;
  }
};

// Main generator handler: POST /api/chaos/generate
const generateChaos = async (req, res) => {
  try {
    let userData;
    try {
      userData = await protect(req);
    } catch {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { mode, conversationUserId } = req.body;
    const ourUserId = userData._id;

    // 1. Validate mode
    const validModes = [
      "RANDOM_QUESTION",
      "ICEBREAKER",
      "ROAST",
      "WOULD_YOU_RATHER",
      "DEBATE",
      "CHALLENGE",
      "QUIZ",
    ];

    if (!mode || !validModes.includes(mode)) {
      return res.status(400).json({
        message: `Invalid mode. Allowed modes: ${validModes.join(", ")}`,
      });
    }

    // 2. Validate conversationUserId
    if (!conversationUserId || !mongoose.Types.ObjectId.isValid(conversationUserId)) {
      return res.status(400).json({ message: "Invalid target user ID" });
    }

    if (ourUserId.toString() === conversationUserId.toString()) {
      return res.status(400).json({ message: "Cannot use Chaos Mode with yourself" });
    }

    // 3. Security: Check Block status
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: ourUserId, blocked: conversationUserId },
        { blocker: conversationUserId, blocked: ourUserId },
      ],
    });
    if (isBlocked) {
      return res.status(403).json({ message: "Cannot use Chaos Mode with blocked user" });
    }

    // 4. Security: Check Friendship status
    const canonicalPair = Friendship.getCanonicalPair(ourUserId, conversationUserId);
    const friendship = await Friendship.findOne({
      canonicalPair,
      status: "ACCEPTED",
    });
    if (!friendship) {
      return res.status(403).json({ message: "You can only use Chaos Mode with friends." });
    }

    // 5. Rate limiting
    if (!checkRateLimit(ourUserId)) {
      return res.status(429).json({
        message: "Whoa 😭 Slow down. Give Chaos a second.",
      });
    }

    // 6. Generate content based on mode
    let result = null;

    // Try Gemini if available (except Quiz which is curated)
    if (mode !== "QUIZ") {
      result = await generateWithGemini(mode);
    }

    // Fallback to rich curated pool
    if (!result) {
      switch (mode) {
        case "RANDOM_QUESTION": {
          const q = getRandomItem(CHAOS_POOLS.RANDOM_QUESTION);
          result = {
            mode,
            title: "Random Question",
            content: q,
            chatText: `🎲 Random Question:\n${q}`,
          };
          break;
        }

        case "ICEBREAKER": {
          const q = getRandomItem(CHAOS_POOLS.ICEBREAKER);
          result = {
            mode,
            title: "Icebreaker",
            content: q,
            chatText: `🧊 Icebreaker:\n${q}`,
          };
          break;
        }

        case "ROAST": {
          const r = getRandomItem(CHAOS_POOLS.ROAST);
          result = {
            mode,
            title: "Roast Battle",
            content: r,
            chatText: `🔥 ROAST BATTLE:\n"${r}"\n\nYour turn 😉`,
          };
          break;
        }

        case "WOULD_YOU_RATHER": {
          const item = getRandomItem(CHAOS_POOLS.WOULD_YOU_RATHER);
          result = {
            mode,
            title: "Would You Rather",
            content: item.content,
            options: item.options,
            chatText: `🤔 WOULD YOU RATHER:\n• ${item.options[0]}\n• ${item.options[1]}\n\nWhat do you choose?`,
          };
          break;
        }

        case "DEBATE": {
          const item = getRandomItem(CHAOS_POOLS.DEBATE);
          result = {
            mode,
            title: "Debate",
            content: item.topic,
            sideA: item.sideA,
            sideB: item.sideB,
            chatText: `🔥 DEBATE:\nTopic: "${item.topic}"\n\n🟢 Side A: ${item.sideA}\n🔵 Side B: ${item.sideB}\n\nWhich side are you taking?`,
          };
          break;
        }

        case "CHALLENGE": {
          const c = getRandomItem(CHAOS_POOLS.CHALLENGE);
          result = {
            mode,
            title: "Random Challenge",
            content: c,
            chatText: `🎯 Chaos Challenge:\n${c}`,
          };
          break;
        }

        case "QUIZ": {
          const qItem = getRandomItem(CHAOS_POOLS.QUIZ);
          result = {
            mode,
            title: "Quick Quiz",
            content: qItem.question,
            options: qItem.options,
            answer: qItem.answer,
            explanation: qItem.explanation,
            chatText: `🧠 QUICK QUIZ:\n${qItem.question}\n\nA) ${qItem.options[0]}\nB) ${qItem.options[1]}\nC) ${qItem.options[2]}\nD) ${qItem.options[3]}\n\nDrop your guess below!`,
          };
          break;
        }

        default:
          return res.status(400).json({ message: "Unsupported mode" });
      }
    } else {
      // Format Gemini output if obtained
      result.mode = mode;
      if (mode === "WOULD_YOU_RATHER" && result.options?.length >= 2) {
        result.chatText = `🤔 WOULD YOU RATHER:\n• ${result.options[0]}\n• ${result.options[1]}\n\nWhat do you choose?`;
      } else if (mode === "DEBATE" && result.topic) {
        result.chatText = `🔥 DEBATE:\nTopic: "${result.topic}"\n\n🟢 Side A: ${result.sideA || "Argue in favor"}\n🔵 Side B: ${result.sideB || "Argue against"}\n\nWhich side are you taking?`;
      } else if (mode === "ROAST") {
        result.chatText = `🔥 ROAST BATTLE:\n"${result.content}"\n\nYour turn 😉`;
      } else {
        result.chatText = `🌪️ ${result.title || mode}:\n${result.content || result.topic}`;
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in generateChaos:", error);
    return res.status(500).json({ message: "Chaos failed 😭 Please try again." });
  }
};

module.exports = {
  generateChaos,
  CHAOS_POOLS,
};
