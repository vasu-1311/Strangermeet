// StrangerMeet – Signaling Server
// Deploy FREE on Railway.app or Render.com
// ─────────────────────────────────────────
const express  = require('express');
const http     = require('http');
const { Server } = require('socket.io');
const path     = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST'] },
  pingInterval: 10000,
  pingTimeout:  25000,
});

// Serve frontend (client folder) if you want all-in-one deploy
app.use(express.static(path.join(__dirname, '../client')));

// ── Waiting queues by preference ──────────────────
// key = "any" | "male" | "female"
const waitingQueues = { any: [], male: [], female: [] };
const rooms = new Map();  // roomId → [socketA, socketB]
let totalConnected = 0;

// ── helpers ───────────────────────────────────────
function genRoomId() {
  return Math.random().toString(36).slice(2, 10);
}

function removeFromQueue(socketId) {
  for (const q of Object.values(waitingQueues)) {
    const i = q.findIndex(u => u.id === socketId);
    if (i !== -1) { q.splice(i, 1); return; }
  }
}

function findMatch(socket, pref) {
  // pref = who I want to meet: "any"|"male"|"female"
  // gender = my own gender
  const myGender = socket.data.gender || 'any';

  // Build candidate list: people waiting whose gender matches what I want
  // AND who want to meet someone of my gender (or anyone)
  let candidates = [];
  for (const [, queue] of Object.entries(waitingQueues)) {
    for (const candidate of queue) {
      if (candidate.id === socket.id) continue;
      const theyWant = candidate.data.pref || 'any';
      const theirGender = candidate.data.gender || 'any';

      const iWantThem  = pref === 'any'      || pref === theirGender;
      const theyWantMe = theyWant === 'any'  || theyWant === myGender;
      const countryOk  = !socket.data.country || !candidate.data.country ||
                         socket.data.country === 'any' ||
                         candidate.data.country === 'any' ||
                         socket.data.country === candidate.data.country;

      if (iWantThem && theyWantMe) {
        candidates.push({ candidate, countryOk });
      }
    }
  }

  // Prefer country match
  const preferred = candidates.filter(c => c.countryOk);
  const pool = preferred.length ? preferred : candidates;
  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)].candidate;
}

// ── Socket events ─────────────────────────────────
io.on('connection', (socket) => {
  totalConnected++;
  io.emit('stats', { online: totalConnected });
  console.log(`[+] ${socket.id} connected  (total: ${totalConnected})`);

  // ── User registers profile ──────────────────────
  socket.on('register', (data) => {
    socket.data.username = data.username || 'Anonymous';
    socket.data.gender   = data.gender   || 'any';
    socket.data.country  = data.country  || 'any';
    socket.data.pref     = data.pref     || 'any';
  });

  // ── User wants a new match ──────────────────────
  socket.on('find_match', (data) => {
    socket.data.pref    = data.pref    || 'any';
    socket.data.country = data.country || 'any';
    socket.data.gender  = data.gender  || 'any';

    // Leave old room if any
    leaveCurrentRoom(socket);

    // Look for a match in the queue
    const match = findMatch(socket, socket.data.pref);

    if (match) {
      // Remove match from queue
      removeFromQueue(match.id);

      // Create room
      const roomId = genRoomId();
      rooms.set(roomId, [socket.id, match.id]);
      socket.data.room  = roomId;
      match.data.room   = roomId;

      socket.join(roomId);
      match.join(roomId);

      // Tell both who is initiator (initiator creates the WebRTC offer)
      socket.emit('matched', {
        roomId,
        isInitiator: true,
        stranger: { username: match.data.username, country: match.data.country, gender: match.data.gender }
      });
      match.emit('matched', {
        roomId,
        isInitiator: false,
        stranger: { username: socket.data.username, country: socket.data.country, gender: socket.data.gender }
      });

      console.log(`[room] ${socket.id} <-> ${match.id}  room=${roomId}`);
    } else {
      // Add to appropriate queue
      const q = waitingQueues[socket.data.pref] || waitingQueues.any;
      q.push(socket);
      socket.data.waiting = true;
      socket.emit('waiting', { position: q.length });
      console.log(`[wait] ${socket.id} queued (pref=${socket.data.pref})`);
    }
  });

  // ── WebRTC signaling relay ──────────────────────
  socket.on('offer', (data) => {
    socket.to(data.roomId).emit('offer', { sdp: data.sdp, from: socket.id });
  });

  socket.on('answer', (data) => {
    socket.to(data.roomId).emit('answer', { sdp: data.sdp, from: socket.id });
  });

  socket.on('ice_candidate', (data) => {
    socket.to(data.roomId).emit('ice_candidate', { candidate: data.candidate, from: socket.id });
  });

  // ── Chat message relay ──────────────────────────
  socket.on('chat_msg', (data) => {
    if (socket.data.room) {
      socket.to(socket.data.room).emit('chat_msg', {
        text: data.text.slice(0, 500),   // limit length
        from: socket.data.username
      });
    }
  });

  // ── Report ──────────────────────────────────────
  socket.on('report', (data) => {
    console.log(`[REPORT] ${socket.id} reported ${data.targetId || 'stranger'}: ${data.reason}`);
    socket.emit('report_received');
  });

  // ── Skip / leave ────────────────────────────────
  socket.on('skip', () => {
    leaveCurrentRoom(socket);
  });

  // ── Disconnect ──────────────────────────────────
  socket.on('disconnect', () => {
    totalConnected = Math.max(0, totalConnected - 1);
    io.emit('stats', { online: totalConnected });
    removeFromQueue(socket.id);
    leaveCurrentRoom(socket);
    console.log(`[-] ${socket.id} disconnected (total: ${totalConnected})`);
  });

  function leaveCurrentRoom(sock) {
    const roomId = sock.data.room;
    if (!roomId) return;
    sock.data.room = null;
    sock.to(roomId).emit('stranger_left');
    sock.leave(roomId);
    rooms.delete(roomId);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`StrangerMeet server running on port ${PORT}`));
