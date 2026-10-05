"""
ChessGames - Persistent Backend Server & REST API
Built with Python 3 standard library (http.server + sqlite3).
Zero external dependencies required.
Serves static frontend assets AND real persistent SQLite REST API under /api/.
STRICT: ZERO EMOJIS ANYWHERE.
"""

import os
import sys
import json
import time
import math
import mimetypes
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Import database module
from database import get_connection, init_db, DB_PATH, SEASON_DURATION_MS

PORT = 8099
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Rank tiers matching frontend exactly
RANK_TIERS = [
    ('DIAMOND III', 1800),
    ('DIAMOND II', 1700),
    ('DIAMOND I', 1600),
    ('PLATINUM III', 1533),
    ('PLATINUM II', 1466),
    ('PLATINUM I', 1400),
    ('GOLD III', 1333),
    ('GOLD II', 1266),
    ('GOLD I', 1200),
    ('SILVER III', 1133),
    ('SILVER II', 1066),
    ('SILVER I', 1000),
    ('BRONZE III', 700),
    ('BRONZE II', 400),
    ('BRONZE I', 100)
]

def calculate_rank(elo, is_ranked=True):
    if not is_ranked or not elo or elo <= 0:
        return 'UNRANKED'
    for name, min_elo in RANK_TIERS:
        if elo >= min_elo:
            return name
    return 'BRONZE I'

def get_expected_score(rating_a, rating_b):
    return 1.0 / (1.0 + math.pow(10.0, (rating_b - rating_a) / 400.0))

def calculate_elo_change(current_rating, opponent_rating, actual_score, is_provisional=False, k=32):
    if is_provisional or current_rating <= 0:
        if actual_score == 1.0:
            init_rating = 1340
        elif actual_score == 0.5:
            init_rating = 1200
        else:
            init_rating = 1180
        return {
            'newRating': init_rating,
            'change': init_rating,
            'isProvisional': True
        }

    opp = opponent_rating if opponent_rating > 0 else 1200
    expected = get_expected_score(current_rating, opp)
    change = round(k * (actual_score - expected))
    new_rating = max(100, current_rating + change)
    return {
        'newRating': new_rating,
        'change': change,
        'isProvisional': False
    }

def format_user_dict(cursor, user_row):
    if not user_row:
        return None
    u = dict(user_row)
    if 'password' in u:
        del u['password']
    u_id = u['userId']
    u['id'] = u_id
    u['currentElo'] = u.get('elo', 0)
    u['isRanked'] = bool(u.get('isRanked', 0))

    if cursor:
        cursor.execute("SELECT followingId FROM follows WHERE followerId = ?;", (u_id,))
        u['following'] = [r['followingId'] for r in cursor.fetchall()]

        cursor.execute("SELECT followerId FROM follows WHERE followingId = ?;", (u_id,))
        u['followers'] = [r['followerId'] for r in cursor.fetchall()]

        cursor.execute("""
        SELECT CASE WHEN requesterId = ? THEN receiverId ELSE requesterId END AS fId
        FROM friendships WHERE (requesterId = ? OR receiverId = ?) AND status = 'accepted';
        """, (u_id, u_id, u_id))
        u['friends'] = [r['fId'] for r in cursor.fetchall()]

        u['followersCount'] = len(u['followers'])
        u['followingCount'] = len(u['following'])
        u['friendsCount'] = len(u['friends'])
    else:
        u['following'] = []
        u['followers'] = []
        u['friends'] = []
        u['followersCount'] = 0
        u['followingCount'] = 0
        u['friendsCount'] = 0
    return u

