/**
 * ChessGames - Main Application Controller
 * Handles Landing Screen, Choose Game Modes (Solo, Local 2P, Create Room, Join Room),
 * Real-time Board Gameplay, Game Review Replay, Leaderboards, Social Search, Friends, Messages, and Profiles.
 * STRICT: ZERO EMOJIS ANYWHERE.
 */

(function () {
  'use strict';

  // --- App State ---
  let chess = new ChessEngine();
  let selectedSquare = null; // { row, col }
  let legalMovesForSelected = [];
  let boardFlipped = false;
  let pendingPromotionMove = null;

  // Active Match Configuration
  let currentMatch = {
    mode: 'local', // 'solo' | 'local' | 'room'
    aiDifficulty: 'casual', // 'beginner' | 'casual' | 'master'
    playerColor: 'w', // In solo or room mode: user's assigned piece color ('w' or 'b')
    whitePlayer: null,
    blackPlayer: null,
    isRated: false,
    isCompleted: false,
    roomCode: null
  };

  // Game Review Mode State
  let isReviewMode = false;
  let reviewGame = null;
  let reviewEngine = null;
  let reviewMoveIndex = -1; // -1 = starting board position, 0..N-1 = after move index

  // Social & Chat State
  let activeChatFriendId = null;
  let activeFriendsTab = 'friends'; // 'friends' | 'following' | 'followers'
  let activeViewingProfileId = null;
  let voiceMicEnabled = false;

  // --- DOM Elements Cache ---
  const DOM = {
    // Header & Brand
    brandLink: document.getElementById('brandLink'),
    brandIconSlot: document.getElementById('brandIconSlot'),
    mainNavLinks: document.getElementById('mainNavLinks'),
    navPlay: document.getElementById('navPlay'),
    navLeaderboard: document.getElementById('navLeaderboard'),
    navFriends: document.getElementById('navFriends'),
    navMessages: document.getElementById('navMessages'),
    navProfile: document.getElementById('navProfile'),
    navPlayIcon: document.getElementById('navPlayIcon'),
    navLeaderboardIcon: document.getElementById('navLeaderboardIcon'),
    navFriendsIcon: document.getElementById('navFriendsIcon'),
    navMessagesIcon: document.getElementById('navMessagesIcon'),
    navProfileIcon: document.getElementById('navProfileIcon'),
    headerUserActions: document.getElementById('headerUserActions'),

    // Views
    viewLanding: document.getElementById('viewLanding'),
    viewChooseGame: document.getElementById('viewChooseGame'),
    viewPlay: document.getElementById('viewPlay'),
    viewLeaderboard: document.getElementById('viewLeaderboard'),
    viewFriends: document.getElementById('viewFriends'),
    viewMessages: document.getElementById('viewMessages'),
    viewProfile: document.getElementById('viewProfile'),

    // Landing View Elements
    landingHeroIconSlot: document.getElementById('landingHeroIconSlot'),
    btnLandingPlay: document.getElementById('btnLandingPlay'),
    btnLandingLogin: document.getElementById('btnLandingLogin'),
    btnLandingRegister: document.getElementById('btnLandingRegister'),
    iconLandingPlay: document.getElementById('iconLandingPlay'),

    // Choose Game Elements
    cardModeSolo: document.getElementById('cardModeSolo'),
    cardModeLocal: document.getElementById('cardModeLocal'),
    cardModeCreateRoom: document.getElementById('cardModeCreateRoom'),
    cardModeJoinRoom: document.getElementById('cardModeJoinRoom'),
    iconSoloSlot: document.getElementById('iconSoloSlot'),
    iconLocalSlot: document.getElementById('iconLocalSlot'),
    iconCreateRoomSlot: document.getElementById('iconCreateRoomSlot'),
    iconJoinRoomSlot: document.getElementById('iconJoinRoomSlot'),

    // Play View - Board
    boardFrame: document.getElementById('boardFrame'),
    chessboard: document.getElementById('chessboard'),
    coordRanks: document.getElementById('coordRanks'),
    coordFiles: document.getElementById('coordFiles'),
    matchTitleText: document.getElementById('matchTitleText'),
    matchModeBadge: document.getElementById('matchModeBadge'),

    // Player Cards
    cardPlayerWhite: document.getElementById('cardPlayerWhite'),
    cardPlayerBlack: document.getElementById('cardPlayerBlack'),
    avatarWhite: document.getElementById('avatarWhite'),
    avatarBlack: document.getElementById('avatarBlack'),
    nameWhite: document.getElementById('nameWhite'),
    nameBlack: document.getElementById('nameBlack'),
    rankEloRowWhite: document.getElementById('rankEloRowWhite'),
    rankEloRowBlack: document.getElementById('rankEloRowBlack'),
    rankWhite: document.getElementById('rankWhite'),
    rankBlack: document.getElementById('rankBlack'),
    eloWhite: document.getElementById('eloWhite'),
    eloBlack: document.getElementById('eloBlack'),
    capturedByWhite: document.getElementById('capturedByWhite'),
    capturedByBlack: document.getElementById('capturedByBlack'),
    turnStatusBanner: document.getElementById('turnStatusBanner'),
    turnStatusText: document.getElementById('turnStatusText'),
    gameClockOrNotice: document.getElementById('gameClockOrNotice'),

    // Game Review Controls
    reviewControlPanel: document.getElementById('reviewControlPanel'),
    reviewStepLabel: document.getElementById('reviewStepLabel'),
    btnReplayFirst: document.getElementById('btnReplayFirst'),
    btnReplayPrev: document.getElementById('btnReplayPrev'),
    btnReplayNext: document.getElementById('btnReplayNext'),
    btnReplayLast: document.getElementById('btnReplayLast'),
    iconReplayFirst: document.getElementById('iconReplayFirst'),
    iconReplayPrev: document.getElementById('iconReplayPrev'),
    iconReplayNext: document.getElementById('iconReplayNext'),
    iconReplayLast: document.getElementById('iconReplayLast'),
    btnExitReview: document.getElementById('btnExitReview'),

    // Online Room Panel
    onlineRoomPanel: document.getElementById('onlineRoomPanel'),
    roomStatusBadge: document.getElementById('roomStatusBadge'),
    roomCodeChip: document.getElementById('roomCodeChip'),
    btnVoiceMicToggle: document.getElementById('btnVoiceMicToggle'),
    iconVoiceMic: document.getElementById('iconVoiceMic'),
    voiceMicStatusText: document.getElementById('voiceMicStatusText'),
    voiceNoticeTag: document.getElementById('voiceNoticeTag'),
    roomChatScroll: document.getElementById('roomChatScroll'),
    formRoomChat: document.getElementById('formRoomChat'),
    inputRoomChat: document.getElementById('inputRoomChat'),
    btnSendRoomChat: document.getElementById('btnSendRoomChat'),

    // Move History & Action Buttons
    moveHistorySection: document.getElementById('moveHistorySection'),
    historyList: document.getElementById('historyList'),
    gameActionsGrid: document.getElementById('gameActionsGrid'),
    btnNewGame: document.getElementById('btnNewGame'),
    btnFlipBoard: document.getElementById('btnFlipBoard'),
    btnOfferDraw: document.getElementById('btnOfferDraw'),
    btnResign: document.getElementById('btnResign'),
    iconNewGame: document.getElementById('iconNewGame'),
    iconFlip: document.getElementById('iconFlip'),
    iconDraw: document.getElementById('iconDraw'),
    iconResign: document.getElementById('iconResign'),

    // Leaderboard
    leaderboardSeasonTitle: document.getElementById('leaderboardSeasonTitle'),
    leaderboardCountdownText: document.getElementById('leaderboardCountdownText'),
    iconLeaderboardClock: document.getElementById('iconLeaderboardClock'),
    btnTestSeasonReset: document.getElementById('btnTestSeasonReset'),
    leaderboardTableBody: document.getElementById('leaderboardTableBody'),

    // Friends & Player Search View
    iconSearchPlayersSlot: document.getElementById('iconSearchPlayersSlot'),
    inputSearchPlayers: document.getElementById('inputSearchPlayers'),
    btnClearSearch: document.getElementById('btnClearSearch'),
    playerSearchResults: document.getElementById('playerSearchResults'),
    tabMyFriends: document.getElementById('tabMyFriends'),
    tabMyFollowing: document.getElementById('tabMyFollowing'),
    tabMyFollowers: document.getElementById('tabMyFollowers'),
    friendsListContainer: document.getElementById('friendsListContainer'),

    // Messages View
    chatConversationsList: document.getElementById('chatConversationsList'),
    chatActiveAvatar: document.getElementById('chatActiveAvatar'),
    chatActiveName: document.getElementById('chatActiveName'),
    btnChallengeFromChat: document.getElementById('btnChallengeFromChat'),
    chatMessagesScroll: document.getElementById('chatMessagesScroll'),
    formSendMessage: document.getElementById('formSendMessage'),
    inputChatMessage: document.getElementById('inputChatMessage'),
    btnSendChat: document.getElementById('btnSendChat'),
    iconSendMsg: document.getElementById('iconSendMsg'),

    // Profile View
    profileHeroAvatar: document.getElementById('profileHeroAvatar'),
    profileHeroInitials: document.getElementById('profileHeroInitials'),
    profileHeroUsername: document.getElementById('profileHeroUsername'),
    profileHeroHandle: document.getElementById('profileHeroHandle'),
    profileHeroRank: document.getElementById('profileHeroRank'),
    profileHeroElo: document.getElementById('profileHeroElo'),
    profileUnrankedHint: document.getElementById('profileUnrankedHint'),
    profileCountFollowers: document.getElementById('profileCountFollowers'),
    profileCountFollowing: document.getElementById('profileCountFollowing'),
    profileCountFriends: document.getElementById('profileCountFriends'),
    btnToggleEditProfile: document.getElementById('btnToggleEditProfile'),
    iconEditProfile: document.getElementById('iconEditProfile'),
    profileSeasonTitle: document.getElementById('profileSeasonTitle'),
    profileSeasonWins: document.getElementById('profileSeasonWins'),
    profileSeasonLosses: document.getElementById('profileSeasonLosses'),
    profileSeasonDraws: document.getElementById('profileSeasonDraws'),
    profileLifetimeWins: document.getElementById('profileLifetimeWins'),
    profileLifetimeLosses: document.getElementById('profileLifetimeLosses'),
    profileLifetimeDraws: document.getElementById('profileLifetimeDraws'),
    profileRecentGamesList: document.getElementById('profileRecentGamesList'),
    profileSettingsSection: document.getElementById('profileSettingsSection'),
    profileFormMsg: document.getElementById('profileFormMsg'),
    inputEditUsername: document.getElementById('inputEditUsername'),
    inputProfilePhoto: document.getElementById('inputProfilePhoto'),
    btnUploadPhoto: document.getElementById('btnUploadPhoto'),
    btnRemovePhoto: document.getElementById('btnRemovePhoto'),
    iconUpload: document.getElementById('iconUpload'),
    iconRemovePhoto: document.getElementById('iconRemovePhoto'),
    btnSaveProfile: document.getElementById('btnSaveProfile'),
    btnCancelProfile: document.getElementById('btnCancelProfile'),
    btnLogout: document.getElementById('btnLogout'),
    iconLogout: document.getElementById('iconLogout'),

    // Modals
    modalSoloSetup: document.getElementById('modalSoloSetup'),
    diffBeginner: document.getElementById('diffBeginner'),
    diffCasual: document.getElementById('diffCasual'),
    diffMaster: document.getElementById('diffMaster'),
    aiPlayWhite: document.getElementById('aiPlayWhite'),
    aiPlayBlack: document.getElementById('aiPlayBlack'),
    btnCloseSoloSetup: document.getElementById('btnCloseSoloSetup'),
    btnCancelSoloSetup: document.getElementById('btnCancelSoloSetup'),
    btnStartSoloMatch: document.getElementById('btnStartSoloMatch'),

    modalMatchSetup: document.getElementById('modalMatchSetup'),
    setupPlayer1: document.getElementById('setupPlayer1'),
    setupPlayer2: document.getElementById('setupPlayer2'),
    matchRatedYes: document.getElementById('matchRatedYes'),
    matchRatedNo: document.getElementById('matchRatedNo'),
    matchRatedNotice: document.getElementById('matchRatedNotice'),
    ratedRadioLabel: document.getElementById('ratedRadioLabel'),
    btnCloseMatchSetup: document.getElementById('btnCloseMatchSetup'),
    btnCancelMatchSetup: document.getElementById('btnCancelMatchSetup'),
    btnConfirmStartMatch: document.getElementById('btnConfirmStartMatch'),

    modalCreateRoom: document.getElementById('modalCreateRoom'),
    createdRoomCodeBadge: document.getElementById('createdRoomCodeBadge'),
    btnCopyRoomCode: document.getElementById('btnCopyRoomCode'),
    iconCopySlot: document.getElementById('iconCopySlot'),
    roomWaitingStatusText: document.getElementById('roomWaitingStatusText'),
    btnSimulatePeerJoin: document.getElementById('btnSimulatePeerJoin'),
    btnCloseCreateRoom: document.getElementById('btnCloseCreateRoom'),
    btnCancelCreateRoom: document.getElementById('btnCancelCreateRoom'),

    modalJoinRoom: document.getElementById('modalJoinRoom'),
    inputJoinRoomCode: document.getElementById('inputJoinRoomCode'),
    joinRoomMsg: document.getElementById('joinRoomMsg'),
    btnCloseJoinRoom: document.getElementById('btnCloseJoinRoom'),
    btnCancelJoinRoom: document.getElementById('btnCancelJoinRoom'),
    btnSubmitJoinRoom: document.getElementById('btnSubmitJoinRoom'),

    modalPromotion: document.getElementById('modalPromotion'),
    promotionOptions: document.getElementById('promotionOptions'),

    modalGameOver: document.getElementById('modalGameOver'),
    gameOverHeaderTitle: document.getElementById('gameOverHeaderTitle'),
    gameOverTitle: document.getElementById('gameOverTitle'),
    gameOverWinnerBanner: document.getElementById('gameOverWinnerBanner'),
    gameOverReasonText: document.getElementById('gameOverReasonText'),
    gameOverEloCard: document.getElementById('gameOverEloCard'),
    eloChangeWhiteName: document.getElementById('eloChangeWhiteName'),
    eloChangeWhiteVal: document.getElementById('eloChangeWhiteVal'),
    eloAfterWhite: document.getElementById('eloAfterWhite'),
    rankAfterWhite: document.getElementById('rankAfterWhite'),
    eloChangeBlackName: document.getElementById('eloChangeBlackName'),
    eloChangeBlackVal: document.getElementById('eloChangeBlackVal'),
    eloAfterBlack: document.getElementById('eloAfterBlack'),
    rankAfterBlack: document.getElementById('rankAfterBlack'),
    btnCloseGameOver: document.getElementById('btnCloseGameOver'),
    btnGameOverReview: document.getElementById('btnGameOverReview'),
    btnGameOverNewGame: document.getElementById('btnGameOverNewGame'),
    btnGameOverBack: document.getElementById('btnGameOverBack'),

    // Public Profile Modal
    modalPublicProfile: document.getElementById('modalPublicProfile'),
    pubHeroAvatar: document.getElementById('pubHeroAvatar'),
    pubHeroInitials: document.getElementById('pubHeroInitials'),
    pubHeroUsername: document.getElementById('pubHeroUsername'),
    pubHeroHandle: document.getElementById('pubHeroHandle'),
    pubHeroRank: document.getElementById('pubHeroRank'),
    pubHeroElo: document.getElementById('pubHeroElo'),
    btnPubFollow: document.getElementById('btnPubFollow'),
    pubFollowText: document.getElementById('pubFollowText'),
    iconPubFollow: document.getElementById('iconPubFollow'),
    btnPubAddFriend: document.getElementById('btnPubAddFriend'),
    pubFriendText: document.getElementById('pubFriendText'),
    iconPubFriend: document.getElementById('iconPubFriend'),
    btnPubMessage: document.getElementById('btnPubMessage'),
    pubFollowersCount: document.getElementById('pubFollowersCount'),
    pubFollowingCount: document.getElementById('pubFollowingCount'),
    pubFriendsCount: document.getElementById('pubFriendsCount'),
    pubSeasonTitle: document.getElementById('pubSeasonTitle'),
    pubSeasonRecord: document.getElementById('pubSeasonRecord'),
    pubRecentGamesList: document.getElementById('pubRecentGamesList'),
    btnClosePublicProfile: document.getElementById('btnClosePublicProfile'),

    // Auth Modal
    modalAuth: document.getElementById('modalAuth'),
    tabAuthLogin: document.getElementById('tabAuthLogin'),
    tabAuthRegister: document.getElementById('tabAuthRegister'),
    authValidationMsg: document.getElementById('authValidationMsg'),
    authUsername: document.getElementById('authUsername'),
    authPassword: document.getElementById('authPassword'),
    btnCancelAuth: document.getElementById('btnCancelAuth'),
    btnSubmitAuth: document.getElementById('btnSubmitAuth')
  };

  let authMode = 'login';
  let tempUploadedPhoto = undefined;

  // --- Helper: Initials Avatar (ZERO EMOJIS) ---
  function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(/[_\s-]+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  function renderAvatarElement(user, container) {
    container.innerHTML = '';
    if (user && user.profilePhoto) {
      const img = document.createElement('img');
      img.src = user.profilePhoto;
      img.alt = user.username || 'User photo';
      container.appendChild(img);
    } else {
      container.textContent = getInitials(user ? user.username : '');
    }
  }

  // --- Initialize App ---
  function init() {
    injectSVGs();
    setupNavigation();
    setupLandingActions();
    setupChooseGameModes();
    setupAuthHandlers();
    setupProfileHandlers();
    setupSocialHandlers();
    setupMessagesHandlers();
    setupGameControls();
    setupReviewHandlers();
    setupRoomNetwork();
    setupModals();

    // Check season status
    StorageService.checkAndRotateSeason();

    // Setup initial default match
    initDefaultMatch();

    // Render initial state
    renderHeaderUser();
    renderBoard();
    updateGameUI();
    renderLeaderboard();

    // Route based on URL hash
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);

    setInterval(updateLeaderboardCountdown, 30000);
  }

  // --- SVG Injection (ZERO EMOJIS) ---
  function injectSVGs() {
    DOM.brandIconSlot.innerHTML = '<img src="assets/logo.jpg" alt="ChessGames Logo" class="brand-logo-img">';
    DOM.landingHeroIconSlot.innerHTML = '<img src="assets/logo.jpg" alt="ChessGames Logo" class="landing-hero-logo-img">';
    DOM.iconLandingPlay.innerHTML = ChessSVGs.icons.play;

    DOM.navPlayIcon.innerHTML = ChessSVGs.icons.play;
    DOM.navLeaderboardIcon.innerHTML = ChessSVGs.icons.trophy;
    DOM.navFriendsIcon.innerHTML = ChessSVGs.icons.friends;
    DOM.navMessagesIcon.innerHTML = ChessSVGs.icons.messages;
    DOM.navProfileIcon.innerHTML = ChessSVGs.icons.user;

    DOM.iconSoloSlot.innerHTML = ChessSVGs.icons.computer;
    DOM.iconLocalSlot.innerHTML = ChessSVGs.icons.local2p;
    DOM.iconCreateRoomSlot.innerHTML = ChessSVGs.icons.createRoom;
    DOM.iconJoinRoomSlot.innerHTML = ChessSVGs.icons.joinRoom;

    DOM.iconNewGame.innerHTML = ChessSVGs.icons.plus;
    DOM.iconFlip.innerHTML = ChessSVGs.icons.flip;
    DOM.iconDraw.innerHTML = ChessSVGs.icons.handshake;
    DOM.iconResign.innerHTML = ChessSVGs.icons.flag;

    DOM.iconLeaderboardClock.innerHTML = ChessSVGs.icons.clock;
    DOM.iconUpload.innerHTML = ChessSVGs.icons.camera;
    DOM.iconRemovePhoto.innerHTML = ChessSVGs.icons.trash;
    DOM.iconLogout.innerHTML = ChessSVGs.icons.logout;
    DOM.iconCopySlot.innerHTML = ChessSVGs.icons.copy;
    DOM.iconSendMsg.innerHTML = ChessSVGs.icons.send;
    DOM.iconSearchPlayersSlot.innerHTML = ChessSVGs.icons.search;
    DOM.iconEditProfile.innerHTML = ChessSVGs.icons.edit;
    DOM.iconVoiceMic.innerHTML = ChessSVGs.icons.micOff;

    DOM.iconReplayFirst.innerHTML = ChessSVGs.icons.first;
    DOM.iconReplayPrev.innerHTML = ChessSVGs.icons.prev;
    DOM.iconReplayNext.innerHTML = ChessSVGs.icons.next;
    DOM.iconReplayLast.innerHTML = ChessSVGs.icons.last;

    DOM.iconPubFollow.innerHTML = ChessSVGs.icons.userPlus;
    DOM.iconPubFriend.innerHTML = ChessSVGs.icons.userPlus;

    document.querySelectorAll('.icon-close-slot').forEach(slot => {
      slot.innerHTML = ChessSVGs.icons.close;
    });
  }

  // --- Navigation & Routing ---
  function setupNavigation() {
    const navItems = [
      { link: DOM.navPlay, hash: '#choose-game' },
      { link: DOM.navLeaderboard, hash: '#leaderboard' },
      { link: DOM.navFriends, hash: '#friends' },
      { link: DOM.navMessages, hash: '#messages' },
      { link: DOM.navProfile, hash: '#profile' }
    ];

    navItems.forEach(({ link, hash }) => {
      link.addEventListener('click', () => {
        window.location.hash = hash;
      });
    });

    DOM.brandLink.addEventListener('click', () => {
      const user = StorageService.getCurrentUser();
      window.location.hash = user ? '#choose-game' : '#home';
    });
  }

  function handleHashChange() {
    let hash = window.location.hash || '';
    const user = StorageService.getCurrentUser();

    // First landing behavior:
    // If opening without hash or with #home, show Landing Screen if guest, Choose Game if logged in.
    if (!hash || hash === '#home') {
      if (!user) {
        hash = '#landing';
      } else {
        hash = '#choose-game';
      }
    }

    // Hide all view sections
    [DOM.viewLanding, DOM.viewChooseGame, DOM.viewPlay, DOM.viewLeaderboard, DOM.viewFriends, DOM.viewMessages, DOM.viewProfile].forEach(v => {
      v.classList.remove('active');
    });

    // Clear active nav
    [DOM.navPlay, DOM.navLeaderboard, DOM.navFriends, DOM.navMessages, DOM.navProfile].forEach(n => {
      n.classList.remove('active');
    });

    if (hash === '#landing') {
      DOM.viewLanding.classList.add('active');
    } else if (hash === '#choose-game') {
      DOM.viewChooseGame.classList.add('active');
      DOM.navPlay.classList.add('active');
    } else if (hash === '#play') {
      DOM.viewPlay.classList.add('active');
      DOM.navPlay.classList.add('active');
      renderBoard();
      updateGameUI();
    } else if (hash === '#leaderboard') {
      DOM.viewLeaderboard.classList.add('active');
      DOM.navLeaderboard.classList.add('active');
      renderLeaderboard();
    } else if (hash === '#friends') {
      if (!user) {
        openAuthModal('login');
        window.location.hash = '#choose-game';
        return;
      }
      DOM.viewFriends.classList.add('active');
      DOM.navFriends.classList.add('active');
      renderFriendsView();
    } else if (hash === '#messages') {
      if (!user) {
        openAuthModal('login');
        window.location.hash = '#choose-game';
        return;
      }
      DOM.viewMessages.classList.add('active');
      DOM.navMessages.classList.add('active');
      renderMessagesView();
    } else if (hash === '#profile') {
      DOM.viewProfile.classList.add('active');
      DOM.navProfile.classList.add('active');
      renderProfileView();
    } else {
      DOM.viewChooseGame.classList.add('active');
      DOM.navPlay.classList.add('active');
    }
  }

  // --- Landing Screen Actions ---
  function setupLandingActions() {
    DOM.btnLandingPlay.addEventListener('click', () => {
      window.location.hash = '#choose-game';
    });
    DOM.btnLandingLogin.addEventListener('click', () => {
      openAuthModal('login');
    });
    DOM.btnLandingRegister.addEventListener('click', () => {
      openAuthModal('register');
    });
  }

  // --- Choose Game Mode Actions ---
  function setupChooseGameModes() {
    // Mode 1: Solo
    DOM.cardModeSolo.addEventListener('click', () => {
      DOM.modalSoloSetup.classList.add('active');
    });

    // Mode 2: Local 2 Player
    DOM.cardModeLocal.addEventListener('click', () => {
      openMatchSetupModal();
    });

    // Mode 3: Create Room
    DOM.cardModeCreateRoom.addEventListener('click', () => {
      const user = StorageService.getCurrentUser();
      const room = RoomChannel.createRoom(user);
      currentMatch.roomCode = room.code;
      DOM.createdRoomCodeBadge.textContent = room.code;
      DOM.roomWaitingStatusText.textContent = 'Waiting for opponent to connect...';
      DOM.modalCreateRoom.classList.add('active');
    });

    // Mode 4: Join Room
    DOM.cardModeJoinRoom.addEventListener('click', () => {
      DOM.inputJoinRoomCode.value = '';
      hideValidation(DOM.joinRoomMsg);
      DOM.modalJoinRoom.classList.add('active');
      setTimeout(() => DOM.inputJoinRoomCode.focus(), 100);
    });
  }

  // --- Header User Badge & Auth State ---
  function renderHeaderUser() {
    const user = StorageService.getCurrentUser();
    DOM.headerUserActions.innerHTML = '';

    if (user) {
      const chip = document.createElement('a');
      chip.href = '#profile';
      chip.className = 'user-badge-chip';
      chip.title = 'View Profile';

      const avatar = document.createElement('div');
      avatar.className = 'user-avatar-circle';
      renderAvatarElement(user, avatar);

      const meta = document.createElement('div');
      meta.className = 'user-chip-meta';

      const name = document.createElement('span');
      name.className = 'user-chip-name';
      name.textContent = user.username;

      const elo = document.createElement('span');
      elo.className = 'user-chip-elo';
      elo.textContent = user.isRanked ? `${user.currentElo} ELO` : 'UNRANKED';

      meta.appendChild(name);
      meta.appendChild(elo);
      chip.appendChild(avatar);
      chip.appendChild(meta);

      DOM.headerUserActions.appendChild(chip);
    } else {
      const loginBtn = document.createElement('button');
      loginBtn.type = 'button';
      loginBtn.className = 'btn btn-secondary btn-sm';
      loginBtn.textContent = 'Log In';
      loginBtn.addEventListener('click', () => openAuthModal('login'));

      const regBtn = document.createElement('button');
      regBtn.type = 'button';
      regBtn.className = 'btn btn-primary btn-sm';
      regBtn.textContent = 'Register';
      regBtn.addEventListener('click', () => openAuthModal('register'));

      DOM.headerUserActions.appendChild(loginBtn);
      DOM.headerUserActions.appendChild(regBtn);
    }
  }

  // --- Auth Handlers ---
  function setupAuthHandlers() {
    DOM.tabAuthLogin.addEventListener('click', () => setAuthMode('login'));
    DOM.tabAuthRegister.addEventListener('click', () => setAuthMode('register'));

    DOM.btnSubmitAuth.addEventListener('click', handleAuthSubmit);
    DOM.authPassword.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAuthSubmit();
    });

    DOM.btnCancelAuth.addEventListener('click', () => closeAuthModal());
  }

  function openAuthModal(mode = 'login') {
    setAuthMode(mode);
    DOM.authUsername.value = '';
    DOM.authPassword.value = '';
    hideValidation(DOM.authValidationMsg);
    DOM.modalAuth.classList.add('active');
    setTimeout(() => DOM.authUsername.focus(), 100);
  }

  function closeAuthModal() {
    DOM.modalAuth.classList.remove('active');
  }

  function setAuthMode(mode) {
    authMode = mode;
    hideValidation(DOM.authValidationMsg);
    if (mode === 'login') {
      DOM.tabAuthLogin.classList.add('active');
      DOM.tabAuthRegister.classList.remove('active');
      DOM.btnSubmitAuth.textContent = 'Log In';
    } else {
      DOM.tabAuthLogin.classList.remove('active');
      DOM.tabAuthRegister.classList.add('active');
      DOM.btnSubmitAuth.textContent = 'Create Account';
    }
  }

  function handleAuthSubmit() {
    const username = DOM.authUsername.value.trim();
    const password = DOM.authPassword.value;

    let res;
    if (authMode === 'login') {
      res = StorageService.login(username, password);
    } else {
      res = StorageService.register(username, password);
    }

    if (!res.success) {
      showValidation(DOM.authValidationMsg, res.error, 'error');
    } else {
      closeAuthModal();
      renderHeaderUser();
      renderProfileView();
      renderLeaderboard();
      initDefaultMatch();
      updateGameUI();
      window.location.hash = '#choose-game';
    }
  }

  // --- Default Match Initialization ---
  // Guest players strictly: User 1 (White) vs User 2 (Black), Unrated, no fake usernames, no fake ELO, no fake rank.
  function initDefaultMatch() {
    const user = StorageService.getCurrentUser();

    if (user) {
      currentMatch = {
        mode: 'local',
        aiDifficulty: 'casual',
        playerColor: 'w',
        whitePlayer: user,
        blackPlayer: { username: 'User 2', isGuest: true, currentElo: 0, rank: 'UNRANKED' },
        isRated: false, // Local 2P matches are unrated by default
        isCompleted: false,
        roomCode: null
      };
    } else {
      currentMatch = {
        mode: 'local',
        aiDifficulty: 'casual',
        playerColor: 'w',
        whitePlayer: { username: 'User 1', isGuest: true, currentElo: 0, rank: 'UNRANKED' },
        blackPlayer: { username: 'User 2', isGuest: true, currentElo: 0, rank: 'UNRANKED' },
        isRated: false,
        isCompleted: false,
        roomCode: null
      };
    }

    chess.reset();
    selectedSquare = null;
    legalMovesForSelected = [];
    isReviewMode = false;
    DOM.reviewControlPanel.style.display = 'none';
    DOM.onlineRoomPanel.style.display = 'none';
  }

  // --- Social & Friends View Handlers ---
  function setupSocialHandlers() {
    // Player Search Input
    DOM.inputSearchPlayers.addEventListener('input', () => {
      const q = DOM.inputSearchPlayers.value.trim();
      if (!q) {
        DOM.playerSearchResults.innerHTML = '';
        return;
      }
      performPlayerSearch(q);
    });

    DOM.btnClearSearch.addEventListener('click', () => {
      DOM.inputSearchPlayers.value = '';
      DOM.playerSearchResults.innerHTML = '';
    });

    // Social Subtabs
    DOM.tabMyFriends.addEventListener('click', () => {
      activeFriendsTab = 'friends';
      DOM.tabMyFriends.classList.add('active');
      DOM.tabMyFollowing.classList.remove('active');
      DOM.tabMyFollowers.classList.remove('active');
      renderFriendsView();
    });

    DOM.tabMyFollowing.addEventListener('click', () => {
      activeFriendsTab = 'following';
      DOM.tabMyFollowing.classList.add('active');
      DOM.tabMyFriends.classList.remove('active');
      DOM.tabMyFollowers.classList.remove('active');
      renderFriendsView();
    });

    DOM.tabMyFollowers.addEventListener('click', () => {
      activeFriendsTab = 'followers';
      DOM.tabMyFollowers.classList.add('active');
      DOM.tabMyFriends.classList.remove('active');
      DOM.tabMyFollowing.classList.remove('active');
      renderFriendsView();
    });

    // Public Profile Modal Actions
    DOM.btnClosePublicProfile.addEventListener('click', () => {
      DOM.modalPublicProfile.classList.remove('active');
      activeViewingProfileId = null;
    });

    DOM.btnPubFollow.addEventListener('click', () => {
      const current = StorageService.getCurrentUser();
      if (!current) {
        openAuthModal('login');
        return;
      }
      if (!activeViewingProfileId) return;

      if (StorageService.isFollowing(current.id, activeViewingProfileId)) {
        StorageService.unfollowUser(current.id, activeViewingProfileId);
      } else {
        StorageService.followUser(current.id, activeViewingProfileId);
      }
      openPublicProfileModal(activeViewingProfileId);
      renderFriendsView();
    });

    DOM.btnPubAddFriend.addEventListener('click', () => {
      const current = StorageService.getCurrentUser();
      if (!current) {
        openAuthModal('login');
        return;
      }
      if (!activeViewingProfileId) return;

      if (StorageService.isFriend(current.id, activeViewingProfileId)) {
        StorageService.removeFriend(current.id, activeViewingProfileId);
      } else {
        StorageService.addFriend(current.id, activeViewingProfileId);
      }
      openPublicProfileModal(activeViewingProfileId);
      renderFriendsView();
    });

    DOM.btnPubMessage.addEventListener('click', () => {
      if (!activeViewingProfileId) return;
      activeChatFriendId = activeViewingProfileId;
      DOM.modalPublicProfile.classList.remove('active');
      window.location.hash = '#messages';
    });
  }

  function performPlayerSearch(query) {
    const results = StorageService.searchUsers(query);
    const currentUser = StorageService.getCurrentUser();
    DOM.playerSearchResults.innerHTML = '';

    if (results.length === 0) {
      DOM.playerSearchResults.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.88rem; font-weight: 600;">
          No registered players found matching "${query}".
        </div>
      `;
      return;
    }

    results.forEach(target => {
      const card = document.createElement('div');
      card.className = 'search-player-card';

      const left = document.createElement('div');
      left.className = 'search-card-left';

      const avatar = document.createElement('div');
      avatar.className = 'user-avatar-circle';
      avatar.style.width = '38px';
      avatar.style.height = '38px';
      renderAvatarElement(target, avatar);

      const meta = document.createElement('div');
      meta.className = 'search-card-meta';

      const name = document.createElement('span');
      name.className = 'search-card-name';
      name.textContent = target.username;

      const handle = document.createElement('span');
      handle.className = 'search-card-handle';
      handle.textContent = `@${target.username.toLowerCase()}`;

      const rankElo = document.createElement('span');
      rankElo.className = 'search-card-rank-elo';
      rankElo.textContent = target.isRanked ? `${target.rank} — ${target.currentElo} ELO` : 'UNRANKED — 0 ELO';

      meta.appendChild(name);
      meta.appendChild(handle);
      meta.appendChild(rankElo);

      left.appendChild(avatar);
      left.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'search-card-actions';

      // View Profile Button
      const viewBtn = document.createElement('button');
      viewBtn.type = 'button';
      viewBtn.className = 'btn btn-secondary btn-sm';
      viewBtn.textContent = 'View Profile';
      viewBtn.addEventListener('click', () => openPublicProfileModal(target.id));

      actions.appendChild(viewBtn);

      if (currentUser && currentUser.id !== target.id) {
        // Follow / Unfollow
        const isFollow = StorageService.isFollowing(currentUser.id, target.id);
        const followBtn = document.createElement('button');
        followBtn.type = 'button';
        followBtn.className = `btn btn-sm ${isFollow ? 'btn-secondary' : 'btn-primary'}`;
        followBtn.textContent = isFollow ? 'Following' : 'Follow';
        followBtn.addEventListener('click', () => {
          if (isFollow) {
            StorageService.unfollowUser(currentUser.id, target.id);
          } else {
            StorageService.followUser(currentUser.id, target.id);
          }
          performPlayerSearch(query);
          renderFriendsView();
        });
        actions.appendChild(followBtn);

        // Add / Remove Friend
        const isFr = StorageService.isFriend(currentUser.id, target.id);
        const friendBtn = document.createElement('button');
        friendBtn.type = 'button';
        friendBtn.className = `btn btn-sm ${isFr ? 'btn-secondary' : 'btn-brown'}`;
        friendBtn.textContent = isFr ? 'Remove Friend' : 'Add Friend';
        friendBtn.addEventListener('click', () => {
          if (isFr) {
            StorageService.removeFriend(currentUser.id, target.id);
          } else {
            StorageService.addFriend(currentUser.id, target.id);
          }
          performPlayerSearch(query);
          renderFriendsView();
        });
        actions.appendChild(friendBtn);
      }

      card.appendChild(left);
      card.appendChild(actions);
      DOM.playerSearchResults.appendChild(card);
    });
  }

  function renderFriendsView() {
    const user = StorageService.getCurrentUser();
    if (!user) return;

    DOM.friendsListContainer.innerHTML = '';
    let targetList = [];

    if (activeFriendsTab === 'friends') {
      targetList = StorageService.getFriends(user.id);
    } else if (activeFriendsTab === 'following') {
      const accounts = StorageService.getAllAccounts();
      const followingIds = user.following || [];
      targetList = followingIds.map(id => accounts.find(a => a.id === id)).filter(Boolean);
    } else if (activeFriendsTab === 'followers') {
      const accounts = StorageService.getAllAccounts();
      const followerIds = user.followers || [];
      targetList = followerIds.map(id => accounts.find(a => a.id === id)).filter(Boolean);
    }

    if (targetList.length === 0) {
      let emptyMsg = 'No friends added yet. Use the search bar above to find and add players!';
      if (activeFriendsTab === 'following') emptyMsg = 'You are not following any players yet.';
      if (activeFriendsTab === 'followers') emptyMsg = 'No players are following you yet.';

      DOM.friendsListContainer.innerHTML = `
        <div style="padding: 1.5rem; text-align: center; color: var(--text-muted); font-weight: 600;">
          ${emptyMsg}
        </div>
      `;
      return;
    }

    targetList.forEach(target => {
      const item = document.createElement('div');
      item.className = 'friend-item';

      const left = document.createElement('div');
      left.className = 'friend-left';
      left.style.cursor = 'pointer';
      left.addEventListener('click', () => openPublicProfileModal(target.id));

      const avatar = document.createElement('div');
      avatar.className = 'user-avatar-circle';
      avatar.style.width = '38px';
      avatar.style.height = '38px';
      renderAvatarElement(target, avatar);

      const info = document.createElement('div');
      info.style.display = 'flex';
      info.style.flexDirection = 'column';

      const nameRow = document.createElement('div');
      nameRow.style.display = 'flex';
      nameRow.style.alignItems = 'center';
      nameRow.style.gap = '0.4rem';

      const dot = document.createElement('div');
      dot.className = 'friend-status-dot';

      const name = document.createElement('span');
      name.className = 'friend-meta-name';
      name.textContent = target.username;

      nameRow.appendChild(dot);
      nameRow.appendChild(name);

      const elo = document.createElement('span');
      elo.className = 'friend-meta-elo';
      elo.textContent = target.isRanked ? `${target.rank || 'BRONZE III'} — ${target.currentElo} ELO` : 'UNRANKED';

      info.appendChild(nameRow);
      info.appendChild(elo);

      left.appendChild(avatar);
      left.appendChild(info);

      // Action Buttons
      const actions = document.createElement('div');
      actions.className = 'friend-actions-group';

      const challengeBtn = document.createElement('button');
      challengeBtn.type = 'button';
      challengeBtn.className = 'btn btn-primary btn-sm';
      challengeBtn.textContent = 'Challenge';
      challengeBtn.addEventListener('click', () => {
        currentMatch = {
          mode: 'local',
          whitePlayer: user,
          blackPlayer: target,
          isRated: true,
          isCompleted: false,
          roomCode: null
        };
        chess.reset();
        boardFlipped = false;
        window.location.hash = '#play';
      });

      const messageBtn = document.createElement('button');
      messageBtn.type = 'button';
      messageBtn.className = 'btn btn-secondary btn-sm';
      messageBtn.textContent = 'Message';
      messageBtn.addEventListener('click', () => {
        activeChatFriendId = target.id;
        window.location.hash = '#messages';
      });

      actions.appendChild(challengeBtn);
      actions.appendChild(messageBtn);

      item.appendChild(left);
      item.appendChild(actions);
      DOM.friendsListContainer.appendChild(item);
    });
  }

  // --- Public Profile Modal ---
  function openPublicProfileModal(targetId) {
    const target = StorageService.findAccountById(targetId);
    if (!target) return;

    activeViewingProfileId = targetId;
    const current = StorageService.getCurrentUser();

    renderAvatarElement(target, DOM.pubHeroAvatar);
    DOM.pubHeroUsername.textContent = target.username;
    DOM.pubHeroHandle.textContent = `@${target.username.toLowerCase()}`;
    DOM.pubHeroRank.textContent = target.isRanked ? (target.rank || 'BRONZE III') : 'UNRANKED';
    DOM.pubHeroElo.textContent = target.isRanked ? `${target.currentElo} ELO` : '0 ELO';

    DOM.pubFollowersCount.textContent = target.followers ? target.followers.length : 0;
    DOM.pubFollowingCount.textContent = target.following ? target.following.length : 0;
    DOM.pubFriendsCount.textContent = target.friends ? target.friends.length : 0;

    const season = StorageService.getSeason();
    DOM.pubSeasonTitle.textContent = `Season ${season.seasonId}`;
    DOM.pubSeasonRecord.textContent = `${target.wins} W - ${target.losses} L - ${target.draws} D`;

    // Follow / Friend Buttons state
    if (current && current.id === target.id) {
      DOM.btnPubFollow.style.display = 'none';
      DOM.btnPubAddFriend.style.display = 'none';
      DOM.btnPubMessage.style.display = 'none';
    } else {
      DOM.btnPubFollow.style.display = 'inline-flex';
      DOM.btnPubAddFriend.style.display = 'inline-flex';
      DOM.btnPubMessage.style.display = 'inline-flex';

      const isFollowing = current ? StorageService.isFollowing(current.id, target.id) : false;
      DOM.pubFollowText.textContent = isFollowing ? 'Following' : 'Follow';
      DOM.btnPubFollow.className = `btn btn-sm ${isFollowing ? 'btn-secondary' : 'btn-primary'}`;

      const isFriend = current ? StorageService.isFriend(current.id, target.id) : false;
      DOM.pubFriendText.textContent = isFriend ? 'Remove Friend' : 'Add Friend';
      DOM.btnPubAddFriend.className = `btn btn-sm ${isFriend ? 'btn-secondary' : 'btn-brown'}`;
    }

    // Populate Recent Games for Target Player
    const targetRecentGames = StorageService.getRecentGames(target.id);
    renderRecentGamesList(targetRecentGames, DOM.pubRecentGamesList);

    DOM.modalPublicProfile.classList.add('active');
  }

  // --- Messages View Handlers ---
  function setupMessagesHandlers() {
    DOM.formSendMessage.addEventListener('submit', (e) => {
      e.preventDefault();
      const user = StorageService.getCurrentUser();
      if (!user || !activeChatFriendId) return;

      const text = DOM.inputChatMessage.value.trim();
      if (!text) return;

      const res = StorageService.sendMessage(user.id, activeChatFriendId, text);
      if (res.success) {
        DOM.inputChatMessage.value = '';
        renderActiveChatMessages();
        renderChatUserList();
      }
    });

    DOM.btnChallengeFromChat.addEventListener('click', () => {
      const user = StorageService.getCurrentUser();
      const friend = StorageService.findAccountById(activeChatFriendId);
      if (user && friend) {
        currentMatch = {
          mode: 'local',
          whitePlayer: user,
          blackPlayer: friend,
          isRated: true,
          isCompleted: false,
          roomCode: null
        };
        chess.reset();
        window.location.hash = '#play';
      }
    });
  }

  function renderMessagesView() {
    const user = StorageService.getCurrentUser();
    if (!user) return;

    renderChatUserList();
    renderActiveChatMessages();
  }

  function renderChatUserList() {
    const user = StorageService.getCurrentUser();
    if (!user) return;

    const friends = StorageService.getFriends(user.id);
    DOM.chatConversationsList.innerHTML = '';

    if (friends.length === 0) {
      DOM.chatConversationsList.innerHTML = `
        <div style="padding: 1rem; color: var(--text-muted); font-size: 0.82rem; text-align: center;">
          Add friends to start messaging!
        </div>
      `;
      return;
    }

    if (!activeChatFriendId && friends.length > 0) {
      activeChatFriendId = friends[0].id;
    }

    friends.forEach(f => {
      const item = document.createElement('div');
      item.className = `chat-user-item ${activeChatFriendId === f.id ? 'active' : ''}`;

      const avatar = document.createElement('div');
      avatar.className = 'user-avatar-circle';
      avatar.style.width = '30px';
      avatar.style.height = '30px';
      avatar.style.fontSize = '0.75rem';
      renderAvatarElement(f, avatar);

      const info = document.createElement('div');
      info.className = 'chat-user-info';

      const name = document.createElement('span');
      name.className = 'chat-user-name';
      name.textContent = f.username;

      info.appendChild(name);
      item.appendChild(avatar);
      item.appendChild(info);

      item.addEventListener('click', () => {
        activeChatFriendId = f.id;
        renderChatUserList();
        renderActiveChatMessages();
      });

      DOM.chatConversationsList.appendChild(item);
    });
  }

  function renderActiveChatMessages() {
    const user = StorageService.getCurrentUser();
    if (!user || !activeChatFriendId) {
      DOM.inputChatMessage.disabled = true;
      DOM.btnSendChat.disabled = true;
      DOM.btnChallengeFromChat.style.display = 'none';
      DOM.chatActiveName.textContent = 'Select a conversation';
      DOM.chatActiveAvatar.textContent = '?';
      DOM.chatMessagesScroll.innerHTML = '';
      return;
    }

    const friend = StorageService.findAccountById(activeChatFriendId);
    if (!friend) return;

    DOM.inputChatMessage.disabled = false;
    DOM.btnSendChat.disabled = false;
    DOM.btnChallengeFromChat.style.display = 'inline-flex';
    DOM.chatActiveName.textContent = friend.username;
    renderAvatarElement(friend, DOM.chatActiveAvatar);

    const messages = StorageService.getMessages(user.id, friend.id);
    DOM.chatMessagesScroll.innerHTML = '';

    messages.forEach(msg => {
      const row = document.createElement('div');
      const isMine = msg.senderId === user.id;
      row.className = `chat-msg-row ${isMine ? 'mine' : 'theirs'}`;

      const bubble = document.createElement('div');
      bubble.className = 'chat-bubble';
      bubble.textContent = msg.text;

      const time = document.createElement('span');
      time.className = 'chat-time-tag';
      const d = new Date(msg.timestamp);
      time.textContent = `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;

      row.appendChild(bubble);
      row.appendChild(time);
      DOM.chatMessagesScroll.appendChild(row);
    });

    DOM.chatMessagesScroll.scrollTop = DOM.chatMessagesScroll.scrollHeight;
  }

  // --- Own Profile Handlers ---
  function setupProfileHandlers() {
    DOM.btnToggleEditProfile.addEventListener('click', () => {
      const isHidden = DOM.profileSettingsSection.style.display === 'none';
      DOM.profileSettingsSection.style.display = isHidden ? 'block' : 'none';
    });

    DOM.btnUploadPhoto.addEventListener('click', () => {
      DOM.inputProfilePhoto.click();
    });

    DOM.inputProfilePhoto.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 160;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > maxDim) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            }
          } else {
            if (h > maxDim) {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          tempUploadedPhoto = canvas.toDataURL('image/jpeg', 0.85);

          DOM.profileHeroAvatar.innerHTML = `<img src="${tempUploadedPhoto}" alt="Preview">`;
          showValidation(DOM.profileFormMsg, 'Photo preview loaded. Click "Save Changes" to apply.', 'success');
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });

    DOM.btnRemovePhoto.addEventListener('click', () => {
      tempUploadedPhoto = null;
      const current = StorageService.getCurrentUser();
      const previewUser = { username: DOM.inputEditUsername.value || (current ? current.username : 'User'), profilePhoto: null };
      renderAvatarElement(previewUser, DOM.profileHeroAvatar);
      showValidation(DOM.profileFormMsg, 'Photo removed. Click "Save Changes" to apply.', 'success');
    });

    DOM.btnSaveProfile.addEventListener('click', () => {
      const user = StorageService.getCurrentUser();
      if (!user) return;

      const newUsername = DOM.inputEditUsername.value.trim();
      const updates = {};

      if (newUsername !== user.username) {
        updates.newUsername = newUsername;
      }
      if (tempUploadedPhoto !== undefined) {
        updates.profilePhoto = tempUploadedPhoto;
      }

      const res = StorageService.updateProfile(user.id, updates);
      if (!res.success) {
        showValidation(DOM.profileFormMsg, res.error, 'error');
      } else {
        tempUploadedPhoto = undefined;
        showValidation(DOM.profileFormMsg, 'Profile changes saved successfully.', 'success');
        renderHeaderUser();
        renderProfileView();
        renderLeaderboard();
        updateGameUI();
      }
    });

    DOM.btnCancelProfile.addEventListener('click', () => {
      DOM.profileSettingsSection.style.display = 'none';
      renderProfileView();
    });

    DOM.btnLogout.addEventListener('click', () => {
      StorageService.logout();
      renderHeaderUser();
      renderProfileView();
      renderLeaderboard();
      initDefaultMatch();
      updateGameUI();
      window.location.hash = '#home';
    });
  }

  function renderProfileView() {
    const user = StorageService.getCurrentUser();

    if (!user) {
      DOM.profileHeroUsername.textContent = 'Guest Player';
      DOM.profileHeroHandle.textContent = '@guest';
      DOM.profileHeroRank.textContent = 'UNRANKED';
      DOM.profileHeroElo.textContent = '0 ELO';
      DOM.profileUnrankedHint.style.display = 'block';
      DOM.profileUnrankedHint.textContent = 'Log in or register to receive an official rating and rank.';
      DOM.profileHeroAvatar.innerHTML = 'GP';

      DOM.profileCountFollowers.textContent = '0';
      DOM.profileCountFollowing.textContent = '0';
      DOM.profileCountFriends.textContent = '0';

      DOM.profileSeasonWins.textContent = '0';
      DOM.profileSeasonLosses.textContent = '0';
      DOM.profileSeasonDraws.textContent = '0';

      DOM.profileLifetimeWins.textContent = '0';
      DOM.profileLifetimeLosses.textContent = '0';
      DOM.profileLifetimeDraws.textContent = '0';

      DOM.btnToggleEditProfile.style.display = 'none';
      DOM.profileSettingsSection.style.display = 'none';

      const recentGames = StorageService.getRecentGames(null);
      renderRecentGamesList(recentGames, DOM.profileRecentGamesList);
      return;
    }

    DOM.btnToggleEditProfile.style.display = 'inline-flex';
    DOM.profileHeroUsername.textContent = user.username;
    DOM.profileHeroHandle.textContent = `@${user.username.toLowerCase()}`;
    renderAvatarElement(user, DOM.profileHeroAvatar);

    if (user.isRanked && user.currentElo > 0) {
      DOM.profileHeroRank.textContent = user.rank || RankSystem.getRank(user.currentElo, true);
      DOM.profileHeroElo.textContent = `${user.currentElo} ELO`;
      DOM.profileUnrankedHint.style.display = 'none';
    } else {
      DOM.profileHeroRank.textContent = 'UNRANKED';
      DOM.profileHeroElo.textContent = '0 ELO';
      DOM.profileUnrankedHint.style.display = 'block';
      DOM.profileUnrankedHint.textContent = 'Play your first rated game to receive your rating.';
    }

    DOM.profileCountFollowers.textContent = user.followers ? user.followers.length : 0;
    DOM.profileCountFollowing.textContent = user.following ? user.following.length : 0;
    DOM.profileCountFriends.textContent = user.friends ? user.friends.length : 0;

    const season = StorageService.getSeason();
    DOM.profileSeasonTitle.textContent = `Season ${season.seasonId}`;
    DOM.profileSeasonWins.textContent = user.wins;
    DOM.profileSeasonLosses.textContent = user.losses;
    DOM.profileSeasonDraws.textContent = user.draws;

    DOM.profileLifetimeWins.textContent = user.lifetimeWins || user.wins;
    DOM.profileLifetimeLosses.textContent = user.lifetimeLosses || user.losses;
    DOM.profileLifetimeDraws.textContent = user.lifetimeDraws || user.draws;

    DOM.inputEditUsername.value = user.username;

    // Render Recent Games on Profile
    const myRecentGames = StorageService.getRecentGames(user.id);
    renderRecentGamesList(myRecentGames, DOM.profileRecentGamesList);
  }

  function renderRecentGamesList(games, container) {
    container.innerHTML = '';
    if (!games || games.length === 0) {
      container.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; font-weight: 600;">
          No completed games in history yet. Play a game to record history!
        </div>
      `;
      return;
    }

    const current = StorageService.getCurrentUser();

    games.forEach(g => {
      const item = document.createElement('div');
      item.className = 'recent-game-item';

      const isWhite = current && g.whitePlayer?.id === current.id;
      const isBlack = current && g.blackPlayer?.id === current.id;

      let outcomeType = 'draw';
      let outcomeLabel = 'DRAW';
      let opponentName = g.blackPlayer?.username || 'Opponent';
      let eloChangeVal = 0;

      if (isWhite) {
        opponentName = g.blackPlayer?.username || 'Black';
        eloChangeVal = g.whiteChange || 0;
        if (g.result === '1-0') { outcomeType = 'win'; outcomeLabel = 'WIN'; }
        else if (g.result === '0-1') { outcomeType = 'loss'; outcomeLabel = 'LOSS'; }
      } else if (isBlack) {
        opponentName = g.whitePlayer?.username || 'White';
        eloChangeVal = g.blackChange || 0;
        if (g.result === '0-1') { outcomeType = 'win'; outcomeLabel = 'WIN'; }
        else if (g.result === '1-0') { outcomeType = 'loss'; outcomeLabel = 'LOSS'; }
      } else {
        opponentName = `${g.whitePlayer?.username || 'User 1'} vs ${g.blackPlayer?.username || 'User 2'}`;
        if (g.result === '1-0') { outcomeType = 'win'; outcomeLabel = '1-0'; }
        else if (g.result === '0-1') { outcomeType = 'loss'; outcomeLabel = '0-1'; }
      }

      const pill = document.createElement('span');
      pill.className = `game-outcome-pill ${outcomeType}`;
      pill.textContent = outcomeLabel;

      const oppCol = document.createElement('div');
      oppCol.className = 'game-opponent-col';

      const oppTitle = document.createElement('span');
      oppTitle.className = 'game-opp-name';
      oppTitle.textContent = isWhite || isBlack ? `vs ${opponentName}` : opponentName;

      const reason = document.createElement('span');
      reason.className = 'game-reason-txt';
      reason.textContent = `${g.terminationReason || 'Completed'} (${g.moveCount || g.moves?.length || 0} moves)`;

      oppCol.appendChild(oppTitle);
      oppCol.appendChild(reason);

      const eloCol = document.createElement('span');
      eloCol.className = `game-elo-col ${eloChangeVal > 0 ? 'gain' : eloChangeVal < 0 ? 'loss' : 'neutral'}`;
      if (g.rated) {
        eloCol.textContent = (eloChangeVal >= 0 ? '+' : '') + `${eloChangeVal} ELO`;
      } else {
        eloCol.textContent = 'UNRATED';
      }

      item.appendChild(pill);
      item.appendChild(oppCol);
      item.appendChild(eloCol);

      // Clicking any game opens Game Review mode!
      item.addEventListener('click', () => {
        if (DOM.modalPublicProfile.classList.contains('active')) {
          DOM.modalPublicProfile.classList.remove('active');
        }
        startReviewMode(g);
      });

      container.appendChild(item);
    });
  }

  // --- Leaderboard View Rendering ---
  function renderLeaderboard() {
    const season = StorageService.getSeason();
    DOM.leaderboardSeasonTitle.textContent = `Season ${season.seasonId} Leaderboard`;
    updateLeaderboardCountdown();

    const accounts = StorageService.recalculateRanks();
    const currentUser = StorageService.getCurrentUser();

    DOM.leaderboardTableBody.innerHTML = '';

    if (accounts.length === 0) {
      const emptyRow = document.createElement('tr');
      const emptyCell = document.createElement('td');
      emptyCell.colSpan = 4;
      emptyCell.className = 'empty-leaderboard-cell';
      emptyCell.style.textAlign = 'center';
      emptyCell.style.padding = '2.5rem 1rem';
      emptyCell.style.color = 'var(--text-secondary)';
      emptyCell.style.fontWeight = '600';
      emptyCell.textContent = 'No registered players yet. Create an account to be #1 on the leaderboard!';
      emptyRow.appendChild(emptyCell);
      DOM.leaderboardTableBody.appendChild(emptyRow);
    }

    accounts.forEach((acc, index) => {
      const row = document.createElement('tr');
      if (currentUser && currentUser.id === acc.id) {
        row.classList.add('highlight-user');
      }

      const tdRank = document.createElement('td');
      tdRank.className = `rank-cell ${index === 0 ? 'top-1' : index === 1 ? 'top-2' : index === 2 ? 'top-3' : ''}`;
      tdRank.textContent = acc.isRanked ? acc.seasonRank : '-';

      const tdPlayer = document.createElement('td');
      const playerDiv = document.createElement('div');
      playerDiv.className = 'player-cell';
      playerDiv.style.cursor = 'pointer';
      playerDiv.title = 'View profile';
      playerDiv.addEventListener('click', () => openPublicProfileModal(acc.id));

      const avatarCircle = document.createElement('div');
      avatarCircle.className = 'user-avatar-circle';
      avatarCircle.style.width = '28px';
      avatarCircle.style.height = '28px';
      avatarCircle.style.fontSize = '0.72rem';
      renderAvatarElement(acc, avatarCircle);

      const nameSpan = document.createElement('span');
      nameSpan.textContent = acc.username;
      if (currentUser && currentUser.id === acc.id) {
        nameSpan.style.fontWeight = '800';
        nameSpan.textContent += ' (You)';
      }

      playerDiv.appendChild(avatarCircle);
      playerDiv.appendChild(nameSpan);
      tdPlayer.appendChild(playerDiv);

      const tdElo = document.createElement('td');
      tdElo.className = 'elo-cell';
      tdElo.textContent = acc.isRanked ? `${acc.currentElo} ELO` : 'UNRANKED';

      const tdRecord = document.createElement('td');
      tdRecord.className = 'record-cell';
      tdRecord.textContent = `${acc.wins}W - ${acc.losses}L - ${acc.draws}D`;

      row.appendChild(tdRank);
      row.appendChild(tdPlayer);
      row.appendChild(tdElo);
      row.appendChild(tdRecord);

      DOM.leaderboardTableBody.appendChild(row);
    });

    DOM.btnTestSeasonReset.onclick = () => {
      const rotateRes = StorageService.forceRotateSeason();
      renderLeaderboard();
      renderHeaderUser();
      renderProfileView();
      alert(`Season rotated successfully!\nNow active: Season ${rotateRes.season.seasonId}.\nSeasonal ELO reset to 0 (UNRANKED) while preserving lifetime records, friends, and game history.`);
    };
  }

  function updateLeaderboardCountdown() {
    const cd = StorageService.getSeasonCountdown();
    DOM.leaderboardCountdownText.textContent = `SEASON ${StorageService.getSeason().seasonId} — ${cd.formatted}`;
  }

  // --- Modal Setups ---
  function setupModals() {
    // Solo Setup Modal
    DOM.btnStartSoloMatch.addEventListener('click', () => {
      const user = StorageService.getCurrentUser();
      const diff = DOM.diffBeginner.checked ? 'beginner' : DOM.diffMaster.checked ? 'master' : 'casual';
      const color = DOM.aiPlayWhite.checked ? 'w' : 'b';

      const aiElo = diff === 'beginner' ? 800 : diff === 'master' ? 1600 : 1200;
      const aiRank = diff === 'beginner' ? 'BRONZE I' : diff === 'master' ? 'DIAMOND III' : 'GOLD III';
      const aiName = `Computer (${diff.charAt(0).toUpperCase() + diff.slice(1)})`;

      const humanPlayer = user || { username: 'User 1', currentElo: 0, rank: 'UNRANKED', isGuest: true };
      const aiPlayer = { username: aiName, currentElo: aiElo, rank: aiRank, isGuest: true };

      currentMatch = {
        mode: 'solo',
        aiDifficulty: diff,
        playerColor: color,
        whitePlayer: color === 'w' ? humanPlayer : aiPlayer,
        blackPlayer: color === 'w' ? aiPlayer : humanPlayer,
        isRated: false, // Solo games are unrated practice
        isCompleted: false,
        roomCode: null
      };

      chess.reset();
      boardFlipped = color === 'b';
      isReviewMode = false;
      DOM.reviewControlPanel.style.display = 'none';
      DOM.onlineRoomPanel.style.display = 'none';
      DOM.modalSoloSetup.classList.remove('active');
      window.location.hash = '#play';

      if (color === 'b') {
        setTimeout(makeComputerMove, 400);
      }
    });

    DOM.btnCloseSoloSetup.addEventListener('click', () => DOM.modalSoloSetup.classList.remove('active'));
    DOM.btnCancelSoloSetup.addEventListener('click', () => DOM.modalSoloSetup.classList.remove('active'));

    // Local 2 Player Setup
    DOM.btnNewGame.addEventListener('click', () => {
      window.location.hash = '#choose-game';
    });

    DOM.btnCloseMatchSetup.addEventListener('click', () => closeMatchSetupModal());
    DOM.btnCancelMatchSetup.addEventListener('click', () => closeMatchSetupModal());

    DOM.btnConfirmStartMatch.addEventListener('click', () => {
      const user = StorageService.getCurrentUser();
      const p1Input = DOM.setupPlayer1.value.trim();
      const p2Input = DOM.setupPlayer2.value.trim();

      let whiteUser, blackUser;

      if (!user) {
        // Strict guest rule: User 1 vs User 2, unrated
        whiteUser = { username: 'User 1', isGuest: true, currentElo: 0, rank: 'UNRANKED' };
        blackUser = { username: 'User 2', isGuest: true, currentElo: 0, rank: 'UNRANKED' };
      } else {
        whiteUser = p1Input ? (StorageService.findAccountByUsername(p1Input) || { username: p1Input, isGuest: true, currentElo: 0, rank: 'UNRANKED' }) : user;
        blackUser = p2Input ? (StorageService.findAccountByUsername(p2Input) || { username: p2Input, isGuest: true, currentElo: 0, rank: 'UNRANKED' }) : { username: 'User 2', isGuest: true, currentElo: 0, rank: 'UNRANKED' };
      }

      const isRated = user && DOM.matchRatedYes.checked && !whiteUser.isGuest && !blackUser.isGuest;

      currentMatch = {
        mode: 'local',
        whitePlayer: whiteUser,
        blackPlayer: blackUser,
        isRated: Boolean(isRated),
        isCompleted: false,
        roomCode: null
      };

      chess.reset();
      boardFlipped = false;
      isReviewMode = false;
      DOM.reviewControlPanel.style.display = 'none';
      DOM.onlineRoomPanel.style.display = 'none';
      closeMatchSetupModal();
      window.location.hash = '#play';
    });

    // Create Room Modal
    DOM.btnCloseCreateRoom.addEventListener('click', () => DOM.modalCreateRoom.classList.remove('active'));
    DOM.btnCancelCreateRoom.addEventListener('click', () => DOM.modalCreateRoom.classList.remove('active'));

    DOM.btnCopyRoomCode.addEventListener('click', () => {
      const code = DOM.createdRoomCodeBadge.textContent;
      navigator.clipboard.writeText(code).then(() => {
        DOM.roomWaitingStatusText.textContent = `Room code "${code}" copied to clipboard!`;
      }).catch(() => {
        DOM.roomWaitingStatusText.textContent = `Room code: ${code}`;
      });
    });

    DOM.btnSimulatePeerJoin.addEventListener('click', () => {
      DOM.modalCreateRoom.classList.remove('active');
      launchRoomMatch(currentMatch.roomCode, 'host');
    });

    // Join Room Modal
    DOM.btnCloseJoinRoom.addEventListener('click', () => DOM.modalJoinRoom.classList.remove('active'));
    DOM.btnCancelJoinRoom.addEventListener('click', () => DOM.modalJoinRoom.classList.remove('active'));

    DOM.btnSubmitJoinRoom.addEventListener('click', () => {
      const code = DOM.inputJoinRoomCode.value.trim().toUpperCase();
      if (!code) {
        showValidation(DOM.joinRoomMsg, 'Please enter a room code.');
        return;
      }

      const user = StorageService.getCurrentUser();
      const res = RoomChannel.joinRoom(code, user);
      if (!res.success) {
        showValidation(DOM.joinRoomMsg, res.error);
      } else {
        DOM.modalJoinRoom.classList.remove('active');
        launchRoomMatch(code, 'guest');
      }
    });

    // Game Over Modal Buttons
    DOM.btnCloseGameOver.addEventListener('click', () => DOM.modalGameOver.classList.remove('active'));
    DOM.btnGameOverBack.addEventListener('click', () => DOM.modalGameOver.classList.remove('active'));
    DOM.btnGameOverNewGame.addEventListener('click', () => {
      DOM.modalGameOver.classList.remove('active');
      window.location.hash = '#choose-game';
    });
    DOM.btnGameOverReview.addEventListener('click', () => {
      DOM.modalGameOver.classList.remove('active');
      const allGames = StorageService.getAllGames();
      if (allGames.length > 0) {
        startReviewMode(allGames[0]);
      }
    });
  }

  function openMatchSetupModal() {
    const user = StorageService.getCurrentUser();

    if (!user) {
      DOM.setupPlayer1.value = 'User 1';
      DOM.setupPlayer2.value = 'User 2';
      DOM.setupPlayer1.disabled = true;
      DOM.setupPlayer2.disabled = true;
      DOM.matchRatedNo.checked = true;
      DOM.matchRatedYes.checked = false;
      DOM.matchRatedYes.disabled = true;
      DOM.matchRatedNotice.textContent = 'Guest players are strictly User 1 vs User 2 and matches are UNRATED.';
    } else {
      DOM.setupPlayer1.value = user.username;
      DOM.setupPlayer2.value = 'User 2';
      DOM.setupPlayer1.disabled = false;
      DOM.setupPlayer2.disabled = false;
      DOM.matchRatedNo.checked = true;
      DOM.matchRatedYes.disabled = false;
      DOM.matchRatedNotice.textContent = 'Select Rated to calculate ELO when facing another registered player.';
    }

    DOM.modalMatchSetup.classList.add('active');
  }

  function closeMatchSetupModal() {
    DOM.modalMatchSetup.classList.remove('active');
  }

  // --- Tactical Game Controls ---
  function setupGameControls() {
    DOM.btnFlipBoard.addEventListener('click', () => {
      boardFlipped = !boardFlipped;
      renderBoard();
    });

    DOM.btnResign.addEventListener('click', () => {
      if (chess.isGameOver || isReviewMode) return;
      const turnName = chess.turn === 'w' ? currentMatch.whitePlayer.username : currentMatch.blackPlayer.username;
      const winnerName = chess.turn === 'w' ? currentMatch.blackPlayer.username : currentMatch.whitePlayer.username;

      if (confirm(`${turnName}, are you sure you want to resign the game?`)) {
        chess.resign(chess.turn);
        if (currentMatch.mode === 'room') {
          RoomChannel.sendResign(chess.turn);
        }
        handleMatchCompletion('Resignation', `${winnerName} wins by resignation.`);
      }
    });

    DOM.btnOfferDraw.addEventListener('click', () => {
      if (chess.isGameOver || isReviewMode) return;
      const turnName = chess.turn === 'w' ? currentMatch.whitePlayer.username : currentMatch.blackPlayer.username;
      const otherName = chess.turn === 'w' ? currentMatch.blackPlayer.username : currentMatch.whitePlayer.username;

      if (confirm(`${turnName} offers a draw. Does ${otherName} accept the draw?`)) {
        chess.draw('draw-agreement');
        if (currentMatch.mode === 'room') {
          RoomChannel.sendDrawOffer(chess.turn);
        }
        handleMatchCompletion('Draw Agreement', 'Game drawn by mutual agreement.');
      }
    });
  }

  // --- Online Room Channel Synchronization ---
  function setupRoomNetwork() {
    RoomChannel.onOpponentJoined = (msg) => {
      DOM.roomStatusBadge.textContent = 'IN GAME';
      DOM.roomStatusBadge.style.backgroundColor = 'var(--btn-green-bg)';
      currentMatch.blackPlayer = {
        id: msg.guestId,
        username: msg.guestName,
        currentElo: msg.guestElo,
        rank: msg.guestRank,
        profilePhoto: msg.guestPhoto,
        isGuest: msg.guestIsGuest
      };
      updateGameUI();
    };

    RoomChannel.onOpponentMove = (msg) => {
      if (currentMatch.mode === 'room' && !chess.isGameOver) {
        chess.makeMove(msg.from, msg.to, msg.promotion || 'Q');
        renderBoard();
        updateGameUI();

        if (chess.isGameOver) {
          handleMatchCompletion(chess.gameOverReason === 'checkmate' ? 'Checkmate' : 'Draw', 'Game finished.');
        }
      }
    };

    RoomChannel.onOpponentResign = (msg) => {
      if (currentMatch.mode === 'room' && !chess.isGameOver) {
        chess.resign(msg.color);
        const winner = msg.color === 'w' ? currentMatch.blackPlayer.username : currentMatch.whitePlayer.username;
        handleMatchCompletion('Resignation', `${winner} wins by opponent resignation.`);
      }
    };

    RoomChannel.onOpponentDrawOffer = () => {
      if (currentMatch.mode === 'room' && !chess.isGameOver) {
        if (confirm('Opponent offers a draw. Accept draw?')) {
          chess.draw('draw-agreement');
          handleMatchCompletion('Draw Agreement', 'Game drawn by mutual agreement.');
        }
      }
    };

    RoomChannel.onChatMessage = (msg) => {
      addRoomChatMessage(msg.senderName, msg.text);
    };

    // Voice chat toggle
    DOM.btnVoiceMicToggle.addEventListener('click', () => {
      voiceMicEnabled = !voiceMicEnabled;
      if (voiceMicEnabled) {
        DOM.iconVoiceMic.innerHTML = ChessSVGs.icons.micOn;
        DOM.voiceMicStatusText.textContent = 'MIC ON';
        DOM.btnVoiceMicToggle.className = 'btn btn-primary btn-sm';
      } else {
        DOM.iconVoiceMic.innerHTML = ChessSVGs.icons.micOff;
        DOM.voiceMicStatusText.textContent = 'MIC OFF';
        DOM.btnVoiceMicToggle.className = 'btn btn-secondary btn-sm';
      }
    });

    // In-room Chat Form
    DOM.formRoomChat.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = DOM.inputRoomChat.value.trim();
      if (!text) return;

      const myName = currentMatch.playerColor === 'w' ? currentMatch.whitePlayer.username : currentMatch.blackPlayer.username;
      RoomChannel.sendChat(myName, text);
      addRoomChatMessage(myName, text);
      DOM.inputRoomChat.value = '';
    });
  }

  function addRoomChatMessage(sender, text) {
    const row = document.createElement('div');
    row.className = 'room-chat-msg';

    const author = document.createElement('span');
    author.className = 'room-chat-author';
    author.textContent = `${sender}:`;

    const txt = document.createElement('span');
    txt.className = 'room-chat-text';
    txt.textContent = text;

    row.appendChild(author);
    row.appendChild(txt);
    DOM.roomChatScroll.appendChild(row);
    DOM.roomChatScroll.scrollTop = DOM.roomChatScroll.scrollHeight;
  }

  function launchRoomMatch(code, role = 'host') {
    const user = StorageService.getCurrentUser();
    const isGuest = !user;

    const hostPlayer = role === 'host' ?
      (user || { username: 'User 1', isGuest: true, currentElo: 0, rank: 'UNRANKED' }) :
      { username: 'Opponent', isGuest: false, currentElo: 1200, rank: 'GOLD III' };

    const guestPlayer = role === 'guest' ?
      (user || { username: 'User 2', isGuest: true, currentElo: 0, rank: 'UNRANKED' }) :
      { username: 'Waiting for player...', isGuest: true, currentElo: 0, rank: 'UNRANKED' };

    currentMatch = {
      mode: 'room',
      aiDifficulty: 'casual',
      playerColor: role === 'host' ? 'w' : 'b',
      whitePlayer: hostPlayer,
      blackPlayer: guestPlayer,
      isRated: !isGuest,
      isCompleted: false,
      roomCode: code
    };

    chess.reset();
    boardFlipped = role === 'guest';
    isReviewMode = false;
    DOM.reviewControlPanel.style.display = 'none';
    DOM.onlineRoomPanel.style.display = 'flex';
    DOM.roomCodeChip.textContent = `CODE: ${code}`;
    DOM.roomStatusBadge.textContent = role === 'host' ? 'WAITING FOR PLAYER' : 'IN GAME';
    DOM.roomChatScroll.innerHTML = '';

    window.location.hash = '#play';
  }

  // --- Game Review Mode & Move-by-Move Replay ---
  function setupReviewHandlers() {
    DOM.btnReplayFirst.addEventListener('click', () => {
      if (!isReviewMode) return;
      setReviewMoveIndex(-1);
    });

    DOM.btnReplayPrev.addEventListener('click', () => {
      if (!isReviewMode) return;
      setReviewMoveIndex(Math.max(-1, reviewMoveIndex - 1));
    });

    DOM.btnReplayNext.addEventListener('click', () => {
      if (!isReviewMode || !reviewGame) return;
      const maxIdx = (reviewGame.moves || []).length - 1;
      setReviewMoveIndex(Math.min(maxIdx, reviewMoveIndex + 1));
    });

    DOM.btnReplayLast.addEventListener('click', () => {
      if (!isReviewMode || !reviewGame) return;
      const maxIdx = (reviewGame.moves || []).length - 1;
      setReviewMoveIndex(maxIdx);
    });

    DOM.btnExitReview.addEventListener('click', () => {
      exitReviewMode();
    });
  }

  function startReviewMode(game) {
    if (!game) return;
    isReviewMode = true;
    reviewGame = game;
    reviewEngine = new ChessEngine();

    // Setup review match metadata
    currentMatch = {
      mode: 'review',
      aiDifficulty: 'casual',
      playerColor: 'w',
      whitePlayer: game.whitePlayer,
      blackPlayer: game.blackPlayer,
      isRated: game.rated,
      isCompleted: true,
      roomCode: null
    };

    DOM.reviewControlPanel.style.display = 'block';
    DOM.onlineRoomPanel.style.display = 'none';

    // Start at final move
    const totalMoves = (game.moves || []).length;
    setReviewMoveIndex(totalMoves - 1);
    window.location.hash = '#play';
  }

  function setReviewMoveIndex(targetIndex) {
    reviewMoveIndex = targetIndex;
    reviewEngine = new ChessEngine();
    const moves = reviewGame.moves || [];

    for (let i = 0; i <= targetIndex; i++) {
      const m = moves[i];
      if (m && m.from && m.to) {
        reviewEngine.makeMove(m.from, m.to, m.promotion || 'Q');
      }
    }

    const total = moves.length;
    if (targetIndex === -1) {
      DOM.reviewStepLabel.textContent = `Start Position (0 / ${total})`;
    } else {
      const curMove = moves[targetIndex];
      const san = curMove?.san || '';
      DOM.reviewStepLabel.textContent = `Move ${targetIndex + 1} / ${total} (${san})`;
    }

    renderReviewBoard();
    updateReviewGameUI();
  }

  function exitReviewMode() {
    isReviewMode = false;
    reviewGame = null;
    reviewEngine = null;
    DOM.reviewControlPanel.style.display = 'none';
    initDefaultMatch();
    renderBoard();
    updateGameUI();
  }

  function renderReviewBoard() {
    renderCoordinates();
    DOM.chessboard.innerHTML = '';

    const eng = reviewEngine || chess;
    const inCheck = eng.isInCheck(eng.turn);
    const kingPos = inCheck ? eng.findKing(eng.turn) : null;
    const moves = reviewGame.moves || [];
    const activeMove = reviewMoveIndex >= 0 ? moves[reviewMoveIndex] : null;

    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const r = boardFlipped ? 7 - displayRow : displayRow;
        const c = boardFlipped ? 7 - displayCol : displayCol;

        const square = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        square.className = `square ${isLight ? 'light' : 'dark'}`;
        const squareName = ChessEngine.toSquare(r, c);
        square.dataset.square = squareName;

        if (activeMove) {
          const fromSq = ChessEngine.toSquare(activeMove.from.row, activeMove.from.col);
          const toSq = ChessEngine.toSquare(activeMove.to.row, activeMove.to.col);
          if (squareName === fromSq || squareName === toSq) {
            square.classList.add('last-move');
          }
        }

        if (kingPos && kingPos.row === r && kingPos.col === c) {
          square.classList.add('in-check');
        }

        const piece = eng.getPiece(r, c);
        if (piece) {
          const pieceSvg = ChessSVGs.pieces[piece];
          if (pieceSvg) square.innerHTML = pieceSvg;
        }

        // Board is strictly READ-ONLY during review
        square.style.cursor = 'default';
        DOM.chessboard.appendChild(square);
      }
    }
  }

  function updateReviewGameUI() {
    DOM.matchTitleText.textContent = 'Game Review';
    DOM.matchModeBadge.textContent = reviewGame.rated ? 'Rated' : 'Unrated';
    DOM.matchModeBadge.className = `mode-badge ${reviewGame.rated ? 'rated' : ''}`;

    const w = reviewGame.whitePlayer;
    DOM.nameWhite.textContent = w ? w.username : 'User 1';
    renderAvatarElement(w, DOM.avatarWhite);

    if (w && !w.isGuest && reviewGame.rated) {
      DOM.rankEloRowWhite.style.display = 'flex';
      DOM.rankWhite.textContent = w.rank || 'UNRANKED';
      DOM.eloWhite.textContent = `${w.currentElo} ELO`;
    } else {
      DOM.rankEloRowWhite.style.display = 'none';
    }

    const b = reviewGame.blackPlayer;
    DOM.nameBlack.textContent = b ? b.username : 'User 2';
    renderAvatarElement(b, DOM.avatarBlack);

    if (b && !b.isGuest && reviewGame.rated) {
      DOM.rankEloRowBlack.style.display = 'flex';
      DOM.rankBlack.textContent = b.rank || 'UNRANKED';
      DOM.eloBlack.textContent = `${b.currentElo} ELO`;
    } else {
      DOM.rankEloRowBlack.style.display = 'none';
    }

    const eng = reviewEngine || chess;
    DOM.turnStatusBanner.className = 'turn-status-banner';
    DOM.turnStatusText.textContent = `Result: ${reviewGame.result} (${reviewGame.terminationReason || 'Ended'})`;

    renderReviewMoveHistory();
  }

  function renderReviewMoveHistory() {
    DOM.historyList.innerHTML = '';
    const moves = reviewGame.moves || [];

    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = moves[i];
      const bMove = moves[i + 1];

      const row = document.createElement('div');
      row.className = 'history-row';

      const numCol = document.createElement('span');
      numCol.className = 'move-num';
      numCol.textContent = `${moveNum}.`;

      const wCol = document.createElement('span');
      wCol.className = `move-w ${reviewMoveIndex === i ? 'selected-replay-move' : ''}`;
      wCol.textContent = wMove ? wMove.san : '';
      wCol.style.cursor = 'pointer';
      wCol.addEventListener('click', () => setReviewMoveIndex(i));

      const bCol = document.createElement('span');
      bCol.className = `move-b ${reviewMoveIndex === i + 1 ? 'selected-replay-move' : ''}`;
      bCol.textContent = bMove ? bMove.san : '';
      bCol.style.cursor = 'pointer';
      if (bMove) {
        bCol.addEventListener('click', () => setReviewMoveIndex(i + 1));
      }

      row.appendChild(numCol);
      row.appendChild(wCol);
      row.appendChild(bCol);
      DOM.historyList.appendChild(row);
    }
  }

  // --- Board Coordinate Rendering ---
  function renderCoordinates() {
    DOM.coordFiles.innerHTML = '';
    DOM.coordRanks.innerHTML = '';

    const files = boardFlipped ? ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a'] : ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = boardFlipped ? ['1', '2', '3', '4', '5', '6', '7', '8'] : ['8', '7', '6', '5', '4', '3', '2', '1'];

    files.forEach(f => {
      const span = document.createElement('span');
      span.textContent = f;
      DOM.coordFiles.appendChild(span);
    });

    ranks.forEach(r => {
      const span = document.createElement('span');
      span.textContent = r;
      DOM.coordRanks.appendChild(span);
    });
  }

  // --- Active Board Rendering ---
  function renderBoard() {
    if (isReviewMode) {
      renderReviewBoard();
      return;
    }

    renderCoordinates();
    DOM.chessboard.innerHTML = '';

    const inCheck = chess.isInCheck(chess.turn);
    const kingPos = inCheck ? chess.findKing(chess.turn) : null;
    const lastMove = chess.moveHistory.length > 0 ? chess.moveHistory[chess.moveHistory.length - 1] : null;

    for (let displayRow = 0; displayRow < 8; displayRow++) {
      for (let displayCol = 0; displayCol < 8; displayCol++) {
        const r = boardFlipped ? 7 - displayRow : displayRow;
        const c = boardFlipped ? 7 - displayCol : displayCol;

        const square = document.createElement('div');
        const isLight = (r + c) % 2 === 0;
        square.className = `square ${isLight ? 'light' : 'dark'}`;
        square.dataset.row = r;
        square.dataset.col = c;
        const squareName = ChessEngine.toSquare(r, c);
        square.dataset.square = squareName;

        if (selectedSquare && selectedSquare.row === r && selectedSquare.col === c) {
          square.classList.add('selected');
        }

        if (lastMove) {
          if (squareName === lastMove.fromSquare || squareName === lastMove.toSquare) {
            square.classList.add('last-move');
          }
        }

        if (kingPos && kingPos.row === r && kingPos.col === c) {
          square.classList.add('in-check');
        }

        const piece = chess.getPiece(r, c);
        if (piece) {
          const pieceSvg = ChessSVGs.pieces[piece];
          if (pieceSvg) square.innerHTML = pieceSvg;
        }

        const isLegalDest = legalMovesForSelected.some(m => m.to.row === r && m.to.col === c);
        if (isLegalDest) {
          const isCapture = piece !== null || (selectedSquare && chess.enPassant && chess.enPassant.targetRow === r && chess.enPassant.targetCol === c);
          const marker = document.createElement('div');
          marker.className = isCapture ? 'capture-marker' : 'move-marker';
          square.appendChild(marker);
        }

        // Click to move
        square.addEventListener('click', () => handleSquareClick(r, c));
        DOM.chessboard.appendChild(square);
      }
    }
  }

  // --- Click to Move Handling ---
  function handleSquareClick(row, col) {
    if (chess.isGameOver || isReviewMode) return;

    if (currentMatch.mode === 'solo' && chess.turn !== currentMatch.playerColor) {
      return;
    }
    if (currentMatch.mode === 'room' && chess.turn !== currentMatch.playerColor) {
      return;
    }

    const clickedPiece = chess.getPiece(row, col);
    const clickedColor = chess.getPieceColor(clickedPiece);

    if (!selectedSquare) {
      if (clickedPiece && clickedColor === chess.turn) {
        selectPiece(row, col);
      }
      return;
    }

    if (selectedSquare.row === row && selectedSquare.col === col) {
      deselectPiece();
      return;
    }

    const candidateMove = legalMovesForSelected.find(m => m.to.row === row && m.to.col === col);

    if (candidateMove) {
      if (candidateMove.promotion) {
        promptPawnPromotion(selectedSquare, { row, col });
        return;
      }
      executeMove(selectedSquare, { row, col });
      deselectPiece();
    } else if (clickedPiece && clickedColor === chess.turn) {
      selectPiece(row, col);
    } else {
      deselectPiece();
    }
  }

  function selectPiece(row, col) {
    selectedSquare = { row, col };
    legalMovesForSelected = chess.getLegalMovesForSquare(row, col);
    renderBoard();
  }

  function deselectPiece() {
    selectedSquare = null;
    legalMovesForSelected = [];
    renderBoard();
  }

  // --- Pawn Promotion Modal ---
  function promptPawnPromotion(from, to) {
    pendingPromotionMove = { from, to };
    DOM.promotionOptions.innerHTML = '';

    const color = chess.turn;
    const pieces = ['Q', 'R', 'B', 'N'];
    const names = { Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };

    pieces.forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'promo-btn';
      btn.innerHTML = `${ChessSVGs.pieces[color + p]}<span>${names[p]}</span>`;
      btn.addEventListener('click', () => {
        DOM.modalPromotion.classList.remove('active');
        if (pendingPromotionMove) {
          executeMove(pendingPromotionMove.from, pendingPromotionMove.to, p);
          pendingPromotionMove = null;
          deselectPiece();
        }
      });
      DOM.promotionOptions.appendChild(btn);
    });

    DOM.modalPromotion.classList.add('active');
  }

  // --- Execute Move & Audio ---
  function executeMove(from, to, promotion = 'Q') {
    const moveRecord = chess.makeMove(from, to, promotion);
    if (!moveRecord) return;

    if (currentMatch.mode === 'room') {
      RoomChannel.sendMove(from, to, promotion);
    }

    if (chess.isGameOver) {
      SoundFX.playVictory();
    } else if (chess.isInCheck(chess.turn)) {
      SoundFX.playCheck();
    } else if (moveRecord.captured) {
      SoundFX.playCapture();
    } else {
      SoundFX.playMove();
    }

    renderBoard();
    updateGameUI();

    // Check game termination: CHECKMATE MUST IMMEDIATELY END GAME AND DISABLE BOARD
    if (chess.isGameOver) {
      let reasonType = 'Checkmate';
      let desc = '';
      if (chess.gameOverReason === 'checkmate') {
        reasonType = 'Checkmate';
        const winner = chess.turn === 'w' ? currentMatch.blackPlayer.username : currentMatch.whitePlayer.username;
        desc = `${winner} wins by checkmate!`;
      } else if (chess.gameOverReason === 'stalemate') {
        reasonType = 'Stalemate';
        desc = 'Game drawn by stalemate.';
      } else if (chess.gameOverReason === 'insufficient-material') {
        reasonType = 'Insufficient Material';
        desc = 'Game drawn due to insufficient material.';
      } else if (chess.gameOverReason === '50-move-rule') {
        reasonType = '50-Move Rule';
        desc = 'Game drawn by 50-move rule.';
      }
      handleMatchCompletion(reasonType, desc);
      return;
    }

    if (currentMatch.mode === 'solo' && chess.turn !== currentMatch.playerColor) {
      setTimeout(makeComputerMove, 350);
    }
  }

  function makeComputerMove() {
    if (chess.isGameOver || currentMatch.mode !== 'solo') return;

    const bestMove = chess.getBestMove(currentMatch.aiDifficulty);
    if (bestMove) {
      executeMove(bestMove.from, bestMove.to, bestMove.promotion || 'Q');
    }
  }

  // --- Match Completion, Game Over Screen, and Record Saving ---
  function handleMatchCompletion(reasonType, reasonDescription) {
    if (currentMatch.isCompleted) return;
    currentMatch.isCompleted = true;

    // Immediately disable the chessboard
    selectedSquare = null;
    legalMovesForSelected = [];

    const result = chess.gameResult;
    const movesList = chess.moveHistory.map(m => ({
      from: m.from,
      to: m.to,
      san: m.san,
      piece: m.piece,
      promotion: m.promotion
    }));

    const matchDetails = {
      isRated: currentMatch.isRated,
      terminationReason: reasonType,
      moves: movesList,
      moveCount: movesList.length,
      duration: Math.round(movesList.length * 15)
    };

    const outcome = StorageService.recordMatchOutcome(
      currentMatch.whitePlayer,
      currentMatch.blackPlayer,
      result,
      matchDetails
    );

    // Populate Game Over Modal
    DOM.gameOverTitle.textContent = reasonType.toUpperCase();
    DOM.gameOverReasonText.textContent = reasonDescription;

    let winnerBannerText = 'MATCH DRAW';
    if (result === '1-0') {
      winnerBannerText = `${currentMatch.whitePlayer.username.toUpperCase()} WINS`;
    } else if (result === '0-1') {
      winnerBannerText = `${currentMatch.blackPlayer.username.toUpperCase()} WINS`;
    }
    DOM.gameOverWinnerBanner.textContent = winnerBannerText;

    if (currentMatch.isRated && outcome.eloResults) {
      DOM.gameOverEloCard.style.display = 'flex';
      const wRes = outcome.eloResults.white;
      const bRes = outcome.eloResults.black;

      DOM.eloChangeWhiteName.textContent = currentMatch.whitePlayer.username;
      DOM.eloChangeWhiteVal.textContent = (wRes.change >= 0 ? '+' : '') + wRes.change;
      DOM.eloChangeWhiteVal.className = `elo-change-val ${wRes.change > 0 ? 'gain' : wRes.change < 0 ? 'loss' : 'neutral'}`;
      DOM.eloAfterWhite.textContent = `${wRes.newRating} ELO`;
      DOM.rankAfterWhite.textContent = RankSystem.getRank(wRes.newRating, true);

      DOM.eloChangeBlackName.textContent = currentMatch.blackPlayer.username;
      DOM.eloChangeBlackVal.textContent = (bRes.change >= 0 ? '+' : '') + bRes.change;
      DOM.eloChangeBlackVal.className = `elo-change-val ${bRes.change > 0 ? 'gain' : bRes.change < 0 ? 'loss' : 'neutral'}`;
      DOM.eloAfterBlack.textContent = `${bRes.newRating} ELO`;
      DOM.rankAfterBlack.textContent = RankSystem.getRank(bRes.newRating, true);
    } else {
      DOM.gameOverEloCard.style.display = 'none';
    }

    DOM.modalGameOver.classList.add('active');

    renderHeaderUser();
    renderLeaderboard();
    renderProfileView();
    updateGameUI();
  }

  // --- Update Game Screen UI Panels ---
  function updateGameUI() {
    if (isReviewMode) {
      updateReviewGameUI();
      return;
    }

    let modeText = 'Local 2 Player';
    if (currentMatch.mode === 'solo') modeText = `Solo vs AI (${currentMatch.aiDifficulty})`;
    if (currentMatch.mode === 'room') modeText = 'Online Room';
    DOM.matchTitleText.textContent = modeText;

    DOM.matchModeBadge.textContent = currentMatch.isRated ? 'Rated' : 'Unrated';
    DOM.matchModeBadge.className = `mode-badge ${currentMatch.isRated ? 'rated' : ''}`;

    const whiteUser = currentMatch.whitePlayer;
    DOM.nameWhite.textContent = whiteUser ? whiteUser.username : 'User 1';
    renderAvatarElement(whiteUser, DOM.avatarWhite);

    if (whiteUser && !whiteUser.isGuest && currentMatch.isRated) {
      DOM.rankEloRowWhite.style.display = 'flex';
      DOM.rankWhite.textContent = whiteUser.rank || 'UNRANKED';
      DOM.eloWhite.textContent = `${whiteUser.currentElo} ELO`;
    } else {
      DOM.rankEloRowWhite.style.display = 'none';
    }

    const blackUser = currentMatch.blackPlayer;
    DOM.nameBlack.textContent = blackUser ? blackUser.username : 'User 2';
    renderAvatarElement(blackUser, DOM.avatarBlack);

    if (blackUser && !blackUser.isGuest && currentMatch.isRated) {
      DOM.rankEloRowBlack.style.display = 'flex';
      DOM.rankBlack.textContent = blackUser.rank || 'UNRANKED';
      DOM.eloBlack.textContent = `${blackUser.currentElo} ELO`;
    } else {
      DOM.rankEloRowBlack.style.display = 'none';
    }

    if (chess.turn === 'w') {
      DOM.cardPlayerWhite.classList.add('active-turn');
      DOM.cardPlayerBlack.classList.remove('active-turn');
    } else {
      DOM.cardPlayerWhite.classList.remove('active-turn');
      DOM.cardPlayerBlack.classList.add('active-turn');
    }

    const isCheck = chess.isInCheck(chess.turn);
    if (chess.isGameOver) {
      DOM.turnStatusBanner.className = 'turn-status-banner';
      DOM.turnStatusText.textContent = `Game Over (${chess.gameResult})`;
    } else if (isCheck) {
      DOM.turnStatusBanner.className = 'turn-status-banner alert-check';
      DOM.turnStatusText.textContent = `${chess.turn === 'w' ? whiteUser.username : blackUser.username} is in CHECK!`;
    } else {
      DOM.turnStatusBanner.className = 'turn-status-banner';
      DOM.turnStatusText.textContent = `${chess.turn === 'w' ? whiteUser.username : blackUser.username} to move`;
    }

    renderCapturedPieces();
    renderMoveHistory();
  }

  function renderCapturedPieces() {
    DOM.capturedByWhite.innerHTML = '';
    DOM.capturedByBlack.innerHTML = '';

    const material = chess.getMaterialBalance();

    chess.capturedPieces.w.forEach(piece => {
      const mini = document.createElement('div');
      mini.className = 'captured-mini-piece';
      mini.innerHTML = ChessSVGs.pieces[piece];
      DOM.capturedByWhite.appendChild(mini);
    });

    if (material.diff > 0) {
      const diffSpan = document.createElement('span');
      diffSpan.className = 'captured-score-diff';
      diffSpan.textContent = `+${material.diff}`;
      DOM.capturedByWhite.appendChild(diffSpan);
    }

    chess.capturedPieces.b.forEach(piece => {
      const mini = document.createElement('div');
      mini.className = 'captured-mini-piece';
      mini.innerHTML = ChessSVGs.pieces[piece];
      DOM.capturedByBlack.appendChild(mini);
    });

    if (material.diff < 0) {
      const diffSpan = document.createElement('span');
      diffSpan.className = 'captured-score-diff';
      diffSpan.textContent = `+${Math.abs(material.diff)}`;
      DOM.capturedByBlack.appendChild(diffSpan);
    }
  }

  function renderMoveHistory() {
    DOM.historyList.innerHTML = '';
    const moves = chess.moveHistory;

    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const wMove = moves[i];
      const bMove = moves[i + 1];

      const row = document.createElement('div');
      row.className = 'history-row';
      if (i + 1 >= moves.length - 1) {
        row.classList.add('latest');
      }

      const numCol = document.createElement('span');
      numCol.className = 'move-num';
      numCol.textContent = `${moveNum}.`;

      const wCol = document.createElement('span');
      wCol.className = 'move-w';
      wCol.textContent = wMove ? wMove.san : '';

      const bCol = document.createElement('span');
      bCol.className = 'move-b';
      bCol.textContent = bMove ? bMove.san : '';

      row.appendChild(numCol);
      row.appendChild(wCol);
      row.appendChild(bCol);

      DOM.historyList.appendChild(row);
    }

    DOM.historyList.scrollTop = DOM.historyList.scrollHeight;
  }

  // --- Clean Validation Message Helpers ---
  function showValidation(element, msg, type = 'error') {
    element.textContent = msg;
    element.className = `form-validation-msg ${type}`;
    element.style.display = 'block';
  }

  function hideValidation(element) {
    element.style.display = 'none';
    element.textContent = '';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
