const ws = require("ws");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Message = require("./models/messageModel");
const { User } = require("./models/userModel");

let wssInstance = null;

const notifyMessageUnsent = async (messageDoc) => {
  if (!wssInstance) return;
  let targetIds = [
    messageDoc.sender?.toString(),
    messageDoc.recipient?.toString(),
  ].filter(Boolean);

  if (messageDoc.group) {
    try {
      const Group = require("./models/groupModel");
      const grp = await Group.findById(messageDoc.group);
      if (grp && Array.isArray(grp.members)) {
        targetIds = grp.members.map((m) => m.toString());
      }
    } catch (_) {}
  }

  const payload = JSON.stringify({
    type: "message_unsent",
    messageId: messageDoc._id,
    id: messageDoc._id,
    sender: messageDoc.sender,
    recipient: messageDoc.recipient,
    groupId: messageDoc.group || null,
  });

  wssInstance.clients.forEach((client) => {
    if (
      client.readyState === ws.WebSocket.OPEN &&
      client.userId &&
      targetIds.includes(client.userId.toString())
    ) {
      client.send(payload);
    }
  });
};

const notifyGroupEvent = (memberIds, eventPayload) => {
  if (!wssInstance || !Array.isArray(memberIds)) return;
  const targetIds = memberIds.map((id) => id.toString());
  const payload = JSON.stringify(eventPayload);
  wssInstance.clients.forEach((client) => {
    if (
      client.readyState === ws.WebSocket.OPEN &&
      client.userId &&
      targetIds.includes(client.userId.toString())
    ) {
      client.send(payload);
    }
  });
};

const notifyGroupMessage = (memberIds, messagePayload) => {
  if (!wssInstance || !Array.isArray(memberIds)) return;
  const targetIds = memberIds.map((id) => id.toString());
  const payload = JSON.stringify(messagePayload);
  wssInstance.clients.forEach((client) => {
    if (
      client.readyState === ws.WebSocket.OPEN &&
      client.userId &&
      targetIds.includes(client.userId.toString())
    ) {
      client.send(payload);
    }
  });
};

const notifyFriendRequest = (recipientId, fromUser) => {
  if (!wssInstance || !recipientId) return;
  const payload = JSON.stringify({
    type: "friend_request_received",
    from: fromUser,
  });
  wssInstance.clients.forEach((client) => {
    if (
      client.readyState === ws.WebSocket.OPEN &&
      client.userId &&
      client.userId.toString() === recipientId.toString()
    ) {
      client.send(payload);
    }
  });
};

const notifyFriendshipAccepted = (requesterId, accepterUser) => {
  if (!wssInstance || !requesterId) return;
  const payload = JSON.stringify({
    type: "friend_request_accepted",
    by: accepterUser,
  });
  wssInstance.clients.forEach((client) => {
    if (
      client.readyState === ws.WebSocket.OPEN &&
      client.userId &&
      client.userId.toString() === requesterId.toString()
    ) {
      client.send(payload);
    }
  });
};

