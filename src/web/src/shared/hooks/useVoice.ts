import {useCallback,useRef,useState} from 'react'
import {
    Room,
    RoomEvent,
    RemoteParticipant
} from 'livekit-client'

import {joinVoiceChannel} from '../../processes/voice/joinVoiceChannel'
import {leaveVoiceChannel} from '../../processes/voice/leaveVoiceChannel'
import {VoiceParticipant} from "../types"

export const useVoice=()=>{

    const roomRef=useRef<Room|null>(null)

    const connectingRef=useRef(false)

    const [participants,setParticipants]=useState<VoiceParticipant[]>([])
    const [isConnected,setIsConnected]=useState(false)
    const [isMuted,setIsMuted]=useState(false)

    const syncParticipants=useCallback(()=>{

        const room=roomRef.current

        if(!room) return

        const list=Array.from(
            room.remoteParticipants.values()
        ).map(
            (p:RemoteParticipant)=>({

                userId:p.identity,
                username:p.name || p.identity,
                isMuted:false,
                isDeafened:false
            })
        )

        setParticipants(list)

    },[])

    const joinVoice=useCallback(async(
        channelId:string,
        _: {id:string,name:string}
    )=>{

        if(
            connectingRef.current ||
            roomRef.current
        ){
            return
        }

        connectingRef.current=true

        try{

            const response=
                await joinVoiceChannel(channelId)

            console.log(response)

            const room=new Room()

            roomRef.current=room

            room.on(
                RoomEvent.ParticipantConnected,
                syncParticipants
            )

            room.on(
                RoomEvent.ParticipantDisconnected,
                syncParticipants
            )

            room.on(
                RoomEvent.Disconnected,
                ()=>{

                    roomRef.current=null
                    setParticipants([])
                    setIsConnected(false)
                }
            )

            await room.connect(
                response.liveKitUrl,
                response.token
            )

            await room.localParticipant.setMicrophoneEnabled(true)

            setIsConnected(true)
            setIsMuted(false)

            syncParticipants()

        }
        catch(err){

            console.error(
                'Voice connect error:',
                err
            )
        }
        finally{
            connectingRef.current=false
        }

    },[syncParticipants])

    const leaveVoice=useCallback(async(
        channelId:string
    )=>{

        const room=roomRef.current

        if(!room) return

        try{

            await leaveVoiceChannel(channelId)

        }
        catch(err){

            console.error(err)
        }

        room.disconnect()

        roomRef.current=null

        setParticipants([])
        setIsConnected(false)

    },[])

    const toggleMic=useCallback(async()=>{

        const room=roomRef.current

        if(!room) return

        const next=!isMuted

        await room.localParticipant
            .setMicrophoneEnabled(next)

        setIsMuted(!next)

    },[isMuted])

    return{
        participants,
        isConnected,
        isMuted,
        joinVoice,
        leaveVoice,
        toggleMic
    }
}