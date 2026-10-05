/**
 * ChessGames - Vector SVGs for Chess Pieces & UI Icons
 * Strict visual rule: ZERO emojis used anywhere.
 */

const ChessSVGs = {
  // Standard Staunton Vector Silhouette Pieces (Clean, high clarity, handcrafted)
  pieces: {
    // White King
    'wK': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="none" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/>
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/>
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5C20 16 10.5 13 6.5 19.5c-3 6 5 10.5 5 10.5v7z" fill="#fff"/>
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/>
      </g>
    </svg>`,

    // White Queen
    'wQ': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="#fff" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-8.5 2.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-20 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-7.5-16-7.5 16-7-11 2 12zm0 5c9-1.5 18-1.5 27 0m-27 3.5c9-1.5 18-1.5 27 0m-27 3.5c9-1.5 18-1.5 27 0"/>
        <path d="M11.5 30c3.5-1 6.5-1.5 11-1.5s7.5.5 11 1.5v7H11.5v-7z"/>
      </g>
    </svg>`,

    // White Rook
    'wR': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="#fff" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14l1.5 13.5H14zM9 15h27v-6h-4.5v3h-4v-3h-6v3h-4v-3H9v6z" stroke-linejoin="miter"/>
        <path d="M12 35.5h21m-20-4h19m-17.5-13.5h16"/>
      </g>
    </svg>`,

    // White Bishop
    'wB': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="none" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <g fill="#fff">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-15.5v5m-2.5-2.5h5"/>
      </g>
    </svg>`,

    // White Knight
    'wN': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="none" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#fff"/>
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.06 1.2-1 1-1 0-.74-1.39-1-2-1.74-2.18-1-6.5 3-7 3.5-.5 6-1 8-2z" fill="#fff"/>
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-8.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#000"/>
        <path d="M24.55 10.4s-1.84 2.82-3.69 3.52M22.5 25.5c-1.5.5-3 .5-4.5-.5" stroke="#222"/>
      </g>
    </svg>`,

    // White Pawn
    'wP': `<svg viewBox="0 0 45 45" class="chess-piece">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`,

    // Black King
    'bK': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="none" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22.5 11.63V6M20 8h5" stroke="#fff" stroke-linejoin="miter"/>
        <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#262421" stroke="#fff" stroke-linecap="butt" stroke-linejoin="miter"/>
        <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V23.5C20 16 10.5 13 6.5 19.5c-3 6 5 10.5 5 10.5v7z" fill="#262421"/>
        <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff"/>
      </g>
    </svg>`,

    // Black Queen
    'bQ': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="#262421" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm16.5-4.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-8.5 2.5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm-20 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
        <path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11-7.5-16-7.5 16-7-11 2 12zm0 5c9-1.5 18-1.5 27 0m-27 3.5c9-1.5 18-1.5 27 0m-27 3.5c9-1.5 18-1.5 27 0" stroke="#fff"/>
        <path d="M11.5 30c3.5-1 6.5-1.5 11-1.5s7.5.5 11 1.5v7H11.5v-7z"/>
      </g>
    </svg>`,

    // Black Rook
    'bR': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="#262421" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 39h27v-3H9v3zm3-3v-4.5h21V36H12zm2-4.5l1.5-13.5h14l1.5 13.5H14zM9 15h27v-6h-4.5v3h-4v-3h-6v3h-4v-3H9v6z" stroke-linejoin="miter"/>
        <path d="M12 35.5h21m-20-4h19m-17.5-13.5h16" stroke="#fff"/>
      </g>
    </svg>`,

    // Black Bishop
    'bB': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="none" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <g fill="#262421">
          <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.35.49-2.32.47-3-.5 1.35-1.46 3-2 3-2z"/>
          <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z"/>
          <path d="M25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/>
        </g>
        <path d="M17.5 26h10M15 30h15m-7.5-15.5v5m-2.5-2.5h5" stroke="#fff"/>
      </g>
    </svg>`,

    // Black Knight
    'bN': `<svg viewBox="0 0 45 45" class="chess-piece">
      <g fill="none" fill-rule="evenodd" stroke="#222" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" fill="#262421"/>
        <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0-.06 1.2-1 1-1 0-.74-1.39-1-2-1.74-2.18-1-6.5 3-7 3.5-.5 6-1 8-2z" fill="#262421"/>
        <path d="M9.5 25.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0zm5.5-8.5a.5.5 0 1 1-1 0 .5.5 0 1 1 1 0z" fill="#fff"/>
        <path d="M24.55 10.4s-1.84 2.82-3.69 3.52M22.5 25.5c-1.5.5-3 .5-4.5-.5" stroke="#fff"/>
      </g>
    </svg>`,

    // Black Pawn
    'bP': `<svg viewBox="0 0 45 45" class="chess-piece">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#262421" stroke="#222" stroke-width="1.5" stroke-linecap="round"/>
    </svg>`
  },

  // Handcrafted Clean Vector Icons (ZERO EMOJIS)
  icons: {
    // Brand Knight
    brandKnight: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M19 21H5c0-4 4-4 4-8 0-2-1-3-1-3s2-2 4-2c3 0 5 2 5 6 0 1 1 2 2 3v4z"/>
      <path d="M9 10h.01"/>
    </svg>`,

    // Play (Swords)
    play: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="5 3 19 12 5 21 5 3"/>
    </svg>`,

    // Leaderboard Trophy
    trophy: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 9H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3"/>
      <path d="M18 9h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3"/>
      <path d="M4 3h16v6a8 8 0 0 1-16 0V3z"/>
      <path d="M12 17v4"/>
      <path d="M8 21h8"/>
    </svg>`,

    // User Profile
    user: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>`,

    // Settings
    settings: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,

    // Edit pencil
    edit: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>`,

    // Camera / Upload
    camera: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>`,

    // Trash / Remove
    trash: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
    </svg>`,

    // Flip Board / Rotate
    flip: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="1 4 1 10 7 10"/>
      <polyline points="23 20 23 14 17 14"/>
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
    </svg>`,

    // Flag (Resign)
    flag: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
      <line x1="4" y1="22" x2="4" y2="15"/>
    </svg>`,

    // Handshake (Draw)
    handshake: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 17l-5-5a3 3 0 0 1 4.24-4.24L12 9.5l1.76-1.76a3 3 0 0 1 4.24 4.24L13 17"/>
      <path d="M8 14l-4 4a2 2 0 0 0 2.83 2.83L10 18"/>
      <path d="M16 14l4 4a2 2 0 0 1-2.83 2.83L14 18"/>
    </svg>`,

    // Plus / New Game
    plus: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>`,

    // Close / X
    close: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>`,

    // Checkmark
    check: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>`,

    // Clock / Season
    clock: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`,

    // Friends (Users)
    friends: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>`,

    // Messages (Chat Bubble)
    messages: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>`,

    // Computer / Solo Bot
    computer: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
      <circle cx="8" cy="10" r="1"/>
      <circle cx="16" cy="10" r="1"/>
      <line x1="11" y1="10" x2="13" y2="10"/>
    </svg>`,

    // Two Players / Local
    local2p: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/>
      <line x1="22" y1="11" x2="16" y2="11"/>
    </svg>`,

    // Create Room / Broadcast
    createRoom: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`,

    // Join Room / Keypad
    joinRoom: `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
      <polyline points="10 17 15 12 10 7"/>
      <line x1="15" y1="12" x2="3" y2="12"/>
    </svg>`,

    // Send Message
    send: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>`,

    // Copy
    copy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>`,

    // Logout
    logout: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>`,

    // Search
    search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>`,

    // Mic On
    micOn: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`,

    // Mic Off
    micOff: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="1" y1="1" x2="23" y2="23"/>
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/>
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>`,

    // Replay: First
    first: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="19" y1="20" x2="19" y2="4"/>
      <polyline points="15 4 7 12 15 20"/>
      <line x1="5" y1="4" x2="5" y2="20"/>
    </svg>`,

    // Replay: Previous
    prev: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="15 18 9 12 15 6"/>
    </svg>`,

    // Replay: Next
    next: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>`,

    // Replay: Last
    last: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="5" y1="4" x2="5" y2="20"/>
      <polyline points="9 4 17 12 9 20"/>
      <line x1="19" y1="4" x2="19" y2="20"/>
    </svg>`,

    // Eye / View Profile
    eye: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`,

    // User Plus (Add Friend / Follow)
    userPlus: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="8.5" cy="7" r="4"/>
      <line x1="20" y1="8" x2="20" y2="14"/>
      <line x1="23" y1="11" x2="17" y2="11"/>
    </svg>`
  }
};
