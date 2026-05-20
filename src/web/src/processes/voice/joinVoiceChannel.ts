import {axiosInstance} from "../axiosInstance.ts";
import {JoinVoiceResponse} from "../../shared/types";

export async function joinVoiceChannel(channelId: string): Promise<JoinVoiceResponse> {
    try {
        const response = await axiosInstance.post(`/api/voice/${channelId}/join`)
        return response.data
    } catch (error) {
        console.error('Ошибка подключения к голосовому каналу:', error)
        throw error
    }
}