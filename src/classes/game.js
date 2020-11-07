module.exports = class Game {
  constructor() {
    this.voiceChannel = null;
    this.textChannel = null;
    this.players = [];
    this.startedAt = new Date();
    this.questions = [];
    this.activeQuestionIndex = 0;
  }

  async start() {
    this.textChannel.send('La partie va commencer !');
  };

  async registerPlayers() {

  };
}
