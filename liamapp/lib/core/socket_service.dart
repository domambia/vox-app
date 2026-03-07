import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import 'config.dart';
import 'token_storage.dart';

class IncomingCallData {
  IncomingCallData({
    required this.callId,
    required this.callerId,
    required this.callerName,
    required this.createdAt,
  });

  final String callId;
  final String callerId;
  final String callerName;
  final DateTime createdAt;
}

class WebRTCSignalData {
  WebRTCSignalData({
    required this.callId,
    required this.type,
    required this.payload,
    this.fromUserId,
  });

  final String callId;
  final String type;
  final Map<String, dynamic> payload;
  final String? fromUserId;
}

class SocketService {
  SocketService({required TokenStorage tokenStorage}) : _tokenStorage = tokenStorage;

  final TokenStorage _tokenStorage;

  String? _token;

  io.Socket? _socket;

  final StreamController<Map<String, dynamic>> _messageReceivedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<IncomingCallData> _incomingCallController =
      StreamController<IncomingCallData>.broadcast();

  final StreamController<String> _callAnsweredController =
      StreamController<String>.broadcast();

  final StreamController<String> _callRejectedController =
      StreamController<String>.broadcast();

  final StreamController<Map<String, dynamic>> _callEndedController =
      StreamController<Map<String, dynamic>>.broadcast();

  final StreamController<WebRTCSignalData> _webrtcOfferController =
      StreamController<WebRTCSignalData>.broadcast();

  final StreamController<WebRTCSignalData> _webrtcAnswerController =
      StreamController<WebRTCSignalData>.broadcast();

  final StreamController<WebRTCSignalData> _webrtcIceCandidateController =
      StreamController<WebRTCSignalData>.broadcast();

  Stream<Map<String, dynamic>> get onMessageReceived => _messageReceivedController.stream;
  Stream<IncomingCallData> get onIncomingCall => _incomingCallController.stream;
  Stream<String> get onCallAnswered => _callAnsweredController.stream;
  Stream<String> get onCallRejected => _callRejectedController.stream;
  Stream<Map<String, dynamic>> get onCallEnded => _callEndedController.stream;
  Stream<WebRTCSignalData> get onWebRTCOffer => _webrtcOfferController.stream;
  Stream<WebRTCSignalData> get onWebRTCAnswer => _webrtcAnswerController.stream;
  Stream<WebRTCSignalData> get onWebRTCIceCandidate => _webrtcIceCandidateController.stream;

  bool get isConnected => _socket?.connected == true;

  bool get canSend => isConnected;

  Future<void> connect() async {
    final token = await _tokenStorage.readAccessToken();
    if (token == null || token.isEmpty) return;

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

    socket.on('call:incoming', (data) {
      debugPrint('[SocketService] call:incoming: $data');
      if (data is Map) {
        final caller = data['caller'] as Map<String, dynamic>?;
        final callerName = caller != null
            ? '${caller['first_name'] ?? ''} ${caller['last_name'] ?? ''}'.trim()
            : 'Unknown';
        _incomingCallController.add(IncomingCallData(
          callId: (data['call_id'] ?? '').toString(),
          callerId: (data['caller_id'] ?? '').toString(),
          callerName: callerName.isEmpty ? 'Unknown' : callerName,
          createdAt: DateTime.tryParse(data['created_at']?.toString() ?? '') ?? DateTime.now(),
        ));
      }
    });

    socket.on('call:answered', (data) {
      debugPrint('[SocketService] call:answered: $data');
      if (data is Map) {
        _callAnsweredController.add((data['call_id'] ?? '').toString());
      }
    });

    socket.on('call:rejected', (data) {
      debugPrint('[SocketService] call:rejected: $data');
      if (data is Map) {
        _callRejectedController.add((data['call_id'] ?? '').toString());
      }
    });

    socket.on('call:ended', (data) {
      debugPrint('[SocketService] call:ended: $data');
      if (data is Map) {
        _callEndedController.add(Map<String, dynamic>.from(data));
      }
    });

    socket.on('webrtc:offer', (data) {
      debugPrint('[SocketService] webrtc:offer received');
      if (data is Map) {
        final offer = data['offer'] as Map<String, dynamic>?;
        if (offer != null) {
          _webrtcOfferController.add(WebRTCSignalData(
            callId: (data['call_id'] ?? '').toString(),
            type: 'offer',
            payload: offer,
            fromUserId: (data['caller_id'] ?? '').toString(),
          ));
        }
      }
    });

    socket.on('webrtc:answer', (data) {
      debugPrint('[SocketService] webrtc:answer received');
      if (data is Map) {
        final answer = data['answer'] as Map<String, dynamic>?;
        if (answer != null) {
          _webrtcAnswerController.add(WebRTCSignalData(
            callId: (data['call_id'] ?? '').toString(),
            type: 'answer',
            payload: answer,
            fromUserId: (data['receiver_id'] ?? '').toString(),
          ));
        }
      }
    });

    socket.on('webrtc:ice-candidate', (data) {
      debugPrint('[SocketService] webrtc:ice-candidate received');
      if (data is Map) {
        final candidate = data['candidate'] as Map<String, dynamic>?;
        if (candidate != null) {
          _webrtcIceCandidateController.add(WebRTCSignalData(
            callId: (data['call_id'] ?? '').toString(),
            type: 'ice-candidate',
            payload: candidate,
            fromUserId: (data['from_user_id'] ?? '').toString(),
          ));
        }
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

  void initiateCall({required String receiverId}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('call:initiate', {'receiverId': receiverId});
  }

  void answerCall({required String callId}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('call:answer', {'callId': callId});
  }

  void rejectCall({required String callId}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('call:reject', {'callId': callId});
  }

  void endCall({required String callId}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('call:end', {'callId': callId});
  }

  void sendWebRTCOffer({required String callId, required Map<String, dynamic> offer}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('webrtc:offer', {'callId': callId, 'offer': offer});
  }

  void sendWebRTCAnswer({required String callId, required Map<String, dynamic> answer}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('webrtc:answer', {'callId': callId, 'answer': answer});
  }

  void sendWebRTCIceCandidate({required String callId, required Map<String, dynamic> candidate}) {
    final s = _socket;
    if (s == null || s.connected != true) return;
    s.emit('webrtc:ice-candidate', {'callId': callId, 'candidate': candidate});
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
    _incomingCallController.close();
    _callAnsweredController.close();
    _callRejectedController.close();
    _callEndedController.close();
    _webrtcOfferController.close();
    _webrtcAnswerController.close();
    _webrtcIceCandidateController.close();
    _socket?.dispose();
    _socket = null;
    _token = null;
  }
}
