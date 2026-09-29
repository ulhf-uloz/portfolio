'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronRight, Clock3, ExternalLink, Heart, MapPin, Star, Utensils, Waves, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Mood = 'ご飯' | 'リラックス' | 'アクティビティ'
type Visit = { id: number; spotId: number; date: string; rating: number; memo: string }
type Spot = { id: number; title: string; area: string; category: Mood; stamina: string; duration: string; description: string; access: string; image: string; map: string }

// 初期表示用フォールバックデータ
const initialSpots: Spot[] = [
  { id: 1, title: '千光寺公園', area: '尾道', category: 'リラックス', stamina: '散歩レベル', duration: '半日', description: '尾道の街並みと瀬戸内海を一望できる、気分転換にぴったりの高台の公園。ロープウェイで気軽にアクセスできます。', access: 'JR尾道駅から徒歩約15分 / ロープウェイ山頂駅すぐ', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=1200&q=85', map: 'https://maps.google.com/?q=千光寺公園' },
  { id: 2, title: '宮島表参道商店街', area: '宮島・廿日市', category: 'ご飯', stamina: '散歩レベル', duration: '半日', description: '焼きたてのもみじ饅頭や牡蠣料理を食べ歩き。世界遺産の島で、広島らしい味覚を楽しめます。', access: '宮島桟橋から徒歩約5分', image: 'https://images.unsplash.com/photo-1533929736458-ca588d08c8be?auto=format&fit=crop&w=1200&q=85', map: 'https://maps.google.com/?q=宮島表参道商店街' },
  { id: 3, title: '瀬戸内しまなみ海道', area: '尾道', category: 'アクティビティ', stamina: '元気', duration: '終日', description: '島々をつなぐ絶景のサイクリングルート。潮風を感じながら、忘れられない一日を過ごせます。', access: '尾道駅からレンタサイクル約5分', image: 'https://images.unsplash.com/photo-1502744688674-c619d1586c9e?auto=format&fit=crop&w=1200&q=85', map: 'https://maps.google.com/?q=しまなみ海道' },
  { id: 4, title: '縮景園', area: '広島市', category: 'リラックス', stamina: '散歩レベル', duration: '1時間以内', description: '四季の美しい庭園をゆっくり歩いて、街中で心を整えるひととき。', access: '広島駅から徒歩約15分', image: 'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=85', map: 'https://maps.google.com/?q=縮景園' },
]

const options = [{ label: 'ご飯', icon: Utensils, note: 'おいしいものを食べたい' }, { label: 'リラックス', icon: Waves, note: 'ゆっくり過ごしたい' }, { label: 'アクティビティ', icon: Zap, note: '体を動かしたい' }] as const
const areas = ['全エリア', '広島市', '宮島・廿日市', '呉・江田島', '東広島・西条', '竹原・三原', '尾道', '福山', '世羅', '三次', '庄原', '芸北']

export default function Page() {
  const [user,setUser] = useState<any>(null)
  const [spots, setSpots] = useState<Spot[]>(initialSpots)
  const [mood, setMood] = useState<Mood>('リラックス'), [stamina, setStamina] = useState('散歩レベル'), [duration, setDuration] = useState('半日'), [area, setArea] = useState('全エリア')
  const [view, setView] = useState<'home' | 'recommendations' | 'detail' | 'history'>('home'), [selected, setSelected] = useState<Spot | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [toast, setToast] = useState('')

// Supabaseからスポットデータと訪問履歴を取得
useEffect(() => {
  const fetchData = async () => {
    if (!supabase) return

    // ログインユーザー取得
    const {
      data: { user }
    } = await supabase.auth.getUser()

    setUser(user)

    // スポット一覧の取得
    const { data: spotsData } = await supabase
      .from('spots')
      .select('*')

    if (spotsData && spotsData.length > 0) {
      setSpots(spotsData)
    }

    // 訪問履歴の取得
    const { data: visitsData } = await supabase
      .from('visit_logs')
      .select('*')
      .order('created_at', { ascending: false })

    if (visitsData) {
      setVisits(
        visitsData.map((v) => ({
          id: v.id,
          spotId: v.spot_id,
          date: v.date || '今日',
          rating: v.rating || 0,
          memo: v.memo || ''
        }))
      )
    }
  }

  fetchData()
}, [])

  const recommendations = useMemo(() => spots.filter((spot) => (spot.category === mood || mood === 'リラックス') && (area === '全エリア' || spot.area === area)).slice(0, 3), [spots, mood, area])
  const openDetail = (spot: Spot) => { setSelected(spot); setView('detail') }

  // Supabaseへ訪問記録を追加
  const visit = async () => {
    if (!selected || visits.some((item) => item.spotId === selected.id)) return
    
    const newVisit = { spot_id: selected.id, date: '今日', rating: 0, memo: '' }
    const { data, error } = supabase
      ? await supabase.from('visit_logs').insert([newVisit]).select().single()
      : { data: null, error: true }

    if (!error && data) {
      setVisits((current) => [{ id: data.id, spotId: selected.id, date: '今日', rating: 0, memo: '' }, ...current])
      showToast('訪問を記録しました')
    } else {
      // フォールバック（DB未接続時）
      setVisits((current) => [{ id: Date.now(), spotId: selected.id, date: '今日', rating: 0, memo: '' }, ...current])
      showToast('訪問を記録しました')
    }
  }

  // Supabaseのレビュー更新
  const handleSaveReview = async (rating: number, memo: string, updating: boolean) => {
    if (!selected) return
    
    const existing = visits.find((item) => item.spotId === selected.id)
    if (existing) {
      await supabase?.from('visit_logs').update({ rating, memo }).eq('spot_id', selected.id)
      setVisits((items) => items.map((item) => item.spotId === selected.id ? { ...item, rating, memo } : item))
      showToast(updating ? 'レビューを更新しました' : 'レビューを保存しました')
    }
  }

  // 訪問履歴の削除
  const handleDeleteVisit = async (id: number, spotId: number) => {
    await supabase?.from('visit_logs').delete().eq('id', id)
    setVisits((items) => items.filter((visitItem) => visitItem.id !== id))
    showToast('削除しました')
  }

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2600) }
if (!user) {
  return (
    <div className="p-10 text-center">
      <a
        href="/login"
        className="text-blue-600 underline"
      >
        ログインしてください
      </a>
    </div>
  )
}
  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-10">
        <button onClick={() => setView('home')} className="flex items-center gap-2 text-left" aria-label="トップへ戻る">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-[#1769aa] text-white shadow-lg shadow-blue-200">
            <MapPin className="size-5" fill="currentColor" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">よりみち広島</span>
            <span className="block text-[11px] font-medium text-slate-500">あなたに合う、広島のお出かけ。</span>
          </span>
        </button>
        <button onClick={() => setView('history')} className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 transition hover:ring-blue-300">
          <Heart className="size-4 text-orange-500" fill="currentColor" />訪問履歴
        </button>
      </header>

      <div className="mx-auto w-full max-w-6xl px-5 pb-12 md:px-10">
        {view === 'home' && (
          <section className="mx-auto max-w-3xl pt-10 md:pt-16">
            <div className="mb-10 text-center">
              <p className="mb-3 text-sm font-bold tracking-[0.2em] text-[#1769aa]">HIROSHIMA DAY OUT</p>
              <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-6xl">今日は、どんな<br /><span className="text-[#1769aa]">気分</span>で出かける？</h1>
              <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-slate-500">気分・体力・時間から、あなたにぴったりの場所を<br className="hidden sm:block" />あえて3つだけご提案します。</p>
            </div>
            <div className="flex flex-col gap-7 rounded-[28px] bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 md:p-8">
              <Choice title="気分" value={mood} items={options.map((item) => item.label)} onChange={(value) => setMood(value as Mood)} icons={options.map((item) => item.icon)} />
              <Choice title="体力レベル" value={stamina} items={['ヘトヘト', '散歩レベル', '元気']} onChange={setStamina} />
              <Choice title="利用時間" value={duration} items={['1時間以内', '半日', '終日']} onChange={setDuration} />
              <div>
                <label htmlFor="area" className="mb-3 block text-sm font-bold">エリア <span className="ml-1 text-xs font-normal text-slate-400">任意</span></label>
                <select id="area" value={area} onChange={(event) => setArea(event.target.value)} className="w-full rounded-xl border-0 bg-slate-50 px-4 py-3.5 text-sm font-medium outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#1769aa]">
                  {areas.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <button onClick={() => setView('recommendations')} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1769aa] py-4 text-base font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#12598f]">
                この条件で探す <ChevronRight className="size-5" />
              </button>
            </div>
          </section>
        )}

        {view === 'recommendations' && (
          <section className="mx-auto max-w-4xl pt-7">
            <Back onClick={() => setView('home')} />
            <div className="mb-8 mt-8">
              <p className="text-sm font-bold text-[#1769aa]">あなたへのおすすめ</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">今日はここへ行こう。</h1>
              <p className="mt-2 text-sm text-slate-500">{mood}・{stamina}・{duration}・{area}</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {(recommendations.length ? recommendations : spots.slice(0, 3)).map((spot) => (
                <SpotCard key={spot.id} spot={spot} onClick={() => openDetail(spot)} />
              ))}
            </div>
            <button onClick={() => setView('home')} className="mx-auto mt-8 block text-sm font-semibold text-slate-500 underline underline-offset-4">条件を変えて探す</button>
          </section>
        )}

        {view === 'detail' && selected && (
          <Detail spot={selected} visits={visits} onBack={() => setView('recommendations')} onVisit={visit} onSave={handleSaveReview} />
        )}

        {view === 'history' && (
          <section className="mx-auto max-w-3xl pt-7">
            <Back onClick={() => setView('home')} />
            <div className="mb-8 mt-8">
              <p className="text-sm font-bold text-[#1769aa]">YOUR MEMORIES</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">訪問履歴</h1>
              <p className="mt-2 text-sm text-slate-500">あなたのお出かけの記録です。</p>
            </div>
            <div className="flex flex-col gap-4">
              {visits.map((item) => {
                const spot = spots.find((candidate) => candidate.id === item.spotId)
                if (!spot) return null
                return (
                  <div key={item.id} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                    <img src={spot.image} alt="" className="size-24 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h2 className="font-bold">{spot.title}</h2>
                          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><MapPin className="size-3" />{spot.area} ・ {item.date}</p>
                        </div>
                        <button onClick={() => handleDeleteVisit(item.id, item.spotId)} className="text-xs text-slate-400 hover:text-red-500">削除</button>
                      </div>
                      <Stars value={item.rating} size="small" />
                      {item.memo && <p className="mt-2 truncate text-xs text-slate-500">{item.memo}</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
      {toast && <div role="status" className="fixed bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-xl">{toast}</div>}
    </main>
  )
}

function Detail({ spot, visits, onBack, onVisit, onSave }: { spot: Spot; visits: Visit[]; onBack: () => void; onVisit: () => void; onSave: (rating: number, memo: string, updating: boolean) => void }) {
  const existing = visits.find((item) => item.spotId === spot.id), [rating, setRating] = useState(existing?.rating ?? 0), [memo, setMemo] = useState(existing?.memo ?? ''), [hover, setHover] = useState(0), [error, setError] = useState('')
  const average = existing?.rating ? existing.rating.toFixed(1) : '4.3'
  const save = () => { if (!rating) { setError('評価を選択してください'); return }; setError(''); onSave(rating, memo, Boolean(existing?.rating)) }
  return (
    <section className="mx-auto max-w-3xl pt-7">
      <Back onClick={onBack} />
      <article className="mt-6 overflow-hidden rounded-[28px] bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
        <img src={spot.image} alt={spot.title} className="h-64 w-full object-cover md:h-80" />
        <div className="p-6 md:p-9">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-[#1769aa]">{spot.category}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{spot.area}</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight">{spot.title}</h1>
            </div>
            <div className="text-right">
              <Stars value={4} size="small" />
              <p className="mt-1 text-xs font-medium text-slate-500"><strong className="text-slate-700">{average}</strong> ・ レビュー12件</p>
            </div>
          </div>
          <div className="my-6 flex flex-wrap gap-4 border-y border-slate-100 py-4 text-sm text-slate-600">
            <span className="flex items-center gap-2"><Zap className="size-4 text-orange-500" />{spot.stamina}</span>
            <span className="flex items-center gap-2"><Clock3 className="size-4 text-[#1769aa]" />{spot.duration}</span>
          </div>
          <p className="text-sm leading-8 text-slate-600">{spot.description}</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-1 font-bold text-slate-900">アクセス</p>{spot.access}
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button onClick={onVisit} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#f28b30] py-4 font-bold text-white transition hover:bg-orange-600">
              {existing ? '訪問済み' : 'ここに行く'} <Heart className="size-5" fill="currentColor" />
            </button>
            <a href={spot.map} target="_blank" rel="noreferrer" className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 py-4 font-bold text-slate-700 transition hover:bg-slate-50">
              Google Maps <ExternalLink className="size-4" />
            </a>
          </div>
          <div className="mt-8 border-t border-slate-100 pt-8">
            <div className="mb-5">
              <p className="text-lg font-bold">行ってみた感想を残す</p>
              <p className="mt-1 text-sm text-slate-500">あなたの記録を保存して、あとから振り返れます。</p>
            </div>
            <div className="flex flex-col gap-5">
              <div>
                <p className="mb-3 text-sm font-bold">評価</p>
                <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button key={value} type="button" aria-label={`${value}つ星`} onMouseEnter={() => setHover(value)} onClick={() => setRating(value)} className="rounded-md p-1 transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400">
                      <Star className="size-8" fill={(hover || rating) >= value ? '#f59e0b' : 'none'} stroke={(hover || rating) >= value ? '#f59e0b' : '#cbd5e1'} />
                    </button>
                  ))}
                </div>
                {error && <p className="mt-2 text-sm font-medium text-red-500" role="alert">{error}</p>}
              </div>
              <div>
                <label htmlFor="memo" className="mb-3 block text-sm font-bold">感想・メモ</label>
                <textarea id="memo" maxLength={500} value={memo} onChange={(event) => setMemo(event.target.value)} placeholder={'例：\n景色がとても良かった。\n駐車場は少し混雑していた。\nまた行きたい。'} className="min-h-32 w-full resize-y rounded-2xl border-0 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-[#1769aa]" />
                <p className="mt-1 text-right text-xs text-slate-400">{memo.length} / 500</p>
              </div>
              <button onClick={save} className="w-full rounded-2xl bg-[#1769aa] py-4 font-bold text-white shadow-lg shadow-blue-100 transition hover:bg-[#12598f]">
                {existing?.rating ? 'レビューを更新' : 'レビューを保存'}
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  )
}

function Stars({ value, size = 'normal' }: { value: number; size?: 'small' | 'normal' }) {
  return (
    <div className="flex items-center gap-0.5 text-orange-400" aria-label={`${value}つ星`} role="img">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star key={star} className={size === 'small' ? 'size-3.5' : 'size-5'} fill={star <= value ? 'currentColor' : 'none'} />
      ))}
    </div>
  )
}

function Choice({ title, value, items, onChange, icons }: { title: string; value: string; items: string[]; onChange: (value: string) => void; icons?: typeof Utensils[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-bold">{title}</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item, index) => {
          const Icon = icons?.[index]
          return (
            <button key={item} onClick={() => onChange(item)} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition ${value === item ? 'bg-blue-50 text-[#1769aa] ring-2 ring-[#1769aa]' : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'}`}>
              {Icon && <Icon className="size-4" />}
              {item}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Back({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-[#1769aa]">
      <ArrowLeft className="size-4" />戻る
    </button>
  )
}

function SpotCard({ spot, onClick }: { spot: Spot; onClick: () => void }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 hover:shadow-lg">
      <img src={spot.image} alt={spot.title} className="h-44 w-full object-cover" />
      <div className="p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-[#1769aa]">{spot.area}</span>
          <span className="flex items-center gap-1 text-xs text-slate-500"><Clock3 className="size-3.5" />{spot.duration}</span>
        </div>
        <h2 className="mt-2 text-xl font-bold">{spot.title}</h2>
        <p className="mt-1 text-xs text-slate-500">{spot.stamina} ・ {spot.category}</p>
        <button onClick={onClick} className="mt-5 flex w-full items-center justify-center gap-1 rounded-xl bg-slate-50 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-[#1769aa]">
          詳細を見る <ChevronRight className="size-4" />
        </button>
      </div>
    </article>
  )
}
