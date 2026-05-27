import { axiosInstance } from '../axiosInstance'

export interface BanDto {
  userId: string
  bannedBy: string
  reason: string | null
  bannedAt: string
}

export const getBans = async (guildId: string): Promise<BanDto[]> => {
  const { data } = await axiosInstance.get<BanDto[]>(`/api/guilds/${guildId}/bans`)
  return data
}
