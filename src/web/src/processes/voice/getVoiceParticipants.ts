import { axiosInstance } from "../axiosInstance.ts";

interface GetParticipantsResponse {
    channelId: string
    participants: string[]
}

// Текущие участники голосового канала. Используется для первичной синхронизации
// сайдбара - gateway-события приходят только тем, кто уже был подключен.
export async function getVoiceParticipants(channelId: string): Promise<string[]> {
    const response = await axiosInstance.get<GetParticipantsResponse>(`/api/voice/${channelId}/participants`)
    return response.data.participants ?? []
}
