const { createServer } = require("http");
const { Server } = require("socket.io");

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: "https://tictactoe-react-game-one.vercel.app/",
});

const allUsers = {};

io.on("connection", (socket) => {
  allUsers[socket.id] = {
    socket: socket,
    online: true,
    playing: false,
    playerName: null, // Add playerName here
    gameBoard: Array(3)
      .fill(null)
      .map(() => Array(3).fill(null)),
  };

  socket.on("request_to_play", (data) => {
    const currentUser = allUsers[socket.id];
    currentUser.playerName = data.playerName;

    let opponentPlayer = null;
    for (const key in allUsers) {
      const user = allUsers[key];
      if (user.online && !user.playing && socket.id !== key) {
        opponentPlayer = user;
        break;
      }
    }

    if (opponentPlayer) {
      currentUser.playing = true;
      opponentPlayer.playing = true;

      currentUser.socket.emit("OpponentFound", {
        opponentName: opponentPlayer.playerName,
      });
      opponentPlayer.socket.emit("OpponentFound", {
        opponentName: currentUser.playerName,
      });

      // Emit start_game event to both players
      currentUser.socket.emit("start_game", {
        opponent: opponentPlayer.playerName,
        gameBoard: currentUser.gameBoard,
      });
      opponentPlayer.socket.emit("start_game", {
        opponent: currentUser.playerName,
        gameBoard: opponentPlayer.gameBoard,
      });
    } else {
      currentUser.socket.emit("OpponentNotFound");
    }
  });

  socket.on("disconnect", function () {
    if (allUsers[socket.id]) {
      allUsers[socket.id].online = false;
      allUsers[socket.id].playing = false;

      // Notify the opponent if the player disconnects during a game
      for (const key in allUsers) {
        const user = allUsers[key];
        if (user.playing && user.socket !== socket) {
          user.socket.emit("opponent_disconnected");
          user.playing = false;
        }
      }
    }
  });

  socket.on("player_move", ({ rowIndex, colIndex, move }) => {
    const currentUser = allUsers[socket.id];
    if (currentUser && currentUser.playing) {
      currentUser.gameBoard[rowIndex][colIndex] = move;

      for (const key in allUsers) {
        const opponent = allUsers[key];
        if (opponent.playing && opponent.socket !== socket) {
          opponent.socket.emit("opponent_move", {
            rowIndex,
            colIndex,
            move,
            gameBoard: currentUser.gameBoard,
          });
        }
      }
    }
  });

  socket.on("player_won", ({ winningLine }) => {
    const currentUser = allUsers[socket.id];
    if (currentUser && currentUser.playing) {
      for (const key in allUsers) {
        const opponent = allUsers[key];
        if (opponent.playing && opponent.socket !== socket) {
          opponent.socket.emit("opponent_won", { winningLine });
        }
      }
    }
  });

  socket.on("game_draw", () => {
    const currentUser = allUsers[socket.id];
    if (currentUser && currentUser.playing) {
      for (const key in allUsers) {
        const opponent = allUsers[key];
        if (opponent.playing && opponent.socket !== socket) {
          opponent.socket.emit("draw");
        }
      }
    }
  });
});
httpServer.listen(3000);
