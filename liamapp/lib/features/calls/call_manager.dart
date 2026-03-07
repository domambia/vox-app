import 'dart:async';

import 'package:flutter/foundation.dart';

import '../../core/api_client.dart';
import '../../core/socket_service.dart';
import 'calls_service.dart';
import 'webrtc_service.dart';

enum CallState {
  idle,
  outgoing,
  incoming,
  connecting,
  connected,
  ended,
}

enum CallEndReason {
  none,
  rejected,
  missed,
  ended,
  failed,
}

class CallInfo {
  CallInfo({
    required this.callId,
    required this.remoteUserId,
    required this.remoteUserName,
    required this.isOutgoing,
  });

  final String callId;
  final String remoteUserId;
  final String remoteUserName;
  final bool isOutgoing;
}

class CallManager extends ChangeNotifier {
  CallManager({
    required ApiClient apiClient,
    required SocketService socketService,
  })  : _apiClient = apiClient,
        _socketService = socketService {
    _setupSocketListeners();
  }

  final ApiClient _apiClient;
  final SocketService _socketService;

  CallsService? _callsService;
  WebRTCService? _webrtcService;

  CallState _state = CallState.idle;
  CallEndReason _endReason = CallEndReason.none;
  CallInfo? _currentCall;
  Duration _callDuration = Duration.zero;
  Timer? _durationTimer;

  final _incomingCallController = StreamController<IncomingCallData>.broadcast();

  CallState get state => _state;
  CallEndReason get endReason => _endReason;
  CallInfo? get currentCall => _currentCall;
  Duration get callDuration => _callDuration;
  bool get isMuted => _webrtcService?.isMuted ?? false;
  bool get isSpeakerOn => _webrtcService?.isSpeakerOn ?? true;
  Stream<IncomingCallData> get onIncomingCall => _incomingCallController.stream;

  StreamSubscription<IncomingCallData>? _incomingCallSub;
  StreamSubscription<String>? _callAnsweredSub;
  StreamSubscription<String>? _callRejectedSub;
  StreamSubscription<Map<String, dynamic>>? _callEndedSub;
  StreamSubscription<WebRTCSignalData>? _webrtcOfferSub;
  StreamSubscription<WebRTCSignalData>? _webrtcAnswerSub;
  StreamSubscription<WebRTCSignalData>? _webrtcIceCandidateSub;

  void _setupSocketListeners() {
    _incomingCallSub = _socketService.onIncomingCall.listen(_handleIncomingCall);
    _callAnsweredSub = _socketService.onCallAnswered.listen(_handleCallAnswered);
    _callRejectedSub = _socketService.onCallRejected.listen(_handleCallRejected);
    _callEndedSub = _socketService.onCallEnded.listen(_handleCallEnded);
    _webrtcOfferSub = _socketService.onWebRTCOffer.listen(_handleWebRTCOffer);
    _webrtcAnswerSub = _socketService.onWebRTCAnswer.listen(_handleWebRTCAnswer);
    _webrtcIceCandidateSub = _socketService.onWebRTCIceCandidate.listen(_handleWebRTCIceCandidate);
  }

  void _handleIncomingCall(IncomingCallData data) {
    debugPrint('[CallManager] Incoming call from ${data.callerName}');

    if (_state != CallState.idle) {
      debugPrint('[CallManager] Already in a call, rejecting incoming call');
      _socketService.rejectCall(callId: data.callId);
      return;
    }

    _currentCall = CallInfo(
      callId: data.callId,
      remoteUserId: data.callerId,
      remoteUserName: data.callerName,
      isOutgoing: false,
    );
    _state = CallState.incoming;
    _endReason = CallEndReason.none;
    notifyListeners();

    _incomingCallController.add(data);
  }

  void _handleCallAnswered(String callId) {
    debugPrint('[CallManager] Call answered: $callId');

    if (_currentCall?.callId != callId) return;

    _state = CallState.connecting;
    notifyListeners();

    _sendWebRTCOffer();
  }

  void _handleCallRejected(String callId) {
    debugPrint('[CallManager] Call rejected: $callId');

    if (_currentCall?.callId != callId) return;

    _state = CallState.ended;
    _endReason = CallEndReason.rejected;
    notifyListeners();

    _cleanup();
  }

  void _handleCallEnded(Map<String, dynamic> data) {
    debugPrint('[CallManager] Call ended: $data');

    final callId = (data['call_id'] ?? '').toString();
    if (_currentCall?.callId != callId) return;

    _state = CallState.ended;
    _endReason = CallEndReason.ended;
    notifyListeners();

    _cleanup();
  }

  Future<void> _handleWebRTCOffer(WebRTCSignalData data) async {
    debugPrint('[CallManager] Received WebRTC offer');

    if (_currentCall?.callId != data.callId) return;

    try {
      await _webrtcService?.setRemoteDescription(data.payload);
      final answer = await _webrtcService?.createAnswer();
      if (answer != null) {
        _socketService.sendWebRTCAnswer(callId: data.callId, answer: answer);
      }
    } catch (e) {
      debugPrint('[CallManager] Error handling WebRTC offer: $e');
    }
  }

