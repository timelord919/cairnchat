const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", ({ room } = {}) => {
    if (typeof room !== "string") return;

    room = room.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(room)) return;

    const members = io.sockets.adapter.rooms.get(room);
    if (members && members.size >= 2) {
      socket.emit("room-error", "This prototype allows only two people per room.");
      return;
    }

    socket.join(room);
    socket.data.room = room;

    // Tell the new user about the existing peer's public key, if available.
    if (members) {
      for (const id of members) {
        const peer = io.sockets.sockets.get(id);
        if (peer?.data.publicKey) {
          socket.emit("peer-public-key", peer.data.publicKey);
        }
      }
    }
  });

  socket.on("public-key", (publicKey) => {
    const room = socket.data.room;
    if (!room || typeof publicKey !== "string" || publicKey.length > 300) return;

    socket.data.publicKey = publicKey;
    socket.to(room).emit("peer-public-key", publicKey);
  });

  socket.on("send-message", (packet) => {
    const room = socket.data.room;
    if (
      !room ||
      !packet ||
      typeof packet.iv !== "string" ||
      typeof packet.data !== "string" ||
      !/^[A-Za-z0-9_-]{16}$/.test(packet.iv) ||
      packet.data.length > 12000 ||
      !/^[A-Za-z0-9_-]+$/.test(packet.data)
    ) {
      return;
    }

    // Relay ciphertext only; do not keep message history.
    socket.to(room).emit("message", packet);
  });

  socket.on("disconnect", () => {
    const room = socket.data.room;
    if (room) socket.to(room).emit("peer-left");
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cairn is running on port ${PORT}`);
});
