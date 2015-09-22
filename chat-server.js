// 日本語チャット
'use strict';
chatStart(require('./chat-config.json'));

function chatStart(CONFIG) {
  // require
  var fs = require('fs');
  var http = require('http');
  var util = require('util');
  var io = require('socket.io');

  // CONFIG
  var VERSION =       CONFIG.VERSION       || '0.0.0';
  var UPDATED =       CONFIG.UPDATED       || '';
  var HTTP_PORT =     CONFIG.HTTP_PORT     || 8888;
  var MAX_KEEP_MSGS = CONFIG.MAX_KEEP_MSGS || 1000;
  var STATIC_FILES =  CONFIG.STATIC_FILES  || {};
  var CHAT_MSG_FILE = CONFIG.CHAT_MSG_FILE || 'chat-msgs.json';

  // CONSTANT
  var TAB = '\t';
  var CRLF = '\r\n';
  var NEWLINE = '\n';
  var COLOR_NORMAL = '\u001b[m';
  var COLOR_OK     = '\u001b[;36m';
  var COLOR_ERR    = '\u001b[1;31m';

  // CHAT_MSG_FILE
  try {
    var jsonMsgFile = fs.readFileSync(CHAT_MSG_FILE).toString();
  } catch (e) {
    jsonMsgFile = '';
  }
  var writer = fs.createWriteStream(CHAT_MSG_FILE, {flags: 'a'});

  var allMsgs = [];
  var jsonMsgs = jsonMsgFile.split(NEWLINE);
  var n = jsonMsgs.length;
  for (var i = Math.max(0, n - MAX_KEEP_MSGS); i < n - 1; ++i)
    allMsgs.push(JSON.parse(jsonMsgs[i]));

  //for (var i = 0, n = allMsgs.length; i < n; ++i)
  //  logOK(allMsgs[i].dt + ' : ' + allMsgs[i].val);

  var svdt = new Date();
  var stat = {
    dt: toDateTimeString(svdt), tm: svdt.valueOf(),
    svdt: toDateTimeString(svdt), svtm: svdt.valueOf(),
    ver: VERSION, upd: UPDATED, cnt: 0, act: 0
  };

  // http createServer
  var app = http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    var file = STATIC_FILES[req.url];
    if (typeof file === 'string') {
      logOK('server: http get ' + req.url);
      return fs.createReadStream(file).pipe(res);
    }
    else {
      logNG('server: http get ' + req.url + ' -> NG');
      return res.end('server: error requested URL: ' + req.url);
    }
  }).listen(HTTP_PORT, function (err) {
    if (err) {
      logNG('server: listen error: ' + err);
      return;
    }

    var id = 0;

    // listen
    logOK('server: started on port ' + HTTP_PORT + ', version: ' + VERSION);

    io = io.listen(app, {'log level': 2});

    //io.set('transports', ['websocket', 'flashsocket', 'htmlfile', 'xhr-polling', 'jsonp-polling']);
    //io.set('flashPolicyServer', false);
    //io.set('transports', ['websocket', 'xhr-polling']);
    io.set('transports', ['xhr-polling']);

    var act = 0;

    // io.set('log level', 1); // reduce logging
    logOK('server: io get transports = ' + io.get('transports'));
    io.sockets.on('connection', function (socket) {
      stat.cnt++;
      statDown();

      var no = ++id;
      logOK('server: #' + no + ' (' + stat.cnt + ') socket connected');

      // メッセージをサーバが受信 socket.on msgUp
      socket.on('msgUp', function (msg0) {
        var dt = new Date();
        var msg = {dt: toDateTimeString(dt), tm: dt.valueOf()};
        for (var i in msg0) msg[i] = msg0[i];
        logOK('server: #' + no + ' (' + stat.cnt + ') socket msgUp ' + msg.name + ':' + msg.val);
        // メッセージを全体に送信
        io.sockets.emit('msgDown', msg);
        allMsgs.push(msg);
        // 追加メッセージをファイルへ追加
        writer.write(JSON.stringify(msg) + CRLF);
        if (allMsgs.length > MAX_KEEP_MSGS) allMsgs.shift();
      });

      // 再接続 socket.on msgConn
      socket.on('msgConn', function (tmFrom) {
        logOK('server: #' + no + ' (' + stat.cnt + ') socket msgConn, send msgAll ' + toDateTimeString(new Date(tmFrom)));
        if (!tmFrom)
          return socket.emit('msgAll', allMsgs);
        var msgs = [];
        for (var i = 0, n = allMsgs.length; i < n; ++i)
          if (allMsgs[i].tm > tmFrom)
            msgs.push(allMsgs[i]);
        return socket.emit('msgAll', msgs);
      });

      // 切断 socket.on disconnect
      socket.on('disconnect', function () {
        stat.cnt--;
        statDown();
        io.sockets.emit('statDown', stat);
        logOK('server: #' + no + ' (' + stat.cnt + ') socket disconnect');
      });

      // アクティブユーザの統計 socket.on statCount
      socket.on('statCount', function () {
        act++;
      });

    }); // io.sockets.on connection

    setInterval(statCount, 7000);

    // アクティブユーザの統計を取る
    function statCount() {
      act = 0;
      io.sockets.emit('statCount', null);
      setTimeout(function () {
        stat.act = act;
      }, 2000); // 2秒以内に反応ある人のみ
      statDown();
    }

    // 状態を全体に送信 statDown
    function statDown() {
      var dt = new Date();
      stat.dt = toDateTimeString(dt);
      stat.tm = dt.valueOf(),
      // 状態を全体に送信
      io.sockets.emit('statDown', stat);
    }

  });
  // サーバ開始
  logOK('server: starting - port ' + HTTP_PORT + ', version: ' + VERSION);

  // ログ log
  function logOK(msg) { console.log(COLOR_OK  + msg + COLOR_NORMAL); }
  function logNG(msg) { console.log(COLOR_ERR + msg + COLOR_NORMAL); }

  // 日付文字列 toDateTimeString
  function toDateTimeString(x) {
    if (typeof x !== 'object' || !(x instanceof Date)) x = new Date();
    return x.getFullYear() + '-' + pad2(x.getMonth() + 1) + '-' +
      pad2(x.getDate()) + ' ' +    pad2(x.getHours()) + ':' +
      pad2(x.getMinutes()) + ':' + pad2(x.getSeconds()) + '.' +
      pad3(x.getMilliseconds());
  }

  // pad2, pad3
  function pad2(n) { return n < 10 ? '0' + n : n; }
  function pad3(n) { return n < 10 ? '00' + n : (n < 100 ? '0' + n : n); }
}
