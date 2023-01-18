const chatForm = document.getElementById('chat-form');
const chatMessage = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

const {username,room} = Qs.parse(location.search, {
    ignoreQueryPrefix:true
});

const socket = io();

socket.emit('joinRoom', {
    username,
    room
});

socket.on('message', (message) => {
    outputMessage(message);

    chatMessage.scrollTop = chatMessage.scrollHeight;
})

socket.on('roomUsers',({room,users}) => {
    outputRoomName(room),
    outputUsers(users)
});

function outputRoomName(room){
    roomName.innerText = room;
}

function outputUsers(users){
    userList.innerHTML = '';
    users.forEach((user) => {
        const li = document.createElement('li');
        li.setAttribute('class','user-list');
        li.innerText = user.username + "\t" + user.score;
        userList.appendChild(li);
    })
}

function outputMessage(message){
    const section = document.createElement('section');
    section.classList.add('message');
    const p = document.createElement('p');
    p.classList.add('meta');
    p.innerText = message.username;
    p.innerHTML += `<span> ${message.time}</span>`;
    section.appendChild(p);
    const para = document.createElement('p');
    para.classList.add('text');
    para.innerText = message.text;
    section.appendChild(para);
    document.querySelector('.chat-messages').appendChild(section);
}

document.getElementById('leave-btn').addEventListener('click', () =>{
    const leaveRoom = confirm('Are you sure you would like to leave the room?');
    if(leaveRoom){
        window.location = '../index.html';
    }
})

socket.on('endGame', () => {
    window.location = '../index.html'
});

chatForm.addEventListener('submit', (e) => {
    e.preventDefault();

    let msg = e.target.elements.msg.value;

    msg = msg.trim();

    if(!msg){
        return false;
    }

    socket.emit('chatMessage', msg);

    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
})

// // Canvas Drawing Code:
// Context of canvas
const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const eraser = document.getElementById('eraser');
const paintBrush = document.getElementById('paintbrush');

// configuration
let isDrawing = false;
let current = {
    color: "black"
};
const xOffset = canvas.offsetLeft;
const yOffset = canvas.offsetTop;

canvas.width = innerWidth + xOffset;
canvas.height = innerHeight + yOffset;

canDraw = false;

function throttle(callback, delay){
    let previousCall = new Date().getTime();
    return function(){
        let time = new Date().getTime();

        if(time - previousCall >= delay){
            previousCall = time;
            callback.apply(null, arguments);
        }
    };
}

function drawLine(x0,y0,x1,y1,color,emit){
    ctx.beginPath();
    ctx.moveTo(x0,y0);
    ctx.lineTo(x1,y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.closePath();

    if(!emit){
        return;
    }

    const w = canvas.width;
    const h = canvas.height;

    socket.emit('drawing', {
        x0: x0/w,
        y0: y0/h,
        x1: x1/w,
        y1: y1/h,
        color: color
    });
}

// Event handling
function onMouseDown (e){
    if(canDraw){
    isDrawing = true;
    current.x = e.pageX;
    current.y = e.pageY;
    }
}

function onMouseUp (e){
    if(canDraw){
    if(!isDrawing){
        return;
    }
    isDrawing = false;

    drawLine(
        current.x,
        current.y,
        e.pageX,
        e.pageY,
        current.color,
        true
    );
    }
}

function onMouseMove (e){
    if(canDraw){
    if(!isDrawing){
        return;
    }

    drawLine(
        current.x,
        current.y,
        e.pageX,
        e.pageY,
        current.color,
        true
    );

    current.x = e.pageX;
    current.y = e.pageY;
    }
}

function setToEraser(){
    current.color = "white";
}

function setToPaintBrush(){
    current.color = "black";
}

// Desktop
canvas.addEventListener('mousedown', onMouseDown, false);
canvas.addEventListener('mouseup', onMouseUp, false);
canvas.addEventListener('mouseout', onMouseUp, false);
canvas.addEventListener('mousemove', onMouseMove, false);
eraser.addEventListener('mousedown', setToEraser, false);
paintBrush.addEventListener('mousedown', setToPaintBrush, false);

// Mobile
canvas.addEventListener('touchstart', onMouseDown, false);
canvas.addEventListener('touchend', onMouseUp, false);
canvas.addEventListener('touchcancel', onMouseUp, false);
canvas.addEventListener('touchmove', throttle(onMouseMove, 10), false);

function onDrawingEvent(data){
    const w = canvas.width;
    const h = canvas.height;
    drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h);
}

socket.on('drawing', onDrawingEvent);

// Game Logic

let playerTurn = false;
const wordDisplay = document.getElementById('pictionary-word');
const timeDisplay = document.getElementById('pictionary-timer');
const choice1 = document.getElementById('choice1');
const choice2 = document.getElementById('choice2');
const choice3 = document.getElementById('choice3');

