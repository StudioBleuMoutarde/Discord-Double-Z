module.exports = class Player {
  constructor(member) {
    this.score = 0;
    this.member = member;
  }

  async incrementScore(points) {
    this.score += points;
  };
}
