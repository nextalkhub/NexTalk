import {axiosInstance} from "../axiosInstance.ts";

export async function acceptInvite(code: string): Promise<{ guildId: string; channelId: string }> {
    try {
        const response = await axiosInstance.post(`/api/invites/${code}/accept`)
        return response.data
    } catch (error) {
        console.error('Ошибка принятия инвайта:', error)
        throw error
    }
}