import {axiosInstance} from "../axiosInstance.ts";
import {Member, UpdateMemberRoleRequest} from "../../shared/types";

export async function updateMemberRole(
    guildId: string,
    userId: string,
    data: UpdateMemberRoleRequest
): Promise<Member> {
    try {
        const response = await axiosInstance.put(
            `/api/guilds/${guildId}/members/${userId}/role`,
            data
        )
        return response.data
    } catch (error) {
        console.error('Ошибка назначения роли:', error)
        throw error
    }
}