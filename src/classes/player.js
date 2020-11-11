module.exports = class Player {
  constructor(username, userId) {
    this.score = 0;
    this.username = username;
    this.userId = userId;
  }

  async incrementScore(points) {
    this.score += points;
  };
}
