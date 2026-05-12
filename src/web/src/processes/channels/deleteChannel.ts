import {axiosInstance} from "../axiosInstance.ts";

export async function deleteChannel(guildId: string, channelId: string): Promise<void> {
    try {
        await axiosInstance.delete(`/api/guilds/${guildId}/channels/${channelId}`)
    } catch (error) {
        console.error('Ошибка удаления канала:', error)
        throw error
    }
}