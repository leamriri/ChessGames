/**
 * ChessGames - Pure Chess Rules Engine
 * Implements full FIDE chess rules:
 * - Legal move generation and validation
 * - Pawn double push, en passant, promotion
 * - Castling (kingside and queenside)
 * - Check, checkmate, stalemate, insufficient material
 * - Standard Algebraic Notation (SAN)
 * - Captured pieces and material evaluation
 * ZERO emojis used anywhere.
 */

class ChessEngine {
  constructor() {
    this.reset();
  }

  reset() {
    // 8x8 Board representation. row 0 = rank 8 (Black), row 7 = rank 1 (White)
    this.board = [
      ['bR', 'bN', 'bB', 'bQ', 'bK', 'bB', 'bN', 'bR'],
      ['bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP', 'bP'],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      [null, null, null, null, null, null, null, null],
      ['wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP', 'wP'],
      ['wR', 'wN', 'wB', 'wQ', 'wK', 'wB', 'wN', 'wR']
    ];

    this.turn = 'w'; // 'w' or 'b'
    this.castling = {
      w: { k: true, q: true },
      b: { k: true, q: true }
    };
    this.enPassant = null; // { targetRow, targetCol, captureRow, captureCol } or null
    this.halfMoves = 0; // For 50-move rule
    this.fullMoveNumber = 1;
    this.moveHistory = []; // Array of move objects
    this.capturedPieces = {
      w: [], // Pieces captured by White (i.e. black pieces)
      b: []  // Pieces captured by Black (i.e. white pieces)
    };
    this.isGameOver = false;
    this.gameResult = null; // '1-0', '0-1', '1/2-1/2', null
    this.gameOverReason = null; // 'checkmate', 'stalemate', 'insufficient-material', 'resignation', 'draw-agreement'
  }

  cloneState() {
    return {
      board: this.board.map(row => [...row]),
      turn: this.turn,
      castling: {
        w: { ...this.castling.w },
        b: { ...this.castling.b }
      },
      enPassant: this.enPassant ? { ...this.enPassant } : null,
      halfMoves: this.halfMoves,
      fullMoveNumber: this.fullMoveNumber
    };
  }

  restoreState(state) {
    this.board = state.board.map(row => [...row]);
    this.turn = state.turn;
    this.castling = {
      w: { ...state.castling.w },
      b: { ...state.castling.b }
    };
    this.enPassant = state.enPassant ? { ...state.enPassant } : null;
    this.halfMoves = state.halfMoves;
    this.fullMoveNumber = state.fullMoveNumber;
  }

