$(function () {
  'use strict';
  var tmFrom = 0;
  var socket = io.connect();
  socket.socket.options['connect timeout'] = 2000; // デフォルト値の10秒から2秒に変更
  var $name = $('#name');
  var $msg  = $('#msg');
  var $msgs = $('#msgs');
  var $stat = $('#stat');
  var ver = null;
  var name = $.cookie('chat-light-name');
  if (name) $name.val(name);

  // メッセージ送信(Enterキー) msgUp
  $msg.keydown(function (e) {
    if (e.keyCode != 13) return;
    var name = $name.val();
    if (name.length > 0) $.cookie('chat-light-name', name, {expires: 365});

    socket.emit('msgUp', {name: $name.val(), val: $msg.val()});
    $msg.val('');
    return false;
  });

  // メッセージ受信 msgDown
  socket.on('msgDown', function (msg) {
    disp(msg);
  });

  // メッセージ受信 msgDown
  socket.on('statDown', function (stat) {
    if (!ver) ver = stat.ver;
    if (ver !== stat.ver)
      window.location.reload();
    dispStat(stat);
  });

  // 最初にメッセージ全体を受信 msgAll
  socket.on('msgAll', function (allMsgs) {
    for (var i = 0, n = allMsgs.length; i < n; ++i)
      disp(allMsgs[i]);
  });

  // 接続 connect
  socket.on('connect', function () {
    //disp('connect');
    dispStat('<font color="green">CONNECTED</font>');
    socket.emit('msgConn', tmFrom);
  });

  // 切断 disconnect
  socket.on('disconnect', function () {
    //disp('disconnected');
    dispStat('<font color="red">OFFLINE</font>');
  });

  // アクティブユーザの統計 statCount
  socket.on('statCount', function () {
    socket.emit('statCount', null);
  });

  // disp('loaded');

  // 表示 disp
  function disp(msg) {
    if (typeof msg === 'string')
      return $msgs.prepend(msg + '<br>');

    if (tmFrom < msg.tm)
      tmFrom = msg.tm;

    var name = $('<div/>').text(msg.name).html(); // サニタイズ
    var val = $('<div/>').text(msg.val).html(); // サニタイズ
    $msgs.prepend('<font size="-2">' + msg.dt + '</font> ' + name + ' : ' + val + '<br>');
  }

  // 表示 dispStat
  function dispStat(stat) {
    if (typeof stat === 'string')
      return $stat.html(stat);
    var act = stat.act || 1;

    $stat.html('<font size="-2">' + stat.dt + '</font> ' +
      '<font color="green">ONLINE (' + act + ')</font> ' +
      '<font size="-2"> since: ' + stat.svdt +
      ' v' + stat.ver + ' ' + stat.upd + ' (' + stat.cnt + ')</font>');
  }
});
