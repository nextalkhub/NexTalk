import { axiosInstance } from '../axiosInstance'

export const unbanMember = async (guildId: string, userId: string): Promise<void> => {
  await axiosInstance.delete(`/api/guilds/${guildId}/bans/${userId}`)
}
