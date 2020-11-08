const Player = require('./player');
const questions = require('../data/questions.json');

const constants = require('../data/constants');
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
    this.isOpenToAnswers = false;
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
    let countdown = constants.START_COUNTDOWN_MS / 1000;
    const countdownInterval = setInterval(() => {
      this.textChannel.send(`La partie commence dans ${countdown - 1} !`);
      countdown -= 1;
    }, 1000);
    setTimeout(() => {
      clearInterval(countdownInterval);

      // Lancement de la boucle de jeu
      this.gameLoop();
    }, constants.START_COUNTDOWN_MS);
  };

  /**
   * Boucle de jeu
   * 1 - On affiche la quesion
   * 2 - On ouvre les réponses
   * 3 - Attente du temps de la question
   * 4 - On affiche la réponse
   * 5 - Prochaine question
   */
  gameLoop() {
    // Affichage question active
    this.displayActiveQuestion();

    // Ouverture des réponses
    this.isOpenToAnswers = true;

    // Temps pour répondre
    setTimeout(() => {
      // Fermeture des réponses
      this.isOpenToAnswers = false;

      // Affichage réponse
      this.displayResponse();

      // Décompte avant prochaine question
      setTimeout(() => this.nextQuestion(), 3000);
    }, constants.RESPONSE_TIME);
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
      ...(activeQuestion?.hint && { description: `Indice : ${activeQuestion.hint}` }),
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
      title: `${activeQuestion.label} : ${activeQuestion.response}`,
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
    this.displayResults();
  };

  /**
   * Affiche les résultats de la partie sous forme embed
   * https://discordjs.guide/popular-topics/embeds.html#embed-preview
   */
  displayResults() {
    const embedResults = {
      color: questionColors.RESULTS,
      author: {
        name: 'Fin de partie',
      },
      title: 'Grand gagnant : ',
      fields: [
        {
          name: 'Joueur 1',
          value: '? points',
        },
        {
          name: 'Joueur 2',
          value: '? points',
        },
        {
          name: 'Joueur 3',
          value: '? points',
        },
      ],
    };
    this.textChannel.send({ embed: embedResults });
  };

  /**
   * Gestion de la réponse d'un joueur
   * Une réponse n'est acceptée que si les réponses sont ouvertes
   *
   * @param {*} message 
   */
  playerResponse(message) {
    if (!this.isOpenToAnswers) return;

    // Vérification de la réponse
    const regex = new RegExp(this.questions[this.activeQuestionIndex].response, 'i');
    if (regex.test(message.content)) {
      // Bonne réponse
      // Recherche du membre
      const player = this.players.find((player) => player.member.id === message.author.id);
      player.incrementScore(this.questions[this.activeQuestionIndex]?.points || 1);
    } else {
      // Mauvaise réponse
    }
  }
}
