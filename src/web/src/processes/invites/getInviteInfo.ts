import {axiosInstance} from "../axiosInstance.ts";
import {Invite} from "../../shared/types";

export async function getInviteInfo(code: string): Promise<Invite & { guildName: string }> {
    try {
        const response = await axiosInstance.get(`/api/invites/${code}`)
        return response.data
    } catch (error) {
        console.error('Ошибка получения информации об инвайте:', error)
        throw error
    }
}