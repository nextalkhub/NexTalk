import {axiosInstance} from "../axiosInstance.ts";
import {CreateGuildRequest, Guild} from "../../shared/types";

export async function updateGuild(
    guildId: string,
    data: Partial<CreateGuildRequest>
): Promise<Guild> {
    try {
        const response = await axiosInstance.put(`/api/guilds/${guildId}`, data)
        return response.data
    } catch (error) {
        console.error('Ошибка обновления сервера:', error)
        throw error
    }
}