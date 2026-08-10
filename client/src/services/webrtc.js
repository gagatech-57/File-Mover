/**
 * WebRTC DataChannel Manager for High-Speed File Transfer
 * Uses 64 KB chunking with active backpressure control (bufferedAmountLowThreshold)
 */

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' }
  ]
};

const CHUNK_SIZE = 64 * 1024; // 64 KB per chunk
const HIGH_WATERMARK = 128 * 1024; // 128 KB backpressure limit

export class WebRTCManager {
  constructor(socket, sessionId, role) {
    this.socket = socket;
    this.sessionId = sessionId;
    this.role = role;

    this.pc = null;
    this.dataChannel = null;
    this.connectionType = 'Connecting...';
    this.isChannelOpen = false;

    // Callbacks
    this.onProgress = null;
    this.onFileReceived = null;
    this.onChannelStateChange = null;

    // Receiver file assembly state
    this.currentReceivingFile = null;
    this.receivedChunks = [];
    this.receivedBytes = 0;

    this.initPeerConnection();
    this.setupSocketListeners();
  }

  initPeerConnection() {
    try {
      this.pc = new RTCPeerConnection(RTC_CONFIG);

      this.pc.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit('webrtc_ice_candidate', {
            sessionId: this.sessionId,
            candidate: event.candidate
          });
        }
      };

