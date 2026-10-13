"use strict";

const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const rooms = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

function leaveRoom(socket) {
  const roomName = socket.data.room;
  if (!roomName) return;

  const members = rooms.get(roomName);
  socket.data.room = null;

  if (!members) return;

  members.delete(socket.id);
  socket.leave(roomName);

  if (members.size === 0) {
    rooms.delete(roomName);
  } else {
    for (const id of members.keys()) {
      io.to(id).emit("peer-left");
    }
  }
}

io.on("connection", socket => {
  socket.on("join-room", ({ room } = {}) => {
    if (socket.data.room) {
      socket.emit("room-error", "Refresh to start a new session.");
      return;
    }

    if (typeof room !== "string") {
      socket.emit("room-error", "Invalid room code.");
      return;
    }

    room = room.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(room)) {
      socket.emit("room-error", "Room code must be 3–40 lowercase letters, numbers, or hyphens.");
      return;
    }

    let members = rooms.get(room);
    if (!members) {
      members = new Map();
      rooms.set(room, members);
    }

    if (members.size >= 2) {
      socket.emit("room-error", "This prototype allows only two people per room.");
      return;
    }

    members.set(socket.id, { publicKey: null });
    socket.data.room = room;
    socket.join(room);
    socket.emit("joined-room");

    // If the existing peer already submitted a key, send it to the newcomer.
    for (const [id, member] of members) {
      if (id !== socket.id && member.publicKey) {
        socket.emit("peer-public-key", member.publicKey);
      }
    }
  });

  socket.on("public-key", publicKey => {
    const roomName = socket.data.room;
    const members = roomName && rooms.get(roomName);
    const member = members && members.get(socket.id);

    if (
      !member ||
      typeof publicKey !== "string" ||
      !/^[A-Za-z0-9_-]{86}$/.test(publicKey)
    ) {
      return;
    }

    member.publicKey = publicKey;

    // Notify only the other member. The new joiner receives an existing key
    // above, or receives this event when the other person submits theirs.
    socket.to(roomName).emit("peer-public-key", publicKey);
  });

  socket.on("send-message", packet => {
    const roomName = socket.data.room;
    const members = roomName && rooms.get(roomName);

    if (
      !members ||
      members.size !== 2 ||
      !packet ||
      typeof packet.iv !== "string" ||
      !/^[A-Za-z0-9_-]{16}$/.test(packet.iv) ||
      typeof packet.data !== "string" ||
      packet.data.length < 1 ||
      packet.data.length > 6000 ||
      !/^[A-Za-z0-9_-]+$/.test(packet.data)
    ) {
      return;
    }

    const recipientId = [...members.keys()].find(id => id !== socket.id);
    if (recipientId) {
      io.to(recipientId).emit("message", {
        iv: packet.iv,
        data: packet.data,
        time: new Date().toISOString()
      });
    }
  });

  socket.on("disconnect", () => leaveRoom(socket));
});
  
const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cairn is running on port ${PORT}`);
});
