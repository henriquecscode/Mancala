const fs = require('fs');
module.exports.saveUsers = function (users) {
    let toSave = {}
    Object.keys(users).forEach(key => {
        toSave[key] = {};
        toSave[key].pass = users[key].pass;
        toSave[key].pass_plain = users[key].pass_plain;
        toSave[key].stats = users[key].stats;

    })
    let string = JSON.stringify(toSave);
    fs.writeFile('./server/data/players.json', string, (err) => {
        if (err) {
            console.log(err);
            return false;
        }
        else {
            console.log('Saving users at ' + Date.now());
            return true;
        }
    });
}

module.exports.loadUsers = function () {
    let string = fs.readFileSync('./server/data/players.json', 'utf8');
    if (string == '') { return {}; }
    data = JSON.parse(string);
    return data;
}