const ytdl = require('ytdl-core');

const Player = require('./player');
const questions = require('../data/test-questions.json');

const questionColors = require('../enums/question-colors');
const QCMValues = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

module.exports = class Game {
  constructor() {
    this.voiceChannel = null;
    this.voiceChannelConnection = null;
    this.textChannel = null;
    this.players = [];
    this.startedAt = new Date();
    this.questions = questions;
    this.activeQuestionIndex = 0;

    this.isInBuzz = null;
    this.playersAlreadyBuzzed = [];

    this.questionTimeRemaining = process.env.RESPONSE_TIME;
    this.questionInterval = null;
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

    if (!this.voiceChannelConnection) {
      this.textChannel.send(`Je n'ai pas réussi à m'initialiser correctement :(`);

      // Quitter le channel vocal
      this.voiceChannel.leave();
    }

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
        this.players.push(new Player(member.user.username, member.user.id));
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
    console.log(`Init question ${this.activeQuestionIndex + 1}`);
    this.initActiveQuestion();

    // Timer pour la question
    if (this.questions[this.activeQuestionIndex].type === 'MUSIC') {
      this.questionTimeRemaining = process.env.RESPONSE_MUSIC_TIME;
    } else {
      this.questionTimeRemaining = process.env.RESPONSE_TIME;
    }
    console.log(`(${this.activeQuestionIndex + 1}) Timer a ${this.questionTimeRemaining}`);

    this.questionInterval = setInterval(() => {
      // Lorsque le timer atteint 0
      if (this.questionTimeRemaining <= 0) {
        console.log(`Fin question ${this.activeQuestionIndex + 1}`);
        this.endActiveQuestion();
      }

      if (!this.isInBuzz) {
        // Si pas en buzz alors le timer continue
        this.questionTimeRemaining -= 1000;

        if (this.questionTimeRemaining >= 0 && this.questionTimeRemaining % 3 === 0) {
          this.textChannel.send(`Il reste ${this.questionTimeRemaining / 1000} secondes`);
        }
      }
    }, 1000);
  }

  /**
   * Affiche la question active sous forme embed
   * https://discordjs.guide/popular-topics/embeds.html#embed-preview
   */
  initActiveQuestion() {
    const activeQuestion = this.questions[this.activeQuestionIndex];

    // Si on a des propositions sur la question
    let fields = [];
    if (activeQuestion.propositions && activeQuestion.propositions.length > 0) {
      activeQuestion.propositions.forEach((proposition, index) => {
        fields.push({
          name: proposition.label,
          value: QCMValues[index],
        });
      });
    }

    // Si on a une image sur la question alors on ajoute un thumbnail
    let thumbnail = null;
    if (activeQuestion.image) {
      thumbnail = {
        url: activeQuestion.image,
      };
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
        name: `(${this.activeQuestionIndex + 1} / ${this.questions.length})  +${activeQuestion.points || 1} points`,
      },
      title: activeQuestion.label,
      ...(activeQuestion.hint && { description: `Indice : ${activeQuestion.hint}` }),
      ...(fields.length > 0 && { fields }),
      ...(thumbnail && { thumbnail }),
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
    // Clear l'interval timer de la question
    console.log(`(${this.activeQuestionIndex + 1}) clear interval`);
    clearInterval(this.questionInterval);

    // Arrete la musique si question MUSIC
    if (this.questions[this.activeQuestionIndex].type === 'MUSIC' && this.voiceChannelConnection && this.voiceChannelConnection.dispatcher) {
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
    console.log(`(${this.activeQuestionIndex + 1}) affichage réponse`);
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
    console.log('*** Fin de partie');
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
        name: player.username,
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
    console.log(`(${this.activeQuestionIndex + 1}) Joueur ${userId} a buzzé`);

    // Le joueur est enregistré ?
    if (!(this.players.some((p) => p.userId === userId))) return;

    // Temps restant ?
    if (this.questionTimeRemaining <= 0) return;

    // Déjà en buzz ?
    if (!!this.isInBuzz) return;

    // Le joueur a t-il déjà buzzé ?
    if (this.playersAlreadyBuzzed.includes(userId)) return;

    // Reaction sur la question en cours ?
    if (this.questionMessageId !== messageId) return;

    // Indication que état a BUZZ
    this.isInBuzz = userId;

    // Ajout à la liste des joueurs ayant déjà buzzé
    this.playersAlreadyBuzzed.push(userId);

    // Message pour savoir qui a buzzé
    this.textChannel.send(`<@${userId}> A buzzé !`)
      .then((msg) => {
        // Ajout de réactions
        msg.react('🆗')
          .then(() => msg.react('⛔'));
      });
  }

  buzzResponse(reaction) {
    console.log(`(${this.activeQuestionIndex + 1}) Admin reacted with : ${reaction.emoji.name}`);

    if (reaction.emoji.name === '🆗') {
      // Le joueur a bien répondu
      // Recherche du membre
      const player = this.players.find((player) => player.userId === this.isInBuzz);
      const pointsEarned = this.questions[this.activeQuestionIndex].points || 1;
      player.incrementScore(pointsEarned);

      this.textChannel.send(`<@${this.isInBuzz}> a trouvé la bonne réponse ! +${pointsEarned} points !`);

      this.isInBuzz = null;

      // Fin de la question prématuré
      this.endActiveQuestion();
    } else {
      // Suppression des réactions des joueurs sur le "buzzer"
      this.textChannel.messages.fetch(this.questionMessageId)
      .then((m) => {
        m.reactions.removeAll()
          .then(() => m.react('👍'))
          // On débloque le timer
          .then(() => {
            this.isInBuzz = null;
            this.textChannel.send(`FAUX ! La partie reprend, il reste ${this.questionTimeRemaining / 1000} secondes`);
          });
      })
      .catch((err) => {
        console.log(`error removing reactions : ${JSON.stringify(err)}`);
      });
    }
  }
}
