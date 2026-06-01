import React, { createContext, useContext, useState, useCallback } from 'react'

type GlobalModal = 'create-server' | 'logout' | null

interface ModalCtx {
  modal: GlobalModal
  open: (kind: Exclude<GlobalModal, null>) => void
  close: () => void
}

const ModalContext = createContext<ModalCtx>({
  modal: null,
  open: () => {},
  close: () => {},
})

// eslint-disable-next-line react-refresh/only-export-components
export const useGlobalModal = () => useContext(ModalContext)

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modal, setModal] = useState<GlobalModal>(null)

  const open = useCallback((kind: Exclude<GlobalModal, null>) => setModal(kind), [])
  const close = useCallback(() => setModal(null), [])

  return (
    <ModalContext.Provider value={{ modal, open, close }}>
      {children}
    </ModalContext.Provider>
  )
}
