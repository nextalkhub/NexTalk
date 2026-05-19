import {axiosInstance} from "../axiosInstance.ts";

export async function leaveVoiceChannel(channelId: string): Promise<void> {
    try {
        await axiosInstance.post(`/api/voice/${channelId}/leave`)
    } catch (error) {
        console.error('Ошибка выхода из голосового канала:', error)
        throw error
    }
}