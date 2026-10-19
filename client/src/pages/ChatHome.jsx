import React, { useEffect, useState, useRef } from "react";
import Nav from "../components/Chat/Nav";
import axios from "axios";
import TopBar from "../components/Chat/TopBar";
import ChatMessages from "../components/Chat/ChatMessages";
import MessageInputForm from "../components/Chat/MessageInputForm";
import OnlineUsersList from "../components/Chat/OnlineUserList";
import GroupCreateModal from "../components/Chat/GroupCreateModal";
import GroupInfoModal from "../components/Chat/GroupInfoModal";
import { useProfile } from "../context/profileContext";
import { useAuth } from "../context/authContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { socketUrl } from "../../apiConfig";
import toast from "react-hot-toast";
import ChaosModal from "../components/Chat/ChaosModal";

const ChatHome = () => {
  const [searchParams] = useSearchParams();
  const [ws, setWs] = useState(null);
  const [onlinePeople, setOnlinePeople] = useState({});
  const [selectedUserId, setSelectedUserId] = useState(
    searchParams.get("userId") || null
  );
  const [selectedGroupId, setSelectedGroupId] = useState(
    searchParams.get("groupId") || null
  );
  const [groups, setGroups] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);

  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [offlinePeople, setOfflinePeople] = useState({});
  const [allPeople, setAllPeople] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [friends, setFriends] = useState([]);
  const [relationshipStatus, setRelationshipStatus] = useState("LOADING");
  const [isChaosOpen, setIsChaosOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  const { userDetails } = useProfile();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Refs to allow WebSocket message handler to always access fresh active chat
  const selectedUserIdRef = useRef(selectedUserId);
  const selectedGroupIdRef = useRef(selectedGroupId);
  useEffect(() => {
    selectedUserIdRef.current = selectedUserId;
  }, [selectedUserId]);
  useEffect(() => {
    selectedGroupIdRef.current = selectedGroupId;
  }, [selectedGroupId]);

  // Keep selectedUserId/groupId synced with query params if present
  useEffect(() => {
    const qUserId = searchParams.get("userId");
    const qGroupId = searchParams.get("groupId");
    if (qUserId && qUserId !== selectedUserId) {
      setSelectedUserId(qUserId);
      setSelectedGroupId(null);
    } else if (qGroupId && qGroupId !== selectedGroupId) {
      setSelectedGroupId(qGroupId);
      setSelectedUserId(null);
    }
  }, [searchParams]);

  // Clear reply state when switching conversation partner or group
  useEffect(() => {
    setReplyingTo(null);
  }, [selectedUserId, selectedGroupId]);

  const handleSelectUser = (id) => {
    setSelectedGroupId(null);
    setCurrentGroup(null);
    setSelectedUserId(id);
  };

  const handleSelectGroup = (id) => {
    setSelectedUserId(null);
    const grp = groups.find((g) => String(g._id) === String(id));
    if (grp) setCurrentGroup(grp);
    setSelectedGroupId(id);
  };

  // Fetch relationship status when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) {
      setRelationshipStatus("NOT_CONNECTED");
      return;
    }
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`/api/friends/status/${selectedUserId}`);
        setRelationshipStatus(res.data?.status || "NOT_CONNECTED");
      } catch (err) {
        console.error("Error fetching relationship status:", err);
        setRelationshipStatus("NOT_CONNECTED");
      }
    };
    fetchStatus();
  }, [selectedUserId]);

  const showOnlinePeople = (peopleArray) => {
    const people = {};
    peopleArray.forEach(({ userId, username, userHandle, avatarLink }) => {
      if (userDetails?._id && String(userId) === String(userDetails._id)) {
        return;
      }
      people[userId] = { username, userHandle, avatarLink };
    });
    setOnlinePeople(people);
  };

  // Fetch groups from backend
  const fetchGroups = async () => {
    try {
      const res = await axios.get("/api/groups");
      if (Array.isArray(res.data)) {
        setGroups(res.data);
      }
    } catch (err) {
      console.error("Error fetching groups:", err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Fetch conversations from backend
  const fetchConversations = async () => {
    try {
      const res = await axios.get("/api/conversations?includeFriends=true");
      if (Array.isArray(res.data)) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch friends from backend
  const fetchFriends = async () => {
    try {
      const res = await axios.get("/api/friends");
      if (Array.isArray(res.data)) {
        setFriends(res.data);
      }
    } catch (err) {
      console.error("Error fetching friends:", err);
    }
  };

  useEffect(() => {
    fetchFriends();
  }, []);

  // Fetch messages and group details when group selected
  useEffect(() => {
    const fetchGroupData = async () => {
      if (selectedGroupId) {
        try {
          const [detailsRes, messagesRes] = await Promise.all([
            axios.get(`/api/groups/${selectedGroupId}`),
            axios.get(`/api/groups/${selectedGroupId}/messages`),
          ]);
          setCurrentGroup(detailsRes.data);
          setMessages(Array.isArray(messagesRes.data) ? messagesRes.data : []);

          // Clear unread state for group
          axios
            .patch(`/api/conversations/${selectedGroupId}/unread`, {
              isUnread: false,
            })
            .then(() => {
              setGroups((prev) =>
                prev.map((g) =>
                  String(g._id) === String(selectedGroupId)
                    ? { ...g, isUnread: false }
                    : g
                )
              );
            })
            .catch(() => {});
        } catch (error) {
          console.error("Error fetching group details or messages:", error);
          if (
            error?.response?.status === 403 ||
            error?.response?.status === 404
          ) {
            toast.error(
              error?.response?.data?.message || "Group unavailable"
            );
            setSelectedGroupId(null);
            setCurrentGroup(null);
            setMessages([]);
            fetchGroups();
          }
        }
      }
    };
    fetchGroupData();
  }, [selectedGroupId]);

  // When selected direct conversation is unread, automatically mark as read
  useEffect(() => {
    if (!selectedUserId) return;
    const conv = conversations.find(
      (c) => String(c.userId) === String(selectedUserId)
    );
    if (conv && conv.isUnread) {
      axios
        .patch(`/api/conversations/${selectedUserId}/unread`, {
          isUnread: false,
        })
        .then(() => {
          setConversations((prev) =>
            prev.map((c) =>
              String(c.userId) === String(selectedUserId)
                ? { ...c, isUnread: false }
                : c
            )
          );
        })
        .catch((e) => console.error("Error clearing unread state:", e));
    }
  }, [selectedUserId, conversations]);

  // Fetch directory people once
  useEffect(() => {
    axios
      .get("/api/user/people")
      .then((res) => {
        if (Array.isArray(res.data)) {
          setAllPeople(res.data);
        }
      })
      .catch((err) => console.error("Error fetching people:", err));
  }, []);

  // Fetch 1-to-1 messages when selected user changes
  useEffect(() => {
    const fetchData = async () => {
      if (selectedUserId) {
        try {
          const res = await axios.get(`/api/user/messages/${selectedUserId}`);
          setMessages(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
          console.error("Error fetching messages:", error);
        }
      }
    };
    fetchData();
  }, [selectedUserId]);

  // Derive offline people in memory without making network calls
  useEffect(() => {
    const offlinePeopleArr = allPeople
      .filter((p) =>
        userDetails?._id ? String(p._id) !== String(userDetails._id) : true
      )
      .filter((p) => !onlinePeople[p._id]);

    const offlineMap = offlinePeopleArr.reduce((acc, p) => {
      acc[p._id] = p;
      return acc;
    }, {});

    setOfflinePeople(offlineMap);
  }, [allPeople, onlinePeople, userDetails]);

  // WebSocket message handler
  const handleMessage = (e) => {
    try {
      const messageData = JSON.parse(e.data);

      if ("online" in messageData) {
        showOnlinePeople(messageData.online);
      } else if (messageData.type === "message_error") {
        toast.error(messageData.error || "Cannot send message");
      } else if (messageData.type === "group_message") {
        if (String(messageData.group) === String(selectedGroupIdRef.current)) {
          setMessages((prev) => [
            ...prev,
            {
              text: messageData.text,
              sender: messageData.sender,
              group: messageData.group,
              _id: messageData._id || messageData.id,
              id: messageData._id || messageData.id,
              replyTo: messageData.replyTo || null,
              isUnsent: Boolean(messageData.isUnsent),
              createdAt: messageData.createdAt || new Date().toISOString(),
            },
          ]);
        }
        fetchGroups();
      } else if (
        messageData.type === "group_member_added" ||
        messageData.type === "group_member_removed" ||
        messageData.type === "group_member_left" ||
        messageData.type === "group_updated"
      ) {
        fetchGroups();
        if (String(selectedGroupIdRef.current) === String(messageData.groupId)) {
          if (
            messageData.type === "group_member_removed" &&
            String(messageData.removedUserId) === String(userDetails?._id)
          ) {
            toast.error("You were removed from this group");
            setSelectedGroupId(null);
            setCurrentGroup(null);
            setMessages([]);
          } else if (messageData.group) {
            setCurrentGroup(messageData.group);
          } else {
            axios
              .get(`/api/groups/${selectedGroupIdRef.current}`)
              .then((res) => setCurrentGroup(res.data))
              .catch(() => {});
          }
        }
      } else if (messageData.type === "friend_request_received") {
        toast.success(
          `${messageData.from?.firstName || "Someone"} sent you a friend request!`
        );
        if (String(selectedUserIdRef.current) === String(messageData.from?._id)) {
          setRelationshipStatus("PENDING_RECEIVED");
        }
      } else if (messageData.type === "friend_request_accepted") {
        toast.success(
          `${messageData.by?.firstName || "A user"} accepted your friend request!`
        );
        if (String(selectedUserIdRef.current) === String(messageData.by?._id)) {
          setRelationshipStatus("FRIENDS");
        }
        fetchFriends();
      } else if (messageData.type === "message_unsent") {
        const unsentId = messageData.messageId || messageData.id;
        setMessages((prev) =>
          prev.map((m) => {
            let updated = m;
            if (
              String(m._id) === String(unsentId) ||
              String(m.id) === String(unsentId)
            ) {
              updated = { ...updated, isUnsent: true, text: "" };
            }
            if (
              m.replyTo &&
              (String(m.replyTo._id) === String(unsentId) ||
                String(m.replyTo.id) === String(unsentId))
            ) {
              updated = {
                ...updated,
                replyTo: { ...m.replyTo, isUnsent: true, text: "" },
              };
            }
            return updated;
          })
        );
        fetchConversations();
        fetchGroups();
      } else if (messageData.type === "message_ack") {
        setMessages((prev) =>
          prev.map((m) =>
            m.tempId && m.tempId === messageData.tempId
              ? {
                  ...m,
                  _id: messageData._id,
                  id: messageData._id,
                  replyTo:
                    messageData.replyTo !== undefined
                      ? messageData.replyTo
                      : m.replyTo,
                  createdAt: messageData.createdAt || m.createdAt,
                }
              : m
          )
        );
      } else if ("text" in messageData) {
        if (
          String(messageData.sender) === String(selectedUserIdRef.current) ||
          String(messageData.recipient) === String(selectedUserIdRef.current)
        ) {
          setMessages((prev) => [
            ...prev,
            {
              text: messageData.text,
              sender: messageData.sender,
              recipient: messageData.recipient,
              _id: messageData._id || messageData.id,
              id: messageData._id || messageData.id,
              replyTo: messageData.replyTo || null,
              isUnsent: Boolean(messageData.isUnsent),
              createdAt: messageData.createdAt || new Date().toISOString(),
            },
          ]);
        }
        fetchConversations();
      }
    } catch (e) {
      console.error("Error processing incoming WS message:", e);
    }
  };

  // Connect WebSocket once when component mounts
  useEffect(() => {
    const socket = new WebSocket(socketUrl);
    socket.addEventListener("message", handleMessage);
    setWs(socket);
    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = (ev, explicitText) => {
    if (ev) ev.preventDefault();
    const textToSend =
      typeof explicitText === "string" ? explicitText : newMessage;
    if (
      !textToSend.trim() ||
      (!selectedUserId && !selectedGroupId) ||
      !ws ||
      ws.readyState !== WebSocket.OPEN
    )
      return;

    const tempId =
      Date.now().toString() + "-" + Math.random().toString(36).substring(2, 7);
    const replyToId = replyingTo?._id || replyingTo?.id || null;
    const currentReplyingTo = replyingTo;

    // Handle Group message sending
    if (selectedGroupId) {
      ws.send(
        JSON.stringify({
          type: "group_message",
          groupId: selectedGroupId,
          text: textToSend.trim(),
          tempId,
          replyTo: replyToId,
        })
      );

      const sentMsg = {
        text: textToSend.trim(),
        sender: {
          _id: userDetails?._id,
          firstName: userDetails?.firstName,
          lastName: userDetails?.lastName,
          username: userDetails?.username,
          avatarLink: userDetails?.avatarLink,
        },
        group: selectedGroupId,
        tempId,
        _id: tempId,
        id: tempId,
        replyTo: currentReplyingTo ? { ...currentReplyingTo } : null,
        isUnsent: false,
        createdAt: new Date().toISOString(),
      };

      if (typeof explicitText !== "string") {
        setNewMessage("");
      }
      setReplyingTo(null);
      setMessages((prev) => [...prev, sentMsg]);
      fetchGroups();
      return;
    }

    // Direct 1-to-1 message sending
    if (userDetails?._id && String(selectedUserId) === String(userDetails._id))
      return;

    if (relationshipStatus !== "FRIENDS") {
      toast.error("You can only message friends.");
      return;
    }

    ws.send(
      JSON.stringify({
        text: textToSend.trim(),
        recipient: selectedUserId,
        tempId,
        replyTo: replyToId,
      })
    );
    const sentMsg = {
      text: textToSend.trim(),
      sender: userDetails?._id,
      recipient: selectedUserId,
      tempId,
      _id: tempId,
      id: tempId,
      replyTo: currentReplyingTo ? { ...currentReplyingTo } : null,
      isUnsent: false,
      createdAt: new Date().toISOString(),
    };
    if (typeof explicitText !== "string") {
      setNewMessage("");
    }
    setReplyingTo(null);
    setMessages((prev) => [...prev, sentMsg]);
    fetchConversations();
  };

  const handleDeleteMessageForMe = async (messageId) => {
    try {
      await axios.delete(`/api/user/messages/${messageId}`);
      setMessages((prev) =>
        prev.filter(
          (m) =>
            String(m._id) !== String(messageId) &&
            String(m.id) !== String(messageId)
        )
      );
      toast.success("Message deleted");
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete message"
      );
    }
  };

  const handleUnsendMessage = async (messageId) => {
    try {
      await axios.post(`/api/user/messages/${messageId}/unsend`);
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId) ||
          String(m.id) === String(messageId)
            ? { ...m, isUnsent: true, text: "" }
            : m
        )
      );
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "unsend", messageId }));
      }
      toast.success("Message unsent");
    } catch (error) {
      console.error("Error unsending message:", error);
      toast.error(
        error?.response?.data?.message || "Failed to unsend message"
      );
    }
  };

  const handleTogglePin = async (targetUser) => {
    const id = targetUser.userId || targetUser._id;
    const isGroup = Boolean(targetUser.isGroup);
    const currentPinned = Boolean(targetUser.isPinned);
    const newPinned = !currentPinned;

    if (isGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          String(g._id) === String(id) ? { ...g, isPinned: newPinned } : g
        )
      );
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          String(c.userId) === String(id) ? { ...c, isPinned: newPinned } : c
        )
      );
    }

    try {
      const res = await axios.patch(`/api/conversations/${id}/pin`, {
        isPinned: newPinned,
      });
      toast.success(
        res.data.message ||
          (newPinned ? "Conversation pinned" : "Conversation unpinned")
      );
      if (isGroup) fetchGroups();
      else fetchConversations();
    } catch (err) {
      console.error("Error toggling pin:", err);
      toast.error(err?.response?.data?.message || "Failed to update pin state");
      if (isGroup) fetchGroups();
      else fetchConversations();
    }
  };

  const handleToggleMute = async (targetUser) => {
    const id = targetUser.userId || targetUser._id;
    const isGroup = Boolean(targetUser.isGroup);
    const currentMuted = Boolean(targetUser.isMuted);
    const newMuted = !currentMuted;

    if (isGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          String(g._id) === String(id) ? { ...g, isMuted: newMuted } : g
        )
      );
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          String(c.userId) === String(id) ? { ...c, isMuted: newMuted } : c
        )
      );
    }

    try {
      const res = await axios.patch(`/api/conversations/${id}/mute`, {
        isMuted: newMuted,
      });
      toast.success(
        res.data.message ||
          (newMuted ? "Notifications muted" : "Notifications unmuted")
      );
      if (isGroup) fetchGroups();
      else fetchConversations();
    } catch (err) {
      console.error("Error toggling mute:", err);
      toast.error(
        err?.response?.data?.message || "Failed to update mute state"
      );
      if (isGroup) fetchGroups();
      else fetchConversations();
    }
  };

  const handleToggleUnread = async (targetUser) => {
    const id = targetUser.userId || targetUser._id;
    const isGroup = Boolean(targetUser.isGroup);
    const currentUnread = Boolean(targetUser.isUnread);
    const newUnread = !currentUnread;

    if (isGroup) {
      setGroups((prev) =>
        prev.map((g) =>
          String(g._id) === String(id) ? { ...g, isUnread: newUnread } : g
        )
      );
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          String(c.userId) === String(id) ? { ...c, isUnread: newUnread } : c
        )
      );
    }

    try {
      const res = await axios.patch(`/api/conversations/${id}/unread`, {
        isUnread: newUnread,
      });
      toast.success(
        res.data.message ||
          (newUnread ? "Marked as unread" : "Marked as read")
      );
      if (isGroup) fetchGroups();
      else fetchConversations();
    } catch (err) {
      console.error("Error toggling unread:", err);
      toast.error(
        err?.response?.data?.message || "Failed to update unread status"
      );
      if (isGroup) fetchGroups();
      else fetchConversations();
    }
  };

  const handleDeleteConversation = async (id) => {
    try {
      await axios.delete(`/api/user/conversations/${id}`);
      setConversations((prev) =>
        prev.filter((c) => String(c.userId) !== String(id))
      );
      setGroups((prev) =>
        prev.filter((g) => String(g._id) !== String(id))
      );
      if (String(selectedUserId) === String(id)) {
        setSelectedUserId(null);
        setMessages([]);
      }
      if (String(selectedGroupId) === String(id)) {
        setSelectedGroupId(null);
        setCurrentGroup(null);
        setMessages([]);
      }
      toast.success("Conversation deleted");
      fetchFriends();
      fetchConversations();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error(
        error?.response?.data?.message || "Failed to delete conversation"
      );
      throw error;
    }
  };

  const handleUnfriend = async (userId) => {
    try {
      await axios.delete(`/api/friends/${userId}`);
      toast.success("Unfriended successfully");
      setRelationshipStatus("NOT_CONNECTED");
      fetchFriends();
      fetchConversations();
    } catch (error) {
      console.error("Error unfriending user:", error);
      toast.error(error?.response?.data?.message || "Failed to unfriend");
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await axios.post(`/api/friends/block/${userId}`);
      toast.success("User blocked");
      setRelationshipStatus("BLOCKED");
      fetchFriends();
      fetchConversations();
    } catch (error) {
      console.error("Error blocking user:", error);
      toast.error(error?.response?.data?.message || "Failed to block user");
    }
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}`);
      toast.success("Friend request sent!");
      setRelationshipStatus("PENDING_SENT");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error(
        error?.response?.data?.message || "Failed to send friend request"
      );
    }
  };

  const handleCancelFriendRequest = async (userId) => {
    try {
      await axios.delete(`/api/friends/request/${userId}`);
      toast.success("Friend request cancelled");
      setRelationshipStatus("NOT_CONNECTED");
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error(
        error?.response?.data?.message || "Failed to cancel request"
      );
    }
  };

  const handleAcceptFriendRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}/accept`);
      toast.success("Friend request accepted!");
      setRelationshipStatus("FRIENDS");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error(
        error?.response?.data?.message || "Failed to accept request"
      );
    }
  };

  const handleDeclineFriendRequest = async (userId) => {
    try {
      await axios.post(`/api/friends/request/${userId}/decline`);
      toast.success("Friend request declined");
      setRelationshipStatus("NOT_CONNECTED");
    } catch (error) {
      console.error("Error declining friend request:", error);
      toast.error(
        error?.response?.data?.message || "Failed to decline request"
      );
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await axios.delete(`/api/friends/block/${userId}`);
      toast.success("User unblocked");
      setRelationshipStatus("NOT_CONNECTED");
    } catch (error) {
      console.error("Error unblocking user:", error);
      toast.error(error?.response?.data?.message || "Failed to unblock user");
    }
  };

  const handleGroupCreated = (newGroup) => {
    fetchGroups();
    setCurrentGroup(newGroup);
    setSelectedGroupId(newGroup._id);
    setSelectedUserId(null);
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const isAnyChatActive = Boolean(selectedUserId || selectedGroupId);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-background relative overflow-hidden">
      <Nav />

      {/* Conversations and Groups List Sidebar */}
      <OnlineUsersList
        onlinePeople={onlinePeople}
        selectedUserId={selectedUserId}
        setSelectedUserId={handleSelectUser}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        groups={groups}
        onOpenCreateGroup={() => setIsCreateGroupOpen(true)}
        offlinePeople={offlinePeople}
        allPeople={allPeople}
        conversations={conversations}
        friends={friends}
        currentMessages={messages}
        onTogglePin={handleTogglePin}
        onToggleMute={handleToggleMute}
        onToggleUnread={handleToggleUnread}
        onDeleteConversation={handleDeleteConversation}
      />

      {/* Main Chat Screen Area */}
      <section
        className={`${
          !isAnyChatActive ? "hidden md:flex" : "flex"
        } flex-1 flex flex-col bg-background h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden relative z-10`}
      >
        {!isAnyChatActive ? (
          <div className="flex-1 relative flex flex-col items-center justify-center text-center p-8 select-none bg-cream-50/60">
            {/* Ambient backdrop glow */}
            <div className="w-96 h-96 bg-chatora-pink/10 rounded-full blur-3xl absolute pointer-events-none -z-0"></div>

            <div className="relative z-10 flex flex-col items-center max-w-md">
              <div className="w-20 h-20 rounded-3xl bg-white border border-chatora-border p-1 shadow-sweet mb-6 flex items-center justify-center">
                <div className="w-full h-full rounded-[22px] bg-gradient-to-tr from-chatora-pink/20 via-chatora-peach/20 to-chatora-lavender/20 flex items-center justify-center text-3xl">
                  💬✨
                </div>
              </div>

              <h2 className="text-2xl font-bold text-plum-900 tracking-tight mb-2">
                Talk. Laugh. Connect. 💕
              </h2>
              <p className="text-sm text-plum-500 leading-relaxed mb-6">
                Pick a conversation from your list, create a group with friends,
                or explore the community and cause a little chaos.
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="hero-create-group-btn"
                  onClick={() => setIsCreateGroupOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FFB3C6] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-sm font-extrabold text-plum-900 transition-all active:scale-95"
                >
                  <span className="text-base font-bold">+</span>
                  Create Group ✨
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/people")}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-cream-100 border border-chatora-border text-sm font-semibold text-plum-800 transition-all shadow-sweet active:scale-95"
                >
                  Discover People 🌸
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <TopBar
              selectedUserId={selectedUserId}
              setSelectedUserId={handleSelectUser}
              selectedGroupId={selectedGroupId}
              setSelectedGroupId={handleSelectGroup}
              currentGroup={currentGroup}
              onOpenGroupInfo={() => setIsGroupInfoOpen(true)}
              onLeaveGroup={() => setIsGroupInfoOpen(true)}
              offlinePeople={offlinePeople}
              onlinePeople={onlinePeople}
              allPeople={allPeople}
              conversations={conversations}
              friends={friends}
              onDeleteConversation={handleDeleteConversation}
              onUnfriend={handleUnfriend}
              onBlockUser={handleBlockUser}
              relationshipStatus={relationshipStatus}
              onOpenChaos={() => setIsChaosOpen(true)}
            />

            <ChatMessages
              messages={messages}
              userDetails={userDetails}
              selectedUserId={selectedUserId}
              selectedGroupId={selectedGroupId}
              onDeleteMessageForMe={handleDeleteMessageForMe}
              onUnsendMessage={handleUnsendMessage}
              onReply={(msg) => setReplyingTo(msg)}
              onSayHi={() => setNewMessage("Hey! 👋")}
            />

            {/* Chat Footer / Input area */}
            <div className="flex-shrink-0 w-full bg-white/95 backdrop-blur-md border-t border-chatora-border z-20 pb-16 md:pb-0">
              {Boolean(selectedGroupId) || relationshipStatus === "FRIENDS" ? (
                <MessageInputForm
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  sendMessage={sendMessage}
                  selectedUserId={selectedUserId}
                  selectedGroupId={selectedGroupId}
                  onOpenChaos={() => setIsChaosOpen(true)}
                  replyingTo={replyingTo}
                  onCancelReply={() => setReplyingTo(null)}
                  partnerName={
                    selectedGroupId
                      ? currentGroup?.name || "Group"
                      : conversations.find(
                          (c) => String(c.userId) === String(selectedUserId)
                        )?.username ||
                        allPeople.find(
                          (p) => String(p._id) === String(selectedUserId)
                        )?.username ||
                        "Friend"
                  }
                  currentUserId={userDetails?._id}
                />
              ) : (
                <div className="w-full max-w-5xl mx-auto p-3 md:p-4">
                  {relationshipStatus === "NOT_CONNECTED" && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white border border-chatora-border rounded-2xl shadow-sweet">
                      <div className="flex items-center gap-2.5 text-plum-700 text-xs sm:text-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-chatora-pink"></span>
                        <span>You can only message friends on Chatora.</span>
                      </div>
                      <button
                        onClick={() => handleSendFriendRequest(selectedUserId)}
                        className="w-full sm:w-auto bg-gradient-to-r from-[#FFB3C6] via-[#FFBDC7] to-[#FFCCBC] border border-chatora-pink/30 hover:shadow-sweet-pink text-plum-900 px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95"
                      >
                        + Add Friend 💕
                      </button>
                    </div>
                  )}

                  {relationshipStatus === "PENDING_SENT" && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white border border-chatora-border rounded-2xl shadow-sweet">
                      <div className="flex items-center gap-2.5 text-plum-700 text-xs sm:text-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-chatora-yellow animate-pulse"></span>
                        <span>
                          Friend request sent. Waiting for acceptance before messaging.
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          handleCancelFriendRequest(selectedUserId)
                        }
                        className="w-full sm:w-auto bg-white hover:bg-rose-50 text-chatora-coral border border-chatora-border px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sweet transition-all active:scale-95"
                      >
                        Cancel Request
                      </button>
                    </div>
                  )}

                  {relationshipStatus === "PENDING_RECEIVED" && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white border border-chatora-border rounded-2xl shadow-sweet">
                      <div className="flex items-center gap-2.5 text-plum-700 text-xs sm:text-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-chatora-mint"></span>
                        <span>This user sent you a friend request.</span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={() =>
                            handleAcceptFriendRequest(selectedUserId)
                          }
                          className="flex-1 sm:flex-none bg-chatora-mint hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sweet transition-all active:scale-95"
                        >
                          Accept 💕
                        </button>
                        <button
                          onClick={() =>
                            handleDeclineFriendRequest(selectedUserId)
                          }
                          className="flex-1 sm:flex-none bg-white hover:bg-cream-100 text-plum-700 border border-chatora-border px-3 py-2 rounded-xl text-xs font-semibold shadow-sweet transition-all active:scale-95"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  )}

                  {relationshipStatus === "BLOCKED" && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white border border-chatora-border rounded-2xl shadow-sweet">
                      <div className="flex items-center gap-2.5 text-plum-700 text-xs sm:text-sm">
                        <span className="w-2.5 h-2.5 rounded-full bg-chatora-coral"></span>
                        <span>You have blocked this user.</span>
                      </div>
                      <button
                        onClick={() => handleUnblockUser(selectedUserId)}
                        className="w-full sm:w-auto bg-white hover:bg-cream-100 text-plum-800 border border-chatora-border px-4 py-2 rounded-xl text-xs font-semibold shadow-sweet transition-all active:scale-95"
                      >
                        Unblock User
                      </button>
                    </div>
                  )}

                  {relationshipStatus === "BLOCKED_BY_USER" && (
                    <div className="p-3.5 text-center bg-white border border-chatora-border rounded-2xl shadow-sweet text-xs sm:text-sm text-plum-400 select-none">
                      You cannot message this user.
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* Chaos Mode Modal */}
      <ChaosModal
        isOpen={isChaosOpen}
        onClose={() => setIsChaosOpen(false)}
        selectedUserId={selectedUserId}
        selectedGroupId={selectedGroupId}
        partnerName={
          selectedGroupId
            ? currentGroup?.name || "Group"
            : conversations.find((c) => String(c.userId) === String(selectedUserId))
                ?.username ||
              allPeople.find((p) => String(p._id) === String(selectedUserId))
                ?.username ||
              "Friend"
        }
        onSendToChat={(text) => sendMessage(null, text)}
      />

      {/* Group Create Modal */}
      <GroupCreateModal
        isOpen={isCreateGroupOpen}
        onClose={() => setIsCreateGroupOpen(false)}
        onGroupCreated={handleGroupCreated}
      />

      {/* Group Info Modal */}
      <GroupInfoModal
        isOpen={isGroupInfoOpen}
        onClose={() => setIsGroupInfoOpen(false)}
        group={currentGroup}
        currentUserId={userDetails?._id}
        onGroupUpdated={(updated) => {
          setCurrentGroup(updated);
          fetchGroups();
        }}
        onLeaveGroup={() => {
          setSelectedGroupId(null);
          setCurrentGroup(null);
          setMessages([]);
          fetchGroups();
        }}
      />
    </div>
  );
};

export default ChatHome;
