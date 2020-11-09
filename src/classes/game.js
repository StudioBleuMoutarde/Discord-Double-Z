const ytdl = require('ytdl-core');

const Player = require('./player');
const questions = require('../data/questions.json');

const questionTypes = require('../enums/question-types');
const questionColors = require('../enums/question-colors');

module.exports = class Game {
  constructor() {
    this.voiceChannel = null;
    this.voiceChannelConnection = null;
    this.textChannel = null;
    this.players = [];
    this.startedAt = new Date();
    this.questions = questions;
    this.activeQuestionIndex = 0;

    this.isInBuzz = false;
    this.playersAlreadyBuzzed = [];

    this.questionTimeout = null;
    this.questionMessageId = null;
  }

  /**
   * Débute une partie
   * - Enregistre les joueurs présents dans le channel vocal "Plateau"
   * - Lance un décompte de 3s avant la première question
   */
  async start() {
    this.textChannel.send('La partie va commencer !');

    // Recherche des joueurs dans le channel vocal
    this.registerPlayers();

    // Le bot rejoint le channel vocal
    this.voiceChannelConnection = await this.voiceChannel.join();

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
      // Ne pas s'enregistrer soi, ni le bot
      if (!member.user.bot && member.user.id !== process.env.ADMIN_ID) {
        this.players.push(new Player(member));
        this.textChannel.send(`* ${member.displayName} enregistré`);
      }
    });
  };

  /**
   * Lance un décompte de 3s en affichant le temps restant
   * 
   * Lance la boucle de jeu à la fin du décompte
   */
  countdown() {
    let countdown = process.env.START_COUNTDOWN_MS / 1000;
    const countdownInterval = setInterval(() => {
      this.textChannel.send(`La partie commence dans ${countdown - 1} !`);
      countdown -= 1;
    }, 1000);
    setTimeout(() => {
      clearInterval(countdownInterval);

      // Lancement de la boucle de jeu
      this.gameLoop();
    }, process.env.START_COUNTDOWN_MS);
  };

  /**
   * Boucle de jeu
   * 1 - On affiche la quesion active
   * 2 - Attente du temps de la question
   * 3 - On affiche la réponse
   */
  gameLoop() {
    // Affichage question active
    this.initActiveQuestion();

    // Temps pour répondre
    // Plus de temps pour les musiques
    this.questionTimeout = setTimeout(() => {
      this.endActiveQuestion();
    }, this.questions[this.activeQuestionIndex].type === 'MUSIC' ? process.env.RESPONSE_MUSIC_TIME : process.env.RESPONSE_TIME);
  }

  /**
   * Affiche la question active sous forme embed
   * https://discordjs.guide/popular-topics/embeds.html#embed-preview
   */
  initActiveQuestion() {
    const activeQuestion = this.questions[this.activeQuestionIndex];

    // Pour les questions QCM on a des propositions
    let fields = [];
    if (activeQuestion.type === 'QCM') {
      activeQuestion.propositions.forEach((proposition) => {
        fields.push({
          name: proposition.label,
          value: proposition.value,
        });
      });
    }

    // Pour les questions musique, on lance la musique
    if (activeQuestion.type === 'MUSIC') {
      // Lancer la musique
      this.voiceChannelConnection
        .play(
          ytdl(activeQuestion.url),
          {
            volume: 0.1,
          }
        )
        .on('error', (error) => {
          this.textChannel.send(`Erreur lors de la lecture de la musique : ${JSON.stringify(error)}`);
        });
    }

    const embedQuestion = {
      color: questionColors[activeQuestion.type],
      author: {
        name: `(${this.activeQuestionIndex + 1} / ${this.questions.length}) ${questionTypes[activeQuestion.type]}`,
      },
      title: activeQuestion.label,
      ...(activeQuestion.hint && { description: `Indice : ${activeQuestion.hint}` }),
      ...(fields.length > 0 && { fields }),
    };
    this.textChannel.send({ embed: embedQuestion })
      .then((msg) => {
        this.questionMessageId = msg.id;

        // Ajout de réactions
        msg.react('👍');
      });
  };

  /**
   * Termine la question active
   * - Ferme les réponses
   * - Affiche la réponse
   * - Passe à la question suivante après un certain temps
   */
  endActiveQuestion() {
    // Arrete la musique si question MUSIC
    if (this.questions[this.activeQuestionIndex].type === 'MUSIC') {
      this.voiceChannelConnection.dispatcher.end();
    }

    // Affichage réponse
    this.displayResponse();

    // Décompte avant prochaine question
    setTimeout(() => this.nextQuestion(), process.env.DISPLAY_RESPONE_TIME);
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

  /**
   * Incrémente l'index de la question active si il en reste, sinon termine la partie
   */
  nextQuestion() {
    // Si des questions encore disponible
    if (this.activeQuestionIndex >= this.questions.length - 1) {
      this.end();
      return;
    }

    // Incrément de la question active
    this.activeQuestionIndex += 1;

    // Reset des infos
    this.playersAlreadyBuzzed = [];

    // On relance la boucle de jeu
    this.gameLoop();
  };

  end() {
    this.displayResults();

    // Quitter le channel vocal
    this.voiceChannel.leave();
  };

  /**
   * Affiche les résultats de la partie sous forme embed
   * https://discordjs.guide/popular-topics/embeds.html#embed-preview
   */
  displayResults() {
    // Tri des joueurs par score
    const sortedPlayers = this.players.sort((a, b) => b.score - a.score);

    // Récupération du score des joueurs
    const fields = sortedPlayers.map((player) => {
      return {
        name: player.member.user.username,
        value: `${player.score} points`,
      }
    });

    const embedResults = {
      color: questionColors.RESULTS,
      author: {
        name: 'Fin de partie',
      },
      title: `GG ${fields[0].name}`,
      fields,
    };
    this.textChannel.send({ embed: embedResults });
  };

  /**
   * Gestion du buzz d'un joueur
   * @param {*} userId 
   */
  buzz(userId, messageId) {
    // Déjà en buzz ?
    if (this.isInBuzz) return;

    // Le joueur a t-il déjà buzzé ?
    if (this.playersAlreadyBuzzed.includes(userId)) return;

    // Reaction sur la question en cours ?
    if (this.questionMessageId !== messageId) return;

    // Indication que état a BUZZ
    this.isInBuzz = true;

    // Ajout à la liste des joueurs ayant déjà buzzé
    this.playersAlreadyBuzzed.push(userId);

    // Message pour savoir qui a buzzé
    this.textChannel.send(`<@${userId}> A buzzé !`);

    // Mise en pause du timer de question
  }
}
