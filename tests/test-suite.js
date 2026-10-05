/**
 * Test Suite for ChessGames
 * Validates chess engine rules, RankSystem, 0 ELO unranked lifecycle,
 * social search, friends vs followers separation, online rooms, and game history.
 * ZERO emojis used anywhere.
 */

// Mock localStorage for Node.js environment
const store = {};
global.localStorage = {
  getItem: (key) => store[key] || null,
  setItem: (key, val) => { store[key] = String(val); },
  removeItem: (key) => { delete store[key]; },
  clear: () => { for (const k in store) delete store[k]; }
};

// Load dependencies
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock window and BroadcastChannel for Node.js environment
global.window = {
  addEventListener: () => {},
  location: { hash: '' }
};
global.BroadcastChannel = class {
  constructor(name) { this.name = name; }
  postMessage() {}
};

vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/pieces.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/elo.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/chess-engine.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/services.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8'));
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../js/room-channel.js'), 'utf8'));

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`[PASS] ${testName}`);
  } else {
    failed++;
    console.error(`[FAIL] ${testName}`);
  }
}

console.log('--- TEST RUN START ---');

// 1. Rank System & Tiers
console.log('\n--- 1. Rank System & Tiers ---');
assert(RankSystem.getRank(0, false) === 'UNRANKED', '0 ELO or unranked status returns UNRANKED');
assert(RankSystem.getRank(1850, true) === 'DIAMOND III', '1850 ELO returns DIAMOND III');
assert(RankSystem.getRank(1650, true) === 'DIAMOND I', '1650 ELO returns DIAMOND I');
assert(RankSystem.getRank(1480, true) === 'PLATINUM II', '1480 ELO returns PLATINUM II');
assert(RankSystem.getRank(1340, true) === 'GOLD III', '1340 ELO returns GOLD III');
assert(RankSystem.getRank(1180, true) === 'SILVER III', '1180 ELO returns SILVER III');
assert(RankSystem.getRank(850, true) === 'BRONZE III', '850 ELO returns BRONZE III');

// 2. Elo Rating System & Provisional Placement
console.log('\n--- 2. Elo Rating System & Provisional Placement ---');
// Unranked 0 ELO player completes first rated game
const firstWin = EloSystem.calculateRating(0, 1200, 1, true);
assert(firstWin.newRating === 1340 && firstWin.isProvisional === true, 'First rated game WIN assigns 1340 initial rating (GOLD III)');

const firstDraw = EloSystem.calculateRating(0, 1200, 0.5, true);
assert(firstDraw.newRating === 1200 && firstDraw.isProvisional === true, 'First rated game DRAW assigns 1200 initial rating');

const firstLoss = EloSystem.calculateRating(0, 1200, 0, true);
assert(firstLoss.newRating === 1180 && firstLoss.isProvisional === true, 'First rated game LOSS assigns 1180 initial rating');

// Standard match calculation between rated players
const standardRes = EloSystem.processMatchResult(1340, 1340, '1-0', false, false);
assert(standardRes.white.change === 16 && standardRes.white.newRating === 1356, '1340 vs 1340 Win gives +16 (1356)');
assert(standardRes.black.change === -16 && standardRes.black.newRating === 1324, '1340 vs 1340 Loss gives -16 (1324)');

// 3. Chess Engine - Movements & Rules
console.log('\n--- 3. Chess Engine Rules & Movements ---');
const game = new ChessEngine();
assert(game.turn === 'w', 'Initial turn is White');

const e4Move = game.makeMove('e2', 'e4');
assert(e4Move !== null && e4Move.san === 'e4', '1. e4 move valid');
assert(game.turn === 'b', 'Turn switches to Black');

const e5Move = game.makeMove('e7', 'e5');
assert(e5Move !== null && e5Move.san === 'e5', '1... e5 move valid');
assert(game.turn === 'w', 'Turn switches to White');

