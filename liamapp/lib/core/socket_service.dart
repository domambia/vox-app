import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'config.dart';
import 'token_storage.dart';

class SocketService {
  SocketService({required TokenStorage tokenStorage}) : _tokenStorage = tokenStorage;

  final TokenStorage _tokenStorage;

  io.Socket? _socket;

  final StreamController<Map<String, dynamic>> _messageReceivedController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get onMessageReceived => _messageReceivedController.stream;

  bool get isConnected => _socket?.connected == true;

  Future<void> connect() async {
    if (_socket != null) {
      if (_socket!.connected) return;
      _socket!.connect();
      return;
    }

    final token = await _tokenStorage.readAccessToken();
    if (token == null || token.isEmpty) return;

    final socket = io.io(
      AppConfig.socketBaseUrl,
      <String, dynamic>{
        'transports': ['websocket'],
        'autoConnect': false,
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
  }
}
