/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from "react";
import "./App.css";
import Players from "./players/Players";
import Square from "./square/square.jsx"; // Ensure the path is correct
import io from "socket.io-client";
import Swal from "sweetalert2"; // Correct import for SweetAlert2

const initialGameState = [
  [null, null, null],
  [null, null, null],
  [null, null, null],
];

function App() {
  const [gameState, setGameState] = useState(initialGameState);
  const [currentPlayer, setCurrentPlayer] = useState("X"); // Player starts with 'X'
  const [winner, setWinner] = useState(null);
  const [winningPath, setWinningPath] = useState([]);
  const [playOnline, setPlayOnline] = useState(false); // State to track if playing online
  const [playVsComputer, setPlayVsComputer] = useState(false); // State to track if playing vs computer
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [opponentName, setOpponentName] = useState(null);
  const [showResetButton, setShowResetButton] = useState(false);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true); // Track whose turn it is

  useEffect(() => {
    if (playVsComputer && currentPlayer === "O" && !winner) {
      setTimeout(() => {
        const [bestMoveRow, bestMoveCol] = findBestMove(gameState);
        handleSquareClick(bestMoveRow, bestMoveCol);
      }, 900); // Delay the computer move by 0.9 seconds
    }
  }, [currentPlayer, playVsComputer, gameState, winner]);

  useEffect(() => {
    if (socket) {
      socket.on("start_game", ({ opponent }) => {
        setOpponentName(opponent);
      });

      socket.on("opponent_move", ({ rowIndex, colIndex, move }) => {
        setGameState((prevGameState) => {
          const newGameState = prevGameState.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              rIdx === rowIndex && cIdx === colIndex ? move : cell
            )
          );
          return newGameState;
        });
        setCurrentPlayer((prevPlayer) => (prevPlayer === "X" ? "O" : "X"));
        setIsPlayerTurn(true); // Opponent has moved, now it's player's turn
      });

      socket.on("opponent_won", ({ winningLine }) => {
        setWinner("O"); // Opponent ('O') won
        setWinningPath(winningLine);
      });

      socket.on("draw", () => {
        setWinner("draw");
      });

      socket.on("player_joined", ({ playerName }) => {
        Swal.fire({
          title: "Welcome!",
          text: `${playerName} has joined the game.`,
          icon: "success",
          confirmButtonText: "OK",
        });
      });

      socket.on("opponent_joined", ({ playerName }) => {
        Swal.fire({
          title: "New Player!",
          text: `${playerName} has joined the game.`,
          icon: "info",
          confirmButtonText: "OK",
        });
      });

      socket.on("opponent_disconnected", ({ playerName }) => {
        Swal.fire({
          title: "Player Left",
          text: `${playerName} has left the game.`,
          icon: "warning",
          confirmButtonText: "OK",
        });
        setOpponentName(null); // Reset opponent name
        resetGame(); // Reset the game when the opponent disconnects
      });
    }
  }, [socket]);

  useEffect(() => {
    if (winner) {
      setShowResetButton(true);
    }
  }, [winner]);

  const checkWinner = (state) => {
    const lines = [
      // Horizontal wins
      [
        [0, 0],
        [0, 1],
        [0, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
      ],
      // Vertical wins
      [
        [0, 0],
        [1, 0],
        [2, 0],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
      ],
      // Diagonal wins
      [
        [0, 0],
        [1, 1],
        [2, 2],
      ],
      [
        [0, 2],
        [1, 1],
        [2, 0],
      ],
    ];

    for (let i = 0; i < lines.length; i++) {
      const [[aX, aY], [bX, bY], [cX, cY]] = lines[i];
      if (
        state[aX][aY] &&
        state[aX][aY] === state[bX][bY] &&
        state[aX][aY] === state[cX][cY]
      ) {
        return lines[i];
      }
    }
    return null;
  };

  const handleSquareClick = (rowIndex, colIndex) => {
    if (
      winner ||
      gameState[rowIndex][colIndex] !== null || // Check if square is already filled
      (!playVsComputer && !opponentName) || // Ensure opponent name is set in online play
      (!playVsComputer && !isPlayerTurn) // Ensure it's player's turn in online play
    ) {
      return;
    }

    const newGameState = gameState.map((row, rIdx) =>
      row.map((cell, cIdx) =>
        rIdx === rowIndex && cIdx === colIndex ? currentPlayer : cell
      )
    );

    const nextPlayer = currentPlayer === "X" ? "O" : "X";

    setGameState(newGameState);
    setCurrentPlayer(nextPlayer);
    setIsPlayerTurn(nextPlayer === "X"); // Update turn indicator based on next player

    if (playOnline) {
      socket.emit("player_move", {
        rowIndex,
        colIndex,
        move: currentPlayer,
      });
    }

    const winningLine = checkWinner(newGameState);
    if (winningLine) {
      setWinner(currentPlayer); // Current player wins
      setWinningPath(winningLine);
      if (playOnline) {
        socket.emit("player_won", { winningLine });
      }
    } else if (newGameState.flat().every((cell) => cell)) {
      setWinner("draw"); // It's a draw
      if (playOnline) {
        socket.emit("draw");
      }
    }
  };

  const resetGame = () => {
    setGameState(initialGameState);
    setCurrentPlayer("X");
    setWinner(null);
    setWinningPath([]);
    setShowResetButton(false);
    setIsPlayerTurn(true); // Reset turn to player's turn
  };

  const takePlayerName = async () => {
    const result = await Swal.fire({
      title: "Enter your name",
      input: "text",
      inputLabel: "Name",
      inputPlaceholder: "Enter your name",
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Cancel",
      inputValidator: (value) => {
        if (!value) {
          return "Please enter your name";
        }
      },
    });

    if (result.isConfirmed) {
      const name = result.value;
      setPlayerName(name);

      return name;
    } else {
      // Logic to handle cancellation or returning to the home page
      console.log("Returning to home page");
      window.location.href = "/";
      return null;
    }
  };

  socket?.on("connect", function () {
    setPlayOnline(true);
  });

  socket?.on("OpponentNotFound", () => {
    setOpponentName(false);
  });

  socket?.on("OpponentFound", (data) => {
    setOpponentName(data.opponentName);
  });

  const handlePlayOnlineClick = () => {
    takePlayerName().then((name) => {
      if (name) {
        const newSocket = io("https://tictactoe-server-1.azurewebsites.net/", {
          autoConnect: false,
        });
        newSocket.connect(); // Connect the socket when Play Online is clicked
        setSocket(newSocket);
        newSocket.emit("request_to_play", {
          playerName: name,
        });

        // Proceed with starting the game or other logic here
        console.log(`Player name is: ${name}`);
        setPlayOnline(true);

        // Listen for opponent found event
        newSocket.on("start_game", ({ opponent }) => {
          setOpponentName(opponent);
        });
      }
    });
  };

  const handlePlayVsComputerClick = () => {
    takePlayerName().then((name) => {
      if (name) {
        setPlayVsComputer(true);
      }
    });
  };

  const scores = {
    X: -10,
    O: 10,
    draw: 0,
    NONE: 0,
  };

  const checkAIWinner = (state) => {
    const winner = checkWinner(state);
    if (winner) {
      return state[winner[0][0]][winner[0][1]];
    }
    if (state.flat().every((cell) => cell)) {
      return "draw";
    }
    return "NONE";
  };

  const minimax = (board, depth, isMaximizingPlayer) => {
    var result = checkAIWinner(board);
    if (result !== "NONE") {
      return scores[result];
    }

    if (isMaximizingPlayer) {
      let bestScore = -999999999;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (!board[i][j]) {
            board[i][j] = "O";
            let score = minimax(board, depth + 1, false);
            board[i][j] = null;
            if (score > bestScore) {
              bestScore = score;
            }
          }
        }
      }
      return bestScore;
    } else {
      let bestScore = 999999999;
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (!board[i][j]) {
            board[i][j] = "X";
            let score = minimax(board, depth + 1, true);
            board[i][j] = null;
            if (score < bestScore) {
              bestScore = score;
            }
          }
        }
      }
      return bestScore;
    }
  };

  const findBestMove = (state) => {
    let bestScore = -999999999;
    let move = [-1, -1];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (!state[i][j]) {
          state[i][j] = "O";
          let score = minimax(state, 0, false);
          state[i][j] = null;
          if (score > bestScore) {
            bestScore = score;
            move = [i, j];
          }
        }
      }
    }
    return move;
  };

  return (
    <div className="App">
      <h1 className="app-title">Tic Tac Toe Battle</h1>
      {!playOnline && !playVsComputer && (
        <>
          <div className="buttons">
            <button
              className="play-online-button glow1"
              onClick={handlePlayOnlineClick}
            >
              Play Online
            </button>
            <button
              className="play-vs-computer-button glow1 play-online-button"
              onClick={handlePlayVsComputerClick}
            >
              Computer
            </button>
          </div>
        </>
      )}

      {playOnline && !opponentName && (
        <p className="waiting">Waiting for opponent .....</p>
      )}

      {(playOnline && opponentName) || playVsComputer ? (
        <>
          <div className="playerss">
            <div className="left">
              <Players />
              <div className="p1">{playerName}</div>
            </div>
            <div className="VS">
              <img
                src="https://img.icons8.com/?size=100&id=4ylXLFLMMHAW&format=png&color=000000"
                alt="vs"
              />
            </div>
            <div className="right">
              <Players />
              <div className="p2">
                {playVsComputer ? "Computer" : opponentName || "Opponent"}
              </div>
            </div>
          </div>
          <div className="square-gridss">
            {gameState.map((row, rowIndex) => (
              <div key={rowIndex} className="row">
                {row.map((value, colIndex) => {
                  const isWinningSquare = winningPath.some(
                    ([winRow, winCol]) =>
                      winRow === rowIndex && winCol === colIndex
                  );
                  return (
                    <Square
                      key={`${rowIndex}-${colIndex}`}
                      id={`${rowIndex}-${colIndex}`}
                      value={value}
                      onClick={() => handleSquareClick(rowIndex, colIndex)}
                      className={isWinningSquare ? "glow" : ""}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="turn-indicator">
            {playOnline ? (
              isPlayerTurn ? (
                <p>Your turn</p>
              ) : (
                <p>{opponentName || "Opponent"}'s turn</p>
              )
            ) : (
              <p>{isPlayerTurn ? "Your turn" : "Computer's turn"}</p>
            )}
          </div>
          {winner && (
            <div className="winner-message">
              {winner === "draw" ? "It's a draw!" : `Player ${winner} wins!`}
            </div>
          )}
          {showResetButton && (
            <div className="resetb-container">
              <button
                className="resetb play-online-button glow1"
                onClick={resetGame}
              >
                Reset
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

export default App;
