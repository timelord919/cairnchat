const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const messagesByRoom = new Map();

app.use(express.static("public"));

app.get("/", (req, res) => {
  const fs = require("fs");
  const path = require("path");
  const candidates = [
    path.join(__dirname, "public", "index.html"),
    path.join(__dirname, "index.html"),
    path.join(__dirname, "public.html")
  ];
  const homepage = candidates.find(fs.existsSync);

  if (homepage) {
    res.sendFile(homepage);
  } else {
    res.status(404).send("Homepage not found. Add public/index.html to the GitHub repository.");
  }
});

io.on("connection", (socket) => {
  socket.on("join-room", ({ room, name } = {}) => {
    if (typeof room !== "string" || typeof name !== "string") return;

    room = room.trim().toLowerCase();
    name = name.trim().slice(0, 24);

    if (!/^[a-z0-9-]{3,40}$/.test(room) || !name) return;

    // Leave any room the socket previously joined.
    for (const oldRoom of socket.rooms) {
      if (oldRoom !== socket.id) socket.leave(oldRoom);
    }

    socket.join(room);
    socket.data.room = room;
    socket.data.name = name;

    socket.emit("room-history", messagesByRoom.get(room) || []);
    socket.to(room).emit("notice", `${name} joined the room`);
  });

  socket.on("send-message", (text) => {
    const room = socket.data.room;
    const name = socket.data.name;

    if (!room || !name || typeof text !== "string") return;

    text = text.trim().slice(0, 1000);
    if (!text) return;

    const message = {
      name,
      text,
      time: new Date().toISOString()
    };

    const history = messagesByRoom.get(room) || [];
    history.push(message);
    if (history.length > 100) history.shift();
    messagesByRoom.set(room, history);

    io.to(room).emit("message", message);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cairn is running on port ${PORT}`);
});
