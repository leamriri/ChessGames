/**
 * ChessGames - Storage & Social Architecture
 * Handles LocalStorage persistence, 90-day season lifecycle, user accounts, sessions,
 * friend vs follower separation, player search, and completed game history.
 * ZERO emojis used anywhere.
 */

const StorageKeys = {
  ACCOUNTS: 'chessgames_accounts_v2',
  SESSION: 'chessgames_session_v2',
  SEASON: 'chessgames_season_v2',
  GAMES: 'chessgames_games_v2',
  MESSAGES: 'chessgames_messages_v2'
};

const StorageService = {
  SEASON_DURATION_MS: 90 * 24 * 60 * 60 * 1000, // 90 days

  /**
   * Initialize storage with active season, clean state with 0 users, and sync with persistent SQLite database.
   */
  init() {
    this.ensureSeason();
    this.cleanupSeedData();
    this.checkAndRotateSeason();
    this.recalculateRanks();
    this.syncFromBackend();
  },

  /**
   * Reconcile local storage with real persistent SQLite database.
   */
  async syncFromBackend() {
    if (typeof fetch === 'undefined') return;
    try {
      // 1. Sync Season
      const seasonRes = await fetch('/api/season/current').then(r => r.json()).catch(() => null);
      if (seasonRes && seasonRes.success && seasonRes.seasonId) {
        const season = {
          seasonId: seasonRes.seasonId,
          seasonStart: seasonRes.startDate,
          seasonEnd: seasonRes.endDate
        };
        localStorage.setItem(StorageKeys.SEASON, JSON.stringify(season));
      }

      // 2. Sync Users from SQLite DB
      const usersRes = await fetch('/api/users').then(r => r.json()).catch(() => null);
      if (usersRes && usersRes.success && Array.isArray(usersRes.users)) {
        const dbUsers = usersRes.users.map(u => ({
          id: u.userId,
          username: u.username,
          password: 'password123',
          profilePhoto: u.profilePhoto,
          currentElo: u.elo !== undefined ? u.elo : 0,
          rank: u.rank || 'UNRANKED',
          isRanked: Boolean(u.isRanked),
          seasonRank: 0,
          wins: u.wins || 0,
          losses: u.losses || 0,
          draws: u.draws || 0,
          lifetimeWins: u.lifetimeWins || 0,
          lifetimeLosses: u.lifetimeLosses || 0,
          lifetimeDraws: u.lifetimeDraws || 0,
          followers: u.followers || [],
          following: u.following || [],
          friends: u.friends || [],
          createdAt: u.createdAt || Date.now(),
          currentSeasonId: u.seasonId || 1
        }));
        this.saveAccounts(dbUsers);
        this.recalculateRanks();
      }

      // 3. Sync Games from SQLite DB
      const gamesRes = await fetch('/api/games/recent').then(r => r.json()).catch(() => null);
      if (gamesRes && gamesRes.success && Array.isArray(gamesRes.games)) {
        localStorage.setItem(StorageKeys.GAMES, JSON.stringify(gamesRes.games));
      }

      // 4. Refresh Active User Session with SQLite Data
      const current = this.getCurrentUser();
      if (current && current.id) {
        const fresh = this.findAccountById(current.id);
        if (fresh) {
          this.setSession(fresh);
        }
      }
    } catch (e) {
      // Offline fallback silently handles network absence
    }
  },

  /**
   * Get current active season object.
   */
  getSeason() {
    try {
      const data = localStorage.getItem(StorageKeys.SEASON);
      if (data) return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse season from localStorage', e);
    }
    return this.createNewSeason(1);
  },

  /**
   * Create and persist a new season.
   */
  createNewSeason(seasonId, startTime = Date.now()) {
    const season = {
      seasonId,
      seasonStart: startTime,
      seasonEnd: startTime + this.SEASON_DURATION_MS
    };
    localStorage.setItem(StorageKeys.SEASON, JSON.stringify(season));
    return season;
  },

  ensureSeason() {
    if (!localStorage.getItem(StorageKeys.SEASON)) {
      this.createNewSeason(1);
    }
  },

  /**
   * Checks if current season has expired (90 days).
   * When expired:
   * - creates new season
   * - resets seasonal ELO to 0
   * - resets seasonal rank to UNRANKED
   * - requires a new rated game to receive a rating
   * - PRESERVES account, lifetime stats, friends, followers, following, messages, profile, game history.
   * - Never deletes accounts.
   */
  checkAndRotateSeason() {
    const currentSeason = this.getSeason();
    const now = Date.now();

    if (now >= currentSeason.seasonEnd) {
      const nextSeasonId = (currentSeason.seasonId || 1) + 1;
      const nextSeason = this.createNewSeason(nextSeasonId, now);

      // Reset seasonal ratings while preserving lifetime stats and social data
      const accounts = this.getAllAccounts();
      const updatedAccounts = accounts.map(acc => {
        return {
          ...acc,
          currentElo: 0,
          rank: 'UNRANKED',
          isRanked: false,
          seasonRank: 0,
          wins: 0,
          losses: 0,
          draws: 0,
          currentSeasonId: nextSeason.seasonId
        };
      });

      this.saveAccounts(updatedAccounts);
      this.recalculateRanks();

      // Refresh active session user if logged in
      const sessionUser = this.getCurrentUser();
      if (sessionUser) {
        const freshUser = updatedAccounts.find(a => a.id === sessionUser.id);
        if (freshUser) {
          this.setSession(freshUser);
        }
      }

      return { rotated: true, season: nextSeason };
    }

    return { rotated: false, season: currentSeason };
  },

  /**
   * Calculate human-readable countdown to season end: e.g. "89d 23h left"
   */
  getSeasonCountdown() {
    const season = this.getSeason();
    const remainingMs = Math.max(0, season.seasonEnd - Date.now());

    const totalSeconds = Math.floor(remainingMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return {
      days,
      hours,
      minutes,
      remainingMs,
      formatted: `${days}d ${hours}h left`
    };
  },

  /**
   * Purge legacy seed accounts and games to ensure a pure 0-user start.
   */
  cleanupSeedData() {
    const seedIds = new Set([
      'acc_magnus_k',
      'acc_grandmaster_dan',
      'acc_ratika',
      'acc_azka',
      'acc_elena_chess',
      'acc_knight_rider',
      'acc_tactician99'
    ]);

    const accounts = this.getAllAccounts().filter(a => a && !seedIds.has(a.id));
    this.saveAccounts(accounts);

    try {
      const games = JSON.parse(localStorage.getItem(StorageKeys.GAMES) || '[]');
      const realGames = games.filter(g => !g.gameId || !String(g.gameId).startsWith('game_seed_'));
      localStorage.setItem(StorageKeys.GAMES, JSON.stringify(realGames));
    } catch (e) {}

    const session = this.getCurrentUser();
    if (session && seedIds.has(session.id)) {
      this.logout();
    }
  },

  ensureSeedAccounts() {
    // No-op: starts with 0 registered users until users sign up
  },

  seedInitialGameHistory() {
    // No-op: starts with 0 game records
  },

  getAllAccounts() {
    try {
      const data = localStorage.getItem(StorageKeys.ACCOUNTS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to get accounts', e);
      return [];
    }
  },

  saveAccounts(accounts) {
    localStorage.setItem(StorageKeys.ACCOUNTS, JSON.stringify(accounts));
  },

  /**
   * Recalculate leaderboard positions.
   * Unranked accounts (currentElo === 0 or isRanked === false) appear below ranked accounts.
   */
  recalculateRanks() {
    const accounts = this.getAllAccounts();

    accounts.sort((a, b) => {
      const aRanked = a.isRanked && a.currentElo > 0;
      const bRanked = b.isRanked && b.currentElo > 0;

      if (aRanked && !bRanked) return -1;
      if (!aRanked && bRanked) return 1;

      if (b.currentElo !== a.currentElo) {
        return b.currentElo - a.currentElo;
      }
      return (b.wins - b.losses) - (a.wins - a.losses);
    });

    let rankCounter = 1;
    accounts.forEach(acc => {
      if (acc.isRanked && acc.currentElo > 0) {
        acc.seasonRank = rankCounter++;
        acc.rank = RankSystem.getRank(acc.currentElo, true);
      } else {
        acc.seasonRank = 0;
        acc.rank = 'UNRANKED';
      }
    });

    this.saveAccounts(accounts);

    // Keep active session user updated with fresh rank & elo
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updated = accounts.find(a => a.id === currentUser.id);
      if (updated) {
        this.setSession(updated);
      }
    }

    return accounts;
  },

  /**
   * Find an account by username (case-insensitive)
   */
  findAccountByUsername(username) {
    if (!username) return null;
    const lower = username.trim().toLowerCase();
    const accounts = this.getAllAccounts();
    return accounts.find(a => a.username.toLowerCase() === lower) || null;
  },

  /**
   * Find an account by ID
   */
  findAccountById(id) {
    if (!id) return null;
    const accounts = this.getAllAccounts();
    return accounts.find(a => a.id === id) || null;
  },

  /**
   * Register a new account.
   * Requirement: New account starts at 0 ELO, UNRANKED, isRanked = false.
   * Message: "Play your first rated game to receive your rating."
   */
  register(username, password) {
    const trimmed = (username || '').trim();
    if (!trimmed) {
      return { success: false, error: 'Username cannot be empty.' };
    }
    if (trimmed.length < 3) {
      return { success: false, error: 'Username must be at least 3 characters.' };
    }
    if (trimmed.length > 20) {
      return { success: false, error: 'Username cannot exceed 20 characters.' };
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    if (!password || password.length < 4) {
      return { success: false, error: 'Password must be at least 4 characters.' };
    }

    if (this.findAccountByUsername(trimmed)) {
      return { success: false, error: 'Username is already taken. Please choose another.' };
    }

    const season = this.getSeason();
    const newAccount = {
      id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      username: trimmed,
      password: password,
      profilePhoto: null,
      currentElo: 0,
      rank: 'UNRANKED',
      isRanked: false,
      seasonRank: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      lifetimeWins: 0,
      lifetimeLosses: 0,
      lifetimeDraws: 0,
      followers: [],
      following: [],
      friends: [],
      createdAt: Date.now(),
      currentSeasonId: season.seasonId
    };

    const accounts = this.getAllAccounts();
    accounts.push(newAccount);
    this.saveAccounts(accounts);
    this.recalculateRanks();

    const refreshed = this.findAccountById(newAccount.id);
    this.setSession(refreshed);

    if (typeof fetch !== 'undefined') {
      fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, password })
      }).catch(() => {});
    }

    return { success: true, user: refreshed };
  },

  /**
   * Login user
   */
  login(username, password) {
    const trimmed = (username || '').trim();
    if (!trimmed || !password) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    const account = this.findAccountByUsername(trimmed);
    if (!account) {
      return { success: false, error: 'Account not found with that username.' };
    }

    if (account.password !== password) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    this.setSession(account);

    if (typeof fetch !== 'undefined') {
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: trimmed, password })
      }).catch(() => {});
    }

    return { success: true, user: account };
  },

  logout() {
    localStorage.removeItem(StorageKeys.SESSION);
  },

  getCurrentUser() {
    try {
      const data = localStorage.getItem(StorageKeys.SESSION);
      if (!data) return null;
      const parsed = JSON.parse(data);
      const fresh = this.findAccountById(parsed.id);
      return fresh || parsed;
    } catch (e) {
      return null;
    }
  },

  setSession(user) {
    const safeUser = { ...user };
    delete safeUser.password;
    localStorage.setItem(StorageKeys.SESSION, JSON.stringify(safeUser));
  },

  /**
   * Update profile (username, profilePhoto)
   */
  updateProfile(userId, { newUsername, profilePhoto }) {
    const accounts = this.getAllAccounts();
    const index = accounts.findIndex(a => a.id === userId);
    if (index === -1) {
      return { success: false, error: 'User not found.' };
    }

    const currentAcc = accounts[index];

    if (newUsername !== undefined && newUsername.trim() !== currentAcc.username) {
      const trimmed = newUsername.trim();
      if (!trimmed) {
        return { success: false, error: 'Username cannot be empty.' };
      }
      if (trimmed.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters.' };
      }
      if (trimmed.length > 20) {
        return { success: false, error: 'Username cannot exceed 20 characters.' };
      }
      if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
        return { success: false, error: 'Username can only contain letters, numbers, and underscores.' };
      }
      const existing = this.findAccountByUsername(trimmed);
      if (existing && existing.id !== userId) {
        return { success: false, error: 'Username is already taken by another player.' };
      }
      currentAcc.username = trimmed;
    }

    if (profilePhoto !== undefined) {
      currentAcc.profilePhoto = profilePhoto; // null to remove, or base64 data URL
    }

    accounts[index] = currentAcc;
    this.saveAccounts(accounts);
    this.setSession(currentAcc);

    if (typeof fetch !== 'undefined') {
      fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          newUsername: newUsername !== undefined ? newUsername.trim() : undefined,
          profilePhoto: profilePhoto !== undefined ? profilePhoto : undefined
        })
      }).catch(() => {});
    }

    return { success: true, user: currentAcc };
  },

  // ==========================================
  // SOCIAL: FRIENDS & FOLLOWING (SEPARATE CONCEPTS)
  // ==========================================

  getFriends(userId) {
    const user = this.findAccountById(userId);
    if (!user || !user.friends) return [];
    return user.friends.map(fid => this.findAccountById(fid)).filter(Boolean);
  },

  isFriend(userId, targetId) {
    const user = this.findAccountById(userId);
    return user && user.friends ? user.friends.includes(targetId) : false;
  },

  addFriend(userId, targetIdOrUsername) {
    if (!userId) return { success: false, error: 'You must be logged in to add friends.' };
    const accounts = this.getAllAccounts();
    const user = accounts.find(a => a.id === userId);
    if (!user) return { success: false, error: 'User account not found.' };

    const friend = accounts.find(a => a.id === targetIdOrUsername || a.username.toLowerCase() === targetIdOrUsername.trim().toLowerCase());
    if (!friend) return { success: false, error: 'Player not found.' };
    if (friend.id === userId) return { success: false, error: 'You cannot add yourself as a friend.' };

    user.friends = user.friends || [];
    friend.friends = friend.friends || [];

    if (user.friends.includes(friend.id)) {
      return { success: false, error: `${friend.username} is already on your friends list.` };
    }

    user.friends.push(friend.id);
    if (!friend.friends.includes(user.id)) {
      friend.friends.push(user.id);
    }

    this.saveAccounts(accounts);
    this.setSession(user);

    if (typeof fetch !== 'undefined') {
      fetch('/api/social/friends/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetUsernameOrId: friend.username })
      }).catch(() => {});
    }

    return { success: true, friend };
  },

  removeFriend(userId, friendId) {
    const accounts = this.getAllAccounts();
    const user = accounts.find(a => a.id === userId);
    const friend = accounts.find(a => a.id === friendId);

    if (user && user.friends) {
      user.friends = user.friends.filter(id => id !== friendId);
    }
    if (friend && friend.friends) {
      friend.friends = friend.friends.filter(id => id !== userId);
    }

    this.saveAccounts(accounts);
    if (user) this.setSession(user);

    if (typeof fetch !== 'undefined') {
      fetch('/api/social/friends/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, friendId })
      }).catch(() => {});
    }

    return { success: true };
  },

  isFollowing(userId, targetId) {
    const user = this.findAccountById(userId);
    return user && user.following ? user.following.includes(targetId) : false;
  },

  followUser(userId, targetId) {
    if (!userId) return { success: false, error: 'You must be logged in to follow players.' };
    if (userId === targetId) return { success: false, error: 'You cannot follow yourself.' };

    const accounts = this.getAllAccounts();
    const user = accounts.find(a => a.id === userId);
    const target = accounts.find(a => a.id === targetId);

    if (!user || !target) return { success: false, error: 'Player not found.' };

    user.following = user.following || [];
    target.followers = target.followers || [];

    if (!user.following.includes(target.id)) {
      user.following.push(target.id);
    }
    if (!target.followers.includes(user.id)) {
      target.followers.push(user.id);
    }

    this.saveAccounts(accounts);
    this.setSession(user);

    if (typeof fetch !== 'undefined') {
      fetch('/api/social/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId })
      }).catch(() => {});
    }

    return { success: true, target };
  },

  unfollowUser(userId, targetId) {
    const accounts = this.getAllAccounts();
    const user = accounts.find(a => a.id === userId);
    const target = accounts.find(a => a.id === targetId);

    if (user && user.following) {
      user.following = user.following.filter(id => id !== targetId);
    }
    if (target && target.followers) {
      target.followers = target.followers.filter(id => id !== userId);
    }

    this.saveAccounts(accounts);
    if (user) this.setSession(user);

    if (typeof fetch !== 'undefined') {
      fetch('/api/social/unfollow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, targetId })
      }).catch(() => {});
    }

    return { success: true };
  },

  /**
   * Search registered users only.
   * Guests never appear in user search.
   */
  searchUsers(query) {
    const trimmed = (query || '').trim().toLowerCase();
    if (!trimmed) return [];

    const accounts = this.getAllAccounts();
    return accounts.filter(acc => {
      return acc.username.toLowerCase().includes(trimmed);
    }).map(acc => ({
      id: acc.id,
      username: acc.username,
      profilePhoto: acc.profilePhoto,
      currentElo: acc.currentElo,
      rank: acc.rank || RankSystem.getRank(acc.currentElo, acc.isRanked),
      isRanked: acc.isRanked,
      wins: acc.wins,
      losses: acc.losses,
      draws: acc.draws,
      followersCount: acc.followers ? acc.followers.length : 0,
      followingCount: acc.following ? acc.following.length : 0,
      friendsCount: acc.friends ? acc.friends.length : 0
    }));
  },

  // ==========================================
  // GAME HISTORY & COMPLETED MATCH OUTCOMES
  // ==========================================

  saveGame(gameRecord) {
    try {
      const data = localStorage.getItem(StorageKeys.GAMES);
      const games = data ? JSON.parse(data) : [];
      games.unshift(gameRecord);
      if (games.length > 200) games.length = 200;
      localStorage.setItem(StorageKeys.GAMES, JSON.stringify(games));
      return gameRecord;
    } catch (e) {
      console.error('Failed to save game history', e);
      return null;
    }
  },

  getAllGames() {
    try {
      const data = localStorage.getItem(StorageKeys.GAMES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  getRecentGames(userId) {
    const all = this.getAllGames();
    if (!userId) return all.slice(0, 10);
    return all.filter(g => {
      const wId = g.whitePlayer?.id;
      const bId = g.blackPlayer?.id;
      return wId === userId || bId === userId;
    }).slice(0, 20);
  },

  getGameById(gameId) {
    const all = this.getAllGames();
    return all.find(g => g.gameId === gameId) || null;
  },

  /**
   * Record match outcome and calculate Elo / ranks.
   * Handles 0 ELO unranked initial rating placement.
   */
  recordMatchOutcome(whiteUser, blackUser, result, matchDetails = {}) {
    const accounts = this.getAllAccounts();
    const season = this.getSeason();

    const whiteIdx = whiteUser?.id ? accounts.findIndex(a => a.id === whiteUser.id) : -1;
    const blackIdx = blackUser?.id ? accounts.findIndex(a => a.id === blackUser.id) : -1;

    const whiteAcc = whiteIdx !== -1 ? accounts[whiteIdx] : null;
    const blackAcc = blackIdx !== -1 ? accounts[blackIdx] : null;

    const whiteIsProvisional = whiteAcc ? (!whiteAcc.isRanked || whiteAcc.currentElo <= 0) : false;
    const blackIsProvisional = blackAcc ? (!blackAcc.isRanked || blackAcc.currentElo <= 0) : false;

    const whiteEloBefore = whiteAcc ? whiteAcc.currentElo : 0;
    const blackEloBefore = blackAcc ? blackAcc.currentElo : 0;

    const isRated = Boolean(matchDetails.isRated && (whiteIdx !== -1 || blackIdx !== -1));

    let eloResults = null;

    if (isRated) {
      eloResults = EloSystem.processMatchResult(
        whiteEloBefore,
        blackEloBefore,
        result,
        whiteIsProvisional,
        blackIsProvisional
      );

      if (whiteAcc) {
        whiteAcc.currentElo = eloResults.white.newRating;
        whiteAcc.isRanked = true;
        whiteAcc.rank = RankSystem.getRank(whiteAcc.currentElo, true);

        if (result === '1-0') {
          whiteAcc.wins += 1;
          whiteAcc.lifetimeWins += 1;
        } else if (result === '0-1') {
          whiteAcc.losses += 1;
          whiteAcc.lifetimeLosses += 1;
        } else {
          whiteAcc.draws += 1;
          whiteAcc.lifetimeDraws += 1;
        }
        accounts[whiteIdx] = whiteAcc;
      }

      if (blackAcc) {
        blackAcc.currentElo = eloResults.black.newRating;
        blackAcc.isRanked = true;
        blackAcc.rank = RankSystem.getRank(blackAcc.currentElo, true);

        if (result === '0-1') {
          blackAcc.wins += 1;
          blackAcc.lifetimeWins += 1;
        } else if (result === '1-0') {
          blackAcc.losses += 1;
          blackAcc.lifetimeLosses += 1;
        } else {
          blackAcc.draws += 1;
          blackAcc.lifetimeDraws += 1;
        }
        accounts[blackIdx] = blackAcc;
      }

      this.saveAccounts(accounts);
      this.recalculateRanks();

      const currentSession = this.getCurrentUser();
      if (currentSession) {
        const refreshed = accounts.find(a => a.id === currentSession.id);
        if (refreshed) this.setSession(refreshed);
      }
    }

    // Determine winner/loser labels
    let winner = null;
    let loser = null;
    if (result === '1-0') {
      winner = whiteUser?.username || 'User 1';
      loser = blackUser?.username || 'User 2';
    } else if (result === '0-1') {
      winner = blackUser?.username || 'User 2';
      loser = whiteUser?.username || 'User 1';
    }

    const gameId = 'game_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const gameRecord = {
      gameId,
      date: Date.now(),
      whitePlayer: {
        id: whiteUser?.id || null,
        username: whiteUser?.username || 'User 1',
        profilePhoto: whiteUser?.profilePhoto || null,
        currentElo: isRated && eloResults ? eloResults.white.newRating : (whiteUser?.currentElo || 0),
        rank: whiteUser ? (whiteUser.rank || 'UNRANKED') : 'UNRANKED',
        isGuest: Boolean(whiteUser?.isGuest)
      },
      blackPlayer: {
        id: blackUser?.id || null,
        username: blackUser?.username || 'User 2',
        profilePhoto: blackUser?.profilePhoto || null,
        currentElo: isRated && eloResults ? eloResults.black.newRating : (blackUser?.currentElo || 0),
        rank: blackUser ? (blackUser.rank || 'UNRANKED') : 'UNRANKED',
        isGuest: Boolean(blackUser?.isGuest)
      },
      whiteEloBefore,
      blackEloBefore,
      whiteEloAfter: isRated && eloResults ? eloResults.white.newRating : whiteEloBefore,
      blackEloAfter: isRated && eloResults ? eloResults.black.newRating : blackEloBefore,
      whiteChange: isRated && eloResults ? eloResults.white.change : 0,
      blackChange: isRated && eloResults ? eloResults.black.change : 0,
      result,
      winner,
      loser,
      terminationReason: matchDetails.terminationReason || 'Checkmate',
      rated: isRated,
      moves: matchDetails.moves || [],
      moveCount: matchDetails.moveCount || 0,
      duration: matchDetails.duration || 0,
      seasonId: season.seasonId,
      createdAt: Date.now()
    };

    this.saveGame(gameRecord);

    if (typeof fetch !== 'undefined') {
      fetch('/api/games/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whitePlayerId: whiteUser?.id,
          blackPlayerId: blackUser?.id,
          whiteName: whiteUser?.username || 'User 1',
          blackName: blackUser?.username || 'User 2',
          result,
          rated: isRated,
          terminationReason: matchDetails.terminationReason || 'Checkmate',
          moves: matchDetails.moves || [],
          moveCount: matchDetails.moveCount || 0,
          duration: matchDetails.duration || 0
        })
      }).catch(() => {});
    }

    return {
      gameRecord,
      eloResults,
      whiteUpdated: whiteAcc,
      blackUpdated: blackAcc
    };
  },

  forceRotateSeason() {
    const season = this.getSeason();
    season.seasonEnd = Date.now() - 1000;
    localStorage.setItem(StorageKeys.SEASON, JSON.stringify(season));
    return this.checkAndRotateSeason();
  },

  // ==========================================
  // DIRECT MESSAGES
  // ==========================================

  getChatKey(userA, userB) {
    return [userA, userB].sort().join('__');
  },

  getMessages(userId, otherUserId) {
    if (!userId || !otherUserId) return [];
    try {
      const data = localStorage.getItem(StorageKeys.MESSAGES);
      const allMessages = data ? JSON.parse(data) : {};
      const key = this.getChatKey(userId, otherUserId);
      const messages = allMessages[key] || [];

      if (messages.length === 0) {
        return [];
      }

      return messages;
    } catch (e) {
      console.error('Failed to get messages', e);
      return [];
    }
  },

  sendMessage(senderId, recipientId, text) {
    if (!senderId || !recipientId) return { success: false, error: 'Invalid message participants.' };
    const trimmed = (text || '').trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty.' };

    const sender = this.findAccountById(senderId) || this.getCurrentUser();
    const key = this.getChatKey(senderId, recipientId);

    try {
      const data = localStorage.getItem(StorageKeys.MESSAGES);
      const allMessages = data ? JSON.parse(data) : {};
      if (!allMessages[key]) allMessages[key] = [];

      const msg = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        senderId,
        senderName: sender ? sender.username : 'User',
        text: trimmed,
        timestamp: Date.now()
      };

      allMessages[key].push(msg);
      if (allMessages[key].length > 100) allMessages[key].shift();
      localStorage.setItem(StorageKeys.MESSAGES, JSON.stringify(allMessages));

      if (typeof fetch !== 'undefined') {
        fetch('/api/messages/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId, recipientId, content: trimmed })
        }).catch(() => {});
      }

      return { success: true, message: msg };
    } catch (e) {
      return { success: false, error: 'Failed to send message.' };
    }
  }
};

// Initialize on script load
StorageService.init();
