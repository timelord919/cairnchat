# Cairn

Cairn is a solo-developed, two-person encrypted messaging prototype by **timelord919**.

**Try it:** [https://cairn-z9yw.onrender.com/](https://cairn-z9yw.onrender.com/)

> **Warning:** Cairn is not recommended for sensitive conversations. It is a prototype and has not been independently audited.

## How it works

Cairn uses Express and Socket.IO to serve the web app and connect participants. People join a room using a code; each room supports up to two participants. The server relays submitted public keys and message packets between them.

The server validates the format and size of public keys and message packets. That alone does not establish that the full system provides secure end-to-end encryption; encryption depends on the client implementation.

## Run locally

You’ll need Node.js and npm.

```bash
git clone <repository-url>
cd <repository-directory>
npm install
npm start
```
Set the start script in package.json to run your server file, for example:
```
{
  "scripts": {
    "start": "node server.js"
  }
}
```
Then open http://localhost:3000. The server uses the PORT environment variable when set, and otherwise listens on port 3000.

## Room and message constraints

Room codes must be 3–40 characters and use lowercase letters, numbers, or hyphens.
Each room allows up to two participants.
A connection can join only one room; refresh to start a new session.
Message packets must contain a base64url-encoded IV and data. The server limits the data field to 6,000 characters.

## Limitations

This is a prototype and has not been independently audited.
Room membership and submitted public keys are kept in memory; this server code does not persist messages.
Restarting the server clears active room state.
The server relays message packets but does not itself encrypt or decrypt their contents.

## License

Cairn is licensed under the GNU General Public License v3.0. See LICENSE [blocked] for the full license text.
