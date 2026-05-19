import {axiosInstance} from "../axiosInstance.ts";

export async function kickMember(guildId: string, userId: string): Promise<void> {
    try {
        await axiosInstance.delete(`/api/guilds/${guildId}/members/${userId}`)
    } catch (error) {
        console.error('Ошибка кика участника:', error)
        throw error
    }
}