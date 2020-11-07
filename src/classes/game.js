const Player = require('./player');
const questions = require('../data/questions.json');

const questionTypes = require('../enums/question-types');
const questionColors = require('../enums/question-colors');

module.exports = class Game {
  constructor() {
    this.voiceChannel = null;
    this.textChannel = null;
    this.players = [];
    this.startedAt = new Date();
    this.questions = questions;
    this.activeQuestionIndex = 0;
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
   * 
   * Lance la boucle de jeu à la fin du décompte
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

      // Lancement de la boucle de jeu
      this.gameLoop();
    }, COUNTDOWN_MS);
  };

  gameLoop() {
    // Affichage question active
    this.displayActiveQuestion();

    // Temps pour répondre
    const filter = () => true;
    this.textChannel.awaitMessages(filter, { max: 50, time: 5000, errors: ['time'] })
      .then((messages) => {
        console.log(`- ${messages.first().author.username} a dit ${messages.first().content}`);

        // Vérification de la réponse

        // Recherche du joueur ayant répondu
      })
      .catch(() => {
        // Affichage réponse
        this.displayResponse();

        // Décompte avant prochaine question
        setTimeout(() => this.nextQuestion(), 3000);
      });
  }

  /**
   * Affiche la question active sous forme embed
   * https://discordjs.guide/popular-topics/embeds.html#embed-preview
   */
  displayActiveQuestion() {
    const activeQuestion = this.questions[this.activeQuestionIndex];
    const embedQuestion = {
      color: questionColors[activeQuestion.type],
      author: {
        name: `(${this.activeQuestionIndex + 1} / ${this.questions.length}) ${questionTypes[activeQuestion.type]}`,
      },
      title: activeQuestion.label,
      description: `Indice : ${activeQuestion.hint}`,
    };
    this.textChannel.send({ embed: embedQuestion });
  };

  /**
   * Affiche la réponse de la question active sous forme embed
   * https://discordjs.guide/popular-topics/embeds.html#embed-preview
   */
  displayResponse() {
    const activeQuestion = this.questions[this.activeQuestionIndex];
    const embedResponse = {
      color: questionColors.RESPONSE,
      title: activeQuestion.response,
    };
    this.textChannel.send({ embed: embedResponse });
  };

  nextQuestion() {
    // Si des questions encore disponible
    if (this.activeQuestionIndex >= this.questions.length - 1) {
      this.end();
      return;
    }

    // Incrément de la question active
    this.activeQuestionIndex += 1;

    // On relance la boucle de jeu
    this.gameLoop();
  };

  end() {
    this.textChannel.send('La partie est finie !');
  };
}
