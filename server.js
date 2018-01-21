var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080;
var ip = process.env.IP || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var spymasterRed = false;
var spymasterBlue = false;
var room = {};
var users = 0;
var usersRed = 0;
var usersBlue = 0;
var cards = ["Brücke", "Himalaya", "Taucher", "Hochhaus", "Erdbeere",
			"Anzug", "Whiskey", "Millionär", "Flugzeug", "Atlas",
			"Saturn", "Katze", "Elefant", "Liebe", "Amsterdam",
			"Magazin", "Zeit", "Sofa", "Computer", "Gabel",
			"Verlag", "Island", "Gitarre", "Mittelmeer", "Ausgang"];
var colors = ["red","red","red","red","red",
				"red","red","red","red","blue",
				"blue","blue","blue","blue","blue",
				"blue","blue",'neut','neut','neut',
				'neut','neut','neut','neut','black'];
var shuffledColors = shuffle(colors);
var pattern = listToMatrix(shuffledColors,5);

//app.use(app.static('assets'));

app.get('/', function(req, res){
	res.sendFile(__dirname + '/index.html');
});

app.get('/style/', function(req, res){
	res.sendFile(__dirname + '/assets/style.css');
});

io.on('connection', function(socket){
	
	socket.on('disconnect', function(){
		users--;
		io.emit('user left',socket.id);
		if(room[socket.id].team == 0) {usersRed--;} else {usersBlue--;}
		console.log(users + ' ' + usersRed + ' ' + usersBlue);
		if(users < 4 && usersRed < 2 || usersBlue < 2) {
			io.emit('interrupt game','');
		}
		var message = {};
		message.author = room[socket.id].name;
		message.team = room[socket.id].team;
		message.content = '<em>left the game</em>';
		io.emit('chat message', message);
		delete room[socket.id];
	});
	
	socket.on('user registration', function(msg){
		users++;
		var user = {};
		user.id = socket.id;
		user.name = msg.name;
		user.team = msg.team;
		if(user.team == 0) {usersRed++;} else {usersBlue++;}
		room[socket.id] = user;	
		io.emit('user joined',user);
		console.log(room);
		for(var personId in room) {
			if(room[personId].id !== socket.id) {
				io.to(socket.id).emit('user joined',room[personId]);
			}
		}
		var message = {};
		message.author = user.name;
		message.team = user.team;
		if(user.team == 0) {var teamName = 'Team Red';} else {var teamName = 'Team Blue';}
		message.content = '<em>joined for ' + teamName + '</em>';
		io.emit('chat message', message);
		console.log('--- Setting spymaster button for ' + socket.id + ' to ' + room[socket.id].team);
		io.to(socket.id).emit('set spymaster button team',room[socket.id].team);
		if(users >= 4 && usersRed >= 2 && usersBlue >= 2) {
			io.emit('start game','');
		}
	});
	
	socket.on('check card',function(msg) {
		console.log('checking ' + msg);
		var position = msg.split("-");
		var cardInfo = {};
		cardInfo.yPos = position[1];
		cardInfo.xPos = position[2];
		cardInfo.color = pattern[position[1]][position[2]];
		console.log(cardInfo);
		io.emit('reveal card',cardInfo);
	});
	
	socket.on('chat message',function(msg) {
		var message = {};
		message.content = msg;
		message.author = room[socket.id].name;
		message.team = room[socket.id].team;
		console.log(message);
		io.emit('chat message', message);
	});
	
	socket.on('become spymaster',function(msg) {
		console.log(room[socket.id].name + ' wants to be spymaster');
		if(room[socket.id].team == 0 && !spymasterRed 
		|| room[socket.id].team == 1 && !spymasterBlue) {
			if(room[socket.id].team == 0) {spymasterRed = true;} else {spymasterBlue = true;}
			io.emit('become spymaster',room[socket.id].team);
			var message = {};
			message.author = room[socket.id].name;
			message.team = room[socket.id].team;
			if(room[socket.id].team == 0) {var teamName = 'Team Red';} else {var teamName = 'Team Blue';}
			message.content = '<em>became spymaster for ' + teamName + '</em>';
			io.emit('chat message', message);
			
			for(var i = 0; i <= 4; i++) {
				for(var j = 0; j <= 4; j++) {
					var cardInfo = {};
					cardInfo.yPos = i;
					cardInfo.xPos = j;
					cardInfo.color = pattern[i][j];
					console.log(cardInfo);
					io.to(socket.id).emit('reveal card',cardInfo);
				}
			}
			
			console.log('--- granted');
		} else {
			console.log('--- refused');
		}
	});
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app;

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
	
	return a;
}

function listToMatrix(list, elementsPerSubArray) {
    var matrix = [], i, k;

    for (i = 0, k = -1; i < list.length; i++) {
        if (i % elementsPerSubArray === 0) {
            k++;
            matrix[k] = [];
        }

        matrix[k].push(list[i]);
    }

    return matrix;
}