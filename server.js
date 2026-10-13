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
  res.sendFile(require("path").join(__dirname, "public", "index.html"));
});

io.on("connection", (socket) => {
  socket.on("join-room", ({ room } = {}) => {
    if (typeof room !== "string") return;

    room = room.trim().toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(room)) return;

    for (const oldRoom of socket.rooms) {
      if (oldRoom !== socket.id) socket.leave(oldRoom);
    }

    socket.join(room);
    socket.data.room = room;
    socket.emit("room-history", messagesByRoom.get(room) || []);
  });

  socket.on("send-message", (packet) => {
    const room = socket.data.room;

    // Only accept encrypted packets in the expected format.
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
    if (history.length > 100) history.shift();
    messagesByRoom.set(room, history);

    io.to(room).emit("message", message);
  });
});

server.listen(PORT, "We can make the server relay **ciphertext only**, with browsers encrypting and decrypting messages using the built-in Web Crypto API and **AES-256-GCM**.

One important limitation: this is a solid learning prototype, not an audited secure messenger. Anyone with the room key can read that room’s messages. Also, because the website downloads its code from Render, a malicious or compromised server could serve altered code that steals the key. Don’t use this for sensitive conversations yet.

### 1. Replace `server.js`

```js
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
    if (!/^[a-z0-9-]{3,40}\$/.test(room)) return;

    for (const oldRoom of socket.rooms) {
      if (oldRoom !== socket.id) socket.leave(oldRoom);
    }

    socket.join(room);
    socket.data.room = room;
    socket.emit("room-history", messagesByRoom.get(room) || []);
  });

  socket.on("send-message", (packet) => {
    const room = socket.data.room;

    // The server accepts encrypted packets, not plaintext messages.
    if (
      !room ||
      !packet ||
      typeof packet.iv !== "string" ||
      typeof packet.data !== "string" ||
      !/^[A-Za-z0-9_-]{16}\$/.test(packet.iv) ||
      packet.data.length > 12000 ||
      !/^[A-Za-z0-9_-]+\$/.test(packet.data)
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
    if (history.length > 100) history.shift();
    messagesByRoom.set(room, history);

    io.to(room).emit("message", message);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Cairn is running on port ${PORT}`);
});
