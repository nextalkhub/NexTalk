import React from 'react'
import styles from './ServerCard.module.scss'
import {Guild} from "../../../shared/types";

interface ServerCardProps {
    server: Guild
    onClick: () => void
}

export const ServerCard: React.FC<ServerCardProps> = ({ server, onClick }) => {
    return (
        <div className={styles.card} onClick={onClick}>
            <div>{server.name}</div>
        </div>
    )
}