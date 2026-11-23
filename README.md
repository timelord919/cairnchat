Cairn

Cairn is a solo-developed, two-person encrypted messaging prototype by timelord919.

Try it: https://cairn-z9yw.onrender.com/

Warning: Cairn is not recommended for sensitive conversations. It is a prototype, and its security has not been independently audited.
How it works

Cairn uses Express and Socket.IO to serve the web app and connect participants. People join a room using a code; each room supports up to two participants. The server relays submitted public keys and message packets between them.

The server code validates the shape and size of public keys and message packets, but that alone does not establish that the full system provides secure end-to-end encryption. Review the client-side code and cryptographic design before relying on it.

Run locally

You’ll need Node.js and npm.

bash


git clone <repository-url>
cd <repository-directory>
npm install
npm start
Set the start script in package.json to run your server file, for example:

json


{
  "scripts": {
    "start": "node server.js"
  }
}
Then open http://localhost:3000. The server uses the PORT environment variable when set, and otherwise listens on port 3000.

Room and message constraints

Room codes must be 3–40 characters, using lowercase letters, numbers, and hyphens.
Each room allows up to two participants.
A connected participant can join only one room per connection; refresh to start a new session.
Message packets must contain a base64url-encoded IV and data. The server limits the data field to 6,000 characters.
Limitations

This is a prototype and has not been independently audited.
The server keeps room membership and submitted public keys in memory; this code does not persist messages.
A server restart clears active room state.
The server’s message relay does not itself encrypt or decrypt message contents. Encryption depends on the client implementation.
Credits

Created and maintained solo by timelord919.
