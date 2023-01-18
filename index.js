const express = require('express');

const path = require('path');

const app =  express();

const http = require('http').Server(app);

const socketio = require('socket.io');

app.use(express.static(path.join(__dirname,"public")));

// const server = http.createServer(app);

const io = socketio(http);

let players = {};
let gameState = {};
let word = 'banana';

let rounds = 0;

const{
    userJoin,
    userLeave,
    getCurrentUser,
    getRoomUsers
} = require('./utils/users');

const formatMessage = require('./utils/messages');
const { data } = require('jquery');
const { log, time } = require('console');

const botName = 'Welcome Bot';

let timeScore = 0;

io.on('connection', (socket) => {
    // Socket represents a user that will be connecting
    socket.on('joinRoom', ({username,room,score}) => {
        const user = userJoin(
            socket.id,
            username,
            room,
            score
        )
        user.score = 0;
        socket.join(user.room);

        socket.on('timer', time =>{
            socket.broadcast.to(user.room).emit('drawingTimerBroadcast', time);
            timeScore = time.time;
        });

        socket.on('chooseWordTimer', time =>{
            socket.broadcast.to(user.room).emit('guessingTimerBroadcast', time);
        });

        socket.on('drawing', data => {
            socket.broadcast.to(user.room).emit('drawing', data);
        });

        socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat`));

        io.to(user.room).emit('roomUsers',{
            room:user.room,
            users:getRoomUsers(user.room),
        });
    })

    socket.on('chatMessage', (msg) => {
        const user = getCurrentUser(socket.id);
        handleGuess(msg);
    });

    socket.on('playerTurn', setPlayerDrawing);

        function setPlayerDrawing(){
            players[socket.id].drawing = true;
            io.sockets.emit('gameUpdate', {
                players,
                gameState
            });
            socket.emit('thisPlayerTurn', "It's your turn!");
            socket.broadcast.emit('stopTurn');
            socket.on('getWord', (word) =>{
                gameState = {playerDrawing: socket.id, word: word};
            });
            io.sockets.emit('gameUpdate', {players, gameState});
        }

        players[socket.id] = {id: socket.id, name: socket.username, score: 0, drawing: false};
        io.sockets.emit('gameUpdate', {players, gameState});

        if(Object.keys(players).length === 1){
            setPlayerDrawing();
        }

        // socket.on('outOfTime',setPlayerDrawing);

        function handleGuess(message){
            // Have if statement that checks round number and if round number is equal to max rounds then stop game.
            const user = getCurrentUser(socket.id);
            if((message.toLowerCase().includes(gameState.word)) && players[socket.id].drawing === false){
                if(message.toLowerCase() == gameState.word){
                    players[gameState.playerDrawing].score += timeScore;
                    players[socket.id].score += Math.floor(timeScore/2);
                    socket.broadcast.to(user.room).emit('updateGuesserScore', {
                        user: user.username,
                        guesserScore: players[socket.id].score
                    });
                    io.to(socket.id).emit('updateGuesserScore', {
                        user: user.username,
                        guesserScore: players[socket.id].score
                    });
                    players[gameState.playerDrawing].drawing = false;
                    io.to(user.room).emit('message', formatMessage(user.username, "I've found the word!"));
                    if(rounds < 5){
                        socket.on('clearCanvas', (socket) => {
                            io.to(user.room).emit('wipeCanvas')
                        });
                        setPlayerDrawing();
                        rounds++;
                    }else{
                        // add end screen code here:
                        io.emit('endGame');
                    }
                } else{
                    io.to(user.room).emit('message', formatMessage(user.username, "This was a close guess!"));
                    if(players[socket.id].drawing === false){
                        players[socket.id].score --;
                    }
                }
            } else if(!(message.toLowerCase().includes(gameState.word))){
                io.to(user.room).emit('message', formatMessage(user.username, message));
                if(players[socket.id].drawing === false){
                    players[socket.id].score --;
                }
            }
        }

    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user){
            io.to(user.room).emit(
                'message',
                formatMessage(botName, `${user.username} has left the chat`)
            );

            io.to(user.room).emit('roomUsers', {
                room:user.room,
                users:getRoomUsers(user.room),
                score:0
            });
        }

        try{
            if(players[socket.id].drawing === true){
                delete players[socket.id];
                try{
                    nextId = players[Object.keys(players)[0]].id;
                    io.to(`${nextId}`).emit('newPlayerTurn');
                } catch(e){
                    console.log('No players connected');
                }
            } else{
                delete players[socket.id];
            }
        } catch(e){
            console.log('player disconnected');
        }
    });

    // Emit a message to client
    socket.emit("welcomemessage", 'welcome to the chat');
});

const port = 8080;

http.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});