const Player = require('./player');

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

    // Recherche des joueurs dans le channel vocal
    this.voiceChannel.members.forEach((member) => {
      this.players.push(new Player(member));
      this.textChannel.send(`${member.displayName} enregistré`);
    });
  };

  async registerPlayers() {

  };
}
