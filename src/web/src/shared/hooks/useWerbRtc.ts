import {
    ChatMessage,
    ConnectionStatus,
    DataChannelMessage,
    MicStatus,
    RoomParticipant,
    UseWebRTCConfig,
    UseWebRTCReturn
} from "../types/webRtcTypes.ts";
import {useCallback, useEffect, useRef, useState} from "react";
import {io, Socket} from "socket.io-client";

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
    {urls: 'stun:stun.l.google.com:19302'},
    {urls: 'stun:stun1.l.google.com:19302'},
]

const generateMessageId = (): string => crypto.randomUUID();

async function fetchIceConfig(serverUrl: string) {
    try {
        const response = await fetch(`${serverUrl}/ice-config`);

        const data = await response.json() as {iceServers: RTCIceServer[]};
        return data.iceServers;
    } catch (error) {
        console.warn(error);
        return FALLBACK_ICE_SERVERS;
    }
}

export function useWebRTC(
    config: UseWebRTCConfig = {
        // Сигнальный сервер — VITE_LIVEKIT_URL или LiveKit через nginx
        signalingServerUrl: import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:8080/livekit',
        iceServers: FALLBACK_ICE_SERVERS
    }
) : UseWebRTCReturn {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [localSocketId, setLocalSocketId] = useState<string | null>(null);
    const [localUsername, setLocalUsername] = useState<string>("");
    const [needsPlayConfirm, setNeedsPlayConfirm] = useState<boolean>(false);
    const [micStatus, setMicStatus] = useState<MicStatus>('idle');
    const [isMuted, setIsMuted] = useState<boolean>(true);

    const localVideoRef = useRef<HTMLVideoElement | null>(null);
    const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
    const localStreamRef = useRef<MediaStream | null>(null);
    const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const dataChannelRef = useRef<RTCDataChannel | null>(null);

    const currentRoomRef = useRef<string>("");
    const usernameRef = useRef<string>("");

    const [isInitiating, setIsInitiating] = useState(false);

    const iceServersRef = useRef<RTCIceServer[]>(FALLBACK_ICE_SERVERS);

    const confirmPlay = useCallback(async () => {
        if(!remoteAudioRef.current) return;
        try {
            await remoteAudioRef.current.play();
            setNeedsPlayConfirm(false);
        } catch (error) {
            console.log(error);
        }
    }, []);

    const startVoice = useCallback(async () => {
        const pc = peerConnectionRef.current;
        if (!pc) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });

            localStreamRef.current = stream;

            stream.getTracks().forEach(track => {
                pc.addTrack(track, stream);
            });

            setMicStatus("active");
            setIsMuted(false);
        } catch (error) {
            console.error("Error accessing microphone:", error);
            setMicStatus("error");
        }
    }, []);

    const stopVoice = useCallback(() => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                if (track.kind === 'audio') {
                    track.stop();
                }
            });
            localStreamRef.current = null;
        }
        setMicStatus('idle');
        setIsMuted(true);
    }, []);

    const toggleMic = useCallback(() => {
        const stream = localStreamRef.current;
        if(!stream) {
            console.warn('No media stream available');
            startVoice();
            return;
        }

        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            console.warn('No audio tracks found');
            return;
        }

        audioTracks.forEach(track => {
            track.enabled = !track.enabled;
        });

        setIsMuted(prev => !prev);
        setMicStatus(isMuted ? 'active' : 'active');
    }, [isMuted, startVoice]);

    const addMessage = useCallback((message: ChatMessage) => {
        setMessages(prev => [...prev, message]);
        console.log("messages: ", messages);
    }, []);

    const sendMessage = useCallback((text: string) => {

        const channel = dataChannelRef.current;
        if (!channel || channel.readyState !== 'open') return;

        const message: DataChannelMessage = {
            id: generateMessageId(),
            text,
            username: usernameRef.current,
            timestamp: Date.now()
        };

        channel.send(JSON.stringify(message));

        const ownMessage: ChatMessage = {
            ...message,
            isOwn: true
        };

        addMessage(ownMessage);
    }, [addMessage]);

    const setupDataChannel = useCallback((channel: RTCDataChannel)=> {
        dataChannelRef.current = channel;
        channel.onopen = () => setConnectionStatus('connected');
        channel.onclose = () => setConnectionStatus('disconnected');

        channel.onmessage = (event: MessageEvent<string>) => {
            try {
                const data = JSON.parse(event.data) as DataChannelMessage;

                const message: ChatMessage = {
                    id: data.id,
                    text: data.text,
                    username: data.username,
                    timestamp: data.timestamp,
                    isOwn: false
                };

                addMessage(message);
            } catch(error) {
                console.warn(error);
            }
        };
    }, [addMessage]);

    const createPeerConnection = useCallback(() => {
        const pc = new RTCPeerConnection({
            iceServers: iceServersRef.current
        });

        pc.onicecandidate = (event) => {
            if (event.candidate && socketRef.current) {
                socketRef.current?.emit('ice-candidate', {
                    roomId: currentRoomRef.current,
                    candidate: event.candidate.toJSON(),
                    from: socketRef.current.id
                });
            }
        };

        pc.oniceconnectionstatechange = ()=> {
            switch(pc.iceConnectionState) {
                case 'checking':
                    setConnectionStatus('connected');
                    break;
                case 'connected':
                case 'completed':
                    setConnectionStatus('connected');
                    break;
                case 'failed':
                    setConnectionStatus('failed');
                    break;
                case 'disconnected':
                case 'closed':
                    setConnectionStatus('disconnected');
                    break;
            }
        };

        pc.ontrack = async (event) => {
            if(event.track.kind !== 'audio') return;

            if(!remoteAudioRef.current) {
                remoteAudioRef.current = document.createElement('audio');
                remoteAudioRef.current.autoplay = true;
                document.body.appendChild(remoteAudioRef.current);
            }

            remoteAudioRef.current.srcObject = event.streams[0] ?? null;
            try {
                await remoteAudioRef.current.play();
            } catch (error) {
                setNeedsPlayConfirm(true);
            }
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed') {
                setConnectionStatus('failed');
            }
        };

        pc.onnegotiationneeded = async (): Promise<void> => {
            if(pc.signalingState !== 'stable') {
                return;
            }

            try {
                const offer: RTCSessionDescriptionInit = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socketRef.current?.emit('offer', {
                    roomId: currentRoomRef.current,
                    offer: pc.localDescription,
                    from: socketRef.current?.id
                });
            } catch(error) {
                console.error(error);
            }
        };

        pc.ondatachannel = (event: RTCDataChannelEvent) => {
            setupDataChannel(event.channel);
        };

        return pc;
    }, [setupDataChannel]);

    const joinRoom = useCallback(async (roomId: string, username: string) => {
        setConnectionStatus('idle');
        setLocalUsername(username);

        currentRoomRef.current = roomId;
        usernameRef.current = username;

        iceServersRef.current = await fetchIceConfig(config.signalingServerUrl);

        const socket = io(config.signalingServerUrl, {
            transports: ['websocket']
        });
        socketRef.current = socket;

        const joinPromise = new Promise((resolve, reject) => {
            socket.once('join-success', () => {
                resolve(true);
            });

            socket.once('room-full', (data) => {
                reject(new Error(data.message));
            });

            setTimeout(() => {
                reject(new Error('Timeout connecting to room'));
            }, 10000);
        });

        socket.on('connect', () => {
            setLocalSocketId(socket.id ?? null);
            socket.emit('join-room', { roomId, username });
        });

        socket.on('disconnect', () => {
            console.log('Socket disconnected');
            setConnectionStatus('disconnected');
        });

        socket.on('participants', (list: RoomParticipant[]) => {
            setParticipants(list);
        });

        socket.on('user-joined', (participant: RoomParticipant) => {
            if (participant.socketId !== socket.id && !peerConnectionRef.current) {
                initiateConnection();
            }
        });

        socket.on('user-left', (participant: RoomParticipant) => {
            setParticipants(prev => prev.filter((p) => p.socketId !== participant.socketId));
            if (participant.socketId !== socket.id) {
                peerConnectionRef.current?.close();
                peerConnectionRef.current = null;
                dataChannelRef.current = null;
                setConnectionStatus('disconnected');
            }
        });

        socket.on('offer', async ({ offer, from }) => {
            if (from === socket.id) return;

            let pc = peerConnectionRef.current;

            if (!pc || pc.signalingState === 'closed') {
                pc = createPeerConnection();
                peerConnectionRef.current = pc;
            }

            if (pc && pc.signalingState !== 'closed') {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);

                    socket.emit('answer', {
                        roomId,
                        answer: pc.localDescription,
                        from: socket.id
                    });
                } catch (e) {
                    console.error(e);
                }
            }
        });

        socket.on('answer', async ({ answer, from }) => {
            if (from === socket.id) return;

            const pc = peerConnectionRef.current;
            if (!pc) return;
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (e) {
                console.error(e);
            }
        });

        socket.on('ice-candidate', async ({ candidate, from }) => {
            if (from === socket.id) return;

            const pc = peerConnectionRef.current;
            if (!pc) return;

            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (e) {
                console.error(e);
            }
        });

        try {
            await joinPromise;
        } catch (error) {
            setConnectionStatus('failed');
            socket.disconnect();
            throw error;
        }
    }, [config.signalingServerUrl, createPeerConnection]);

    const initiateConnection = useCallback(async () => {
        if (isInitiating || peerConnectionRef.current?.signalingState === 'have-local-offer') {
            return;
        }

        setIsInitiating(true);

        try {
            const socket = socketRef.current;
            if(!socket) return;

            const pc = createPeerConnection();
            peerConnectionRef.current = pc;

            const dataChannel = pc.createDataChannel('chat', {ordered: true});
            setupDataChannel(dataChannel);

            try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);

                socket.emit('offer', {
                    roomId: currentRoomRef.current,
                    offer: pc.localDescription,
                    from: socket.id
                });
            } catch(error) {
                console.error('Failed to create offer:', error);
                setConnectionStatus('failed');
            }
        } finally {
            setIsInitiating(false);
        }
    }, [isInitiating, createPeerConnection, setupDataChannel]);

    useEffect(() => {
        return () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (remoteAudioRef.current) {
                remoteAudioRef.current.pause();
                remoteAudioRef.current.srcObject = null;
                remoteAudioRef.current.remove();
                remoteAudioRef.current = null;
            }
            dataChannelRef.current?.close();
            peerConnectionRef.current?.close();
            socketRef.current?.disconnect();
        };
    }, []);

    return {
        messages,
        connectionStatus,
        joinRoom,
        sendMessage,
        participants,
        localSocketId,
        localUsername,
        needsPlayConfirm,
        confirmPlay,
        micStatus,
        isMuted,
        toggleMic,
        startVoice,
        stopVoice,
        localVideoRef,
        remoteVideoRef
    };
}