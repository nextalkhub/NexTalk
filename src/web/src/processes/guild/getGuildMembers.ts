import {axiosInstance} from "../axiosInstance.ts";
import {Member} from "../../shared/types";

export async function getGuildMembers(guildId: string): Promise<Member[]> {
    try {
        const response = await axiosInstance.get(`/api/guilds/${guildId}/members`)
        console.log("getGuildMembers response: ", response.data)
        return response.data
    } catch (error) {
        console.error('Ошибка получения участников:', error)
        throw error
    }
}