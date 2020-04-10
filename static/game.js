var socket = io();
var joined = false;

document.getElementById('confirm-new-player').addEventListener('click', function (event) {
  var name = document.getElementById('name').value;
  if (name.length > 1) {
    socket.emit('new-player', name);
    document.getElementById('new-player').style.display = 'none';
    document.getElementById('start-the-game').style.display = 'block';
    joined = true;
  } else {
    var textarea = document.getElementById('messages');
    textarea.value += 'Please enter a name!\r\n';
    textarea.scrollTop = textarea.scrollHeight;
  }
});

document.getElementById('confirm-start-the-game').addEventListener('click', function (event) {
  socket.emit('start-the-game');
});

document.getElementById('finger-in').addEventListener('click', function (event) {
  socket.emit('finger', true);
  document.getElementById('your-finger').style.display = 'none';
});

document.getElementById('finger-out').addEventListener('click', function (event) {
  socket.emit('finger', false);
  document.getElementById('your-finger').style.display = 'none';
});

document.getElementById('confirm-guess').addEventListener('click', function (event) {
  var guess = document.getElementById('guess').value;
  socket.emit('guess', guess);
  document.getElementById('your-turn').style.display = 'none';
  document.getElementById('guess').value = null;
});

socket.on('message', function(data) {
  var textarea = document.getElementById('messages');
  textarea.value += data.message + '\r\n';
  textarea.scrollTop = textarea.scrollHeight;
  if (data.start) {
    document.getElementById('new-player').style.display = 'none';
    document.getElementById('start-the-game').style.display = 'none';
    if (joined) {
      document.getElementById('game').style.display = 'block';
    }
  } else if (data.nextRound) {
    if (joined) {
      document.getElementById('your-finger').style.display = 'block';
    }
  } else if (data.inProgress) {
    document.getElementById('new-player').style.display = 'none';
  } else if (data.joinBack) {
    document.getElementById('start-the-game').style.display = 'none';
    document.getElementById('game').style.display = 'block';
  }
});

socket.on('turn', function(data) {
  document.getElementById('turn').innerHTML = data.message;
  if (data.id === socket.id) {
    document.getElementById('your-turn').style.display = 'block';
  }
});

socket.on('end', function() {
  document.getElementById('game').style.display = 'none';
  document.getElementById('new-player').style.display = 'block';
  joined = false;
});
