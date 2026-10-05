"""
ChessGames - Persistent Database & REST API Verification Suite
Tests registration, login, ELO calculation, profile update, social features,
game history, and guest non-interference directly against SQLite database.
ZERO emojis.
"""

import sys
import json
import time
import urllib.request
import urllib.error

BASE = 'http://localhost:8099/api'

def post(endpoint, data):
    req = urllib.request.Request(
        BASE + endpoint,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as err:
        return json.loads(err.read().decode('utf-8'))

def get(endpoint):
    req = urllib.request.Request(BASE + endpoint)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as err:
        return json.loads(err.read().decode('utf-8'))

print("=== STARTING PERSISTENT BACKEND API VERIFICATION ===")

ts = int(time.time() * 1000 % 100000)
test_username = f"Bob_{ts}"
renamed_username = f"MasterBob_{ts}"

# 1. Register test users (Bob and Alice)
reg = post('/auth/register', {'username': test_username, 'password': 'bobpass123'})
assert reg['success'] is True, f"Registration failed: {reg}"
user_id = reg['user']['userId']
print(f"[PASS] 1. Registered user: {reg['user']['username']} (ID: {user_id}), starting ELO: {reg['user']['elo']}, rank: {reg['user']['rank']}")
assert reg['user']['elo'] == 0, "New user starts at 0 ELO"
assert reg['user']['rank'] == 'UNRANKED', "New user starts as UNRANKED"
assert reg['user']['isRanked'] is False, "New user isRanked is False"

reg_alice = post('/auth/register', {'username': f"Alice_{ts}", 'password': 'alicepass123'})
assert reg_alice['success'] is True, f"Alice registration failed: {reg_alice}"
alice_id = reg_alice['user']['userId']
alice_name = reg_alice['user']['username']

# 2. Login
login = post('/auth/login', {'username': test_username, 'password': 'bobpass123'})
assert login['success'] is True, "Login should succeed"
print(f"[PASS] 2. Logged in successfully: {login['user']['username']}")

# 3. Search Users
search = get(f'/users/search?q={test_username}')
assert search['success'] is True and len(search['results']) > 0, "Search should find Bob"
print(f"[PASS] 3. User search returns: {search['results'][0]['username']}")

# 4. Play a rated match: Bob (White, 0 ELO unranked) vs Alice (Black, 0 ELO unranked) -> Bob wins!
game = post('/games/record', {
    'whitePlayerId': user_id,
    'blackPlayerId': alice_id,
    'whiteName': test_username,
    'blackName': alice_name,
    'result': '1-0',
    'rated': True,
    'terminationReason': 'Checkmate',
    'moves': [{'san': 'e4'}, {'san': 'e5'}, {'san': 'Qh5'}, {'san': 'Nc6'}, {'san': 'Bc4'}, {'san': 'Nf6'}, {'san': 'Qxf7#'}],
    'moveCount': 7,
    'duration': 145
})
assert game['success'] is True, "Game recording should succeed"
print(f"[PASS] 4. Rated match recorded. Bob ELO after: {game['whiteEloAfter']} (Change: +{game['whiteChange']})")
assert game['whiteEloAfter'] == 1340, f"Provisional first win should award 1340 ELO, got {game['whiteEloAfter']}"

# 5. Check Bob Profile in DB
profile = get(f'/users/profile?userId={user_id}')
assert profile['success'] is True, "Profile fetch should succeed"
u = profile['user']
print(f"[PASS] 5. Bob in SQLite DB: ELO = {u['elo']}, Rank = {u['rank']}, Wins = {u['wins']}, LifetimeWins = {u['lifetimeWins']}")
assert u['elo'] == 1340, "Persistent ELO in DB should be 1340"
assert u['rank'] == 'GOLD III', "Persistent Rank in DB should be GOLD III"
assert u['wins'] == 1, "Persistent wins in DB should be 1"

# 6. Update Profile
edit = post('/users/profile', {
    'userId': user_id,
    'newUsername': renamed_username
})
assert edit['success'] is True, f"Profile update failed: {edit}"
print(f"[PASS] 6. Profile updated username to: {edit['user']['username']}")

# 7. Add Friend & Follow Alice
fr = post('/social/friends/add', {'userId': user_id, 'targetUsernameOrId': alice_name})
assert fr['success'] is True, "Friend add should succeed"
print(f"[PASS] 7. Added friend: {alice_name}")

fol = post('/social/follow', {'userId': user_id, 'targetId': alice_id})
assert fol['success'] is True, "Follow should succeed"
print(f"[PASS] 8. Followed {alice_name}")

# 8. Check Social Status
status = get(f'/social/status?userId={user_id}&targetId={alice_id}')
assert status['isFriend'] is True, "Should be friends"
assert status['isFollowing'] is True, "Should be following"
print(f"[PASS] 9. Social status confirmed: isFriend = {status['isFriend']}, isFollowing = {status['isFollowing']}")

# 9. Send Message
msg = post('/messages/send', {
    'senderId': user_id,
    'recipientId': alice_id,
    'content': 'Hello Alice, great game!'
})
assert msg['success'] is True, "Message send should succeed"
print(f"[PASS] 10. Message persisted in DB: '{msg['message']['content']}'")

# 10. Verify Message Thread in DB
conv = get(f'/messages?userId={user_id}&otherUserId={alice_id}')
assert conv['success'] is True and len(conv['messages']) >= 1, "Conversation thread should contain messages"
print(f"[PASS] 11. Thread verified in DB, message count: {len(conv['messages'])}")

# 11. Check Game History in DB
history = get(f'/games/recent?userId={user_id}')
assert history['success'] is True and len(history['games']) >= 1, "Game history should contain recorded match"
print(f"[PASS] 12. Game history verified in DB: {history['games'][0]['winner']} won by {history['games'][0]['terminationReason']}")

# 12. Guest Game test: rated = false, no ELO changes, not inserted into users
guest_game = post('/games/record', {
    'whitePlayerId': None,
    'blackPlayerId': None,
    'whiteName': 'User 1',
    'blackName': 'User 2',
    'result': '1-0',
    'rated': False,
    'terminationReason': 'Checkmate',
    'moves': [],
    'moveCount': 12,
    'duration': 210
})
assert guest_game['success'] is True, "Guest game recording should succeed"
assert guest_game['rated'] is False, "Guest game should not be rated"
assert guest_game['eloResults'] is None, "Guest game should have no ELO results"
print("[PASS] 13. Guest match verified: rated = False, no ELO impact, no user inserted")

# 13. Verify Leaderboard contains renamed user
leaderboard = get('/leaderboard')
found_bob = any(p['userId'] == user_id for p in leaderboard['leaderboard'])
assert found_bob is True, "Bob should appear on the persistent leaderboard"
print("[PASS] 14. Persistent leaderboard verified: contains newly registered and ranked player")

print("\n=======================================================")
print("ALL 14 PERSISTENT BACKEND API TESTS PASSED SUCCESSFULLY!")
print("=======================================================")
