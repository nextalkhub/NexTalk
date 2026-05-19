import {axiosInstance} from "../axiosInstance.ts";

export async function deleteInvite(guildId: string, code: string): Promise<void> {
    try {
        await axiosInstance.delete(`/api/guilds/${guildId}/invites/${code}`)
    } catch (error) {
        console.error('Ошибка удаления инвайта:', error)
        throw error
    }
}