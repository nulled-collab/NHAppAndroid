// context/SortContext.tsx
import AsyncStorage from "@react-native-async-storage/async-storage"
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react"

export type SortKey =
  | "popular"
  | "popular-week"
  | "popular-today"
  | "popular-month"
  | "date"

const STORAGE_KEY = "searchSortPref"

/* -------- контекст без значения по умолчанию -------- */
interface ISortCtx {
  sort: SortKey
  setSort: (s: SortKey) => void
}
const SortContext = createContext<ISortCtx | undefined>(undefined)

/* -------- provider ----------------------------------- */
export const SortProvider = ({ children }: { children: React.ReactNode }) => {
  const [sort, setSortState] = useState<SortKey>("date") // стартуем с «date»
  const [ready, setReady] = useState(false)

  /* один раз читаем AsyncStorage */
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((s) => {
      if (s) setSortState(s as SortKey)
      setReady(true)
    })
  }, [])

  /* единый метод изменить сортировку + записать в хранилище */
  const setSort = useCallback((s: SortKey) => {
    setSortState(s)
    AsyncStorage.setItem(STORAGE_KEY, s).catch(() => {})
  }, [])

  const value = useMemo(() => ({ sort, setSort }), [sort, setSort])

  /* пока не загрузили AsyncStorage — можно вернуть null/spinner */
  if (!ready) return null

  return <SortContext.Provider value={value}>{children}</SortContext.Provider>
}

/* -------- хук: бросаем ошибку, если провайдера нет ----- */
export const useSort = () => {
  const ctx = useContext(SortContext)
  if (!ctx) throw new Error("useSort must be used inside SortProvider")
  return ctx
}
