/**
 * ChessGames - Services & Repository Architecture
 * Provides isolated service layer for persistent database operations.
 * Communicates with the backend SQLite database via REST API.
 * 
 * Services:
 * - AuthService
 * - UserService
 * - GameService
 * - EloService
 * - SeasonService
 * - FriendService
 * - FollowService
 * - MessageService
 * - RoomService
 * 
 * STRICT: ZERO EMOJIS ANYWHERE.
 */

(function (root) {
  'use strict';

  const API_BASE = '';
  const SESSION_KEY = 'chessgames_session_v2';

  /**
   * Helper: JSON HTTP Request with error handling and fallback
   */
  async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, options);
      const json = await res.json();
      return json;
    } catch (err) {
      console.warn(`[Services] Network request to ${endpoint} failed:`, err.message);
      return { success: false, error: err.message, networkError: true };
    }
  }

  // =========================================================================
  // 1. AuthService
  // =========================================================================
  const AuthService = {
    /**
     * Register a new user in the persistent database.
     * New account starts at 0 ELO, UNRANKED, isRanked = false.
     */
    async register(username, password) {
      const res = await apiRequest('/api/auth/register', 'POST', { username, password });
      if (res.success && res.user) {
        this.setSession(res.user);
        if (root.StorageService) {
          root.StorageService.setSession(res.user);
        }
      }
      return res;
    },

    /**
     * Log in a registered user.
     */
    async login(username, password) {
      const res = await apiRequest('/api/auth/login', 'POST', { username, password });
      if (res.success && res.user) {
        this.setSession(res.user);
        if (root.StorageService) {
          root.StorageService.setSession(res.user);
        }
      }
      return res;
    },

    /**
     * Clear user session from storage.
     */
    logout() {
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch (e) {}
      if (root.StorageService) {
        root.StorageService.logout();
      }
    },

    /**
     * Get active session user synchronously (cached)
     */
    getCurrentUser() {
      try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    },

    /**
     * Refresh active session user from SQLite database.
     */
    async refreshCurrentUser() {
      const current = this.getCurrentUser();
      if (!current || !current.id) return null;

      const res = await UserService.getProfile(current.id);
      if (res.success && res.user) {
        this.setSession(res.user);
        if (root.StorageService) {
          root.StorageService.setSession(res.user);
        }
        return res.user;
      }
      return current;
    },

    /**
     * Save active session user.
     */
    setSession(user) {
      if (!user) return;
      const safe = { ...user };
      delete safe.password;
      safe.id = safe.userId || safe.id;
      safe.userId = safe.id;
      safe.currentElo = safe.elo !== undefined ? safe.elo : safe.currentElo;
      safe.elo = safe.currentElo;
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(safe));
      } catch (e) {}
    }
  };

  // =========================================================================
  // 2. UserService
  // =========================================================================
  const UserService = {
    /**
     * Fetch user profile by userId or username from persistent DB.
     */
    async getProfile(userId, username) {
      let query = '';
      if (userId) query = `userId=${encodeURIComponent(userId)}`;
      else if (username) query = `username=${encodeURIComponent(username)}`;
      else return { success: false, error: 'userId or username required' };

      const res = await apiRequest(`/api/users/profile?${query}`, 'GET');
      if (res.success && res.user) {
        res.user.id = res.user.userId;
        res.user.currentElo = res.user.elo;
      }
      return res;
    },

    /**
     * Update username or profile photo in persistent DB.
     */
    async updateProfile(userId, { newUsername, profilePhoto }) {
      const res = await apiRequest('/api/users/profile', 'POST', {
        userId,
        newUsername,
        profilePhoto
      });
      if (res.success && res.user) {
        res.user.id = res.user.userId;
        res.user.currentElo = res.user.elo;
        AuthService.setSession(res.user);
      }
      return res;
    },

    /**
     * Search registered users by username query in persistent DB.
     * Note: Guest users are never in registered DB.
     */
    async searchUsers(query) {
      if (!query || !query.trim()) return { success: true, results: [] };
      const res = await apiRequest(`/api/users/search?q=${encodeURIComponent(query.trim())}`, 'GET');
      if (res.success && res.results) {
        res.results.forEach(u => {
          u.id = u.userId;
          u.currentElo = u.elo;
        });
      }
      return res;
    },

    /**
     * Retrieve all registered users from DB.
     */
    async getAllUsers() {
      const res = await apiRequest('/api/users', 'GET');
      if (res.success && res.users) {
        res.users.forEach(u => {
          u.id = u.userId;
          u.currentElo = u.elo;
        });
      }
      return res;
    }
  };

  // =========================================================================
  // 3. GameService
  // =========================================================================
  const GameService = {
    /**
     * Record completed game outcome to persistent DB.
     * Updates ELO, rank, and statistics for rated matches.
     * Guest games are saved with rated = false and never modify user ratings.
     */
    async recordGame(gameData) {
      const res = await apiRequest('/api/games/record', 'POST', gameData);
      return res;
    },

    /**
     * Retrieve recent games from DB (optionally filtered by userId).
     */
    async getRecentGames(userId) {
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const res = await apiRequest(`/api/games/recent${query}`, 'GET');
      return res.success ? (res.games || []) : [];
    },

    /**
     * Retrieve single game by ID for review and replay.
     */
    async getGameById(gameId) {
      const res = await apiRequest(`/api/games/${encodeURIComponent(gameId)}`, 'GET');
      return res.success ? res.game : null;
    }
  };

  // =========================================================================
  // 4. EloService
  // =========================================================================
  const EloService = {
    getRank(elo, isRanked) {
      const sys = typeof RankSystem !== 'undefined' ? RankSystem : (root && root.RankSystem);
      if (sys) {
        return sys.getRank(elo, isRanked);
      }
      return isRanked && elo > 0 ? 'GOLD III' : 'UNRANKED';
    },

    calculateRating(currentRating, opponentRating, score, isProvisional = false) {
      const sys = typeof EloSystem !== 'undefined' ? EloSystem : (root && root.EloSystem);
      if (sys) {
        return sys.calculateRating(currentRating, opponentRating, score, isProvisional);
      }
      return { newRating: currentRating, change: 0, isProvisional };
    },

    processMatchResult(whiteElo, blackElo, result, whiteIsProv = false, blackIsProv = false) {
      const sys = typeof EloSystem !== 'undefined' ? EloSystem : (root && root.EloSystem);
      if (sys) {
        return sys.processMatchResult(whiteElo, blackElo, result, whiteIsProv, blackIsProv);
      }
      return {
        white: { newRating: whiteElo, change: 0 },
        black: { newRating: blackElo, change: 0 }
      };
    }
  };

  // =========================================================================
  // 5. SeasonService
  // =========================================================================
  const SeasonService = {
    /**
     * Get active season information and remaining countdown.
     */
    async getCurrentSeason() {
      const res = await apiRequest('/api/season/current', 'GET');
      return res.success ? res : { seasonId: 1, formatted: 'Active' };
    },

    /**
     * Get active seasonal leaderboard ordered by ELO and win rate.
     */
    async getLeaderboard() {
      const res = await apiRequest('/api/leaderboard', 'GET');
      if (res.success && res.leaderboard) {
        res.leaderboard.forEach(r => {
          r.id = r.userId;
          r.currentElo = r.elo;
        });
        return res.leaderboard;
      }
      return [];
    },

    /**
     * Trigger season rotation.
     */
    async rotateSeason() {
      const res = await apiRequest('/api/season/rotate', 'POST');
      return res;
    }
  };

  // =========================================================================
  // 6. FriendService
  // =========================================================================
  const FriendService = {
    /**
     * Get friends list for given user from persistent DB.
     */
    async getFriends(userId) {
      if (!userId) return [];
      const res = await apiRequest(`/api/social/friends?userId=${encodeURIComponent(userId)}`, 'GET');
      if (res.success && res.friends) {
        res.friends.forEach(f => {
          f.id = f.userId;
          f.currentElo = f.elo;
        });
        return res.friends;
      }
      return [];
    },

    /**
     * Add friend by username or ID in persistent DB.
     */
    async addFriend(userId, targetUsernameOrId) {
      const res = await apiRequest('/api/social/friends/add', 'POST', {
        userId,
        targetUsernameOrId
      });
      return res;
    },

    /**
     * Remove friend in persistent DB.
     */
    async removeFriend(userId, friendId) {
      const res = await apiRequest('/api/social/friends/remove', 'POST', {
        userId,
        friendId
      });
      return res;
    },

    /**
     * Check if two users are friends.
     */
    async isFriend(userId, targetId) {
      if (!userId || !targetId) return false;
      const res = await apiRequest(`/api/social/status?userId=${encodeURIComponent(userId)}&targetId=${encodeURIComponent(targetId)}`, 'GET');
      return Boolean(res.success && res.isFriend);
    }
  };

  // =========================================================================
  // 7. FollowService
  // =========================================================================
  const FollowService = {
    /**
     * Get following list.
     */
    async getFollowing(userId) {
      if (!userId) return [];
      const res = await apiRequest(`/api/social/follows?userId=${encodeURIComponent(userId)}&type=following`, 'GET');
      return res.success ? (res.users || []) : [];
    },

    /**
     * Get followers list.
     */
    async getFollowers(userId) {
      if (!userId) return [];
      const res = await apiRequest(`/api/social/follows?userId=${encodeURIComponent(userId)}&type=followers`, 'GET');
      return res.success ? (res.users || []) : [];
    },

    /**
     * Follow a player in persistent DB.
     */
    async follow(userId, targetId) {
      const res = await apiRequest('/api/social/follow', 'POST', { userId, targetId });
      return res;
    },

    /**
     * Unfollow a player in persistent DB.
     */
    async unfollow(userId, targetId) {
      const res = await apiRequest('/api/social/unfollow', 'POST', { userId, targetId });
      return res;
    },

    /**
     * Check if user is following target.
     */
    async isFollowing(userId, targetId) {
      if (!userId || !targetId) return false;
      const res = await apiRequest(`/api/social/status?userId=${encodeURIComponent(userId)}&targetId=${encodeURIComponent(targetId)}`, 'GET');
      return Boolean(res.success && res.isFollowing);
    }
  };

  // =========================================================================
  // 8. MessageService
  // =========================================================================
  const MessageService = {
    /**
     * Get message conversation between two users from persistent DB.
     */
    async getConversation(userId, otherUserId) {
      if (!userId || !otherUserId) return [];
      const res = await apiRequest(`/api/messages?userId=${encodeURIComponent(userId)}&otherUserId=${encodeURIComponent(otherUserId)}`, 'GET');
      return res.success ? (res.messages || []) : [];
    },

    /**
     * Send direct message in persistent DB.
     */
    async sendMessage(senderId, recipientId, content) {
      const res = await apiRequest('/api/messages/send', 'POST', {
        senderId,
        recipientId,
        content
      });
      return res;
    }
  };

  // =========================================================================
  // 9. RoomService
  // =========================================================================
  const RoomService = {
    /**
     * Create room in persistent DB.
     */
    async createRoom(roomCode, hostId) {
      const res = await apiRequest('/api/rooms/create', 'POST', { roomCode, hostId });
      return res;
    },

    /**
     * Join room in persistent DB.
     */
    async joinRoom(roomCode, guestId) {
      const res = await apiRequest('/api/rooms/join', 'POST', { roomCode, guestId });
      return res;
    },

    /**
     * Get room state from persistent DB.
     */
    async getRoom(roomCode) {
      const res = await apiRequest(`/api/rooms/${encodeURIComponent(roomCode)}`, 'GET');
      return res.success ? res.room : null;
    }
  };

  // Export to global scope
  const services = {
    AuthService,
    UserService,
    GameService,
    EloService,
    SeasonService,
    FriendService,
    FollowService,
    MessageService,
    RoomService
  };

  if (typeof global !== 'undefined') {
    Object.assign(global, services);
  }
  if (typeof window !== 'undefined') {
    Object.assign(window, services);
  }

})(typeof window !== 'undefined' ? window : global);
