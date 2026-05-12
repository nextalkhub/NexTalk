import {axiosInstance} from "../axiosInstance.ts";
import {Channel, CreateChannelRequest} from "../../shared/types";

export async function updateChannel(
    guildId: string,
    channelId: string,
    data: Partial<CreateChannelRequest>
): Promise<Channel> {
    try {
        const response = await axiosInstance.put(
            `/api/guilds/${guildId}/channels/${channelId}`,
            data
        )
        return response.data
    } catch (error) {
        console.error('Ошибка обновления канала:', error)
        throw error
    }
}