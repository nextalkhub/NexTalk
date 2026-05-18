import { axiosInstance } from "../axiosInstance.ts";
import { GetMessagesResponse } from "../../shared/types";

export async function getChannelMessages(
    channelId: string,
    options?: {
        cursor?: string
        limit?: number
    }
): Promise<GetMessagesResponse> {
    try {
        const userId = '3'
        const response = await axiosInstance.get(
            `/channels/${channelId}/messages`,
            {
                headers: {
                    'X-User-Id': userId
                },
                params: {
                    cursor: options?.cursor,
                    limit: options?.limit ?? 50,
                },
            }
        )

        console.log('getChannelMessages: ', response.data)
        return response.data
    } catch (error) {
        console.error('Ошибка получения сообщений:', error)
        throw error
    }
}