      this.pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state: ${this.pc.connectionState}`);
        if (this.pc.connectionState === 'connected') {
          this.detectConnectionType();
        }
      };

      if (this.role === 'SENDER') {
        // Sender creates DataChannel
        this.dataChannel = this.pc.createDataChannel('fileMoverChannel', {
          ordered: true
        });
        this.setupDataChannel(this.dataChannel);
      } else {
        // Receiver listens for incoming DataChannel
        this.pc.ondatachannel = (event) => {
          this.dataChannel = event.channel;
          this.setupDataChannel(this.dataChannel);
        };
      }
    } catch (err) {
      console.error('[WebRTC] Initialization error:', err);
    }
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = CHUNK_SIZE;

    channel.onopen = () => {
      console.log('[WebRTC DataChannel] Open ✓');
      this.isChannelOpen = true;
      if (this.onChannelStateChange) this.onChannelStateChange(true);
    };

    channel.onclose = () => {
      console.log('[WebRTC DataChannel] Closed');
      this.isChannelOpen = false;
      if (this.onChannelStateChange) this.onChannelStateChange(false);
    };

    channel.onerror = (err) => {
      console.error('[WebRTC DataChannel] Error:', err);
    };

    if (this.role === 'RECEIVER') {
      channel.onmessage = (event) => this.handleIncomingMessage(event.data);
    }
  }

  async detectConnectionType() {
    try {
      const stats = await this.pc.getStats();
      let type = 'Direct WebRTC P2P ⚡';
      stats.forEach((report) => {
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          const localCandidate = stats.get(report.localCandidateId);
          const remoteCandidate = stats.get(report.remoteCandidateId);
          if (localCandidate?.candidateType === 'relay' || remoteCandidate?.candidateType === 'relay') {
            type = 'TURN Relayed';
          } else if (localCandidate?.candidateType === 'srflx' || remoteCandidate?.candidateType === 'srflx') {
            type = 'STUN P2P ⚡';
          } else {
            type = 'Direct LAN P2P ⚡';
          }
        }
      });
      this.connectionType = type;
    } catch (err) {
      this.connectionType = 'WebRTC DataChannel ⚡';
    }
  }

  setupSocketListeners() {
    this.socket.on('webrtc_offer', async ({ offer }) => {
      if (this.role === 'RECEIVER' && this.pc) {
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);

          this.socket.emit('webrtc_answer', {
            sessionId: this.sessionId,
            answer
          });
        } catch (err) {
          console.error('[WebRTC] Answer error:', err);
        }
      }
    });

    this.socket.on('webrtc_answer', async ({ answer }) => {
      if (this.role === 'SENDER' && this.pc) {
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[WebRTC] Remote description error:', err);
        }
      }
    });

    this.socket.on('webrtc_ice_candidate', async ({ candidate }) => {
      if (this.pc) {
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Add ICE candidate error:', err);
        }
      }
    });
  }

  async createOffer() {
    if (!this.pc || this.role !== 'SENDER') return;
    try {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.socket.emit('webrtc_offer', {
        sessionId: this.sessionId,
        offer
      });
    } catch (err) {
      console.error('[WebRTC] Create offer error:', err);
    }
  }

  /**
   * Send file over WebRTC DataChannel with Backpressure Control
   */
  async sendFile(file) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('WebRTC DataChannel is not open');
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const totalBytes = file.size;

    // Send metadata header as JSON string
    const metadata = {
      type: 'file_start',
      fileId,
      name: file.name,
      size: totalBytes,
      mimeType: file.type || 'application/octet-stream'
    };
    this.dataChannel.send(JSON.stringify(metadata));

    let offset = 0;
    const startTime = Date.now();

    while (offset < totalBytes) {
      // BACKPRESSURE CONTROL: Pause if channel buffer is full
      if (this.dataChannel.bufferedAmount > HIGH_WATERMARK) {
        await new Promise((resolve) => {
          this.dataChannel.onbufferedamountlow = () => {
            this.dataChannel.onbufferedamountlow = null;
            resolve();
          };
        });
      }

      const chunkSlice = file.slice(offset, offset + CHUNK_SIZE);
      const arrayBuffer = await chunkSlice.arrayBuffer();

      this.dataChannel.send(arrayBuffer);
      offset += arrayBuffer.byteLength;

      // Calculate progress telemetry
      const elapsedTime = (Date.now() - startTime) / 1000;
      const speed = elapsedTime > 0 ? (offset / elapsedTime) : 0; // Bytes / sec
      const percent = Math.round((offset / totalBytes) * 100);
      const remainingBytes = totalBytes - offset;
      const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;

      if (this.onProgress) {
        this.onProgress({
          fileId,
          fileName: file.name,
          bytesTransferred: offset,
          totalBytes,
          speed,
          percent,
          eta,
          connectionType: this.connectionType
        });
      }

      // Relay telemetry to socket for room UI updates
      this.socket.emit('transfer_progress', {
        sessionId: this.sessionId,
        fileId,
        bytesTransferred: offset,
        totalBytes,
        speed,
        percent
      });
    }

    // Send completion header
    const endHeader = { type: 'file_end', fileId };
    this.dataChannel.send(JSON.stringify(endHeader));

    return { id: fileId, name: file.name, size: totalBytes };
  }

  /**
   * Handle incoming DataChannel message on Receiver
   */
  handleIncomingMessage(data) {
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'file_start') {
          this.currentReceivingFile = msg;
          this.receivedChunks = [];
          this.receivedBytes = 0;
          this.receiveStartTime = Date.now();
        } else if (msg.type === 'file_end') {
          if (this.currentReceivingFile) {
            const blob = new Blob(this.receivedChunks, {
              type: this.currentReceivingFile.mimeType
            });
            const fileResult = {
              id: this.currentReceivingFile.fileId,
              originalName: this.currentReceivingFile.name,
              size: this.currentReceivingFile.size,
              blob,
              url: URL.createObjectURL(blob)
            };

            if (this.onFileReceived) {
              this.onFileReceived(fileResult);
            }

            this.currentReceivingFile = null;
            this.receivedChunks = [];
            this.receivedBytes = 0;
          }
        }
      } catch (err) {
        console.error('[WebRTC] Failed to parse control message:', err);
      }
    } else if (data instanceof ArrayBuffer) {
      if (this.currentReceivingFile) {
        this.receivedChunks.push(data);
        this.receivedBytes += data.byteLength;

        const totalBytes = this.currentReceivingFile.size;
        const elapsedTime = (Date.now() - this.receiveStartTime) / 1000;
        const speed = elapsedTime > 0 ? (this.receivedBytes / elapsedTime) : 0;
        const percent = Math.round((this.receivedBytes / totalBytes) * 100);
        const remainingBytes = totalBytes - this.receivedBytes;
        const eta = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;

        if (this.onProgress) {
          this.onProgress({
            fileId: this.currentReceivingFile.fileId,
            fileName: this.currentReceivingFile.name,
            bytesTransferred: this.receivedBytes,
            totalBytes,
            speed,
            percent,
            eta,
            connectionType: this.connectionType
          });
        }
      }
    }
  }

  destroy() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.pc) {
      this.pc.close();
    }
  }
}
