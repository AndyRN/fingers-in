var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port', 5000);
app.use('/static', express.static(__dirname + '/static'));
app.get('/', function (request, response) {
  response.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(5000, function () {
  console.log('Listening...');
});

var inProgress = false;
var players = [];

io.on('connection', function(socket) {
  if (inProgress) {
    socket.emit('message', { message: 'Game in progress', inProgress: true });
  }

  socket.on('new-player', function(name) {
    console.log(name + ' joined the game');
    players.push({
      socket: socket,
      name: name,
      turn: false,
      finger: null,
      guess: null,
      responded: false
    });
    io.sockets.emit('message', { message: name + ' joined the game' });
  });

  socket.on('start-the-game', function() {
    var player = players.find(player => player.socket.id === socket.id);
    inProgress = true;
    io.sockets.emit('message', { message: player.name + ' started the game!', start: true });
    var selectedPlayer = players[Math.floor(Math.random() * players.length)];
    selectedPlayer.turn = true;
    io.sockets.emit('turn', { id: selectedPlayer.socket.id, message: 'Current turn: ' + selectedPlayer.name });
  });

  socket.on('finger', function(finger) {
    var player = players.find(player => player.socket.id === socket.id);
    player.finger = finger;
    if (finger) {
      socket.emit('message', { message: 'You left your finger in...'});
    } else {
      socket.emit('message', { message: 'You pulled your finger out...'});
    }
    determineResponse(player);
    processResults();
  });

  socket.on('guess', function(guess) {
    var player = players.find(player => player.socket.id === socket.id);
    player.guess = guess;
    socket.emit('message', { message: 'You think there will be ' + player.guess + ' finger(s) left in...'});
    determineResponse(player);
    processResults();
  });

  socket.on('disconnect', function() {
    var player = players.find(player => player.socket.id === socket.id);
    if (player) {
      console.log(player.name + ' left');
      var index = players.indexOf(currentPlayer);
      players.splice(index, 1);
    }
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
      var total = 0;
      players.forEach(player => {
        if (player.finger) {
          total++;
        }
      });
      io.sockets.emit('message', { message: 'There were ' + total + ' finger(s) left in!' });
      var currentPlayer = players.find(player => player.turn);      
      var index = players.indexOf(currentPlayer);
      if (currentPlayer.guess == total) {
        io.sockets.emit('message', { message: currentPlayer.name + ' was right!', nextRound: true });
        currentPlayer.socket.emit('end');
        players.splice(index, 1);
      } else {
        io.sockets.emit('message', { message: currentPlayer.name + ' was wrong...', nextRound: true });
      }
      players.forEach(player => {
        player.turn = false;
        player.finger = null;
        player.guess = null;
        player.responded = false;
      });
      var nextPlayer = players[0];
      if (players.length === 1) {
        io.sockets.emit('message', { message: 'Game over, ' + nextPlayer.name + ' lost!', restart: true });
        nextPlayer.socket.emit('end');
        players.splice(index, 1);
        inProgress = false;
      } else {
        if (index < players.length - 1) {
          nextPlayer = players[index + 1];
        }
        nextPlayer.turn = true;
        io.sockets.emit('message', { message: 'Next up is ' + nextPlayer.name });
        io.sockets.emit('turn', { id: nextPlayer.socket.id, message: 'Current turn: ' + nextPlayer.name });
      }
    }
  };
});
