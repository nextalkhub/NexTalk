import {axiosInstance} from "../axiosInstance.ts";
import {Channel} from "../../shared/types";

export async function getGuildChannels(guildId: string): Promise<Channel[]> {
    try {
        const response = await axiosInstance.get(`/api/guilds/${guildId}/channels`)
        return response.data
    } catch (error) {
        console.error('Ошибка получения каналов:', error)
        throw error
    }
}