// Illegal moves blocked
assert(game.makeMove('e4', 'e6') === null, 'Pawn cannot jump 2 squares from non-starting row');
assert(game.makeMove('a1', 'a5') === null, 'Rook cannot jump over pawn on a2');

// Knight leap
const nf3 = game.makeMove('g1', 'f3');
assert(nf3 !== null && nf3.san === 'Nf3', 'Knight can jump over pieces (Nf3)');

// 4. Fool's Mate Checkmate
console.log('\n--- 4. Fool\'s Mate Checkmate Detection ---');
const foolsGame = new ChessEngine();
foolsGame.makeMove('f2', 'f3');
foolsGame.makeMove('e7', 'e5');
foolsGame.makeMove('g2', 'g4');
const mateMove = foolsGame.makeMove('d8', 'h4');
assert(mateMove !== null && mateMove.san.includes('#'), 'Fool\'s Mate detected in SAN (#)');
assert(foolsGame.isGameOver === true, 'Game is marked as over');
assert(foolsGame.gameOverReason === 'checkmate', 'Game over reason is checkmate');
assert(foolsGame.gameResult === '0-1', 'Game result is Black wins (0-1)');

// 5. Castling Validation
console.log('\n--- 5. Castling Validation ---');
const castleGame = new ChessEngine();
castleGame.makeMove('e2', 'e4');
castleGame.makeMove('e7', 'e5');
castleGame.makeMove('g1', 'f3');
castleGame.makeMove('b8', 'c6');
castleGame.makeMove('f1', 'e2');
castleGame.makeMove('g8', 'f6');
const castleMove = castleGame.makeMove('e1', 'g1');
assert(castleMove !== null && castleMove.san === 'O-O', 'Kingside castling O-O executed cleanly');
assert(castleGame.getPiece(7, 6) === 'wK', 'White King now on g1');
assert(castleGame.getPiece(7, 5) === 'wR', 'White Rook now on f1');

// 6. En Passant Validation
console.log('\n--- 6. En Passant Validation ---');
const epGame = new ChessEngine();
epGame.makeMove('e2', 'e4');
epGame.makeMove('a7', 'a6');
epGame.makeMove('e4', 'e5');
epGame.makeMove('d7', 'd5');
assert(epGame.enPassant !== null, 'En passant target square created');
const epMove = epGame.makeMove('e5', 'd6');
assert(epMove !== null && epMove.san === 'exd6', 'En passant move executed');
assert(epGame.getPiece(3, 3) === null, 'Captured black pawn on d5 removed');

// 7. Pawn Promotion
console.log('\n--- 7. Pawn Promotion Validation ---');
const promoGame = new ChessEngine();
for (let r = 0; r < 8; r++) {
  for (let c = 0; c < 8; c++) promoGame.board[r][c] = null;
}
promoGame.board[1][4] = 'wP'; // e7
promoGame.board[0][0] = 'bK'; // a8
promoGame.board[7][0] = 'wK'; // a1
promoGame.turn = 'w';
const promoMove = promoGame.makeMove('e7', 'e8', 'Q');
assert(promoMove !== null && promoMove.san.includes('=Q'), 'Pawn promoted to Queen');
assert(promoGame.getPiece(0, 4) === 'wQ', 'Square e8 has wQ');

// 8. Storage, 0 ELO Unranked Registration
console.log('\n--- 8. Storage & Account Lifecycle ---');
StorageService.init();
assert(StorageService.getAllAccounts().length === 0, 'Storage starts with 0 registered accounts');

// Registration: requirement is that new user starts at 0 ELO and UNRANKED
const regRes = StorageService.register('Alice_Chess', 'pass1234');
assert(regRes.success === true, 'User registration succeeds');
assert(regRes.user.currentElo === 0, 'New user starting ELO is 0');
assert(regRes.user.rank === 'UNRANKED', 'New user starting rank is UNRANKED');
assert(regRes.user.isRanked === false, 'New user starts as unranked (isRanked = false)');
assert(regRes.user.lifetimeWins === 0, 'New user starting lifetime wins is 0');

