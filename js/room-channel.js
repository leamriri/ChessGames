/**
 * ChessGames - Local & Multi-tab Room Channel
 * Uses native BroadcastChannel and localStorage events for instant real-time
 * room creation, synchronization, game chat, and peer-to-peer gameplay across tabs.
 * ZERO emojis used anywhere.
 */

const RoomChannel = {
  channel: null,
  activeRoom: null,
  isHost: false,
  onOpponentJoined: null,
  onOpponentMove: null,
  onOpponentResign: null,
  onOpponentDrawOffer: null,
  onChatMessage: null,

  init() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel('chessgames_rooms_bus');
      this.channel.onmessage = (event) => this.handleMessage(event.data);
    }

    // Also listen to storage events as robust fallback across tabs/windows
    window.addEventListener('storage', (e) => {
      if (e.key === 'chessgames_room_event' && e.newValue) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleMessage(data);
        } catch (err) {}
      }
    });
  },

  post(data) {
    if (this.channel) {
      this.channel.postMessage(data);
    }
    try {
      localStorage.setItem('chessgames_room_event', JSON.stringify({ ...data, _ts: Date.now() }));
    } catch (e) {}
  },

  /**
   * Generate short random 5-character room code (e.g. A7K92)
   */
  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  },

  createRoom(user) {
    const code = this.generateRoomCode();
    const isGuest = !user;
    this.activeRoom = {
      code,
      hostId: user ? user.id : 'guest_1',
      hostName: user ? user.username : 'User 1',
      hostElo: user && user.isRanked ? user.currentElo : 0,
      hostRank: user ? (user.rank || 'UNRANKED') : 'UNRANKED',
      hostPhoto: user ? user.profilePhoto : null,
      hostIsGuest: isGuest,
      guestId: null,
      guestName: null,
      guestElo: 0,
      guestRank: 'UNRANKED',
      guestPhoto: null,
      guestIsGuest: true,
      status: 'waiting', // 'waiting' | 'ready' | 'playing' | 'finished' | 'disconnected'
      createdAt: Date.now()
    };
    this.isHost = true;

    localStorage.setItem('chessgames_room_' + code, JSON.stringify(this.activeRoom));
    this.post({ type: 'ROOM_ANNOUNCE', room: this.activeRoom });

    return this.activeRoom;
  },

  joinRoom(code, user) {
    const cleanCode = (code || '').trim().toUpperCase();
    const stored = localStorage.getItem('chessgames_room_' + cleanCode);

    let room = null;
    if (stored) {
      try {
        room = JSON.parse(stored);
      } catch (e) {}
    }

    if (!room) {
      return { success: false, error: 'Room code not found. Please verify the code.' };
    }

    if (room.status === 'playing' && room.guestName && room.guestName !== (user ? user.username : 'User 2')) {
      return { success: false, error: 'Room is already full.' };
    }

    this.activeRoom = room;
    this.isHost = false;
    const isGuest = !user;

    room.guestId = user ? user.id : 'guest_2';
    room.guestName = user ? user.username : 'User 2';
    room.guestElo = user && user.isRanked ? user.currentElo : 0;
    room.guestRank = user ? (user.rank || 'UNRANKED') : 'UNRANKED';
    room.guestPhoto = user ? user.profilePhoto : null;
    room.guestIsGuest = isGuest;
    room.status = 'playing';

    localStorage.setItem('chessgames_room_' + cleanCode, JSON.stringify(room));
    this.post({
      type: 'ROOM_JOINED',
      code: cleanCode,
      guestId: room.guestId,
      guestName: room.guestName,
      guestElo: room.guestElo,
      guestRank: room.guestRank,
      guestPhoto: room.guestPhoto,
      guestIsGuest: room.guestIsGuest
    });

    return { success: true, room };
  },

  sendMove(from, to, promotion) {
    if (!this.activeRoom) return;
    this.post({
      type: 'MOVE',
      code: this.activeRoom.code,
      from,
      to,
      promotion
    });
  },

  sendResign(color) {
    if (!this.activeRoom) return;
    this.post({
      type: 'RESIGN',
      code: this.activeRoom.code,
      color
    });
  },

  sendDrawOffer(color) {
    if (!this.activeRoom) return;
    this.post({
      type: 'DRAW_OFFER',
      code: this.activeRoom.code,
      color
    });
  },

  sendChat(senderName, text) {
    if (!this.activeRoom || !text) return;
    this.post({
      type: 'CHAT',
      code: this.activeRoom.code,
      senderName,
      text,
      timestamp: Date.now()
    });
  },

  handleMessage(msg) {
    if (!msg || !this.activeRoom) return;
    if (msg.code && msg.code !== this.activeRoom.code) return;

    if (msg.type === 'ROOM_JOINED' && this.isHost) {
      this.activeRoom.guestId = msg.guestId;
      this.activeRoom.guestName = msg.guestName;
      this.activeRoom.guestElo = msg.guestElo;
      this.activeRoom.guestRank = msg.guestRank;
      this.activeRoom.guestPhoto = msg.guestPhoto;
      this.activeRoom.guestIsGuest = msg.guestIsGuest;
      this.activeRoom.status = 'playing';
      if (this.onOpponentJoined) {
        this.onOpponentJoined(msg);
      }
    } else if (msg.type === 'MOVE') {
      if (this.onOpponentMove) {
        this.onOpponentMove(msg);
      }
    } else if (msg.type === 'RESIGN') {
      if (this.onOpponentResign) {
        this.onOpponentResign(msg);
      }
    } else if (msg.type === 'DRAW_OFFER') {
      if (this.onOpponentDrawOffer) {
        this.onOpponentDrawOffer(msg);
      }
    } else if (msg.type === 'CHAT') {
      if (this.onChatMessage) {
        this.onChatMessage(msg);
      }
    }
  },

  leaveRoom() {
    this.activeRoom = null;
    this.isHost = false;
  }
};

RoomChannel.init();
