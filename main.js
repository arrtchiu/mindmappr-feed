var app = require('http').createServer(handler)
  , io = require('socket.io').listen(app)
  , redis = require('redis')
;

app.listen(process.env.PORT || 80);

function handler (req, res) {
  res.writeHead(200);
  res.end('This is not a web page!');
}

var redisClient = (function() {
  if (process.env.REDISCLOUD_URL) {
    var rtg = require("url").parse(process.env.REDISCLOUD_URL);
    var client = redis.createClient(rtg.port, rtg.hostname);
    client.auth(rtg.auth.split(":")[1]);
    return client;
  } else {
    return redis.createClient();
  }
})();

function validIdeaId(ideaId) {
  return /^\d+$/.test(ideaId);
}

function ideaRoom(ideaId, callback) {
  if (validIdeaId(ideaId))
    callback('idea:' + ideaId);
  else
    console.log('Invalid Idea ID "' + ideaId + '"');
}

redisClient.on('pmessage', function(pattern, channel, message) {
  console.log('channel: ' + channel + '; message: ' + message);
  io.sockets.in(channel).emit('idea-event', message);
});

redisClient.psubscribe('idea:*');

io.sockets.on('connection', function(socket) {
  socket.on('sub', function(ideaId) {
    console.log('sub ' + ideaId);
    ideaRoom(ideaId, function(roomId) {
      socket.join(roomId);
    });
  });

  socket.on('unsub', function(ideaId) {
    console.log('unsub ' + ideaId);
    ideaRoom(ideaId, function(roomId) {
      socket.leave(roomId);
    });
  });
})