// Duplicate username prevented
const dupRes = StorageService.register('alice_chess', 'pass1234');
assert(dupRes.success === false, 'Duplicate username registration blocked');

// Login
const loginRes = StorageService.login('Alice_Chess', 'pass1234');
assert(loginRes.success === true && loginRes.user.id === regRes.user.id, 'User login succeeds');

// 9. First Rated Game Placement & Game History Saving
console.log('\n--- 9. First Rated Game Placement & Game History ---');
const oppReg = StorageService.register('Tactician99', 'pass1234');
const opponentUser = oppReg.user;
opponentUser.currentElo = 1180;
opponentUser.isRanked = true;
opponentUser.rank = 'SILVER I';
const accs1 = StorageService.getAllAccounts();
const idx1 = accs1.findIndex(a => a.id === opponentUser.id);
if (idx1 !== -1) accs1[idx1] = opponentUser;
StorageService.saveAccounts(accs1);

const aliceUser = StorageService.findAccountByUsername('Alice_Chess');

const matchOutcome = StorageService.recordMatchOutcome(
  aliceUser,
  opponentUser,
  '1-0',
  { isRated: true, terminationReason: 'Checkmate', moves: [{ san: 'e4' }], moveCount: 1 }
);

const refreshedAlice = StorageService.findAccountById(aliceUser.id);
assert(refreshedAlice.isRanked === true, 'Alice is now ranked after completing first rated game');
assert(refreshedAlice.currentElo === 1340, `Alice receives initial rating of 1340 (actual: ${refreshedAlice.currentElo})`);
assert(refreshedAlice.rank === 'GOLD III', `Alice rank updated to GOLD III based on 1340 ELO (actual: ${refreshedAlice.rank})`);
assert(refreshedAlice.wins === 1, 'Alice season wins incremented to 1');
assert(refreshedAlice.lifetimeWins === 1, 'Alice lifetime wins incremented to 1');

// Game history verification
const recentGames = StorageService.getRecentGames(aliceUser.id);
assert(recentGames.length >= 1, 'Completed game recorded to game history');
assert(recentGames[0].winner === 'Alice_Chess', 'Game winner recorded correctly');
assert(recentGames[0].rated === true, 'Game marked as rated');

// 10. Social System: Separate Friends vs Followers & Player Search
console.log('\n--- 10. Social System & Player Search ---');
const ratikaReg = StorageService.register('Ratika', 'pass1234');
const ratika = ratikaReg.user;
ratika.currentElo = 1340;
ratika.isRanked = true;
ratika.rank = 'GOLD III';
const accs2 = StorageService.getAllAccounts();
const idx2 = accs2.findIndex(a => a.id === ratika.id);
if (idx2 !== -1) accs2[idx2] = ratika;
StorageService.saveAccounts(accs2);

// Search registered players
const searchRes = StorageService.searchUsers('ratika');
assert(searchRes.length >= 1 && searchRes[0].username === 'Ratika', 'Player search finds Ratika');
assert(searchRes[0].rank === 'GOLD III', 'Search result includes player rank');

// Follow & Unfollow (separate from friend)
StorageService.followUser(aliceUser.id, ratika.id);
assert(StorageService.isFollowing(aliceUser.id, ratika.id) === true, 'Alice is now following Ratika');
assert(StorageService.isFriend(aliceUser.id, ratika.id) === false, 'Following Ratika does NOT make them a friend');

StorageService.unfollowUser(aliceUser.id, ratika.id);
assert(StorageService.isFollowing(aliceUser.id, ratika.id) === false, 'Alice unfollowed Ratika');

// Add & Remove Friend
StorageService.addFriend(aliceUser.id, ratika.id);
assert(StorageService.isFriend(aliceUser.id, ratika.id) === true, 'Alice and Ratika are now friends');
StorageService.removeFriend(aliceUser.id, ratika.id);
assert(StorageService.isFriend(aliceUser.id, ratika.id) === false, 'Friend successfully removed');

