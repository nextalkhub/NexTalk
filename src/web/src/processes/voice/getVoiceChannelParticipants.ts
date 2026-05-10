import {axiosInstance} from "../axiosInstance.ts";
import {VoiceParticipant} from "../../shared/types";

export async function getVoiceChannelParticipants(
    channelId: string
): Promise<VoiceParticipant[]> {
    try {
        const response = await axiosInstance.get(`/api/voice/${channelId}/participants`)
        return response.data.map((p: VoiceParticipant) => ({
            ...p,
            joinedAt: new Date(p.joinedAt)
        }))
    } catch (error) {
        console.error('Ошибка получения участников голосового канала:', error)
        throw error
    }
}