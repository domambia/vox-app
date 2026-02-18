import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'config.dart';
import 'token_storage.dart';

class SocketService {
  SocketService({required TokenStorage tokenStorage}) : _tokenStorage = tokenStorage;

  final TokenStorage _tokenStorage;

  String? _token;

  io.Socket? _socket;

  final StreamController<Map<String, dynamic>> _messageReceivedController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onMessageReceived => _messageReceivedController.stream;

  bool get isConnected => _socket?.connected == true;

  bool get canSend => isConnected;

  Future<void> connect() async {
    final token = await _tokenStorage.readAccessToken();
    if (token == null || token.isEmpty) return;

    // If token changed (e.g. after refresh), recreate the socket so auth is correct.
    if (_socket != null && _token != token) {
      await disconnect();
    }

    if (_socket != null) {
      if (_socket!.connected) return;
      _socket!.connect();
      return;
    }

    _token = token;

    final socket = io.io(
      AppConfig.socketBaseUrl,
      <String, dynamic>{
        'transports': ['websocket', 'polling'],
        'autoConnect': false,
        'timeout': 20000,
        'reconnection': true,
        'reconnectionAttempts': 999,
        'reconnectionDelay': 1000,
        'reconnectionDelayMax': 5000,
        'auth': {
          'token': token,
        },
      },
    );

    socket.onConnect((_) {
      debugPrint('[SocketService] connected');
    });

    socket.onDisconnect((_) {
      debugPrint('[SocketService] disconnected');
    });

    socket.on('message:received', (data) {
      if (data is Map) {
        _messageReceivedController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('connect_error', (err) {
      debugPrint('[SocketService] connect_error: $err');
    });

    _socket = socket;
    _socket!.connect();
  }

  Future<void> disconnect() async {
    final s = _socket;
    if (s == null) return;

    s.dispose();
    _socket = null;
    _token = null;
  }

  void sendMessage({required String recipientId, required String content, String messageType = 'TEXT'}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('message:send', {
      'recipientId': recipientId,
      'content': content,
      'messageType': messageType,
    });
  }

  void typingStart({required String conversationId, required String recipientId}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('typing:start', {
      'conversationId': conversationId,
      'recipientId': recipientId,
    });
  }

  void typingStop({required String conversationId, required String recipientId}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('typing:stop', {
      'conversationId': conversationId,
      'recipientId': recipientId,
    });
  }

  Future<void> syncAuth(bool isAuthenticated) async {
    if (isAuthenticated) {
      await connect();
    } else {
      await disconnect();
    }
  }

  void dispose() {
    _messageReceivedController.close();
    _socket?.dispose();
    _socket = null;
    _token = null;
  }
}
