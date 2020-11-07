module.exports = class Player {
  constructor(playerId) {
    this.id = playerId;
    this.score = 0;
  }

  async incrementScore(points) {
    this.score += points;
  };
}
