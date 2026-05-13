/**
 * VoiceChatManager — WebRTC P2P voice for online co-op.
 *
 * Signaling (OFFER / ANSWER / ICE) is relayed via the game WebSocket server.
 * Actual audio is P2P once the connection is established.
 *
 * Usage:
 *   await voiceChatManager.start('host')   // initiator — creates + sends OFFER
 *   await voiceChatManager.start('guest')  // responder — waits for OFFER
 *   voiceChatManager.toggleMute()          // returns new muted state
 *   voiceChatManager.stop()
 */
class VoiceChatManager {
    constructor() {
        this._pc           = null;  // RTCPeerConnection
        this._stream       = null;  // local MediaStream
        this._remoteAudio  = null;  // Audio element for remote stream
        this._muted        = false;
        this._partnerMuted = false;
        this._active       = false;
        this._role         = null;

        // Optional callback: (isSelf, muted) => void
        this.onMuteChange  = null;
    }

    get isMuted()        { return this._muted; }
    get partnerMuted()   { return this._partnerMuted; }
    get isActive()       { return this._active; }

    async start(role) {
        if (this._active) this.stop();
        this._role = role;

        try {
            this._stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } catch (e) {
            console.warn('[VoiceChat] Mic access denied:', e.message);
            return false;
        }

        const config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
        this._pc = new RTCPeerConnection(config);

        this._stream.getAudioTracks().forEach(track => this._pc.addTrack(track, this._stream));

        this._pc.ontrack = (ev) => {
            if (this._remoteAudio) { this._remoteAudio.srcObject = null; }
            this._remoteAudio = new Audio();
            this._remoteAudio.srcObject = ev.streams[0];
            this._remoteAudio.autoplay  = true;
        };

        this._pc.onicecandidate = (ev) => {
            if (ev.candidate) {
                window.networkManager?.send({ type: 'WEBRTC_ICE', data: ev.candidate });
            }
        };

        this._pc.onconnectionstatechange = () => {
            const state = this._pc?.connectionState;
            if (state === 'connected')   console.log('[VoiceChat] P2P connected');
            if (state === 'failed')      console.warn('[VoiceChat] P2P failed — no retry');
            if (state === 'disconnected') console.warn('[VoiceChat] P2P disconnected');
        };

        this._active = true;

        if (role === 'host') {
            const offer = await this._pc.createOffer();
            await this._pc.setLocalDescription(offer);
            window.networkManager?.send({ type: 'WEBRTC_OFFER', data: offer });
        }

        return true;
    }

    async handleOffer(offer) {
        if (!this._pc) return;
        await this._pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await this._pc.createAnswer();
        await this._pc.setLocalDescription(answer);
        window.networkManager?.send({ type: 'WEBRTC_ANSWER', data: answer });
    }

    async handleAnswer(answer) {
        if (!this._pc) return;
        try {
            await this._pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (e) {
            console.warn('[VoiceChat] handleAnswer error:', e.message);
        }
    }

    async handleIce(candidate) {
        if (!this._pc || !candidate) return;
        try {
            await this._pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
            console.warn('[VoiceChat] ICE error:', e.message);
        }
    }

    handlePartnerMute(muted) {
        this._partnerMuted = muted;
        if (this.onMuteChange) this.onMuteChange(false, muted);
    }

    toggleMute() {
        this._muted = !this._muted;
        if (this._stream) {
            this._stream.getAudioTracks().forEach(t => { t.enabled = !this._muted; });
        }
        window.networkManager?.send({ type: 'VOICE_MUTE', muted: this._muted });
        if (this.onMuteChange) this.onMuteChange(true, this._muted);
        return this._muted;
    }

    stop() {
        if (this._pc)          { try { this._pc.close(); } catch {} this._pc = null; }
        if (this._stream)      { this._stream.getTracks().forEach(t => t.stop()); this._stream = null; }
        if (this._remoteAudio) { this._remoteAudio.srcObject = null; this._remoteAudio = null; }
        this._active       = false;
        this._role         = null;
        this._muted        = false;
        this._partnerMuted = false;
    }
}

window.voiceChatManager = new VoiceChatManager();

export { VoiceChatManager };
export default window.voiceChatManager;
