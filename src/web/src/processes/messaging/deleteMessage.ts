import {axiosInstance} from "../axiosInstance.ts";

export async function deleteMessage(messageId: string): Promise<void> {
    try {
        await axiosInstance.delete(`/api/messages/${messageId}`)
    } catch (error) {
        console.error('Ошибка удаления сообщения:', error)
        throw error
    }
}