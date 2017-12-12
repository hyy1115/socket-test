$(function() {
    var FADE_TIME = 150; // ms
    var TYPING_TIMER_LENGTH = 400; // ms
    var COLORS = [
        '#e21400', '#91580f', '#f8a700', '#f78b00',
        '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
        '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ];
    
    // 初始化变量
    var $window = $(window);
    var $usernameInput = $('.usernameInput'); // 输入用户名
    var $messages = $('.messages'); // 消息区域
    var $inputMessage = $('.inputMessage'); // 输入消息输入框
    
    var $loginPage = $('.login.page'); // 登录页面
    var $chatPage = $('.chat.page'); // 聊天室页面
    
    // 提示设置用户名
    var username = sessionStorage.getItem('username');
    var connected = false;
    var typing = false;
    var lastTypingTime;
    var $currentInput = $usernameInput.focus();
    
    var socket = io();
    
    if (!!username) {
        $loginPage.fadeOut();
        socket.emit('add user', username);
        $chatPage.show();
    }
    
    function addParticipantsMessage (data) {
        var message = '';
        if (data.numUsers === 1) {
            message += "在线 1 人";
        } else {
            message += "在线 " + data.numUsers + " 人";
        }
        log(message);
    }
    
    // 设置客户端的用户名
    function setUsername () {
        username = cleanInput($usernameInput.val().trim());
        
        // 如果用户名是有效的
        if (username) {
            $loginPage.fadeOut();
            $chatPage.show();
            $loginPage.off('click');
            $currentInput = $inputMessage.focus();
            
            // 告诉服务器你的用户名
            socket.emit('add user', username);
            sessionStorage.setItem('username', username)
        }
    }
    
    // 发送聊天消息
    function sendMessage () {
        var message = $inputMessage.val();
        // 防止标记被注入到消息中
        message = cleanInput(message);
        // 如果有非空消息和套接字连接
        if (message && connected) {
            $inputMessage.val('');
            addChatMessage({
                username: username,
                message: message
            });
            // 告诉服务器执行“新消息”并发送一个参数
            socket.emit('new message', message);
        }
    }
    
    // 记录一条消息
    function log (message, options) {
        var $el = $('<li>').addClass('log').text(message);
        addMessageElement($el, options);
    }
    
    // 将可视聊天消息添加到消息列表
    function addChatMessage (data, options) {
        // 如果有“X正在键入”，请不要褪色信息
        var $typingMessages = getTypingMessages(data);
        options = options || {};
        if ($typingMessages.length !== 0) {
            options.fade = false;
            $typingMessages.remove();
        }
        
        var $usernameDiv = $('<span class="username"/>')
        .text(data.username)
        .css('color', getUsernameColor(data.username));
        var $messageBodyDiv = $('<span class="messageBody">')
        .text(data.message);
        
        var typingClass = data.typing ? 'typing' : '';
        var $messageDiv = $('<li class="message"/>')
        .data('username', data.username)
        .addClass(typingClass)
        .append($usernameDiv, $messageBodyDiv);
        
        addMessageElement($messageDiv, options);
    }
    
    // 添加可视聊天输入消息
    function addChatTyping (data) {
        data.typing = true;
        data.message = '正在输入中...';
        addChatMessage(data);
    }
    
    // 删除可视聊天输入消息
    function removeChatTyping (data) {
        getTypingMessages(data).fadeOut(function () {
            $(this).remove();
        });
    }
    
    //将消息元素添加到消息并滚动到底部
    // el - 要添加的元素作为消息
    // options.fade - 如果元素应该淡入（default = true）
    // options.prepend - If该元素应该预先
    // 所有其​​他消息（默认= false）
    function addMessageElement (el, options) {
        var $el = $(el);
        
        // 设置默认选项
        if (!options) {
            options = {};
        }
        if (typeof options.fade === 'undefined') {
            options.fade = true;
        }
        if (typeof options.prepend === 'undefined') {
            options.prepend = false;
        }
        
        // 应用选项
        if (options.fade) {
            $el.hide().fadeIn(FADE_TIME);
        }
        if (options.prepend) {
            $messages.prepend($el);
        } else {
            $messages.append($el);
        }
        $messages[0].scrollTop = $messages[0].scrollHeight;
    }
    
    // 防止注入标记的输入
    function cleanInput (input) {
        return $('<div/>').text(input).html();
    }
    
    // 更新输入事件
    function updateTyping () {
        if (connected) {
            if (!typing) {
                typing = true;
                socket.emit('typing');
            }
            lastTypingTime = (new Date()).getTime();
            
            setTimeout(function () {
                var typingTimer = (new Date()).getTime();
                var timeDiff = typingTimer - lastTypingTime;
                if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
                    socket.emit('stop typing');
                    typing = false;
                }
            }, TYPING_TIMER_LENGTH);
        }
    }
    
    // 获取用户的“X is typing”消息
    function getTypingMessages (data) {
        return $('.typing.message').filter(function (i) {
            return $(this).data('username') === data.username;
        });
    }
    
    // 通过我们的哈希函数获取用户名的颜色
    function getUsernameColor (username) {
        // 计算哈希码
        var hash = 7;
        for (var i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + (hash << 5) - hash;
        }
        // 计算颜色
        var index = Math.abs(hash % COLORS.length);
        return COLORS[index];
    }
    
    // 键盘事件
    
    $window.keydown(function (event) {
        // 键入键时自动对焦当前输入
        if (!(event.ctrlKey || event.metaKey || event.altKey)) {
            $currentInput.focus();
        }
        // 当客户在他们的键盘上点击ENTER时
        if (event.which === 13) {
            if (username) {
                sendMessage();
                socket.emit('stop typing');
                typing = false;
            } else {
                setUsername();
            }
        }
    });
    
    $inputMessage.on('input', function() {
        updateTyping();
    });
    
    // 点击事件
    
    // 在登录页面的任意位置点击时进行对焦
    $loginPage.click(function () {
        $currentInput.focus();
    });
    
    // 点击消息输入的边框时重点输入
    $inputMessage.click(function () {
        $inputMessage.focus();
    });
    
    // Socket 事件
    
    // 只要服务器发出“登录”，就登录登录消息
    socket.on('login', function (data) {
        connected = true;
        // 显示欢迎消息
        var message = "羽毛球活动群！";
        log(message, {
            prepend: true
        });
        addParticipantsMessage(data);
    });
    
    // 每当服务器发出“新消息”时，更新聊天主体
    socket.on('new message', function (data) {
        addChatMessage(data);
    });
    
    // 只要服务器发出“用户加入”，就将其登录到聊天主体中
    socket.on('user joined', function (data) {
        log(data.username + ' 加入法狗狗战队');
        addParticipantsMessage(data);
    });
    
    // 只要服务器发出“用户离开”，就将其退出到聊天主体中
    socket.on('user left', function (data) {
        log(data.username + ' 含泪离开了我们');
        addParticipantsMessage(data);
        removeChatTyping(data);
    });
    
    //只要服务器发出“打字”，就显示打字信息
    socket.on('typing', function (data) {
        addChatTyping(data);
    });
    
    // 每当服务器发出“停止输入”时，就终止输入消息
    socket.on('stop typing', function (data) {
        removeChatTyping(data);
    });
    
    socket.on('disconnect', function () {
        log('你已经断开连接');
    });
    
    socket.on('reconnect', function () {
        log('你已经重新连接');
        if (username) {
            socket.emit('add user', username);
        }
    });
    
    socket.on('reconnect_error', function () {
        log('attempt to reconnect has failed');
    });
    
});