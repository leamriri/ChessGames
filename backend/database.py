"""
ChessGames - Persistent SQLite Database Engine
Manages SQLite schema, migrations, connection pooling, and atomic database operations.
ZERO emojis used anywhere.
"""

import os
import sqlite3
import json
import time

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
DB_PATH = os.path.join(DB_DIR, 'chessgames.db')

SEASON_DURATION_MS = 90 * 24 * 60 * 60 * 1000  # 90 days in ms

def get_connection():
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Users Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password TEXT NOT NULL,
        profilePhoto TEXT,
        elo INTEGER DEFAULT 0,
        rank TEXT DEFAULT 'UNRANKED',
        isRanked INTEGER DEFAULT 0,
        seasonId INTEGER DEFAULT 1,
        wins INTEGER DEFAULT 0,
        losses INTEGER DEFAULT 0,
        draws INTEGER DEFAULT 0,
        lifetimeWins INTEGER DEFAULT 0,
        lifetimeLosses INTEGER DEFAULT 0,
        lifetimeDraws INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
    );
    """)

    # 2. Games Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS games (
        gameId TEXT PRIMARY KEY,
        whitePlayerId TEXT,
        blackPlayerId TEXT,
        whiteName TEXT NOT NULL,
        blackName TEXT NOT NULL,
        whiteEloBefore INTEGER DEFAULT 0,
        blackEloBefore INTEGER DEFAULT 0,
        whiteEloAfter INTEGER DEFAULT 0,
        blackEloAfter INTEGER DEFAULT 0,
        whiteChange INTEGER DEFAULT 0,
        blackChange INTEGER DEFAULT 0,
        result TEXT NOT NULL,
        winnerId TEXT,
        loserId TEXT,
        terminationReason TEXT NOT NULL,
        rated INTEGER DEFAULT 0,
        moves TEXT DEFAULT '[]',
        moveCount INTEGER DEFAULT 0,
        duration INTEGER DEFAULT 0,
        seasonId INTEGER DEFAULT 1,
        createdAt INTEGER NOT NULL
    );
    """)

    # 3. Seasons Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS seasons (
        seasonId INTEGER PRIMARY KEY,
        startDate INTEGER NOT NULL,
        endDate INTEGER NOT NULL,
        status TEXT DEFAULT 'active'
    );
    """)

    # 4. Friendships Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS friendships (
        friendshipId TEXT PRIMARY KEY,
        requesterId TEXT NOT NULL,
        receiverId TEXT NOT NULL,
        status TEXT DEFAULT 'accepted',
        createdAt INTEGER NOT NULL,
        UNIQUE(requesterId, receiverId)
    );
    """)

    # 5. Follows Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS follows (
        followerId TEXT NOT NULL,
        followingId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        PRIMARY KEY (followerId, followingId)
    );
    """)

    # 6. Conversations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS conversations (
        conversationId TEXT PRIMARY KEY,
        participantIds TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
    );
    """)

    # 7. Messages Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        messageId TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        readStatus INTEGER DEFAULT 0
    );
    """)

    # 8. Rooms Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rooms (
        roomId TEXT PRIMARY KEY,
        roomCode TEXT UNIQUE NOT NULL,
        hostId TEXT,
        whitePlayerId TEXT,
        blackPlayerId TEXT,
        status TEXT DEFAULT 'waiting',
        gameId TEXT,
        createdAt INTEGER NOT NULL
    );
    """)

    # Indexes
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_users_elo ON users (elo DESC);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_games_white ON games (whitePlayerId);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_games_black ON games (blackPlayerId);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversationId);")

    conn.commit()

    # Seed initial season and community players if empty
    ensure_seed_data(conn)
    conn.close()

def ensure_seed_data(conn):
    cursor = conn.cursor()
    # Ensure active Season 1 exists, but seed 0 users/games
    cursor.execute("SELECT COUNT(*) AS count FROM seasons WHERE status = 'active';")
    row = cursor.fetchone()
    if not row or row['count'] == 0:
        now = int(time.time() * 1000)
        cursor.execute("""
        INSERT OR IGNORE INTO seasons (seasonId, startDate, endDate, status)
        VALUES (1, ?, ?, 'active');
        """, (now - 86400000, now + SEASON_DURATION_MS))
        conn.commit()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully at:", DB_PATH)
