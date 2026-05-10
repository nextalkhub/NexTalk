// import {axiosInstance} from "../axiosInstance.ts";
// import {VoiceRoomInfo} from "../../shared/types";
//
// export async function getAllActiveVoiceChannels(): Promise<VoiceRoomInfo[]> {
//     try {
//         const response = await axiosInstance.get('/api/voice/channels')
//         return response.data.map((room: any) => ({
//             ...room,
//             createdAt: new Date(room.createdAt),
//             participants: room.participants.map((p: any) => ({
//                 ...p,
//                 joinedAt: new Date(p.joinedAt)
//             }))
//         }))
//     } catch (error) {
//         console.error('Ошибка получения активных комнат:', error)
//         throw error
//     }
// }