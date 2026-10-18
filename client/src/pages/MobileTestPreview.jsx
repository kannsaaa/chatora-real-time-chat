import React, { useState } from "react";
import TopBar from "../components/Chat/TopBar";
import ChatMessages from "../components/Chat/ChatMessages";
import MessageInputForm from "../components/Chat/MessageInputForm";
import Nav from "../components/Chat/Nav";
import ChaosModal from "../components/Chat/ChaosModal";

const MOCK_CURRENT_USER = {
  _id: "user_me",
  firstName: "Alex",
  lastName: "Rivera",
  email: "alex@example.com",
};

const MOCK_GROUP = {
  _id: "group_123",
  name: "Weekend Foodies & Chai Club",
  avatar: "☕",
  members: [
    { _id: "user_me", firstName: "Alex" },
    { _id: "user_2", firstName: "Priya" },
    { _id: "user_3", firstName: "Rohan" },
    { _id: "user_4", firstName: "Sam" },
    { _id: "user_5", firstName: "Maya" },
  ],
};

const INITIAL_MESSAGES = [
  {
    _id: "msg_1",
    sender: { _id: "user_2", firstName: "Priya" },
    text: "Hey everyone! Who's ready for some weekend chaos?",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isRead: true,
  },
  {
    _id: "msg_2",
    sender: { _id: "user_me", firstName: "Alex" },
    text: "Hit the Chaos button, let's do Would You Rather!",
    createdAt: new Date(Date.now() - 1800000).toISOString(),
    isRead: true,
  },
  {
    _id: "msg_3",
    sender: { _id: "user_3", firstName: "Rohan" },
    text: "🤔 WOULD YOU RATHER:\nWhat do you choose for the rest of your life?\n• Option A: Unlimited street food anywhere in the world for free\n• Option B: Never have to wait in line or get stuck in traffic ever again",
    createdAt: new Date(Date.now() - 600000).toISOString(),
    isRead: true,
  },
  {
    _id: "msg_4",
    sender: { _id: "user_4", firstName: "Sam" },
    text: "⚔️ DEBATE TOPIC: Pineapple on pizza\n🟢 Side A: A culinary masterpiece with perfect sweet and savory balance\n🔵 Side B: A crime against Italian heritage and food culture",
    createdAt: new Date(Date.now() - 300000).toISOString(),
    isRead: true,
  },
];

export default function MobileTestPreview() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [groupInfoClicked, setGroupInfoClicked] = useState(false);

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    const msg = {
      _id: `msg_${Date.now()}`,
      sender: MOCK_CURRENT_USER,
      text: newMessage,
      replyTo: replyingTo ? replyingTo._id : undefined,
      replyToDetails: replyingTo
        ? {
            _id: replyingTo._id,
            text: replyingTo.text,
            sender: replyingTo.sender,
          }
        : undefined,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    setMessages((prev) => [...prev, msg]);
    setNewMessage("");
    setReplyingTo(null);
  };

  const handleReply = (targetMsg) => {
    setReplyingTo(targetMsg);
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-cream-50 flex flex-col overflow-hidden relative font-sans">
      {/* Top Header */}
      <TopBar
        selectedGroupId={MOCK_GROUP._id}
        currentGroup={MOCK_GROUP}
        selectedUserId={null}
        setSelectedUserId={() => {}}
        setSelectedGroupId={() => {}}
        onOpenGroupInfo={() => setGroupInfoClicked(true)}
        onlinePeople={{}}
        offlinePeople={{}}
        allPeople={[]}
        conversations={[]}
        onOpenChaos={() => setIsChaosOpen(true)}
      />

      {/* Group Info modal alert banner for testing */}
      {groupInfoClicked && (
        <div className="bg-plum-900 text-white text-xs px-3 py-1 flex items-center justify-between">
          <span>Group Info Triggered! ✨</span>
          <button
            onClick={() => setGroupInfoClicked(false)}
            className="text-chatora-pink font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Messages Container */}
      <section className="flex-1 min-h-0 w-full overflow-hidden flex flex-col relative bg-cream-50">
        <div className="flex-1 min-h-0 w-full overflow-y-auto px-2 sm:px-4 py-2">
          <ChatMessages
            messages={messages}
            userDetails={MOCK_CURRENT_USER}
            selectedGroupId={MOCK_GROUP._id}
            selectedUserId={null}
            onReply={handleReply}
            onDeleteMessageForMe={() => {}}
            onUnsendMessage={() => {}}
          />
        </div>

        {/* Message Input Form Footer */}
        <footer className="flex-shrink-0 w-full bg-transparent z-20 pb-16 md:pb-0">
          <MessageInputForm
            selectedGroupId={MOCK_GROUP._id}
            selectedUserId={null}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            sendMessage={handleSendMessage}
            onOpenChaos={() => setIsChaosOpen(true)}
            replyingTo={replyingTo}
            onCancelReply={() => setReplyingTo(null)}
            partnerName={MOCK_GROUP.name}
            currentUserId={MOCK_CURRENT_USER._id}
          />
        </footer>
      </section>

      {/* Mobile Bottom Navigation */}
      <Nav />

      {/* Chaos Modal for testing */}
      <ChaosModal
        isOpen={isChaosOpen}
        onClose={() => setIsChaosOpen(false)}
        selectedUserId={null}
        selectedGroupId={MOCK_GROUP._id}
        partnerName={MOCK_GROUP.name}
        onSendGeneratedMessage={(content) => {
          setMessages((prev) => [
            ...prev,
            {
              _id: `msg_chaos_${Date.now()}`,
              sender: MOCK_CURRENT_USER,
              text: content,
              createdAt: new Date().toISOString(),
              isRead: false,
            },
          ]);
          setIsChaosOpen(false);
        }}
      />
    </div>
  );
}