// 11. Online Room Channel (5-character room code)
console.log('\n--- 11. Online Room Channel ---');
const room = RoomChannel.createRoom(aliceUser);
assert(/^[A-Z0-9]{5}$/.test(room.code), `Room code is 5 alphanumeric uppercase characters (${room.code})`);
assert(room.status === 'waiting', 'Created room status is waiting');

const joinRes = RoomChannel.joinRoom(room.code, ratika);
assert(joinRes.success === true, 'Opponent joins room with 5-character code');
assert(joinRes.room.status === 'playing', 'Room status transitions to playing');

// 12. 90-Day Season Reset & Account Preservation
console.log('\n--- 12. 90-Day Season Reset ---');
const seasonBefore = StorageService.getSeason();
const rotateRes = StorageService.forceRotateSeason();
assert(rotateRes.rotated === true, 'Season rotation triggered');
assert(rotateRes.season.seasonId === seasonBefore.seasonId + 1, `Season advanced to Season ${rotateRes.season.seasonId}`);

// Check that Alice's account was preserved and seasonal rating reset to 0 UNRANKED
const aliceAfterSeason = StorageService.findAccountById(aliceUser.id);
assert(aliceAfterSeason !== null, 'Account preserved across seasons');
assert(aliceAfterSeason.currentElo === 0, 'Seasonal ELO reset to 0');
assert(aliceAfterSeason.rank === 'UNRANKED', 'Seasonal rank reset to UNRANKED');
assert(aliceAfterSeason.lifetimeWins === 1, 'Lifetime wins preserved (1)');

// 13. Persistent Service Layer Architecture
console.log('\n--- 13. Persistent Service Layer Architecture ---');
assert(typeof AuthService !== 'undefined' && typeof AuthService.register === 'function', 'AuthService is defined with register/login/logout');
assert(typeof UserService !== 'undefined' && typeof UserService.getProfile === 'function', 'UserService is defined with getProfile/searchUsers');
assert(typeof GameService !== 'undefined' && typeof GameService.recordGame === 'function', 'GameService is defined with recordGame/getRecentGames');
assert(typeof EloService !== 'undefined' && typeof EloService.getRank === 'function', 'EloService is defined with getRank/calculateRating');
assert(typeof SeasonService !== 'undefined' && typeof SeasonService.getCurrentSeason === 'function', 'SeasonService is defined with getCurrentSeason/getLeaderboard');
assert(typeof FriendService !== 'undefined' && typeof FriendService.getFriends === 'function', 'FriendService is defined with getFriends/addFriend');
assert(typeof FollowService !== 'undefined' && typeof FollowService.getFollowing === 'function', 'FollowService is defined with getFollowing/follow');
assert(typeof MessageService !== 'undefined' && typeof MessageService.getConversation === 'function', 'MessageService is defined with getConversation/sendMessage');
assert(typeof RoomService !== 'undefined' && typeof RoomService.createRoom === 'function', 'RoomService is defined with createRoom/joinRoom');

// Validate EloService integration
assert(EloService.getRank(1340, true) === 'GOLD III', 'EloService returns GOLD III for 1340 ELO');
assert(EloService.getRank(0, false) === 'UNRANKED', 'EloService returns UNRANKED for 0 ELO');
const testProv = EloService.calculateRating(0, 1200, 1, true);
assert(testProv.newRating === 1340 && testProv.isProvisional === true, 'EloService provisional placement awards 1340 on win');

// Validate AuthService session management
AuthService.setSession({ userId: 'acc_test_user', username: 'TestUser', elo: 1250, rank: 'GOLD I' });
const sessionUser = AuthService.getCurrentUser();
assert(sessionUser !== null && sessionUser.username === 'TestUser', 'AuthService manages current session user');
assert(sessionUser.currentElo === 1250 && sessionUser.id === 'acc_test_user', 'AuthService normalizes id and currentElo fields');
AuthService.logout();
assert(AuthService.getCurrentUser() === null, 'AuthService logout clears session');

console.log('\n=============================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('=============================================');

if (failed > 0) process.exit(1);
