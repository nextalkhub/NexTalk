import {axiosInstance} from "../axiosInstance.ts";
import {GetMessagesResponse} from "../../shared/types";

export async function getChannelMessages(
    channelId: string,
    options?: {
        cursor?: string
        limit?: number
    }
): Promise<GetMessagesResponse> {
    try {
        const params = new URLSearchParams()
        if (options?.cursor) params.append('cursor', options.cursor)
        if (options?.limit) params.append('limit', Math.min(options.limit, 100).toString())

        const url = `/api/channels/${channelId}/messages${params.toString() ? `?${params}` : ''}`
        const response = await axiosInstance.get(url)

        return {
            messages: response.data.messages,
            nextCursor: response.data.nextCursor,
            prevCursor: response.data.prevCursor,
            hasMore: response.data.hasMore,
            total: response.data.total
        }
    } catch (error) {
        console.error('Ошибка получения сообщений:', error)
        throw error
    }
}