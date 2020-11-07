const Player = require('./player');
const questions = require('../data/questions.json');

module.exports = class Game {
  constructor() {
    this.voiceChannel = null;
    this.textChannel = null;
    this.players = [];
    this.startedAt = new Date();
    this.questions = questions;
    this.activeQuestionIndex = 0;
    this.openToAnswers = false;
  }

  /**
   * Débute une partie
   * - Enregistre les joueurs présents dans le channel vocal "Plateau"
   * - Lance un décompte de 3s avant la première question
   */
  start() {
    this.textChannel.send('La partie va commencer !');

    // Recherche des joueurs dans le channel vocal
    this.registerPlayers();

    // Décompte de début de partie
    this.countdown();

    // Lance la boucle de jeu
    this.gameLoop();
  };

  /**
   * Enregistre les joueurs présents dans le channel vocal "Plateau"
   * en créant des objets Player avec la référence de "member"
   * https://discord.js.org/#/docs/main/stable/class/GuildMember
   */
  registerPlayers() {
    // Recherche des joueurs dans le channel vocal
    this.voiceChannel.members.forEach((member) => {
      // Ne pas s'enregistrer soi
      // if (member.userID !== process.env.ADMIN_ID) {
        this.players.push(new Player(member));
        this.textChannel.send(`${member.displayName} enregistré`);
      // }
    });
  };

  /**
   * Lance un décompte de 3s en affichant le temps restant
   */
  countdown() {
    const COUNTDOWN_MS = 4000;
    let countdown = COUNTDOWN_MS / 1000;
    const countdownInterval = setInterval(() => {
      this.textChannel.send(`La partie commence dans ${countdown - 1} !`);
      countdown -= 1;
    }, 1000);
    setTimeout(() => {
      clearInterval(countdownInterval);
    }, COUNTDOWN_MS);
  };

  gameLoop() {
    // Affichage question
    console.log(`Question active : ${JSON.stringify(this.questions[this.activeQuestionIndex])}`);

    // Ouvrir aux réponses
    this.openToAnswers = true;

    // Temps pour répondre

    // Fermer aux réponses
    this.openToAnswers = false;

    // Affichage réponse

    // Prochaine question
    this.activeQuestionIndex += 1;
  }
}