  Future<void> _handleWebRTCAnswer(WebRTCSignalData data) async {
    debugPrint('[CallManager] Received WebRTC answer');

    if (_currentCall?.callId != data.callId) return;

    try {
      await _webrtcService?.setRemoteDescription(data.payload);
      _state = CallState.connected;
      _startDurationTimer();
      notifyListeners();
    } catch (e) {
      debugPrint('[CallManager] Error handling WebRTC answer: $e');
    }
  }

  Future<void> _handleWebRTCIceCandidate(WebRTCSignalData data) async {
    debugPrint('[CallManager] Received ICE candidate');

    if (_currentCall?.callId != data.callId) return;

    try {
      await _webrtcService?.addIceCandidate(data.payload);
    } catch (e) {
      debugPrint('[CallManager] Error adding ICE candidate: $e');
    }
  }

  Future<void> initiateCall({
    required String receiverId,
    required String receiverName,
  }) async {
    if (_state != CallState.idle) {
      throw Exception('Already in a call');
    }

    _callsService ??= CallsService(_apiClient);

    try {
      final result = await _callsService!.initiate(receiverId: receiverId);
      final callId = (result['call_id'] ?? result['callId'] ?? '').toString();

      _currentCall = CallInfo(
        callId: callId,
        remoteUserId: receiverId,
        remoteUserName: receiverName,
        isOutgoing: true,
      );

      _state = CallState.outgoing;
      _endReason = CallEndReason.none;
      notifyListeners();

      await _initializeWebRTC();
    } catch (e) {
      debugPrint('[CallManager] Error initiating call: $e');
      _state = CallState.ended;
      _endReason = CallEndReason.failed;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> answerCall() async {
    if (_state != CallState.incoming || _currentCall == null) {
      throw Exception('No incoming call to answer');
    }

    _state = CallState.connecting;
    notifyListeners();

    try {
      await _initializeWebRTC();
      _socketService.answerCall(callId: _currentCall!.callId);
    } catch (e) {
      debugPrint('[CallManager] Error answering call: $e');
      _state = CallState.ended;
      _endReason = CallEndReason.failed;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> rejectCall() async {
    if (_state != CallState.incoming || _currentCall == null) {
      return;
    }

    _socketService.rejectCall(callId: _currentCall!.callId);

    _state = CallState.ended;
    _endReason = CallEndReason.rejected;
    notifyListeners();

    _cleanup();
  }

  Future<void> endCall() async {
    if (_currentCall == null) return;

    _socketService.endCall(callId: _currentCall!.callId);

    _state = CallState.ended;
    _endReason = CallEndReason.ended;
    notifyListeners();

    _cleanup();
  }

  void toggleMute() {
    _webrtcService?.toggleMute();
    notifyListeners();
  }

  void toggleSpeaker() {
    _webrtcService?.toggleSpeaker();
    notifyListeners();
  }

  Future<void> _initializeWebRTC() async {
    _webrtcService = WebRTCService(apiClient: _apiClient);

    _webrtcService!.onIceCandidate = (candidate) {
      if (_currentCall != null) {
        _socketService.sendWebRTCIceCandidate(
          callId: _currentCall!.callId,
          candidate: candidate,
        );
      }
    };

    await _webrtcService!.initialize();
    await _webrtcService!.startLocalStream();
  }

  Future<void> _sendWebRTCOffer() async {
    if (_webrtcService == null || _currentCall == null) return;

    try {
      final offer = await _webrtcService!.createOffer();
      _socketService.sendWebRTCOffer(callId: _currentCall!.callId, offer: offer);
    } catch (e) {
      debugPrint('[CallManager] Error creating WebRTC offer: $e');
    }
  }

  void _startDurationTimer() {
    _callDuration = Duration.zero;
    _durationTimer?.cancel();
    _durationTimer = Timer.periodic(const Duration(seconds: 1), (_) {
      _callDuration += const Duration(seconds: 1);
      notifyListeners();
    });
  }

  void _cleanup() {
    _durationTimer?.cancel();
    _durationTimer = null;
    _webrtcService?.dispose();
    _webrtcService = null;
    _currentCall = null;
    _callDuration = Duration.zero;
  }

  void resetState() {
    _state = CallState.idle;
    _endReason = CallEndReason.none;
    _cleanup();
    notifyListeners();
  }

  @override
  void dispose() {
    _incomingCallSub?.cancel();
    _callAnsweredSub?.cancel();
    _callRejectedSub?.cancel();
    _callEndedSub?.cancel();
    _webrtcOfferSub?.cancel();
    _webrtcAnswerSub?.cancel();
    _webrtcIceCandidateSub?.cancel();
    _incomingCallController.close();
    _cleanup();
    super.dispose();
  }
}
