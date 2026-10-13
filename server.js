const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const messagesByRoom = new Map();

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", ({ room } = {}) => {
    if (typeof room !== "string") return;

    room = room.trim().toLowerCase();

    if (!/^[a-z0-9-]{3,40}$/.test(room)) return;

    for (const oldRoom of socket.rooms) {
      if (oldRoom !== socket.id) {
        socket.leave(oldRoom);
      }
    }

    socket.join(room);
    socket.data.room = room;
    socket.emit("room-history", messagesByRoom.get(room) || []);
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

    const message = {
      iv: packet.iv,
      data: packet.data,
      time: new Date().toISOString()
    };

    const history = messagesByRoom.get(room) || [];
    history.push(message);

    if (history.length > 100) {
      history.shift();
    }

    messagesByRoom.set(room, history);
    io.to(room).emit("message", message);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cairn is running on port ${PORT}`);
});