  static toCoords(square) {
    if (typeof square !== 'string' || square.length !== 2) return null;
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square[1], 10);
    if (col < 0 || col > 7 || row < 0 || row > 7) return null;
    return { row, col };
  }

  static toSquare(row, col) {
    return String.fromCharCode(97 + col) + (8 - row);
  }

  getPiece(row, col) {
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    return this.board[row][col];
  }

  getPieceColor(piece) {
    return piece ? piece[0] : null;
  }

  getPieceType(piece) {
    return piece ? piece[1] : null;
  }

  getOpponent(color) {
    return color === 'w' ? 'b' : 'w';
  }

  findKing(color) {
    const kingPiece = color + 'K';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c] === kingPiece) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  isSquareAttacked(row, col, attackingColor) {
    const pawnDir = attackingColor === 'w' ? 1 : -1; // Pawn attack source direction

    // 1. Check pawns
    const pawnRow = row + pawnDir;
    if (pawnRow >= 0 && pawnRow < 8) {
      if (col - 1 >= 0 && this.board[pawnRow][col - 1] === attackingColor + 'P') return true;
      if (col + 1 < 8 && this.board[pawnRow][col + 1] === attackingColor + 'P') return true;
    }

    // 2. Check knights
    const knightMoves = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1]
    ];
    for (const [dr, dc] of knightMoves) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        if (this.board[nr][nc] === attackingColor + 'N') return true;
      }
    }

    // 3. Check king
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr;
        const nc = col + dc;
        if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
          if (this.board[nr][nc] === attackingColor + 'K') return true;
        }
      }
    }

    // 4. Check straight lines (Rook / Queen)
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of straightDirs) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const piece = this.board[r][c];
        if (piece) {
          if (piece[0] === attackingColor && (piece[1] === 'R' || piece[1] === 'Q')) {
            return true;
          }
          break; // Blocked
        }
        r += dr;
        c += dc;
      }
    }

    // 5. Check diagonals (Bishop / Queen)
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diagDirs) {
      let r = row + dr;
      let c = col + dc;
      while (r >= 0 && r < 8 && c >= 0 && c < 8) {
        const piece = this.board[r][c];
        if (piece) {
          if (piece[0] === attackingColor && (piece[1] === 'B' || piece[1] === 'Q')) {
            return true;
          }
          break; // Blocked
        }
        r += dr;
        c += dc;
      }
    }

    return false;
  }

  isInCheck(color = this.turn) {
    const kingPos = this.findKing(color);
    if (!kingPos) return false;
    return this.isSquareAttacked(kingPos.row, kingPos.col, this.getOpponent(color));
  }

  getPseudoLegalMoves(color = this.turn) {
    const moves = [];

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece || piece[0] !== color) continue;

        const type = piece[1];

        // PAWN
        if (type === 'P') {
          const dir = color === 'w' ? -1 : 1;
          const startRow = color === 'w' ? 6 : 1;
          const promoRow = color === 'w' ? 0 : 7;

          // Forward 1
          const f1Row = r + dir;
          if (f1Row >= 0 && f1Row < 8 && !this.board[f1Row][c]) {
            if (f1Row === promoRow) {
              ['Q', 'R', 'B', 'N'].forEach(promo => {
                moves.push({ from: { row: r, col: c }, to: { row: f1Row, col: c }, promotion: promo });
              });
            } else {
              moves.push({ from: { row: r, col: c }, to: { row: f1Row, col: c } });
            }

            // Forward 2 from start
            const f2Row = r + 2 * dir;
            if (r === startRow && !this.board[f2Row][c]) {
              moves.push({ from: { row: r, col: c }, to: { row: f2Row, col: c } });
            }
          }

          // Diagonal Captures
          for (const dc of [-1, 1]) {
            const tc = c + dc;
            if (tc >= 0 && tc < 8) {
              const targetPiece = this.board[f1Row][tc];
              if (targetPiece && targetPiece[0] !== color) {
                if (f1Row === promoRow) {
                  ['Q', 'R', 'B', 'N'].forEach(promo => {
                    moves.push({ from: { row: r, col: c }, to: { row: f1Row, col: tc }, promotion: promo });
                  });
                } else {
                  moves.push({ from: { row: r, col: c }, to: { row: f1Row, col: tc } });
                }
              } else if (
                this.enPassant &&
                this.enPassant.targetRow === f1Row &&
                this.enPassant.targetCol === tc
              ) {
                // En Passant capture
                moves.push({
                  from: { row: r, col: c },
                  to: { row: f1Row, col: tc },
                  isEnPassant: true,
                  captureRow: this.enPassant.captureRow,
                  captureCol: this.enPassant.captureCol
                });
              }
            }
          }
        }

        // KNIGHT
        else if (type === 'N') {
          const offsets = [
            [-2, -1], [-2, 1], [-1, -2], [-1, 2],
            [1, -2], [1, 2], [2, -1], [2, 1]
          ];
          for (const [dr, dc] of offsets) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const target = this.board[nr][nc];
              if (!target || target[0] !== color) {
                moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
              }
            }
          }
        }

        // BISHOP / ROOK / QUEEN
        else if (type === 'B' || type === 'R' || type === 'Q') {
          const dirs = [];
          if (type === 'B' || type === 'Q') {
            dirs.push([-1, -1], [-1, 1], [1, -1], [1, 1]);
          }
          if (type === 'R' || type === 'Q') {
            dirs.push([-1, 0], [1, 0], [0, -1], [0, 1]);
          }

          for (const [dr, dc] of dirs) {
            let nr = r + dr;
            let nc = c + dc;
            while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
              const target = this.board[nr][nc];
              if (!target) {
                moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
              } else {
                if (target[0] !== color) {
                  moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                }
                break; // Blocked
              }
              nr += dr;
              nc += dc;
            }
          }
        }

        // KING
        else if (type === 'K') {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                const target = this.board[nr][nc];
                if (!target || target[0] !== color) {
                  moves.push({ from: { row: r, col: c }, to: { row: nr, col: nc } });
                }
              }
            }
          }

          // Castling
          const oppColor = this.getOpponent(color);
          const kingRow = color === 'w' ? 7 : 0;
          if (r === kingRow && c === 4 && !this.isInCheck(color)) {
            // Kingside castling
            if (
              this.castling[color].k &&
              this.board[kingRow][5] === null &&
              this.board[kingRow][6] === null &&
              this.board[kingRow][7] === color + 'R' &&
              !this.isSquareAttacked(kingRow, 5, oppColor) &&
              !this.isSquareAttacked(kingRow, 6, oppColor)
            ) {
              moves.push({
                from: { row: r, col: c },
                to: { row: kingRow, col: 6 },
                isCastling: 'k'
              });
            }

            // Queenside castling
            if (
              this.castling[color].q &&
              this.board[kingRow][1] === null &&
              this.board[kingRow][2] === null &&
              this.board[kingRow][3] === null &&
              this.board[kingRow][0] === color + 'R' &&
              !this.isSquareAttacked(kingRow, 3, oppColor) &&
              !this.isSquareAttacked(kingRow, 2, oppColor)
            ) {
              moves.push({
                from: { row: r, col: c },
                to: { row: kingRow, col: 2 },
                isCastling: 'q'
              });
            }
          }
        }
      }
    }

    return moves;
  }

  /**
   * Generates only strictly legal moves (moves that do not leave own King in check).
   */
  getLegalMoves(color = this.turn) {
    const pseudo = this.getPseudoLegalMoves(color);
    const legal = [];

    for (const move of pseudo) {
      const state = this.cloneState();
      this.applyMoveInternal(move);
      const inCheck = this.isInCheck(color);
      this.restoreState(state);

      if (!inCheck) {
        legal.push(move);
      }
    }

    return legal;
  }

  /**
   * Get legal moves for a specific square (e.g. when user clicks a piece)
   */
  getLegalMovesForSquare(row, col) {
    const piece = this.board[row][col];
    if (!piece || piece[0] !== this.turn) return [];
    const allLegal = this.getLegalMoves(this.turn);
    return allLegal.filter(m => m.from.row === row && m.from.col === col);
  }

  /**
   * Internal move application without history tracking (used for simulations)
   */
  applyMoveInternal(move) {
    const { from, to, promotion, isCastling, isEnPassant } = move;
    const movingPiece = this.board[from.row][from.col];

    // En passant capture
    if (isEnPassant) {
      this.board[move.captureRow][move.captureCol] = null;
    }

    // Castling rook movement
    if (isCastling === 'k') {
      const rookFromCol = 7;
      const rookToCol = 5;
      this.board[from.row][rookToCol] = this.board[from.row][rookFromCol];
      this.board[from.row][rookFromCol] = null;
    } else if (isCastling === 'q') {
      const rookFromCol = 0;
      const rookToCol = 3;
      this.board[from.row][rookToCol] = this.board[from.row][rookFromCol];
      this.board[from.row][rookFromCol] = null;
    }

    // Move main piece
    this.board[from.row][from.col] = null;
    this.board[to.row][to.col] = promotion ? (movingPiece[0] + promotion) : movingPiece;

    // Update castling rights
    const color = movingPiece[0];
    if (movingPiece[1] === 'K') {
      this.castling[color].k = false;
      this.castling[color].q = false;
    } else if (movingPiece[1] === 'R') {
      if (from.row === 7 && from.col === 7) this.castling.w.k = false;
      if (from.row === 7 && from.col === 0) this.castling.w.q = false;
      if (from.row === 0 && from.col === 7) this.castling.b.k = false;
      if (from.row === 0 && from.col === 0) this.castling.b.q = false;
    }

    // If opponent rook is captured in corner, revoke opponent's corresponding castling right
    if (to.row === 7 && to.col === 7) this.castling.w.k = false;
    if (to.row === 7 && to.col === 0) this.castling.w.q = false;
    if (to.row === 0 && to.col === 7) this.castling.b.k = false;
    if (to.row === 0 && to.col === 0) this.castling.b.q = false;

    // Update En Passant target
    if (movingPiece[1] === 'P' && Math.abs(to.row - from.row) === 2) {
      const midRow = (from.row + to.row) / 2;
      this.enPassant = {
        targetRow: midRow,
        targetCol: from.col,
        captureRow: to.row,
        captureCol: to.col
      };
    } else {
      this.enPassant = null;
    }

    this.turn = this.getOpponent(this.turn);
  }

  /**
   * Execute a move from UI or logic, returning move record or null if illegal
   */
  makeMove(from, to, chosenPromotion = 'Q') {
    if (this.isGameOver) return null;

    const fromPos = typeof from === 'string' ? ChessEngine.toCoords(from) : from;
    const toPos = typeof to === 'string' ? ChessEngine.toCoords(to) : to;

    if (!fromPos || !toPos) return null;

    const legalMoves = this.getLegalMoves(this.turn);
    const candidateMoves = legalMoves.filter(
      m => m.from.row === fromPos.row && m.from.col === fromPos.col &&
           m.to.row === toPos.row && m.to.col === toPos.col
    );

    if (candidateMoves.length === 0) {
      return null; // Illegal move
    }

    // Find the specific move (checking promotion if applicable)
    let move = candidateMoves[0];
    if (candidateMoves.length > 1) {
      move = candidateMoves.find(m => m.promotion === chosenPromotion) || candidateMoves[0];
    }

    // Capture bookkeeping
    const movingPiece = this.board[fromPos.row][fromPos.col];
    let capturedPiece = this.board[toPos.row][toPos.col];
    if (move.isEnPassant) {
      capturedPiece = this.board[move.captureRow][move.captureCol];
    }

    if (capturedPiece) {
      this.capturedPieces[this.turn].push(capturedPiece);
    }

    // Format Standard Algebraic Notation (SAN)
    const san = this.formatSAN(move, movingPiece, capturedPiece, legalMoves);

    // Apply move
    this.applyMoveInternal(move);

    // Half-move clock
    if (movingPiece[1] === 'P' || capturedPiece) {
      this.halfMoves = 0;
    } else {
      this.halfMoves += 1;
    }

    if (this.turn === 'w') {
      this.fullMoveNumber += 1;
    }

    // Record in history
    const moveRecord = {
      fromSquare: ChessEngine.toSquare(fromPos.row, fromPos.col),
      toSquare: ChessEngine.toSquare(toPos.row, toPos.col),
      piece: movingPiece,
      captured: capturedPiece,
      san: san,
      turn: movingPiece[0],
      moveNumber: this.fullMoveNumber - (movingPiece[0] === 'w' ? 0 : 0) // move counter
    };
    this.moveHistory.push(moveRecord);

    // Check game termination status
    this.updateGameStatus();

    return moveRecord;
  }

  formatSAN(move, piece, captured, legalMoves) {
    if (move.isCastling === 'k') return 'O-O';
    if (move.isCastling === 'q') return 'O-O-O';

    const type = piece[1];
    const fromSquare = ChessEngine.toSquare(move.from.row, move.from.col);
    const toSquare = ChessEngine.toSquare(move.to.row, move.to.col);

    let san = '';

    if (type === 'P') {
      if (captured || move.isEnPassant) {
        san = fromSquare[0] + 'x' + toSquare;
      } else {
        san = toSquare;
      }
      if (move.promotion) {
        san += '=' + move.promotion;
      }
    } else {
      san = type;

      // Disambiguation
      const ambiguous = legalMoves.filter(
        m => m !== move &&
             this.board[m.from.row][m.from.col] === piece &&
             m.to.row === move.to.row &&
             m.to.col === move.to.col
      );

      if (ambiguous.length > 0) {
        const sameFile = ambiguous.some(m => m.from.col === move.from.col);
        const sameRow = ambiguous.some(m => m.from.row === move.from.row);

        if (!sameFile) {
          san += fromSquare[0];
        } else if (!sameRow) {
          san += fromSquare[1];
        } else {
          san += fromSquare;
        }
      }

      if (captured) san += 'x';
      san += toSquare;
    }

    // Check / Checkmate suffix
    const state = this.cloneState();
    this.applyMoveInternal(move);
    const nextLegal = this.getLegalMoves(this.turn);
    const inCheck = this.isInCheck(this.turn);

    if (nextLegal.length === 0) {
      if (inCheck) san += '#';
    } else if (inCheck) {
      san += '+';
    }

    this.restoreState(state);

    return san;
  }

  updateGameStatus() {
    const legalMoves = this.getLegalMoves(this.turn);

    if (legalMoves.length === 0) {
      this.isGameOver = true;
      if (this.isInCheck(this.turn)) {
        this.gameResult = this.turn === 'w' ? '0-1' : '1-0';
        this.gameOverReason = 'checkmate';
      } else {
        this.gameResult = '1/2-1/2';
        this.gameOverReason = 'stalemate';
      }
      return;
    }

    // Insufficient material
    if (this.hasInsufficientMaterial()) {
      this.isGameOver = true;
      this.gameResult = '1/2-1/2';
      this.gameOverReason = 'insufficient-material';
      return;
    }

    // 50-move rule
    if (this.halfMoves >= 100) {
      this.isGameOver = true;
      this.gameResult = '1/2-1/2';
      this.gameOverReason = '50-move-rule';
      return;
    }
  }

  hasInsufficientMaterial() {
    const pieces = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (this.board[r][c]) pieces.push(this.board[r][c]);
      }
    }

    // K vs K
    if (pieces.length === 2) return true;

    // K+B vs K or K+N vs K
    if (pieces.length === 3) {
      const nonKings = pieces.filter(p => p[1] !== 'K');
      if (nonKings.length === 1 && (nonKings[0][1] === 'B' || nonKings[0][1] === 'N')) {
        return true;
      }
    }

    return false;
  }

  resign(color) {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.gameResult = color === 'w' ? '0-1' : '1-0';
    this.gameOverReason = 'resignation';
  }

  draw(reason = 'draw-agreement') {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.gameResult = '1/2-1/2';
    this.gameOverReason = reason;
  }

  getMaterialBalance() {
    const values = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
    let whiteTotal = 0;
    let blackTotal = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece) continue;
        const val = values[piece[1]] || 0;
        if (piece[0] === 'w') whiteTotal += val;
        else blackTotal += val;
      }
    }

    return {
      whiteTotal,
      blackTotal,
      diff: whiteTotal - blackTotal // positive means White ahead, negative means Black ahead
    };
  }

  /**
   * Static board evaluation for Computer AI
   */
  evaluateBoard() {
    const pieceValues = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = this.board[r][c];
        if (!piece) continue;

        const val = pieceValues[piece[1]] || 0;
        let positional = 0;

        // Central control bonus for pawns and knights
        if (piece[1] === 'P' || piece[1] === 'N') {
          if ((r === 3 || r === 4) && (c === 3 || c === 4)) positional += 25;
          else if (r >= 2 && r <= 5 && c >= 2 && c <= 5) positional += 12;
        }

        const total = val + positional;
        if (piece[0] === 'w') {
          score += total;
        } else {
          score -= total;
        }
      }
    }

    return score;
  }

  /**
   * Minimax with alpha-beta pruning
   */
  minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0 || this.isGameOver) {
      return this.evaluateBoard();
    }

    const color = isMaximizing ? 'w' : 'b';
    const moves = this.getLegalMoves(color);

    if (moves.length === 0) {
      if (this.isInCheck(color)) {
        return isMaximizing ? -50000 : 50000;
      }
      return 0; // Stalemate
    }

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const state = this.cloneState();
        this.applyMoveInternal(move);
        const evalScore = this.minimax(depth - 1, alpha, beta, false);
        this.restoreState(state);
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const state = this.cloneState();
        this.applyMoveInternal(move);
        const evalScore = this.minimax(depth - 1, alpha, beta, true);
        this.restoreState(state);
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * Determine best move for the AI based on difficulty level
   * @param {'beginner'|'casual'|'master'} difficulty 
   */
  getBestMove(difficulty = 'casual') {
    const moves = this.getLegalMoves(this.turn);
    if (moves.length === 0) return null;

    const isWhite = this.turn === 'w';

    // Beginner (~800 ELO): Pick from moves with slight preference for captures
    if (difficulty === 'beginner') {
      const captures = moves.filter(m => this.board[m.to.row][m.to.col] !== null);
      if (captures.length > 0 && Math.random() < 0.6) {
        return captures[Math.floor(Math.random() * captures.length)];
      }
      return moves[Math.floor(Math.random() * moves.length)];
    }

    // Casual (~1200 ELO): Depth 2
    // Master (~1600 ELO): Depth 3
    const searchDepth = difficulty === 'master' ? 3 : 2;

    let bestMove = moves[0];
    let bestScore = isWhite ? -Infinity : Infinity;

    for (const move of moves) {
      const state = this.cloneState();
      this.applyMoveInternal(move);
      const score = this.minimax(searchDepth - 1, -Infinity, Infinity, !isWhite);
      this.restoreState(state);

      if (isWhite) {
        if (score > bestScore) {
          bestScore = score;
          bestMove = move;
        }
      } else {
        if (score < bestScore) {
          bestScore = score;
          bestMove = move;
        }
      }
    }

    return bestMove;
  }
}
