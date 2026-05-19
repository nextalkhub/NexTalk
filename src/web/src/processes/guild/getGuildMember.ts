import {axiosInstance} from "../axiosInstance.ts";
import {Member} from "../../shared/types";

export async function getGuildMember(guildId: string, userId: string): Promise<Member> {
    try {
        const response = await axiosInstance.get(`/api/guilds/${guildId}/members/${userId}`)
        return response.data
    } catch (error) {
        console.error('Ошибка получения участника:', error)
        throw error
    }
}