class ChessGamesRequestHandler(BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        # Clean logging
        sys.stderr.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {args[0]} - {args[1]}\n")

    def send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status=400):
        self.send_json({'success': False, 'error': message}, status=status)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def parse_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            if length <= 0:
                return {}
            raw = self.rfile.read(length).decode('utf-8')
            return json.loads(raw) if raw else {}
        except Exception:
            return {}

    # =========================================================================
    # GET REQUEST ROUTER
    # =========================================================================
    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        # API Routes
        if path.startswith('/api/'):
            self.handle_api_get(path, query)
            return

        # Static File Serving
        self.handle_static(path)

    def handle_api_get(self, path, query):
        conn = get_connection()
        cursor = conn.cursor()

        try:
            # Health check
            if path == '/api/health':
                self.send_json({'success': True, 'status': 'online', 'database': DB_PATH})
                return

            # 1. Season Current
            if path == '/api/season/current':
                cursor.execute("SELECT * FROM seasons ORDER BY seasonId DESC LIMIT 1;")
                season = cursor.fetchone()
                if not season:
                    now = int(time.time() * 1000)
                    cursor.execute("INSERT INTO seasons (seasonId, startDate, endDate, status) VALUES (1, ?, ?, 'active');", (now, now + SEASON_DURATION_MS))
                    conn.commit()
                    cursor.execute("SELECT * FROM seasons ORDER BY seasonId DESC LIMIT 1;")
                    season = cursor.fetchone()

                now = int(time.time() * 1000)
                rem_ms = max(0, season['endDate'] - now)
                days = rem_ms // (86400 * 1000)
                hours = (rem_ms % (86400 * 1000)) // (3600 * 1000)

                self.send_json({
                    'success': True,
                    'seasonId': season['seasonId'],
                    'startDate': season['startDate'],
                    'endDate': season['endDate'],
                    'status': season['status'],
                    'daysLeft': days,
                    'hoursLeft': hours,
                    'formatted': f"{days}d {hours}h left"
                })
                return

            # 2. Leaderboard
            if path == '/api/leaderboard':
                cursor.execute("""
                SELECT userId, username, profilePhoto, elo, rank, isRanked, wins, losses, draws
                FROM users
                ORDER BY isRanked DESC, elo DESC, (wins - losses) DESC;
                """)
                rows = cursor.fetchall()
                leaderboard = []
                rank_num = 1
                for r in rows:
                    is_ranked = bool(r['isRanked'])
                    leaderboard.append({
                        'seasonRank': rank_num if is_ranked else 0,
                        'id': r['userId'],
                        'userId': r['userId'],
                        'username': r['username'],
                        'profilePhoto': r['profilePhoto'],
                        'currentElo': r['elo'],
                        'elo': r['elo'],
                        'rank': r['rank'],
                        'isRanked': is_ranked,
                        'wins': r['wins'],
                        'losses': r['losses'],
                        'draws': r['draws']
                    })
                    if is_ranked:
                        rank_num += 1

                self.send_json({'success': True, 'leaderboard': leaderboard})
                return

            # 3. All Users List
            if path == '/api/users':
                cursor.execute("""
                SELECT userId, username, profilePhoto, elo, rank, isRanked, wins, losses, draws, lifetimeWins, lifetimeLosses, lifetimeDraws, createdAt
                FROM users
                ORDER BY isRanked DESC, elo DESC;
                """)
                rows = cursor.fetchall()
                users = [format_user_dict(cursor, r) for r in rows]
                self.send_json({'success': True, 'users': users})
                return

            # 4. User Profile
            if path == '/api/users/profile':
                user_id = query.get('userId', [None])[0]
                username = query.get('username', [None])[0]

                if user_id:
                    cursor.execute("SELECT * FROM users WHERE userId = ?;", (user_id,))
                elif username:
                    cursor.execute("SELECT * FROM users WHERE username = ? COLLATE NOCASE;", (username,))
                else:
                    self.send_error_json("userId or username required")
                    return

                user = cursor.fetchone()
                if not user:
                    self.send_error_json("User not found", 404)
                    return

                self.send_json({
                    'success': True,
                    'user': format_user_dict(cursor, user)
                })
                return

            # 5. Search Registered Users (never guests)
            if path == '/api/users/search':
                q = query.get('q', [''])[0].strip()
                if not q:
                    self.send_json({'success': True, 'results': []})
                    return

                cursor.execute("""
                SELECT userId, username, profilePhoto, elo, rank, isRanked, wins, losses, draws
                FROM users
                WHERE username LIKE ? COLLATE NOCASE
                ORDER BY isRanked DESC, elo DESC
                LIMIT 20;
                """, (f"%{q}%",))
                rows = cursor.fetchall()
                results = []
                for r in rows:
                    results.append({
                        'id': r['userId'],
                        'userId': r['userId'],
                        'username': r['username'],
                        'profilePhoto': r['profilePhoto'],
                        'currentElo': r['elo'],
                        'elo': r['elo'],
                        'rank': r['rank'],
                        'isRanked': bool(r['isRanked']),
                        'wins': r['wins'],
                        'losses': r['losses'],
                        'draws': r['draws']
                    })

                self.send_json({'success': True, 'results': results})
                return

            # 6. Social: Friends List
            if path == '/api/social/friends':
                user_id = query.get('userId', [None])[0]
                if not user_id:
                    self.send_error_json("userId is required")
                    return

                cursor.execute("""
                SELECT u.userId, u.username, u.profilePhoto, u.elo, u.rank, u.isRanked
                FROM friendships f
                JOIN users u ON (u.userId = CASE WHEN f.requesterId = ? THEN f.receiverId ELSE f.requesterId END)
                WHERE (f.requesterId = ? OR f.receiverId = ?) AND f.status = 'accepted';
                """, (user_id, user_id, user_id))
                friends = []
                for r in cursor.fetchall():
                    item = dict(r)
                    item['id'] = item['userId']
                    item['currentElo'] = item['elo']
                    item['isRanked'] = bool(item['isRanked'])
                    friends.append(item)
                self.send_json({'success': True, 'friends': friends})
                return

            # 7. Social: Following & Followers Lists
            if path == '/api/social/follows':
                user_id = query.get('userId', [None])[0]
                ftype = query.get('type', ['following'])[0]
                if not user_id:
                    self.send_error_json("userId is required")
                    return

                if ftype == 'following':
                    cursor.execute("""
                    SELECT u.userId, u.username, u.profilePhoto, u.elo, u.rank, u.isRanked
                    FROM follows f
                    JOIN users u ON u.userId = f.followingId
                    WHERE f.followerId = ?;
                    """, (user_id,))
                else:
                    cursor.execute("""
                    SELECT u.userId, u.username, u.profilePhoto, u.elo, u.rank, u.isRanked
                    FROM follows f
                    JOIN users u ON u.userId = f.followerId
                    WHERE f.followingId = ?;
                    """, (user_id,))

                users = []
                for r in cursor.fetchall():
                    item = dict(r)
                    item['id'] = item['userId']
                    item['currentElo'] = item['elo']
                    item['isRanked'] = bool(item['isRanked'])
                    users.append(item)
                self.send_json({'success': True, 'users': users})
                return

            # 8. Social: Relationship Status between Two Users
            if path == '/api/social/status':
                user_id = query.get('userId', [None])[0]
                target_id = query.get('targetId', [None])[0]
                if not user_id or not target_id:
                    self.send_error_json("userId and targetId are required")
                    return

                cursor.execute("""
                SELECT COUNT(*) AS c FROM friendships
                WHERE ((requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?))
                  AND status = 'accepted';
                """, (user_id, target_id, target_id, user_id))
                is_friend = cursor.fetchone()['c'] > 0

                cursor.execute("SELECT COUNT(*) AS c FROM follows WHERE followerId = ? AND followingId = ?;", (user_id, target_id))
                is_following = cursor.fetchone()['c'] > 0

                self.send_json({'success': True, 'isFriend': is_friend, 'isFollowing': is_following})
                return

            # 9. Messages: Conversation Thread
            if path == '/api/messages':
                user_id = query.get('userId', [None])[0]
                other_id = query.get('otherUserId', [None])[0]
                if not user_id or not other_id:
                    self.send_error_json("userId and otherUserId are required")
                    return

                conv_id = f"conv_{min(user_id, other_id)}_{max(user_id, other_id)}"
                cursor.execute("SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC LIMIT 100;", (conv_id,))
                messages = []
                for r in cursor.fetchall():
                    m = dict(r)
                    m['timestamp'] = m['createdAt']
                    messages.append(m)
                self.send_json({'success': True, 'messages': messages, 'conversationId': conv_id})
                return

            # 10. Game History: Recent Games
            if path == '/api/games/recent':
                user_id = query.get('userId', [None])[0]
                if user_id:
                    cursor.execute("""
                    SELECT * FROM games
                    WHERE whitePlayerId = ? OR blackPlayerId = ?
                    ORDER BY createdAt DESC LIMIT 25;
                    """, (user_id, user_id))
                else:
                    cursor.execute("SELECT * FROM games ORDER BY createdAt DESC LIMIT 25;")

                rows = cursor.fetchall()
                games = []
                for r in rows:
                    g = dict(r)
                    g['rated'] = bool(g['rated'])
                    try:
                        g['moves'] = json.loads(g['moves'])
                    except Exception:
                        g['moves'] = []
                    g['date'] = g['createdAt']
                    g['winner'] = g['whiteName'] if g['result'] == '1-0' else (g['blackName'] if g['result'] == '0-1' else None)
                    g['loser'] = g['blackName'] if g['result'] == '1-0' else (g['whiteName'] if g['result'] == '0-1' else None)
                    g['whitePlayer'] = {
                        'id': g['whitePlayerId'],
                        'userId': g['whitePlayerId'],
                        'username': g['whiteName'],
                        'profilePhoto': None,
                        'currentElo': g['whiteEloAfter'],
                        'elo': g['whiteEloAfter'],
                        'rank': calculate_rank(g['whiteEloAfter'], bool(g['whitePlayerId']))
                    }
                    g['blackPlayer'] = {
                        'id': g['blackPlayerId'],
                        'userId': g['blackPlayerId'],
                        'username': g['blackName'],
                        'profilePhoto': None,
                        'currentElo': g['blackEloAfter'],
                        'elo': g['blackEloAfter'],
                        'rank': calculate_rank(g['blackEloAfter'], bool(g['blackPlayerId']))
                    }
                    games.append(g)

                self.send_json({'success': True, 'games': games})
                return

            # 11. Single Game by ID (for Game Review)
            if path.startswith('/api/games/'):
                game_id = path.split('/api/games/')[1]
                cursor.execute("SELECT * FROM games WHERE gameId = ?;", (game_id,))
                row = cursor.fetchone()
                if not row:
                    self.send_error_json("Game not found", 404)
                    return
                g = dict(row)
                g['rated'] = bool(g['rated'])
                try:
                    g['moves'] = json.loads(g['moves'])
                except Exception:
                    g['moves'] = []
                g['date'] = g['createdAt']
                g['winner'] = g['whiteName'] if g['result'] == '1-0' else (g['blackName'] if g['result'] == '0-1' else None)
                g['loser'] = g['blackName'] if g['result'] == '1-0' else (g['whiteName'] if g['result'] == '0-1' else None)
                g['whitePlayer'] = {
                    'id': g['whitePlayerId'],
                    'userId': g['whitePlayerId'],
                    'username': g['whiteName'],
                    'profilePhoto': None,
                    'currentElo': g['whiteEloAfter'],
                    'elo': g['whiteEloAfter'],
                    'rank': calculate_rank(g['whiteEloAfter'], bool(g['whitePlayerId']))
                }
                g['blackPlayer'] = {
                    'id': g['blackPlayerId'],
                    'userId': g['blackPlayerId'],
                    'username': g['blackName'],
                    'profilePhoto': None,
                    'currentElo': g['blackEloAfter'],
                    'elo': g['blackEloAfter'],
                    'rank': calculate_rank(g['blackEloAfter'], bool(g['blackPlayerId']))
                }
                self.send_json({'success': True, 'game': g})
                return

            # 12. Room Status by Code
            if path.startswith('/api/rooms/'):
                code = path.split('/api/rooms/')[1].upper()
                cursor.execute("SELECT * FROM rooms WHERE roomCode = ?;", (code,))
                r = cursor.fetchone()
                if not r:
                    self.send_error_json("Room not found", 404)
                    return
                self.send_json({'success': True, 'room': dict(r)})
                return

            self.send_error_json("Endpoint not found", 404)
        finally:
            conn.close()

    # =========================================================================
    # POST & PUT REQUEST ROUTER
    # =========================================================================
    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()
        self.handle_api_post(path, body)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        body = self.parse_body()
        self.handle_api_post(path, body)

    def handle_api_post(self, path, body):
        conn = get_connection()
        cursor = conn.cursor()

        try:
            # 1. Auth: Register
            if path == '/api/auth/register':
                username = (body.get('username') or '').strip()
                password = body.get('password', '')

                if not username or len(username) < 3:
                    self.send_error_json("Username must be at least 3 characters.")
                    return
                if len(username) > 20:
                    self.send_error_json("Username cannot exceed 20 characters.")
                    return
                if not password or len(password) < 4:
                    self.send_error_json("Password must be at least 4 characters.")
                    return

                cursor.execute("SELECT userId FROM users WHERE username = ? COLLATE NOCASE;", (username,))
                if cursor.fetchone():
                    self.send_error_json("Username is already taken. Please choose another.")
                    return

                now = int(time.time() * 1000)
                user_id = f"acc_{now}_{int(time.time() % 10000)}"

                cursor.execute("""
                INSERT INTO users (userId, username, password, profilePhoto, elo, rank, isRanked, seasonId, wins, losses, draws, lifetimeWins, lifetimeLosses, lifetimeDraws, createdAt)
                VALUES (?, ?, ?, NULL, 0, 'UNRANKED', 0, 1, 0, 0, 0, 0, 0, 0, ?);
                """, (user_id, username, password, now))
                conn.commit()

                cursor.execute("SELECT * FROM users WHERE userId = ?;", (user_id,))
                user = cursor.fetchone()
                self.send_json({'success': True, 'user': format_user_dict(cursor, user)})
                return

            # 2. Auth: Login
            if path == '/api/auth/login':
                username = (body.get('username') or '').strip()
                password = body.get('password', '')

                cursor.execute("SELECT * FROM users WHERE username = ? COLLATE NOCASE;", (username,))
                user = cursor.fetchone()
                if not user:
                    self.send_error_json("Account not found with that username.")
                    return
                if user['password'] != password:
                    self.send_error_json("Incorrect password. Please try again.")
                    return

                self.send_json({'success': True, 'user': format_user_dict(cursor, user)})
                return

            # 3. Update Profile (Username & Photo)
            if path == '/api/users/profile':
                user_id = body.get('userId')
                if not user_id:
                    self.send_error_json("userId is required")
                    return

                cursor.execute("SELECT * FROM users WHERE userId = ?;", (user_id,))
                user = cursor.fetchone()
                if not user:
                    self.send_error_json("User not found", 404)
                    return

                new_username = body.get('newUsername')
                if new_username is not None:
                    new_username = new_username.strip()
                    if len(new_username) < 3 or len(new_username) > 20:
                        self.send_error_json("Username must be between 3 and 20 characters.")
                        return
                    cursor.execute("SELECT userId FROM users WHERE username = ? COLLATE NOCASE AND userId != ?;", (new_username, user_id))
                    if cursor.fetchone():
                        self.send_error_json("Username is already taken.")
                        return
                    cursor.execute("UPDATE users SET username = ? WHERE userId = ?;", (new_username, user_id))

                if 'profilePhoto' in body:
                    photo = body['profilePhoto']  # None or data URL string
                    cursor.execute("UPDATE users SET profilePhoto = ? WHERE userId = ?;", (photo, user_id))

                conn.commit()
                cursor.execute("SELECT * FROM users WHERE userId = ?;", (user_id,))
                updated = cursor.fetchone()
                self.send_json({'success': True, 'user': format_user_dict(cursor, updated)})
                return

            # 4. Social: Add Friend
            if path == '/api/social/friends/add':
                user_id = body.get('userId')
                target_str = (body.get('targetUsernameOrId') or '').strip()

                if not user_id or not target_str:
                    self.send_error_json("userId and target are required")
                    return

                cursor.execute("SELECT * FROM users WHERE userId = ? OR username = ? COLLATE NOCASE;", (target_str, target_str))
                target = cursor.fetchone()
                if not target:
                    self.send_error_json("Player not found.")
                    return
                if target['userId'] == user_id:
                    self.send_error_json("You cannot add yourself as a friend.")
                    return

                target_id = target['userId']
                now = int(time.time() * 1000)
                fr_id_1 = f"fr_{user_id}_{target_id}"
                fr_id_2 = f"fr_{target_id}_{user_id}"

                cursor.execute("""
                INSERT OR IGNORE INTO friendships (friendshipId, requesterId, receiverId, status, createdAt)
                VALUES (?, ?, ?, 'accepted', ?);
                """, (fr_id_1, user_id, target_id, now))

                cursor.execute("""
                INSERT OR IGNORE INTO friendships (friendshipId, requesterId, receiverId, status, createdAt)
                VALUES (?, ?, ?, 'accepted', ?);
                """, (fr_id_2, target_id, user_id, now))

                conn.commit()
                self.send_json({'success': True, 'friend': format_user_dict(cursor, target)})
                return

            # 5. Social: Remove Friend
            if path == '/api/social/friends/remove':
                user_id = body.get('userId')
                friend_id = body.get('friendId')
                cursor.execute("""
                DELETE FROM friendships
                WHERE (requesterId = ? AND receiverId = ?) OR (requesterId = ? AND receiverId = ?);
                """, (user_id, friend_id, friend_id, user_id))
                conn.commit()
                self.send_json({'success': True})
                return

            # 6. Social: Follow
            if path == '/api/social/follow':
                user_id = body.get('userId')
                target_id = body.get('targetId')
                if not user_id or not target_id:
                    self.send_error_json("userId and targetId required")
                    return
                if user_id == target_id:
                    self.send_error_json("You cannot follow yourself.")
                    return

                now = int(time.time() * 1000)
                cursor.execute("INSERT OR IGNORE INTO follows (followerId, followingId, createdAt) VALUES (?, ?, ?);", (user_id, target_id, now))
                conn.commit()
                self.send_json({'success': True})
                return

            # 7. Social: Unfollow
            if path == '/api/social/unfollow':
                user_id = body.get('userId')
                target_id = body.get('targetId')
                cursor.execute("DELETE FROM follows WHERE followerId = ? AND followingId = ?;", (user_id, target_id))
                conn.commit()
                self.send_json({'success': True})
                return

            # 8. Messages: Send Message
            if path == '/api/messages/send':
                sender_id = body.get('senderId')
                recipient_id = body.get('recipientId')
                content = (body.get('content') or '').strip()

                if not sender_id or not recipient_id or not content:
                    self.send_error_json("senderId, recipientId, and content are required")
                    return

                now = int(time.time() * 1000)
                conv_id = f"conv_{min(sender_id, recipient_id)}_{max(sender_id, recipient_id)}"

                # Ensure conversation
                cursor.execute("""
                INSERT OR IGNORE INTO conversations (conversationId, participantIds, createdAt, updatedAt)
                VALUES (?, ?, ?, ?);
                """, (conv_id, json.dumps([sender_id, recipient_id]), now, now))
                cursor.execute("UPDATE conversations SET updatedAt = ? WHERE conversationId = ?;", (now, conv_id))

                msg_id = f"msg_{now}_{int(time.time() % 10000)}"
                cursor.execute("""
                INSERT INTO messages (messageId, conversationId, senderId, content, createdAt, readStatus)
                VALUES (?, ?, ?, ?, ?, 1);
                """, (msg_id, conv_id, sender_id, content, now))

                conn.commit()
                self.send_json({
                    'success': True,
                    'message': {
                        'messageId': msg_id,
                        'conversationId': conv_id,
                        'senderId': sender_id,
                        'content': content,
                        'createdAt': now,
                        'timestamp': now
                    }
                })
                return

            # 9. Games: Record Match Outcome & Update ELO
            if path == '/api/games/record':
                white_id = body.get('whitePlayerId')
                black_id = body.get('blackPlayerId')
                white_name = body.get('whiteName') or 'User 1'
                black_name = body.get('blackName') or 'User 2'
                result = body.get('result')  # '1-0', '0-1', '1/2-1/2'
                is_rated = bool(body.get('rated', False) and (white_id or black_id))
                term_reason = body.get('terminationReason') or 'Checkmate'
                moves = body.get('moves', [])
                move_count = body.get('moveCount', len(moves))
                duration = body.get('duration', 0)

                # Fetch users
                white_user = None
                black_user = None
                if white_id:
                    cursor.execute("SELECT * FROM users WHERE userId = ?;", (white_id,))
                    white_user = cursor.fetchone()
                if black_id:
                    cursor.execute("SELECT * FROM users WHERE userId = ?;", (black_id,))
                    black_user = cursor.fetchone()

                white_elo_before = white_user['elo'] if white_user else 0
                black_elo_before = black_user['elo'] if black_user else 0
                white_elo_after = white_elo_before
                black_elo_after = black_elo_before
                white_change = 0
                black_change = 0

                elo_results = None

                # Calculate ELO only for rated games involving registered accounts
                if is_rated and (white_user or black_user):
                    white_prov = not bool(white_user['isRanked']) if white_user else True
                    black_prov = not bool(black_user['isRanked']) if black_user else True

                    w_score = 1.0 if result == '1-0' else (0.5 if result == '1/2-1/2' else 0.0)
                    b_score = 1.0 if result == '0-1' else (0.5 if result == '1/2-1/2' else 0.0)

                    w_calc = calculate_elo_change(white_elo_before, black_elo_before, w_score, white_prov)
                    b_calc = calculate_elo_change(black_elo_before, white_elo_before, b_score, black_prov)

                    if white_user:
                        white_elo_after = w_calc['newRating']
                        white_change = w_calc['change']
                        w_rank = calculate_rank(white_elo_after, True)
                        w_win = 1 if result == '1-0' else 0
                        w_loss = 1 if result == '0-1' else 0
                        w_draw = 1 if result == '1/2-1/2' else 0

                        cursor.execute("""
                        UPDATE users SET
                            elo = ?,
                            rank = ?,
                            isRanked = 1,
                            wins = wins + ?,
                            losses = losses + ?,
                            draws = draws + ?,
                            lifetimeWins = lifetimeWins + ?,
                            lifetimeLosses = lifetimeLosses + ?,
                            lifetimeDraws = lifetimeDraws + ?
                        WHERE userId = ?;
                        """, (white_elo_after, w_rank, w_win, w_loss, w_draw, w_win, w_loss, w_draw, white_id))

                    if black_user:
                        black_elo_after = b_calc['newRating']
                        black_change = b_calc['change']
                        b_rank = calculate_rank(black_elo_after, True)
                        b_win = 1 if result == '0-1' else 0
                        b_loss = 1 if result == '1-0' else 0
                        b_draw = 1 if result == '1/2-1/2' else 0

                        cursor.execute("""
                        UPDATE users SET
                            elo = ?,
                            rank = ?,
                            isRanked = 1,
                            wins = wins + ?,
                            losses = losses + ?,
                            draws = draws + ?,
                            lifetimeWins = lifetimeWins + ?,
                            lifetimeLosses = lifetimeLosses + ?,
                            lifetimeDraws = lifetimeDraws + ?
                        WHERE userId = ?;
                        """, (black_elo_after, b_rank, b_win, b_loss, b_draw, b_win, b_loss, b_draw, black_id))

                    elo_results = {
                        'white': {'newRating': white_elo_after, 'change': white_change},
                        'black': {'newRating': black_elo_after, 'change': black_change}
                    }

                now = int(time.time() * 1000)
                game_id = f"game_{now}_{int(time.time() % 10000)}"
                winner_id = white_id if result == '1-0' else (black_id if result == '0-1' else None)
                loser_id = black_id if result == '1-0' else (white_id if result == '0-1' else None)

                cursor.execute("""
                INSERT INTO games (
                    gameId, whitePlayerId, blackPlayerId, whiteName, blackName,
                    whiteEloBefore, blackEloBefore, whiteEloAfter, blackEloAfter,
                    whiteChange, blackChange, result, winnerId, loserId,
                    terminationReason, rated, moves, moveCount, duration, seasonId, createdAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?);
                """, (
                    game_id, white_id, black_id, white_name, black_name,
                    white_elo_before, black_elo_before, white_elo_after, black_elo_after,
                    white_change, black_change, result, winner_id, loser_id,
                    term_reason, 1 if is_rated else 0, json.dumps(moves), move_count, duration, now
                ))

                conn.commit()

                # Build game record object
                game_record = {
                    'gameId': game_id,
                    'date': now,
                    'createdAt': now,
                    'whitePlayer': {
                        'id': white_id,
                        'userId': white_id,
                        'username': white_name,
                        'currentElo': white_elo_after,
                        'elo': white_elo_after,
                        'rank': calculate_rank(white_elo_after, bool(white_id))
                    },
                    'blackPlayer': {
                        'id': black_id,
                        'userId': black_id,
                        'username': black_name,
                        'currentElo': black_elo_after,
                        'elo': black_elo_after,
                        'rank': calculate_rank(black_elo_after, bool(black_id))
                    },
                    'whiteEloBefore': white_elo_before,
                    'blackEloBefore': black_elo_before,
                    'whiteEloAfter': white_elo_after,
                    'blackEloAfter': black_elo_after,
                    'whiteChange': white_change,
                    'blackChange': black_change,
                    'result': result,
                    'winner': white_name if result == '1-0' else (black_name if result == '0-1' else None),
                    'loser': black_name if result == '1-0' else (white_name if result == '0-1' else None),
                    'terminationReason': term_reason,
                    'rated': is_rated,
                    'moves': moves,
                    'moveCount': move_count,
                    'duration': duration,
                    'seasonId': 1
                }

                self.send_json({
                    'success': True,
                    'gameId': game_id,
                    'gameRecord': game_record,
                    'whiteName': white_name,
                    'blackName': black_name,
                    'whiteEloAfter': white_elo_after,
                    'blackEloAfter': black_elo_after,
                    'whiteChange': white_change,
                    'blackChange': black_change,
                    'result': result,
                    'terminationReason': term_reason,
                    'rated': is_rated,
                    'eloResults': elo_results
                })
                return

            # 10. Seasons: Force Rotate (Testing / Simulation)
            if path == '/api/season/rotate':
                cursor.execute("SELECT seasonId FROM seasons ORDER BY seasonId DESC LIMIT 1;")
                curr = cursor.fetchone()
                next_season_id = (curr['seasonId'] if curr else 1) + 1
                now = int(time.time() * 1000)

                cursor.execute("INSERT INTO seasons (seasonId, startDate, endDate, status) VALUES (?, ?, ?, 'active');", (next_season_id, now, now + SEASON_DURATION_MS))
                cursor.execute("""
                UPDATE users SET
                    elo = 0,
                    rank = 'UNRANKED',
                    isRanked = 0,
                    wins = 0,
                    losses = 0,
                    draws = 0,
                    seasonId = ?;
                """, (next_season_id,))
                conn.commit()
                self.send_json({'success': True, 'seasonId': next_season_id})
                return

            # 11. Rooms: Create & Join
            if path == '/api/rooms/create':
                code = (body.get('roomCode') or '').strip().upper()
                host_id = body.get('hostId')
                now = int(time.time() * 1000)
                room_id = f"room_{code}"

                cursor.execute("""
                INSERT OR REPLACE INTO rooms (roomId, roomCode, hostId, whitePlayerId, status, createdAt)
                VALUES (?, ?, ?, ?, 'waiting', ?);
                """, (room_id, code, host_id, host_id, now))
                conn.commit()
                self.send_json({'success': True, 'roomId': room_id, 'roomCode': code, 'status': 'waiting'})
                return

            if path == '/api/rooms/join':
                code = (body.get('roomCode') or '').strip().upper()
                guest_id = body.get('guestId')
                cursor.execute("SELECT * FROM rooms WHERE roomCode = ?;", (code,))
                r = cursor.fetchone()
                if not r:
                    self.send_error_json("Room code not found.")
                    return

                cursor.execute("UPDATE rooms SET blackPlayerId = ?, status = 'playing' WHERE roomCode = ?;", (guest_id, code))
                conn.commit()
                self.send_json({'success': True, 'roomCode': code, 'status': 'playing'})
                return

            self.send_error_json("Endpoint not found", 404)
        finally:
            conn.close()

    # =========================================================================
    # STATIC ASSET SERVING
    # =========================================================================
    def handle_static(self, path):
        if path == '/' or not path:
            path = '/index.html'

        clean_path = os.path.normpath(path.lstrip('/')).replace('\\', '/')
        if clean_path.startswith('..'):
            self.send_error(403, "Access denied")
            return

        full_path = os.path.join(ROOT_DIR, clean_path)

        if not os.path.exists(full_path) or os.path.isdir(full_path):
            self.send_error(404, "File not found")
            return

        mime_type, _ = mimetypes.guess_type(full_path)
        if not mime_type:
            mime_type = 'application/octet-stream'

        try:
            with open(full_path, 'rb') as f:
                content = f.read()

            self.send_response(200)
            self.send_header('Content-Type', mime_type)
            self.send_header('Content-Length', str(len(content)))
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_error(500, f"Error reading file: {e}")

def run_server():
    init_db()
    server_address = ('', PORT)
    httpd = HTTPServer(server_address, ChessGamesRequestHandler)
    print(f"ChessGames Persistent SQLite Backend Server running on http://localhost:{PORT}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.server_close()

if __name__ == '__main__':
    run_server()
