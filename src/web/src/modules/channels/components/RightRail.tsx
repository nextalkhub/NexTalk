import React, { useState } from 'react'
import { Icon } from '../../../shared/components/Icon/Icon'
import { MembersSidebar } from '../../../shared/components/Layout/MembersSidebar'
import { MessageInterface } from '../../../shared/slices/chatSlice'
import styles from './RightRail.module.scss'

type RightView = 'members' | 'thread' | 'pinned' | 'search' | 'inbox'

interface RightRailProps {
    view: RightView
    onView: (v: RightView) => void
    channelId: string
    messages: MessageInterface[]
}

const TABS: { key: RightView; icon: string; label: string }[] = [
    { key: 'members', icon: 'users',  label: 'Участники'  },
    { key: 'thread',  icon: 'thread', label: 'Треды'      },
    { key: 'pinned',  icon: 'pin',    label: 'Закреп'     },
    { key: 'search',  icon: 'search', label: 'Поиск'      },
    { key: 'inbox',   icon: 'inbox',  label: 'Входящие'   },
]

export const RightRail: React.FC<RightRailProps> = ({ view, onView, messages }) => {
    const [query, setQuery] = useState('')

    const filtered = query.trim()
        ? messages.filter(
              m =>
                  m.content.toLowerCase().includes(query.toLowerCase()) ||
                  m.authorName.toLowerCase().includes(query.toLowerCase())
          )
        : []

    return (
        <div className={styles.rail}>
            <div className={styles.tabs}>
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`${styles.tab} ${view === tab.key ? styles.active : ''}`}
                        onClick={() => onView(tab.key)}
                        title={tab.label}
                    >
                        <Icon name={tab.icon} size={15} />
                    </button>
                ))}
            </div>

            <div className={styles.body}>
                {view === 'members' && <MembersSidebar />}

                {view === 'thread' && (
                    <>
                        <div className={styles.sectionLabel}>активные треды</div>
                        {/* FEATURE-GAP: 03 — треды */}
                        <div className={styles.emptyState}>
                            <div className={styles.iconBlob}>
                                <Icon name="thread" size={24} />
                            </div>
                            <p className={styles.emptyTitle}>Нет открытых тредов</p>
                            <p className={styles.emptyText}>
                                Ответьте на сообщение, чтобы начать тред.
                            </p>
                        </div>
                    </>
                )}

                {view === 'pinned' && (
                    <>
                        <div className={styles.sectionLabel}>закреплённое</div>
                        {/* FEATURE-GAP: 06 — закреп сообщений */}
                        <div className={styles.emptyState}>
                            <div className={styles.iconBlob}>
                                <Icon name="pin" size={24} />
                            </div>
                            <p className={styles.emptyTitle}>Нет закреплённых</p>
                            <p className={styles.emptyText}>
                                Закрепляйте важные сообщения, чтобы они были всегда под рукой.
                            </p>
                        </div>
                    </>
                )}

                {view === 'search' && (
                    <div className={styles.searchPanel}>
                        <div className={styles.searchBox}>
                            <Icon name="search" size={13} />
                            <input
                                className={styles.searchInput}
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Поиск по сообщениям..."
                                autoFocus
                            />
                            {query && (
                                <button
                                    className={styles.searchClear}
                                    onClick={() => setQuery('')}
                                    title="Очистить"
                                >
                                    <Icon name="x" size={11} />
                                </button>
                            )}
                        </div>

                        {query.trim() ? (
                            filtered.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <div className={styles.iconBlob}>
                                        <Icon name="search" size={24} />
                                    </div>
                                    <p className={styles.emptyTitle}>Ничего не найдено</p>
                                    <p className={styles.emptyText}>Попробуйте другой запрос.</p>
                                </div>
                            ) : (
                                <>
                                    <div className={styles.sectionLabel}>
                                        {filtered.length} результат{filtered.length > 1 ? 'а' : ''} · «{query}»
                                    </div>
                                    <div className={styles.results}>
                                        {filtered.slice(0, 20).map(m => (
                                            <div key={m.id} className={styles.card}>
                                                <div className={styles.cardHead}>
                                                    <b>{m.authorName}</b>
                                                    <span className={styles.cardTime}>
                                                        {new Date(m.createdAt).toLocaleDateString('ru-RU')}
                                                    </span>
                                                </div>
                                                <p className={styles.cardText}>{m.content}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )
                        ) : (
                            <div className={styles.searchHint}>
                                <p>Введите запрос для поиска по сообщениям в этом канале.</p>
                                {/* FEATURE-GAP: 12 — серверный полнотекстовый поиск */}
                            </div>
                        )}
                    </div>
                )}

                {view === 'inbox' && (
                    <>
                        <div className={styles.sectionLabel}>непрочитанное</div>
                        {/* FEATURE-GAP: 13 — inbox / уведомления */}
                        <div className={styles.emptyState}>
                            <div className={styles.iconBlob}>
                                <Icon name="inbox" size={24} />
                            </div>
                            <p className={styles.emptyTitle}>Всё прочитано</p>
                            <p className={styles.emptyText}>Чисто и спокойно.</p>
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
