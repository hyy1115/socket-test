var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3077;

// 路由
//app.get('/', function(req, res){
//    res.send('<h1>Hello world</h1>');
//});

server.listen(port, function () {
    console.log('Server listening at port %d', port);
});

app.use(express.static(path.join(__dirname, 'client')));

// 聊天室

var numUsers = 0;

io.on('connection', function (socket) {
    var addedUser = false;
    
    // 当客户端发出“新消息”时，这个监听并执行
    socket.on('new message', function (data) {
        // 我们告诉客户执行“新消息”
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });
    
    // 当客户端发出“添加用户”时，这个监听并执行
    socket.on('add user', function (username) {
        if (addedUser) return;
        
        // 我们将用户名存储在此客户端的套接字会话中
        socket.username = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        // 全球性回声（所有客户）一个人连接
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });
    
    // 当客户发出“打字”的时候，我们就把它广播给其他人
    socket.on('typing', function () {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });
    
    // 当客户发出“停止打字”的时候，我们就把它广播给其他人
    socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });
    
    // 当用户断开..执行此操作
    socket.on('disconnect', function () {
        if (addedUser) {
            --numUsers;
            
            // 这个客户已经离开了全球的回音
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });
});