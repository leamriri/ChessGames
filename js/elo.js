/**
 * ChessGames - Elo & Rank System
 * Standard FIDE Elo calculation with provisional placement and configurable ranks.
 * ZERO emojis used anywhere.
 */

const RankSystem = {
  // Configurable rank thresholds in one centralized object
  // Sub-ranks progression: Tier I -> Tier II -> Tier III
  TIERS: [
    { name: 'DIAMOND III', minElo: 1800, badge: 'Diamond III' },
    { name: 'DIAMOND II', minElo: 1700, badge: 'Diamond II' },
    { name: 'DIAMOND I', minElo: 1600, badge: 'Diamond I' },
    { name: 'PLATINUM III', minElo: 1533, badge: 'Platinum III' },
    { name: 'PLATINUM II', minElo: 1466, badge: 'Platinum II' },
    { name: 'PLATINUM I', minElo: 1400, badge: 'Platinum I' },
    { name: 'GOLD III', minElo: 1333, badge: 'Gold III' },
    { name: 'GOLD II', minElo: 1266, badge: 'Gold II' },
    { name: 'GOLD I', minElo: 1200, badge: 'Gold I' },
    { name: 'SILVER III', minElo: 1133, badge: 'Silver III' },
    { name: 'SILVER II', minElo: 1066, badge: 'Silver II' },
    { name: 'SILVER I', minElo: 1000, badge: 'Silver I' },
    { name: 'BRONZE III', minElo: 700, badge: 'Bronze III' },
    { name: 'BRONZE II', minElo: 400, badge: 'Bronze II' },
    { name: 'BRONZE I', minElo: 100, badge: 'Bronze I' }
  ],

  /**
   * Determine rank from Elo and ranked status.
   * If isRanked is false or elo is 0, player is UNRANKED.
   * @param {number} elo
   * @param {boolean} [isRanked=true]
   * @returns {string} e.g. "GOLD III" or "UNRANKED"
   */
  getRank(elo, isRanked = true) {
    if (!isRanked || !elo || elo <= 0) {
      return 'UNRANKED';
    }

    for (const tier of this.TIERS) {
      if (elo >= tier.minElo) {
        return tier.name;
      }
    }

    return 'BRONZE I';
  }
};

const EloSystem = {
  DEFAULT_ELO: 1200,
  PROVISIONAL_BASE: 1200,
  K_FACTOR: 32,
  MIN_ELO: 100,

  /**
   * Calculate expected score for player A facing player B
   * @param {number} ratingA 
   * @param {number} ratingB 
   * @returns {number} Expected score between 0 and 1
   */
  getExpectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  },

  /**
   * Calculate new Elo rating after a match.
   * Handles first-rated-game placement if player currently has 0 Elo (unranked).
   * @param {number} currentRating 
   * @param {number} opponentRating 
   * @param {number} actualScore 1 for win, 0.5 for draw, 0 for loss
   * @param {boolean} [isProvisional=false] whether this is player's first rated match
   * @param {number} [k=32] 
   * @returns {{newRating: number, change: number, isProvisional: boolean}}
   */
  calculateRating(currentRating, opponentRating, actualScore, isProvisional = false, k = EloSystem.K_FACTOR) {
    // If player has never completed a rated match (0 ELO / unranked)
    // First rated win sets initial rating into Gold III (1340) or Gold I
    if (isProvisional || currentRating <= 0) {
      let initialRating = this.PROVISIONAL_BASE;
      if (actualScore === 1) {
        initialRating = 1340; // Win first game -> 1340 ELO (GOLD III)
      } else if (actualScore === 0.5) {
        initialRating = 1200; // Draw first game -> 1200 ELO (GOLD I)
      } else {
        initialRating = 1180; // Loss first game -> 1180 ELO (SILVER III)
      }
      return {
        newRating: initialRating,
        change: initialRating,
        expected: 0.5,
        isProvisional: true
      };
    }

    // Standard rated player facing opponent
    const oppRating = opponentRating > 0 ? opponentRating : this.PROVISIONAL_BASE;
    const expected = this.getExpectedScore(currentRating, oppRating);
    const rawChange = k * (actualScore - expected);
    const change = Math.round(rawChange);
    const newRating = Math.max(this.MIN_ELO, currentRating + change);

    return {
      newRating,
      change: newRating - currentRating,
      expected: Math.round(expected * 100) / 100,
      isProvisional: false
    };
  },

  /**
   * Calculate rating changes for both White and Black.
   * Supports unranked players receiving their provisional initial rating.
   * @param {number} whiteRating 
   * @param {number} blackRating 
   * @param {'1-0'|'0-1'|'1/2-1/2'} result 
   * @param {boolean} [whiteIsProvisional=false]
   * @param {boolean} [blackIsProvisional=false]
   * @returns {{white: {newRating: number, change: number, isProvisional: boolean}, black: {newRating: number, change: number, isProvisional: boolean}}}
   */
  processMatchResult(whiteRating, blackRating, result, whiteIsProvisional = false, blackIsProvisional = false) {
    let whiteScore, blackScore;
    if (result === '1-0') {
      whiteScore = 1;
      blackScore = 0;
    } else if (result === '0-1') {
      whiteScore = 0;
      blackScore = 1;
    } else {
      whiteScore = 0.5;
      blackScore = 0.5;
    }

    const whiteCalc = this.calculateRating(whiteRating, blackRating, whiteScore, whiteIsProvisional);
    const blackCalc = this.calculateRating(blackRating, whiteRating, blackScore, blackIsProvisional);

    return {
      white: whiteCalc,
      black: blackCalc
    };
  }
};
