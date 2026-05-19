import {axiosInstance} from "../axiosInstance.ts";
import {Invite} from "../../shared/types";

export async function getGuildInvites(guildId: string): Promise<Invite[]> {
    try {
        const response = await axiosInstance.get(`/api/guilds/${guildId}/invites`)
        return response.data
    } catch (error) {
        console.error('Ошибка получения инвайтов:', error)
        throw error
    }
}