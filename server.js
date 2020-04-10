var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);
var port = process.env.PORT || 3000;

app.set('port', port);
app.use('/static', express.static(__dirname + '/static'));
app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, function () {
  console.log('Listening on ' + port + '...');
});

var inProgress = false;
var players = [];

io.on('connection', function(socket) {
  if (inProgress) {
    socket.emit('message', { message: 'Game in progress' });
    socket.emit('in-progress');
  }

  socket.on('join-game', function(name) {
    players.push({
      socket: socket,
      name: name,
      turn: false,
      finger: null,
      guess: null,
      skip: false,
      responded: false
    });

    if (inProgress) {
      io.sockets.emit('message', { message: name + ' is back in' });
      var currentPlayer = players.find(player => player.turn);
      io.sockets.emit('current-turn', { message: currentPlayer.name + ' is up. There are ' + players.length + ' players remaining.' });
    } else {
      io.sockets.emit('message', { message: name + ' joined the game' });
    }

    socket.emit('joined-game', { inProgress: inProgress });
  });

  socket.on('start-game', function() {
    var player = players.find(player => player.socket.id === socket.id);
    if (players.length > 1) {
      inProgress = true;
      io.sockets.emit('message', { message: player.name + ' started the game!' });
      io.sockets.emit('next-round');
      var currentPlayer = players[Math.floor(Math.random() * players.length)];
      currentPlayer.turn = true;
      currentPlayer.socket.emit('your-turn');
      io.sockets.emit('current-turn', { message: currentPlayer.name + ' is up. There are ' + players.length + ' players remaining.' });
    } else {
      socket.emit('message', { message: 'Need more than one player to join to start a game...' });
    }
  });

  socket.on('finger', function(finger) {
    var player = players.find(player => player.socket.id === socket.id);
    player.finger = finger;
    if (finger) {
      socket.emit('message', { message: 'You left your finger in...'});
    } else {
      socket.emit('message', { message: 'You pulled your finger out...'});
    }
    socket.emit('finger-confirmed');
    io.sockets.emit('message', { message: player.name + ' did something with their finger...' });
    determineResponse(player);
    processResults();
  });

  socket.on('guess', function(guess) {
    var player = players.find(player => player.socket.id === socket.id);
    player.guess = guess;
    socket.emit('message', { message: 'You think there will be ' + player.guess + ' finger(s) left in...'});
    socket.emit('guess-confirmed');
    io.sockets.emit('message', { message: player.name + ' guessed how many fingers will be left in...' });
    determineResponse(player);
    processResults();
  });

  function determineResponse(player) {
    if (player.turn) {
      player.responded = player.finger !== null && player.guess !== null;
    } else {
      player.responded = player.finger !== null;
    }
  };

  function processResults() {
    if (players.every(player => player.responded)) {
      var totalFingers = 0;
      players.forEach(player => {
        if (player.finger) {
          totalFingers++;
        }
      });

      io.sockets.emit('message', { message: 'There were ' + totalFingers + ' finger(s) left in!' });

      var currentPlayer = players.find(player => player.turn);
      var index = players.indexOf(currentPlayer);

      if (currentPlayer.guess == totalFingers) {
        io.sockets.emit('message', { message: currentPlayer.name + ' was right!' });
        currentPlayer.socket.emit('out');
        players.splice(index, 1);
        index--;
      } else if (currentPlayer.guess > players.length) {
        io.sockets.emit('message', { message: currentPlayer.name + ' guessed more than there are players, stupid call, skip a go!' });
        currentPlayer.skip = true;
      } else if (currentPlayer.guess == 0 && currentPlayer.finger) {
        io.sockets.emit('message', { message: currentPlayer.name + ' guessed there would be none but left their finger in, stupid call, skip a go!' });
        currentPlayer.skip = true;
      } else {
        io.sockets.emit('message', { message: currentPlayer.name + ' was wrong...' });
      }
      
      io.sockets.emit('next-round');

      players.forEach(player => {
        player.turn = false;
        player.finger = null;
        player.guess = null;
        player.responded = false;
      });

      if (players.length > 1) {
        var nextPlayer;
        var playerDetermined = false;
        while (!playerDetermined) {
          if (index < players.length - 1) {
            index++;
          } else {
            index = 0;
          }
          nextPlayer = players[index];
          if (!nextPlayer.skip) {
            playerDetermined = true;
          } else {
            io.sockets.emit('message', { message: nextPlayer.name + ' is skipping a go for their stupidity' });
            nextPlayer.skip = false;
          }
        }
        nextPlayer.turn = true;
        nextPlayer.socket.emit('your-turn');
        io.sockets.emit('message', { message: 'Next up is ' + nextPlayer.name });
        io.sockets.emit('current-turn', { message: nextPlayer.name + ' is up. There are ' + players.length + ' players remaining.' });
      } else {
        io.sockets.emit('message', { message: 'The loser is ' + players[0].name });
        gameOver();
      }
    }
  };

  function gameOver() {
    io.sockets.emit('message', { message: 'Game over' });
    io.sockets.emit('message', { message: '----------------------------------------' });
    io.sockets.emit('game-over');
    players = [];
    inProgress = false;
  }

  socket.on('disconnect', function() {
    var player = players.find(player => player.socket.id === socket.id);
    if (player) {
      io.sockets.emit('message', { message: player.name + ' left the game' });
      var index = players.indexOf(player);  
      players.splice(index, 1);
      index--;

      if (inProgress) {
        if (players.length > 1) {
          var currentPlayer = players.find(player => player.turn);
          if (currentPlayer == null) {
            var playerDetermined = false;
            while (!playerDetermined) {
              if (index < players.length - 1) {
                index++;
              } else {
                index = 0;
              }
              currentPlayer = players[index];
              if (!currentPlayer.skip) {
                playerDetermined = true;
              } else {
                io.sockets.emit('message', { message: currentPlayer.name + ' is skipping a go for their stupidity' });
                currentPlayer.skip = false;
              }
            }
            currentPlayer.turn = true;
            currentPlayer.socket.emit('your-turn');
          }
          io.sockets.emit('current-turn', { message: currentPlayer.name + ' is up. There are ' + players.length + ' players remaining.' });
          processResults();
        } else {
          gameOver();
        }
      }
    }
  });
});
