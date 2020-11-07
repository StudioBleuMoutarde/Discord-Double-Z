module.exports = class Game {
  constructor() {
    this.channel = null;
    this.players = [];
    this.startedAt = new Date();
    this.questions = [];
    this.activeQuestionIndex = 0;
  }

  async start(message) {
    message.reply('La partie va commencer !');
  };

  async registerPlayers() {

  };
}