function hideChoices(){
    choice1.style.display = 'none';
    choice2.style.display = 'none';
    choice3.style.display = 'none';
}

function displayChoices(){
    choice1.style.display = 'inline-block',
    choice2.style.display = 'inline-block';
    choice3.style.display = 'inline-block';
}

socket.on('thisPlayerTurn', function (msg){
    socket.emit('clearCanvas'),
    canDraw = true,
    playerTurn = true,
    displayChoices(),
    getWords()
});

socket.on('newPlayerTurn', () => {
    socket.emit('playerTurn');
    timeDisplay.innerHTML = '';
});

function getWords(){
    const words = [
        "word", "letter", "number", "person", "pen", "police", "people",
        "sound", "water", "breakfast", "place", "man", "men", "woman", "women", "boy",
        "girl", "serial killer", "Oregon Trail", "week", "month", "name", "sentence", "line", "air",
        "land", "home", "hand", "house", "picture", "animal", "mother", "father",
        "big foot", "sister", "world", "head", "page", "country", "question",
        "shiba inu", "school", "plant", "food", "sun", "state", "eye", "city", "tree",
        "farm", "story", "sea", "night", "day", "life", "north", "south", "east",
        "west", "child", "children", "example", "paper", "music", "river", "car",
        "Power Rangers", "feet", "book", "science", "room", "friend", "idea", "fish",
        "mountain", "horse", "watch", "color", "face", "wood", "list", "bird",
        "body", "fart", "family", "song", "door", "forest", "wind", "ship", "area",
        "rock", "Captain Planet", "fire", "problem", "airplane", "top", "bottom", "king",
        "space", "whale", "unicorn", "narwhal", "furniture", "sunset", "sunburn", "Grumpy cat", "feather", "pigeon"
    ];

    let wordsToChoose = [];

    for (let i = 0; i < 3; i++) {
        wordsToChoose[i] = words[Math.floor(Math.random() * words.length)];
    }

    chooseWord(wordsToChoose);
}

function chooseWord(words){
    let word = '';

    choice1.innerHTML = words[0];

    choice2.innerHTML = words[1];

    choice3.innerHTML = words[2];

    choice1.addEventListener("click", function () {
        setWord(choice1);
    });
    choice2.addEventListener("click", function () {
        setWord(choice2);
    });
    choice3.addEventListener("click", function () {
        setWord(choice3);
    });

    let countDownStartTime = 10;
    let currentTime = setInterval(function(){
        if(word === ''){
        if (countDownStartTime <= 0) {
            let choice = Math.floor(Math.random() * 3);
            switch(choice){
            case 1:
                setWord(choice1);
                break;
            case 2:
                setWord(choice2);
                break;
            case 3:
                setWord(choice3);
                break;
            }
            clearInterval(currentTime);
          }else{
            wordDisplay.innerHTML = "It's your turn to choose a word: ";
            timeDisplay.innerHTML = countDownStartTime;
            socket.emit('chooseWordTimer', {
                time: countDownStartTime
            });
          }
          if(word === ''){
            countDownStartTime -= 1;
          }else{
            clearInterval(countDownStartTime);
          }
        }
          
    },1000);

    function startDrawingCountDown(time){
        let countDownStartTime = time;
        guessTimer = setInterval(function(){
            countDownStartTime -= 1,
            timeDisplay.innerHTML = countDownStartTime
            socket.emit('timer', {
                time: countDownStartTime
            });
            if(canDraw == false){
                clearInterval(guessTimer);
            }
            if(countDownStartTime <= 0){
                clearInterval(guessTimer);
                socket.emit('outOfTime');
            }
        },1000);
    }

    function setWord(button) {
        word = button.innerHTML;
        socket.emit('getWord', word);
        wordDisplay.innerHTML = word;
        hideChoices();
        startDrawingCountDown(60);
    }

    function clearCanvas(){
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    socket.on('stopTurn', () => {
        canDraw = false,
        playerTurn = false
        hideChoices()
        clearInterval(guessTimer);
        wordDisplay.innerHTML = 'The next player is drawing...';
    });

    socket.on('wipeCanvas', clearCanvas)
    
    socket.on('drawingTimerBroadcast', time => {
        if(canDraw === false){
            timeDisplay.innerHTML = time.time;
        }
    });

    socket.on('guessingTimerBroadcast', time =>{
        if(canDraw === false){
            timeDisplay.innerHTML = time.time;
        }
    })

    // Update User scores
    
    function updateUsers(user, score){
        let userNodes = userList.childNodes;

        for (let i= 0; i< userNodes.length; i++) {
            if(userNodes[i].innerHTML.includes(user)){
                userNodes[i].innerHTML = user + '\t' + score;
            }   
        }
    }

    socket.on('updateGuesserScore', data =>{
        user: data.user;
        guesserScore: data.guesserScore;
        updateUsers(data.user, data.guesserScore);
    });
}