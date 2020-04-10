var socket = io();
var joined = false;
var playing = false;

function spectateState() {
  document.getElementById('join-game').style.display = 'none';
  document.getElementById('start-game').style.display = 'none';
  document.getElementById('game').style.display = 'none';
  document.getElementById('current-turn').style.display = 'none';
  document.getElementById('your-finger').style.display = 'none';
  document.getElementById('your-guess').style.display = 'none';
}

function readyState() {
  document.getElementById('join-game').style.display = 'block';
  document.getElementById('start-game').style.display = 'none';
  document.getElementById('game').style.display = 'none';
  document.getElementById('current-turn').style.display = 'none';
  document.getElementById('your-finger').style.display = 'none';
  document.getElementById('your-guess').style.display = 'none';
}

function startGameState() {
  document.getElementById('join-game').style.display = 'none';
  document.getElementById('start-game').style.display = 'block';
  document.getElementById('game').style.display = 'none';
  document.getElementById('current-turn').style.display = 'none';
  document.getElementById('your-finger').style.display = 'none';
  document.getElementById('your-guess').style.display = 'none';
}

function playingState() {
  document.getElementById('join-game').style.display = 'none';
  document.getElementById('start-game').style.display = 'none';
  document.getElementById('game').style.display = 'block';
  document.getElementById('current-turn').style.display = 'block';
  document.getElementById('your-finger').style.display = 'block';
  document.getElementById('your-guess').style.display = 'none';
}

socket.on('in-progress', function() {
  spectateState();
});

document.getElementById('join-game-button').addEventListener('click', function () {
  var name = document.getElementById('name').value;
  if (name.length > 0) {
    socket.emit('join-game', name);
  } else {
    var textarea = document.getElementById('messages');
    textarea.value += 'Please enter a name!\r\n';
    textarea.scrollTop = textarea.scrollHeight;
  }
});

socket.on('joined-game', function(data) {
  if (data.inProgress) {
    playingState();
  } else {
    startGameState();
  }
  joined = true;
  playing = true;
});

document.getElementById('start-game-button').addEventListener('click', function () {
  socket.emit('start-game');
});

socket.on('next-round', function() {
  if (joined && playing) {
    playingState();
  } else if (joined && !playing) {
    readyState();
  } else {
    spectateState();
  }
});

socket.on('current-turn', function(data) {
  document.getElementById('current-turn').innerHTML = data.message;
});

socket.on('your-turn', function() {
  document.getElementById('your-guess').style.display = 'block';
});

document.getElementById('finger-in').addEventListener('click', function () {
  socket.emit('finger', true);
});

document.getElementById('finger-out').addEventListener('click', function () {
  socket.emit('finger', false);
});

socket.on('finger-confirmed', function() {
  document.getElementById('your-finger').style.display = 'none';
});

document.getElementById('guess-button').addEventListener('click', function () {
  var guess = document.getElementById('guess').value;
  socket.emit('guess', guess);
});

socket.on('guess-confirmed', function() {
  document.getElementById('your-guess').style.display = 'none';
  document.getElementById('guess').value = null;
});

socket.on('message', function(data) {
  var textarea = document.getElementById('messages');
  textarea.value += data.message + '\r\n';
  textarea.scrollTop = textarea.scrollHeight;
});

socket.on('out', function() {
  readyState();
  playing = false;
});

socket.on('game-over', function() {
  readyState();
  joined = false;
  playing = false;
});
