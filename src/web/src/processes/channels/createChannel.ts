import {axiosInstance} from "../axiosInstance.ts";
import {Channel, CreateChannelRequest} from "../../shared/types";

export async function createChannel(
    guildId: string,
    data: CreateChannelRequest
): Promise<Channel> {
    try {
        const response = await axiosInstance.post(`/api/guilds/${guildId}/channels`, data)
        return response.data
    } catch (error) {
        console.error('Ошибка создания канала:', error)
        throw error
    }
}