// app/(tabs)/index.tsx
import { Book, searchBooks } from "@/api/nhentai";
import BookCard from "@/components/BookCard";
import PaginationBar from "@/components/PaginationBar";
import { hsbToHex } from "@/constants/Colors";
import { useSort } from "@/context/SortContext";
import { useFilterTags } from "@/context/TagFilterContext";
import { useUpdateCheck } from "@/hooks/useUpdateCheck";

import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

/* palette */
const accent   = hsbToHex({ saturation: 94, brightness: 50 });
const bannerBg = hsbToHex({ saturation: 94, brightness: 250 });

/* progress ring */
const Ring = ({
  progress, size = 17, stroke = 3,
}: { progress: number; size?: number; stroke?: number }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ marginRight: 16 }}>
      <Circle cx={size / 2} cy={size / 2} r={r}
        stroke={accent} strokeOpacity={0.25} strokeWidth={stroke} fill="none" />
      <Circle cx={size / 2} cy={size / 2} r={r}
        stroke={accent} strokeWidth={stroke}
        strokeDasharray={`${c}`} strokeDashoffset={c * (1 - progress)}
        strokeLinecap="round" fill="none" rotation={-90}
        origin={`${size / 2},${size / 2}`} />
    </Svg>
  );
};

export default function HomeScreen() {
  const { sort }               = useSort();
  const { includes, excludes } = useFilterTags();
  const incStr                 = JSON.stringify(includes);
  const excStr                 = JSON.stringify(excludes);

  const [books, setBooks]      = useState<Book[]>([]);
  const [totalPages, setTotal] = useState(1);
  const [currentPage, setPage] = useState(1);
  const [favorites, setFav]    = useState<Set<number>>(new Set());
  const [pending, setPend]     = useState(true);
  const [refreshing, setRef]   = useState(false);

  const { update, progress, downloadAndInstall, checkUpdate } = useUpdateCheck();

  const listRef = useRef<FlatList>(null);
  const router  = useRouter();
  const insets  = useSafeAreaInsets();

  /* ---------- load favorites ---------- */
  useEffect(() => {
    AsyncStorage.getItem("bookFavorites").then(j =>
      j && setFav(new Set(JSON.parse(j)))
    );
  }, []);

  const toggleFav = (id:number,next:boolean) =>
    setFav(prev => {
      const cp=new Set(prev);
      next?cp.add(id):cp.delete(id);
      AsyncStorage.setItem("bookFavorites", JSON.stringify([...cp]));
      return cp;
    });

  /* ---------- pagination ---------- */
  const fetchPage = useCallback(async(page:number)=>{
    setPend(true);
    try{
      const res = await searchBooks({
        sort, page, perPage:40,
        includeTags: includes, excludeTags: excludes,
      });
      setBooks(res.books);
      setTotal(res.totalPages);
      setPage(page);
      listRef.current?.scrollToOffset({ offset:0, animated:false });
    } finally { setPend(false); }
  },[sort, incStr, excStr]);

  useEffect(()=>{ fetchPage(1); },[fetchPage]);

  const onRefresh = useCallback(async () => {
    setRef(true);
    await fetchPage(currentPage);
    await checkUpdate();             // ← повторная проверка релиза
    setRef(false);
  }, [currentPage, fetchPage, checkUpdate]);

  if (pending && currentPage === 1)
    return <ActivityIndicator style={{ flex:1 }} />;

  /* ---------- UI ---------- */
  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={books}
        extraData={[update, progress]}   // заставляем перерендерить шапку
        keyExtractor={b => `${b.id}`}
        ListHeaderComponent={
          update && currentPage === 1 ? (
            <TouchableOpacity
              style={[
                styles.updateBanner,
                progress !== null && styles.updateBannerDisabled,
              ]}
              activeOpacity={0.8}
              onPress={downloadAndInstall}
              disabled={progress !== null}
            >
              {progress === null ? (
                <>
                  <Text style={styles.updateTxt}>
                    Скачать обновление {update.versionName}
                  </Text>
                  <Feather name="download" size={17} color="#000" style={{ marginRight:16 }}/>
                </>
              ) : (
                <>
                  <Text style={styles.updateTxt}>
                    Скачивается {update.versionName}
                  </Text>
                  <Ring progress={progress}/>
                </>
              )}
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <BookCard
            book={item}
            isFavorite={favorites.has(item.id)}
            onToggleFavorite={toggleFav}
            onPress={() =>
              router.push({ pathname: "/book/[id]", params:{ id:String(item.id) } })
            }
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>
        }
        contentContainerStyle={{ paddingBottom: 55 + insets.bottom }}
      />

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        onChange={p => fetchPage(p)}
      />

      {pending && currentPage !== 1 && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff"/>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1 },
  overlay:{
    ...StyleSheet.absoluteFillObject,
    backgroundColor:"rgba(0,0,0,0.25)",
    justifyContent:"center",
    alignItems:"center",
  },

  /* --- update banner --- */
  updateBanner:{
    flexDirection:"row",
    alignItems:"center",
    justifyContent:"space-between",
    backgroundColor: bannerBg,
    marginHorizontal:16,
    marginVertical:12,
    borderRadius:80,
    paddingVertical:10,
  },
  updateBannerDisabled:{ opacity:0.8 },
  updateTxt:{ fontSize:15, marginLeft:16, fontWeight:"500", color:"#000" },
});
