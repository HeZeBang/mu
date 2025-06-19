"use client";

import mdata from "./music_data_20250613.json";
import ddata from "./chart_stats.json";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";


interface ChartStat {
  cnt: number;
  diff: string;
  fit_diff: number;
  avg: number;
  avg_dx: number;
  std_dev: number;
  dist: number[];
  fc_dist: number[];
}

interface ChartStats {
  charts: { [musicId: string]: ChartStat[] };
}
interface BasicInfo {
  artist: string;
  bpm: number;
  from: string;
  genre: string;
  image_url: string;
  is_new: boolean;
  title: string;
  version: string;
}

interface Chart {
  charter: string;
  notes: number[]; // [tap, hold, slide, break]
}

interface MusicData {
  alias?: string[];
  basic_info: BasicInfo;
  charts: Chart[];
  ds: number[]; // difficulty scores
  id: string;
  level: string[];
  old_ds: number[]; // old difficulty scores
  title: string;
  type: string;
}

function paginate<T>(data: T[], page: number, pageSize: number = 10): T[] {
  const start = (page - 1) * pageSize;
  return data.slice(start, start + pageSize);
}

const difficultyNames = [
  "Basic",
  "Advanced",
  "Expert",
  "Master",
  "Re:Master",
];

const difficultyColors = [
  ["bg-green-500", "text-white"],
  ["bg-yellow-500", "text-white"],
  ["bg-red-500", "text-white"],
  ["bg-purple-500", "text-white"],
  ["bg-white", "text-purple-500"],
];

// badge 类型定义
interface BadgeTypes {
  xiaoge: boolean;
  xinge: boolean;
  zhenchaoxi: boolean;
  juezan: boolean;
  dilei: boolean;
  baipu: boolean;
  xingxing: boolean;
  duijue: boolean;
}

// badge 过滤后曲目类型
interface FilteredChart {
  chart: Chart;
  index: number;
  badgeTypes: BadgeTypes;
}
interface FilteredMusicData extends Omit<MusicData, 'charts'> {
  charts: FilteredChart[];
}

// 辅助函数：判断每个难度的 badge 类型
function getBadgeTypes(
  music: MusicData,
  chart: Chart,
  index: number,
  chartStats: ChartStats["charts"]
): BadgeTypes {
  return {
    xiaoge: music.ds[index] < 13,
    xinge: ["舞萌DX 2023", "舞萌DX 2024", "舞萌DX 2025"].includes(music.basic_info.from) && index == 3,
    zhenchaoxi: ["maimai", "maimai PLUS", "maimai GreeN", "maimai GreeN PLUS"].includes(music.basic_info.from) && index == 3,
    juezan: (chart.notes.at(chart.notes.length - 1) || 0) > 40,
    dilei: chartStats[music.id] && (chartStats[music.id][index].fit_diff - music.ds[index] > 0.2) && music.ds[index] >= 12 && music.ds[index] < 13,
    baipu: index == 4,
    xingxing: chart.notes.reduce((acc: number, curr: number) => acc + curr, 0) > 1000,
    duijue: music.ds[index] > 14.5,
  };
}