const createWebSocketServer = (server) => {
  const wss = new ws.WebSocketServer({ server });
  wssInstance = wss;

  wss.on("connection", (connection, req) => {
    connection.isAlive = true;

    connection.on("error", (err) => {
      console.error("WebSocket connection error:", err.message);
    });

    const cookies = req.headers.cookie;
    if (cookies) {
      const tokenString = cookies
        .split(";")
        .find((str) => str.trim().startsWith("authToken="));

      if (tokenString) {
        const token = tokenString.split("=")[1];
        try {
          const userData = jwt.verify(token, process.env.JWTPRIVATEKEY);
          if (userData && userData._id) {
            connection.userId = userData._id;
            connection.username = `${userData.firstName} ${userData.lastName}`;
          }
        } catch (err) {
          // Token invalid or expired
        }
      }
    }

    const notifyAboutOnlinePeople = async () => {
      try {
        const authenticatedClients = Array.from(wss.clients).filter(
          (client) => client.userId && client.isAlive
        );

        const onlineUsers = await Promise.all(
          authenticatedClients.map(async (client) => {
            const { userId, username } = client;
            const user = await User.findById(userId).select("avatarLink username");
            const avatarLink = user ? user.avatarLink : null;
            const userHandle = user ? user.username : null;

            return {
              userId,
              username,
              userHandle,
              avatarLink,
            };
          })
        );

        const payload = JSON.stringify({ online: onlineUsers });
        authenticatedClients.forEach((client) => {
          if (client.readyState === ws.WebSocket.OPEN) {
            client.send(payload);
          }
        });
      } catch (err) {
        console.error("Error in notifyAboutOnlinePeople:", err.message);
      }
    };

    connection.timer = setInterval(() => {
      connection.ping();
      connection.deathTimer = setTimeout(() => {
        connection.isAlive = false;
        clearInterval(connection.timer);
        connection.terminate();
        notifyAboutOnlinePeople();
      }, 1000);
    }, 5000);

    connection.on("pong", () => {
      clearTimeout(connection.deathTimer);
    });

    connection.messageQueue = Promise.resolve();

    connection.on("message", (message) => {
      connection.messageQueue = connection.messageQueue.then(async () => {
        try {
          if (!connection.userId) {
            return;
          }

          let messageData;
          try {
            messageData = JSON.parse(message.toString());
          } catch (parseError) {
            console.warn("Received malformed WebSocket message:", message.toString().substring(0, 50));
            if (connection.readyState === ws.WebSocket.OPEN) {
              connection.send(JSON.stringify({ error: "Invalid JSON format" }));
            }
            return;
          }

          // Handle unsend event directly via WebSocket
          if (messageData.type === "unsend") {
            const { messageId } = messageData;
            if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(JSON.stringify({ error: "Invalid message ID" }));
              }
              return;
            }
            const msgDoc = await Message.findById(messageId);
            if (!msgDoc) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(JSON.stringify({ error: "Message not found" }));
              }
              return;
            }
            if (msgDoc.sender.toString() !== connection.userId.toString()) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(JSON.stringify({ error: "Unauthorized to unsend this message" }));
              }
              return;
            }
            msgDoc.isUnsent = true;
            msgDoc.text = "";
            await msgDoc.save();
            await notifyMessageUnsent(msgDoc);
            return;
          }

          // Handle group messages
          if (messageData.groupId) {
            const { groupId, text, tempId, replyTo } = messageData;

            if (!text || typeof text !== "string" || !text.trim()) {
              return;
            }

            if (!mongoose.Types.ObjectId.isValid(groupId)) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(
                  JSON.stringify({
                    type: "message_error",
                    error: "Invalid group ID",
                  })
                );
              }
              return;
            }

            const Group = require("./models/groupModel");
            const group = await Group.findById(groupId);
            if (!group) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(
                  JSON.stringify({
                    type: "message_error",
                    error: "Group not found",
                  })
                );
              }
              return;
            }

            const isMember = group.members.some(
              (m) => m.toString() === connection.userId.toString()
            );
            if (!isMember) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(
                  JSON.stringify({
                    type: "message_error",
                    error: "You are not a member of this group",
                  })
                );
              }
              return;
            }

            // Validate replyTo if provided
            let originalReplyDoc = null;
            if (replyTo !== undefined && replyTo !== null) {
              if (!mongoose.Types.ObjectId.isValid(replyTo)) {
                if (connection.readyState === ws.WebSocket.OPEN) {
                  connection.send(
                    JSON.stringify({
                      type: "message_error",
                      error: "Invalid replyTo message ID",
                    })
                  );
                }
                return;
              }
              originalReplyDoc = await Message.findById(replyTo).populate(
                "sender",
                "firstName lastName username"
              );
              if (!originalReplyDoc) {
                if (connection.readyState === ws.WebSocket.OPEN) {
                  connection.send(
                    JSON.stringify({
                      type: "message_error",
                      error: "Referenced reply message not found",
                    })
                  );
                }
                return;
              }
              if (
                !originalReplyDoc.group ||
                originalReplyDoc.group.toString() !== groupId.toString()
              ) {
                if (connection.readyState === ws.WebSocket.OPEN) {
                  connection.send(
                    JSON.stringify({
                      type: "message_error",
                      error:
                        "Cannot reply to a message from another group or conversation",
                    })
                  );
                }
                return;
              }
            }

            const msgDoc = await Message.create({
              sender: connection.userId,
              recipient: null,
              group: groupId,
              text: text.trim(),
              isUnsent: false,
              deletedFor: [],
              replyTo: replyTo || null,
            });

            const senderUser = await User.findById(connection.userId).select(
              "firstName lastName username avatarLink"
            );

            const senderDetails = senderUser
              ? {
                  _id: senderUser._id,
                  firstName: senderUser.firstName,
                  lastName: senderUser.lastName,
                  username: senderUser.username,
                  avatarLink: senderUser.avatarLink,
                }
              : { _id: connection.userId };

            let baseReplyTo = null;
            if (originalReplyDoc) {
              baseReplyTo = {
                _id: originalReplyDoc._id,
                id: originalReplyDoc._id,
                sender: originalReplyDoc.sender,
                text: originalReplyDoc.isUnsent ? "" : originalReplyDoc.text,
                isUnsent: Boolean(originalReplyDoc.isUnsent),
                deletedFor: originalReplyDoc.deletedFor || [],
                createdAt: originalReplyDoc.createdAt,
              };
            }

            const memberIds = group.members.map((m) => m.toString());

            // Broadcast to all connected members
            wss.clients.forEach((client) => {
              if (
                client.readyState === ws.WebSocket.OPEN &&
                client.userId &&
                memberIds.includes(client.userId.toString())
              ) {
                const isClientSender =
                  client.userId.toString() === connection.userId.toString();
                const isClientDeleted =
                  baseReplyTo &&
                  Array.isArray(baseReplyTo.deletedFor) &&
                  baseReplyTo.deletedFor.some(
                    (id) => id.toString() === client.userId.toString()
                  );

                const sanitizedReply = baseReplyTo
                  ? {
                      _id: baseReplyTo._id,
                      id: baseReplyTo._id,
                      sender: baseReplyTo.sender,
                      text:
                        baseReplyTo.isUnsent || isClientDeleted
                          ? ""
                          : baseReplyTo.text,
                      isUnsent: baseReplyTo.isUnsent,
                      isDeletedForMe: isClientDeleted,
                      createdAt: baseReplyTo.createdAt,
                    }
                  : null;

                if (!isClientSender) {
                  client.send(
                    JSON.stringify({
                      type: "group_message",
                      _id: msgDoc._id,
                      id: msgDoc._id,
                      sender: senderDetails,
                      groupId,
                      group: groupId,
                      text: msgDoc.text,
                      isUnsent: false,
                      createdAt: msgDoc.createdAt,
                      replyTo: sanitizedReply,
                    })
                  );
                }
              }
            });

            // Send message_ack to sender
            if (connection.readyState === ws.WebSocket.OPEN) {
              const isSenderDeleted =
                baseReplyTo &&
                Array.isArray(baseReplyTo.deletedFor) &&
                baseReplyTo.deletedFor.some(
                  (id) => id.toString() === connection.userId.toString()
                );
              const senderSanitizedReply = baseReplyTo
                ? {
                    _id: baseReplyTo._id,
                    id: baseReplyTo._id,
                    sender: baseReplyTo.sender,
                    text:
                      baseReplyTo.isUnsent || isSenderDeleted
                        ? ""
                        : baseReplyTo.text,
                    isUnsent: baseReplyTo.isUnsent,
                    isDeletedForMe: isSenderDeleted,
                    createdAt: baseReplyTo.createdAt,
                  }
                : null;

              connection.send(
                JSON.stringify({
                  type: "message_ack",
                  tempId,
                  _id: msgDoc._id,
                  id: msgDoc._id,
                  sender: senderDetails,
                  groupId,
                  group: groupId,
                  text: msgDoc.text,
                  isUnsent: false,
                  createdAt: msgDoc.createdAt,
                  replyTo: senderSanitizedReply,
                })
              );
            }
            return;
          }

          const { recipient, text, tempId, replyTo } = messageData;

          // Disallow empty or non-string text
          if (!recipient || !text || typeof text !== "string" || !text.trim()) {
            return;
          }

          // BUG-09: Prevent self-messaging where sender === recipient
          if (String(connection.userId) === String(recipient)) {
            if (connection.readyState === ws.WebSocket.OPEN) {
              connection.send(JSON.stringify({ error: "Cannot send message to yourself" }));
            }
            return;
          }

          // Validate recipient is a valid MongoDB ObjectId
          if (!mongoose.Types.ObjectId.isValid(recipient)) {
            if (connection.readyState === ws.WebSocket.OPEN) {
              connection.send(JSON.stringify({ error: "Invalid recipient ID" }));
            }
            return;
          }

          // Validate replyTo if provided
          let originalReplyDoc = null;
          if (replyTo !== undefined && replyTo !== null) {
            if (!mongoose.Types.ObjectId.isValid(replyTo)) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(
                  JSON.stringify({
                    type: "message_error",
                    error: "Invalid replyTo message ID",
                  })
                );
              }
              return;
            }
            originalReplyDoc = await Message.findById(replyTo).populate(
              "sender",
              "firstName lastName username"
            );
            if (!originalReplyDoc) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(
                  JSON.stringify({
                    type: "message_error",
                    error: "Referenced reply message not found",
                  })
                );
              }
              return;
            }
            const origSenderId = (
              originalReplyDoc.sender?._id || originalReplyDoc.sender
            ).toString();
            const origRecipientId = (
              originalReplyDoc.recipient?._id || originalReplyDoc.recipient
            ).toString();
            const isSameConv =
              (origSenderId === connection.userId.toString() &&
                origRecipientId === recipient.toString()) ||
              (origSenderId === recipient.toString() &&
                origRecipientId === connection.userId.toString());
            if (!isSameConv) {
              if (connection.readyState === ws.WebSocket.OPEN) {
                connection.send(
                  JSON.stringify({
                    type: "message_error",
                    error: "Cannot reply to a message from another conversation",
                  })
                );
              }
              return;
            }
          }

          // Check Block relationship
          const Block = require("./models/blockModel");
          const isBlocked = await Block.findOne({
            $or: [
              { blocker: connection.userId, blocked: recipient },
              { blocker: recipient, blocked: connection.userId },
            ],
          });

          if (isBlocked) {
            if (connection.readyState === ws.WebSocket.OPEN) {
              connection.send(
                JSON.stringify({
                  type: "message_error",
                  error: "Cannot message blocked user",
                })
              );
            }
            return;
          }

          // Check Friendship relationship (status === "ACCEPTED")
          const Friendship = require("./models/friendshipModel");
          const canonicalPair = Friendship.getCanonicalPair(connection.userId, recipient);
          const friendship = await Friendship.findOne({
            canonicalPair,
            status: "ACCEPTED",
          });

          if (!friendship) {
            if (connection.readyState === ws.WebSocket.OPEN) {
              connection.send(
                JSON.stringify({
                  type: "message_error",
                  error: "You can only message friends.",
                })
              );
            }
            return;
          }

          const msgDoc = await Message.create({
            sender: connection.userId,
            recipient,
            text: text.trim(),
            isUnsent: false,
            deletedFor: [],
            replyTo: replyTo || null,
          });

          let recipientReplyTo = null;
          let senderReplyTo = null;
          if (originalReplyDoc) {
            const isRecipientDeleted =
              Array.isArray(originalReplyDoc.deletedFor) &&
              originalReplyDoc.deletedFor.some(
                (id) => id.toString() === recipient.toString()
              );
            const isSenderDeleted =
              Array.isArray(originalReplyDoc.deletedFor) &&
              originalReplyDoc.deletedFor.some(
                (id) => id.toString() === connection.userId.toString()
              );

            recipientReplyTo = {
              _id: originalReplyDoc._id,
              id: originalReplyDoc._id,
              sender: originalReplyDoc.sender,
              recipient: originalReplyDoc.recipient,
              text:
                originalReplyDoc.isUnsent || isRecipientDeleted
                  ? ""
                  : originalReplyDoc.text,
              isUnsent: Boolean(originalReplyDoc.isUnsent),
              isDeletedForMe: isRecipientDeleted,
              createdAt: originalReplyDoc.createdAt,
            };

            senderReplyTo = {
              _id: originalReplyDoc._id,
              id: originalReplyDoc._id,
              sender: originalReplyDoc.sender,
              recipient: originalReplyDoc.recipient,
              text:
                originalReplyDoc.isUnsent || isSenderDeleted
                  ? ""
                  : originalReplyDoc.text,
              isUnsent: Boolean(originalReplyDoc.isUnsent),
              isDeletedForMe: isSenderDeleted,
              createdAt: originalReplyDoc.createdAt,
            };
          }

          const outgoingPayload = JSON.stringify({
            _id: msgDoc._id,
            id: msgDoc._id,
            sender: connection.userId,
            recipient,
            text: msgDoc.text,
            isUnsent: false,
            createdAt: msgDoc.createdAt,
            replyTo: recipientReplyTo,
          });

          [...wss.clients].forEach((client) => {
            if (client.userId === recipient && client.readyState === ws.WebSocket.OPEN) {
              client.send(outgoingPayload);
            }
          });

          // Acknowledge back to sender with created MongoDB _id
          if (connection.readyState === ws.WebSocket.OPEN) {
            connection.send(
              JSON.stringify({
                type: "message_ack",
                tempId: tempId,
                _id: msgDoc._id,
                id: msgDoc._id,
                sender: connection.userId,
                recipient,
                text: msgDoc.text,
                isUnsent: false,
                createdAt: msgDoc.createdAt,
                replyTo: senderReplyTo,
              })
            );
          }
        } catch (err) {
          console.error("Error processing WebSocket message:", err);
        }
      }).catch((queueErr) => {
        console.error("Error in message queue:", queueErr);
      });
    });

    connection.on("close", () => {
      clearInterval(connection.timer);
      clearTimeout(connection.deathTimer);
      notifyAboutOnlinePeople();
    });

    notifyAboutOnlinePeople();
  });
};

createWebSocketServer.createWebSocketServer = createWebSocketServer;
createWebSocketServer.notifyMessageUnsent = notifyMessageUnsent;
createWebSocketServer.notifyFriendRequest = notifyFriendRequest;
createWebSocketServer.notifyFriendshipAccepted = notifyFriendshipAccepted;
createWebSocketServer.notifyGroupEvent = notifyGroupEvent;
createWebSocketServer.notifyGroupMessage = notifyGroupMessage;

module.exports = createWebSocketServer;
