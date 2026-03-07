import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_webrtc/flutter_webrtc.dart';

import '../../core/api_client.dart';
import 'calls_service.dart';

class WebRTCService {
  WebRTCService({required ApiClient apiClient}) : _callsService = CallsService(apiClient);

  final CallsService _callsService;

  RTCPeerConnection? _peerConnection;
  MediaStream? _localStream;
  MediaStream? _remoteStream;

  final _localStreamController = StreamController<MediaStream?>.broadcast();
  final _remoteStreamController = StreamController<MediaStream?>.broadcast();
  final _connectionStateController = StreamController<RTCPeerConnectionState?>.broadcast();

  Stream<MediaStream?> get onLocalStream => _localStreamController.stream;
  Stream<MediaStream?> get onRemoteStream => _remoteStreamController.stream;
  Stream<RTCPeerConnectionState?> get onConnectionState => _connectionStateController.stream;

  bool _isMuted = false;
  bool _isSpeakerOn = true;

  bool get isMuted => _isMuted;
  bool get isSpeakerOn => _isSpeakerOn;
  bool get isConnected => _peerConnection?.connectionState == RTCPeerConnectionState.RTCPeerConnectionStateConnected;

  Function(Map<String, dynamic>)? onIceCandidate;
  Function(Map<String, dynamic>)? onOffer;
  Function(Map<String, dynamic>)? onAnswer;

  Future<Map<String, dynamic>> _getIceServers() async {
    try {
      final config = await _callsService.webrtcConfig();
      final iceServers = config['iceServers'] as List<dynamic>? ?? [];
      return {
        'iceServers': iceServers.map((server) {
          if (server is Map) {
            return {
              'urls': server['urls'],
              if (server['username'] != null) 'username': server['username'],
              if (server['credential'] != null) 'credential': server['credential'],
            };
          }
          return {'urls': server.toString()};
        }).toList(),
        'sdpSemantics': 'unified-plan',
      };
    } catch (e) {
      debugPrint('[WebRTCService] Error fetching ICE servers: $e');
      return {
        'iceServers': [
          {'urls': 'stun:stun.l.google.com:19302'},
          {'urls': 'stun:stun1.l.google.com:19302'},
        ],
        'sdpSemantics': 'unified-plan',
      };
    }
  }

  Future<void> initialize() async {
    final config = await _getIceServers();

    _peerConnection = await createPeerConnection(config, {
      'mandatory': {},
      'optional': [
        {'DtlsSrtpKeyAgreement': true},
      ],
    });

    _peerConnection!.onIceCandidate = (RTCIceCandidate candidate) {
      debugPrint('[WebRTCService] onIceCandidate: ${candidate.candidate}');
      onIceCandidate?.call({
        'candidate': candidate.candidate,
        'sdpMLineIndex': candidate.sdpMLineIndex,
        'sdpMid': candidate.sdpMid,
      });
    };

    _peerConnection!.onIceConnectionState = (RTCIceConnectionState state) {
      debugPrint('[WebRTCService] ICE connection state: $state');
    };

    _peerConnection!.onConnectionState = (RTCPeerConnectionState state) {
      debugPrint('[WebRTCService] Connection state: $state');
      _connectionStateController.add(state);
    };

    _peerConnection!.onTrack = (RTCTrackEvent event) {
      debugPrint('[WebRTCService] onTrack: ${event.streams.length} streams');
      if (event.streams.isNotEmpty) {
        _remoteStream = event.streams[0];
        _remoteStreamController.add(_remoteStream);
      }
    };

    _peerConnection!.onAddStream = (MediaStream stream) {
      debugPrint('[WebRTCService] onAddStream');
      _remoteStream = stream;
      _remoteStreamController.add(_remoteStream);
    };
  }

  Future<void> startLocalStream({bool videoEnabled = false}) async {
    final mediaConstraints = <String, dynamic>{
      'audio': true,
      'video': videoEnabled
          ? {
              'mandatory': {
                'minWidth': '640',
                'minHeight': '480',
                'minFrameRate': '30',
              },
              'facingMode': 'user',
              'optional': [],
            }
          : false,
    };

    try {
      _localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      _localStreamController.add(_localStream);

      _localStream!.getTracks().forEach((track) {
        _peerConnection!.addTrack(track, _localStream!);
      });

      debugPrint('[WebRTCService] Local stream started');
    } catch (e) {
      debugPrint('[WebRTCService] Error starting local stream: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createOffer() async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    final offer = await _peerConnection!.createOffer({
      'offerToReceiveAudio': true,
      'offerToReceiveVideo': false,
    });

    await _peerConnection!.setLocalDescription(offer);

    debugPrint('[WebRTCService] Offer created');

    return {
      'type': offer.type,
      'sdp': offer.sdp,
    };
  }

  Future<Map<String, dynamic>> createAnswer() async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    final answer = await _peerConnection!.createAnswer({
      'offerToReceiveAudio': true,
      'offerToReceiveVideo': false,
    });

    await _peerConnection!.setLocalDescription(answer);

    debugPrint('[WebRTCService] Answer created');

    return {
      'type': answer.type,
      'sdp': answer.sdp,
    };
  }

  Future<void> setRemoteDescription(Map<String, dynamic> description) async {
    if (_peerConnection == null) {
      throw Exception('Peer connection not initialized');
    }

    final rtcDescription = RTCSessionDescription(
      description['sdp'] as String?,
      description['type'] as String?,
    );

    await _peerConnection!.setRemoteDescription(rtcDescription);
    debugPrint('[WebRTCService] Remote description set: ${description['type']}');
  }

  Future<void> addIceCandidate(Map<String, dynamic> candidateData) async {
    if (_peerConnection == null) {
      debugPrint('[WebRTCService] Cannot add ICE candidate: peer connection not initialized');
      return;
    }

    final candidate = RTCIceCandidate(
      candidateData['candidate'] as String?,
      candidateData['sdpMid'] as String?,
      candidateData['sdpMLineIndex'] as int?,
    );

    await _peerConnection!.addCandidate(candidate);
    debugPrint('[WebRTCService] ICE candidate added');
  }

  void toggleMute() {
    if (_localStream != null) {
      _isMuted = !_isMuted;
      _localStream!.getAudioTracks().forEach((track) {
        track.enabled = !_isMuted;
      });
      debugPrint('[WebRTCService] Mute toggled: $_isMuted');
    }
  }

  void toggleSpeaker() {
    _isSpeakerOn = !_isSpeakerOn;
    if (_remoteStream != null) {
      _remoteStream!.getAudioTracks().forEach((track) {
        Helper.setSpeakerphoneOn(_isSpeakerOn);
      });
    }
    debugPrint('[WebRTCService] Speaker toggled: $_isSpeakerOn');
  }

  Future<void> dispose() async {
    debugPrint('[WebRTCService] Disposing...');

    _localStream?.getTracks().forEach((track) {
      track.stop();
    });
    await _localStream?.dispose();
    _localStream = null;

    _remoteStream?.getTracks().forEach((track) {
      track.stop();
    });
    await _remoteStream?.dispose();
    _remoteStream = null;

    await _peerConnection?.close();
    _peerConnection = null;

    _localStreamController.close();
    _remoteStreamController.close();
    _connectionStateController.close();

    debugPrint('[WebRTCService] Disposed');
  }
}
