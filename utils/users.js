const users = [];

// insert user into array
function userJoin(id, username, room, score){
    const user = {
        id,
        username,
        room,
        score
    };

    users.push(user);

    return user;
}

// get user data
function getCurrentUser(id) {
    return users.find(user => user.id === id);
}

// user leaving
function userLeave(id){
    const index = users.find(user => user.id === id);

    if(index !== -1){
        return users.splice(index,1)[0];
    }
}

// gets users in a room
function getRoomUsers(room){
    return users.filter((user) => user.room === room);
}

module.exports = {
    userJoin,
    userLeave,
    getCurrentUser,
    getRoomUsers
}

