// var levelup = require('levelup')
// var leveldown = require('leveldown')

// // 1) Create our database
// var db = levelup(leveldown('./mydb'))

// // 2) put a key & value
// db.put('name', 'LevelUP', function (err) {
//     if (err) return console.log('Ooops!', err) // some kind of I/O error

//     // 3) fetch by key
//     db.get('name', function (err, value) {
//         if (err) return console.log('Ooops!', err) // likely the key was not found

//         // ta da!
//         console.log('name=' + value)
//     })
// })