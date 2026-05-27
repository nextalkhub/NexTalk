import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IHome, IPlus } from '../Icons/Icons'
import { avatarBg } from '../Avatar/Avatar'
import { useAppDispatch, useAppSelector } from '../../../store'
import { selectServers, selectCurrentServer, setCurrentServer } from '../../slices/serverSlice'
import type { Guild } from '../../types'

export const ServerRail: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const servers = useAppSelector(selectServers)
  const currentServer = useAppSelector(selectCurrentServer)
  const { serverId } = useParams()

  const activeId = serverId ?? currentServer?.id

  const handleServerClick = (server: Guild) => {
    if (!server.id || !server.name) return
    dispatch(setCurrentServer(server))
    navigate(`/servers/${server.id}/channels`)
  }

  return (
    <nav className="rail">
      <div className="rail-inner">
        <button
          className={`rail-icon${!activeId ? ' is-active' : ''}`}
          title="Главная"
          onClick={() => navigate('/servers')}
        >
          <IHome />
        </button>
        <div className="rail-sep" />
        {servers.filter(s => s.id && s.name).map(server => (
          <button
            key={server.id}
            className={`rail-icon${activeId === server.id ? ' is-active' : ''}`}
            title={server.name}
            style={activeId !== server.id ? { background: avatarBg(server.id) } : undefined}
            onClick={() => handleServerClick(server)}
          >
            {(server.name ?? '?').charAt(0).toUpperCase()}
          </button>
        ))}
        <button
          className="rail-icon rail-icon-ghost"
          title="Создать сервер"
          onClick={() => navigate('/create-server')}
        >
          <IPlus />
        </button>
      </div>
    </nav>
  )
}
