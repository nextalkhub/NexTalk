import {axiosInstance} from "../axiosInstance.ts";
import {Guild} from "../../shared/types";

export async function getGuildById(guildId: string): Promise<Guild> {
    try {
        const response = await axiosInstance.get(`/api/guilds/${guildId}`)
        return response.data
    } catch (error) {
        console.error('Ошибка получения сервера:', error)
        throw error
    }
}