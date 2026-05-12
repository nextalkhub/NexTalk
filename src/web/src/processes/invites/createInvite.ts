import {axiosInstance} from "../axiosInstance.ts";
import {CreateInviteRequest, Invite} from "../../shared/types";

export async function createInvite(
    guildId: string,
    data: CreateInviteRequest
): Promise<Invite> {
    try {
        const response = await axiosInstance.post(`/api/guilds/${guildId}/invites`, data)
        return response.data
    } catch (error) {
        console.error('Ошибка создания инвайта:', error)
        throw error
    }
}