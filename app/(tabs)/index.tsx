import { Book, searchBooks } from "@/api/nhentai"
import BookCard from "@/components/BookCard"
import PaginationBar from "@/components/PaginationBar"
import { useSort } from "@/context/SortContext"
import { useFilterTags } from "@/context/TagFilterContext"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useRouter } from "expo-router"
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export default function HomeScreen() {
  /* сортировка */
  const { sort } = useSort()

  /* теги */
  const { includes, excludes } = useFilterTags()
  const incStr = JSON.stringify(includes)   // ← стабильные строки
  const excStr = JSON.stringify(excludes)

  /* данные + пагинация */
  const [books, setBooks] = useState<Book[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)

  /* избранное */
  const [favorites, setFav] = useState<Set<number>>(new Set())

  /* статусы */
  const [pending, setPending]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const listRef = useRef<FlatList>(null)
  const router   = useRouter()
  const insets   = useSafeAreaInsets()

  /* разово загружаем избранное */
  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then(
      (j) => j && setFav(new Set(JSON.parse(j))),
    )
  }, [])

  const toggleFav = (id: number, next: boolean) =>
    setFav((prev) => {
      const cp = new Set(prev)
      next ? cp.add(id) : cp.delete(id)
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]))
      return cp
    })

  /* загрузка книг */
  const fetchPage = useCallback(
    async (page: number) => {
      setPending(true)
      try {
        const res = await searchBooks({
          sort,
          page,
          perPage: 40,
          includeTags: includes,
          excludeTags: excludes,
        })
        setBooks(res.books)
        setTotalPages(res.totalPages)
        setCurrentPage(page)
        listRef.current?.scrollToOffset({ offset: 0, animated: false })
      } finally {
        setPending(false)
      }
    },
    /* зависимости — сортировка и строковые сигнатуры тегов */
    [sort, incStr, excStr],
  )

  /* первый запрос и при изменении sort / тегов */
  useEffect(() => {
    fetchPage(1)
  }, [fetchPage])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchPage(currentPage)
    setRefreshing(false)
  }, [currentPage, fetchPage])

  if (pending && currentPage === 1)
    return <ActivityIndicator style={{ flex: 1 }} />

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={books}
        keyExtractor={(b) => `${b.id}`}
        renderItem={({ item }) => (
          <BookCard
            book={item}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFav}
            onPress={() =>
              router.push({ pathname: "/book/[id]", params: { id: String(item.id) } })
            }
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{
          paddingBottom: 55 + insets.bottom,
        }}
      />

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={(p) => fetchPage(p)}
      />

      {pending && currentPage !== 1 && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },
})