export default function Home() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [searchFields, setSearchFields] = useState({
    alias: true,
    charter: true,
    title: true,
  });
  const [badgeFilters, setBadgeFilters] = useState({
    xiaoge: false,
    xinge: false,
    zhenchaoxi: false,
    juezan: false,
    dilei: false,
    baipu: false,
    xingxing: false,
    duijue: false,
  });
  useEffect(() => { setPage(1); }, [searchTerm, searchFields]);

  const filteredData = mdata.filter((m: MusicData) => m.basic_info.genre != "宴会场").filter((music: MusicData) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.trim().toLowerCase();
    let match = false;
    if (searchFields.alias && music.alias?.some((a: string) => a.toLowerCase().includes(term))) match = true;
    if (searchFields.title && music.title.toLowerCase().includes(term)) match = true;
    if (searchFields.charter && music.charts.some((c: Chart) => c.charter.toLowerCase().includes(term))) match = true;
    return match;
  });
  const chartStats = (ddata as ChartStats).charts;

  const filteredDataWithBadge: FilteredMusicData[] = filteredData.map((music: MusicData) => {
    const filteredCharts: FilteredChart[] = music.charts.map((chart: Chart, index: number) => ({ chart, index, badgeTypes: getBadgeTypes(music, chart, index, chartStats) }))
      .filter(({ badgeTypes }: { badgeTypes: BadgeTypes }) =>
        Object.entries(badgeFilters).every(([key, value]) => !value || badgeTypes[key as keyof BadgeTypes])
      );
    return { ...music, charts: filteredCharts };
  }).filter((music: FilteredMusicData) => music.charts.length > 0);

  const totalPages = Math.max(1, Math.ceil(filteredDataWithBadge.length / pageSize));
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-4 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">

        <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
          斗技杯 2025 团队挑战赛
        </h1>
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          曲库浏览
        </h2>

        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="输入关键词"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="border rounded px-2 py-1"
          />
          <label className="flex items-center gap-1">
            <Checkbox
              checked={searchFields.alias}
              onCheckedChange={v => setSearchFields(f => ({ ...f, alias: !!v }))}
            />
            别名
          </label>
          <label className="flex items-center gap-1">
            <Checkbox
              checked={searchFields.charter}
              onCheckedChange={v => setSearchFields(f => ({ ...f, charter: !!v }))}
            />
            谱师
          </label>
          <label className="flex items-center gap-1">
            <Checkbox
              checked={searchFields.title}
              onCheckedChange={v => setSearchFields(f => ({ ...f, title: !!v }))}
            />
            乐曲名
          </label>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <label><Checkbox checked={badgeFilters.xiaoge} onCheckedChange={v => setBadgeFilters(f => ({...f, xiaoge: !!v}))}/> 小歌</label>
          <label><Checkbox checked={badgeFilters.xinge} onCheckedChange={v => setBadgeFilters(f => ({...f, xinge: !!v}))}/> 新歌</label>
          <label><Checkbox checked={badgeFilters.zhenchaoxi} onCheckedChange={v => setBadgeFilters(f => ({...f, zhenchaoxi: !!v}))}/> 真超檄</label>
          <label><Checkbox checked={badgeFilters.juezan} onCheckedChange={v => setBadgeFilters(f => ({...f, juezan: !!v}))}/> 绝赞</label>
          <label><Checkbox checked={badgeFilters.dilei} onCheckedChange={v => setBadgeFilters(f => ({...f, dilei: !!v}))}/> 地雷</label>
          <label><Checkbox checked={badgeFilters.baipu} onCheckedChange={v => setBadgeFilters(f => ({...f, baipu: !!v}))}/> 白谱</label>
          <label><Checkbox checked={badgeFilters.xingxing} onCheckedChange={v => setBadgeFilters(f => ({...f, xingxing: !!v}))}/> 猩猩</label>
          <label><Checkbox checked={badgeFilters.duijue} onCheckedChange={v => setBadgeFilters(f => ({...f, duijue: !!v}))}/> 对决</label>
        </div>

        {
          paginate(filteredDataWithBadge, page, pageSize).map((music: FilteredMusicData) => {
            return (
              <div key={music.id} className="flex flex-col gap-4 max-w-4xl">
                <div className="flex items-center gap-4">
                  <img
                    src={`https://maimaidx.jp/maimai-mobile/img/Music/${music.basic_info.image_url}`}
                    alt={`${music.basic_info.title} cover`}
                    width={100}
                    height={100}
                    className="rounded-lg"
                  />
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 items-start">
                      <h3 className="text-xl font-bold">{music.basic_info.title}</h3>
                      <code className="text-sm text-gray-500">#{music.id}</code>
                    </div>
                    <p className="text-sm text-gray-500">
                      {music.basic_info.artist}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">分类：{music.basic_info.genre}</Badge>
                      <Badge variant="outline">类型：{music.type}</Badge>
                      <Badge variant="outline">版本：{music.basic_info.from}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {music.alias?.map((alias: string, index: number) => (
                    <Badge variant="secondary" key={index}>{alias}</Badge>
                  ))}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                  {music.charts.map(({ chart, index }: FilteredChart) => (
                    <div key={index} className={`flex flex-col overflow-hidden gap-1 rounded-md shadow-md border-2`}>
                      <span className={`px-2 py-1 bg-gray-200 ${difficultyColors[index][0]} ${difficultyColors[index][1]} flex gap-3 items-center`}>
                        <b className="text-3xl w-[2em]"><code>{music.level[index]}</code></b>
                        <span>
                          {music.ds[index].toFixed(1)} / <small>拟合:</small> {chartStats[music.id] ? chartStats[music.id][index].fit_diff.toFixed(2) : "-"}
                          <br />
                          <b>{difficultyNames[index]}</b>
                        </span>
                      </span>
                      <div className="p-2">
                        <div className="flex flex-row  flex-wrap gap-1 pb-2">
                          {music.ds[index] < 13 &&
                            <Badge className="bg-red-500 text-white">小歌</Badge>}
                          {["舞萌DX 2023", "舞萌DX 2024", "舞萌DX 2025"].includes(music.basic_info.from) && index == 3 &&
                            <Badge className="bg-blue-500 text-white">新歌</Badge>}
                          {["maimai", "maimai PLUS", "maimai GreeN", "maimai GreeN PLUS"].includes(music.basic_info.from) && index == 3 &&
                            <Badge className="bg-cyan-500 text-white">真超檄</Badge>}
                          {(chart.notes.at(chart.notes.length - 1) || 0) > 40 &&
                            <Badge className="bg-yellow-500 text-white">绝赞</Badge>}
                          {chartStats[music.id] && (chartStats[music.id][index].fit_diff - music.ds[index] > 0.2) && music.ds[index] >= 12 && music.ds[index] < 13 &&
                            <Badge>地雷</Badge>}
                          {false && <Badge className="bg-pink-500 text-white">宴会</Badge>}
                          {index == 4 && <Badge variant="secondary">白谱</Badge>}
                          {chart.notes.reduce((acc: number, curr: number) => acc + curr, 0) > 1000 &&
                            <Badge className="bg-amber-500 text-white">猩猩</Badge>}
                          {music.ds[index] > 14.5 &&
                            <Badge className="bg-blue-500 text-white">对决</Badge>}
                        </div>
                        <span>
                          谱师：{chart.charter}
                          <br />
                          物量：{chart.notes.reduce((acc: number, curr: number) => acc + curr, 0)}
                          <br />
                          音符：{chart.notes.join("/")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        }
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <button
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          上一页
        </button>
        <span>
          第 {page} / {totalPages} 页
        </span>
        <button
          className="px-3 py-1 rounded bg-gray-200 disabled:opacity-50"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          下一页
        </button>
      </footer>
    </div>
  );
}
