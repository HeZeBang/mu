"use client";

import mdata from "./music_data_20250613.json";
import ddata from "./chart_stats.json";
import { Badge } from "@/components/ui/badge";
import React, { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Suspense } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";


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
  slides: boolean;
  dilei: boolean;
  baipu: boolean;
  xingxing: boolean;
  duijue: boolean;
}

// badge 配置，避免重复定义
const badgeConfigs = [
  { key: 'xiaoge', label: '小歌' },
  { key: 'xinge', label: '新歌' },
  { key: 'zhenchaoxi', label: '真超檄' },
  { key: 'juezan', label: '绝赞' },
  { key: 'slides', label: '星星' },
  { key: 'dilei', label: '地雷' },
  { key: 'baipu', label: '白谱' },
  { key: 'xingxing', label: '猩猩' },
  { key: 'duijue', label: '对决' },
] as const;

interface FilteredChart {
  chart: Chart;
  index: number;
  badgeTypes: BadgeTypes;
  ds: number;
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
  const totalNotes = chart.notes.reduce((acc: number, curr: number) => acc + curr, 0);
  return {
    xiaoge: music.ds[index] < 13,
    xinge: ["舞萌DX 2023", "舞萌DX 2024", "舞萌DX 2025"].includes(music.basic_info.from) && index == 3,
    zhenchaoxi: ["maimai", "maimai PLUS", "maimai GreeN", "maimai GreeN PLUS"].includes(music.basic_info.from) && index == 3,
    juezan: (chart.notes.at(chart.notes.length - 1) || 0) > 40 && music.ds[index] <= 14.5,
    slides: chart.notes[2] / totalNotes > 0.2,
    dilei: chartStats[music.id] && (chartStats[music.id][index].fit_diff - music.ds[index] > 0.2) && music.ds[index] >= 12 && music.ds[index] < 14,
    baipu: index == 4,
    xingxing: totalNotes > 1000,
    duijue: music.ds[index] > 14.5,
  };
}

function MainContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const pageSize = 10;
  const [page, setPage] = useState(() => parseInt(searchParams.get("page") || "1"));
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get("searchTerm") || "");
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchFields, setSearchFields] = useState(() => {
    const fieldsParam = searchParams.get('searchFields');
    if (fieldsParam === null) {
      return { alias: true, charter: true, title: true };
    }
    const enabledFields = fieldsParam.split(',').filter(Boolean);
    return {
      alias: enabledFields.includes('alias'),
      charter: enabledFields.includes('charter'),
      title: enabledFields.includes('title'),
    };
  });
  const [badgeFilters, setBadgeFilters] = useState<BadgeTypes>(() => {
    const initialFilters: BadgeTypes = {
      xiaoge: false, xinge: false, zhenchaoxi: false, juezan: false,
      slides: false, dilei: false, baipu: false, xingxing: false, duijue: false,
    };
    const badgesParam = searchParams.get('badgeFilters');
    if (badgesParam) {
      badgesParam.split(',').forEach((b) => {
        if (b in initialFilters) {
          (initialFilters as any)[b] = true;
        }
      });
    }
    return initialFilters;
  });
  const [dsRange, setDsRange] = useState<[number, number]>(() => {
    const rangeParam = searchParams.get('dsRange');
    if (rangeParam) {
      return rangeParam.split(',').map(Number) as [number, number];
    }
    return [1.0, 15.0];
  });

  const handleDsRangeChange = (value: number[]) => {
    setDsRange([value[0], value[1]]);
  }

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Page
    if (page === 1) params.delete('page'); else params.set('page', String(page));

    // SearchTerm
    if (!searchTerm) params.delete('searchTerm'); else params.set('searchTerm', searchTerm);

    // SearchFields - default is all true
    const enabledSearchFields = Object.entries(searchFields).filter(([, v]) => v).map(([k]) => k);
    if (enabledSearchFields.length === 3) {
      params.delete('searchFields');
    } else {
      params.set('searchFields', enabledSearchFields.join(','));
    }

    // BadgeFilters - default is all false
    const enabledBadgeFilters = Object.entries(badgeFilters).filter(([, v]) => v).map(([k]) => k);
    if (enabledBadgeFilters.length === 0) {
      params.delete('badgeFilters');
    } else {
      params.set('badgeFilters', enabledBadgeFilters.join(','));
    }

    // DsRange - default is [1.0, 15.0]
    if (dsRange[0] === 1.0 && dsRange[1] === 15.0) {
      params.delete('dsRange');
    } else {
      params.set('dsRange', dsRange.join(','));
    }

    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [page, searchTerm, searchFields, badgeFilters, dsRange, router, pathname, searchParams]);


  const resetPage = () => setPage(1);

  useEffect(() => {
    resetPage();
  }, [searchTerm, searchFields, badgeFilters, dsRange]);


  const filteredData = mdata.filter((m: MusicData) => !(["宴会場", "宴会场"].includes(m.basic_info.genre))).filter((music: MusicData) => {
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
    const filteredCharts: FilteredChart[] = music.charts.map((chart: Chart, index: number) => ({
      chart,
      index,
      badgeTypes: getBadgeTypes(music, chart, index, chartStats),
      ds: music.ds[index]
    }))
      .filter(({ badgeTypes, ds }) => {
        const badgeMatch = Object.entries(badgeFilters).every(([key, value]) => !value || badgeTypes[key as keyof BadgeTypes]);
        const dsMatch = ds >= dsRange[0] && ds <= dsRange[1];
        return badgeMatch && dsMatch;
      }
      );
    return { ...music, charts: filteredCharts };
  }).filter((music: FilteredMusicData) => music.charts.length > 0);

  const totalPages = Math.max(1, Math.ceil(filteredDataWithBadge.length / pageSize));
  return (
    <div className="min-h-screen pb-24 font-[family-name:var(--font-geist-sans)] flex flex-col items-center pt-20 p-5">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">

        <h1 className="scroll-m-20 text-center text-4xl font-extrabold tracking-tight text-balance">
          斗技杯 2025 团队挑战赛
        </h1>
        <img src="https://ipacel.cc/+/MoeCounter2/?name=mutech" alt="mutech counter" />

        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          更新日志
        </h2>
        <ul className="my-3 list-disc [&>li]:mt-2">
          <li>修复了地雷分类</li>
          <li>添加定数筛选、URL参数</li>
        </ul>

        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          规则（实时更新）
        </h2>
        <div className="prose">
          见腾讯文档：<a href="https://docs.qq.com/doc/DWGhHVnNTUXV3VGh2" className="text-blue-500" target="_blank" rel="noopener noreferrer">点击打开</a>
          <br />
          {/* 宴会分类曲目如下：<img src="fes.jpg" alt="宴会分类曲目" /> */}
          宴会分类曲目已经更新，并合并到腾讯文档，这里显示的不一定最新！
          <Collapsible>
            <CollapsibleTrigger>
              <Button variant="outline">查看宴会分类曲目</Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="p-2">
              <img src="fes.png" alt="宴会分类曲目" />
            </CollapsibleContent>
          </Collapsible>
        </div>

        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
          曲库浏览
        </h2>

        <input
          type="text"
          placeholder="输入关键词"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="border rounded px-2 py-1"
        />
        <div className="flex flex-row gap-2 items-center">
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
          {badgeConfigs.map(badge => (
            <label className="flex items-center gap-1" key={badge.key}>
              <Checkbox
                checked={badgeFilters[badge.key]}
                onCheckedChange={v => setBadgeFilters(f => ({ ...f, [badge.key]: !!v }))}
              />
              {badge.label}
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-2 w-full pt-4 max-w-md">
          <label htmlFor="ds-slider" className="font-semibold">定数范围: {dsRange[0].toFixed(1)} - {dsRange[1].toFixed(1)}</label>
          <Slider
            id="ds-slider"
            value={dsRange}
            onValueChange={handleDsRangeChange}
            min={1}
            max={15}
            step={0.1}
          />
        </div>

        {
          paginate(filteredDataWithBadge, page, pageSize).map((music: FilteredMusicData) => {
            return (
              <div key={music.id} className="flex flex-col gap-4 max-w-4xl w-full">
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
                      <Badge variant="outline">BPM：{music.basic_info.bpm}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {music.alias?.map((alias: string, index: number) => (
                        <Badge variant="secondary" key={index}>{alias}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setExpandedItems(prev => {
                      const next = new Set(prev);
                      if (next.has(music.id)) {
                        next.delete(music.id);
                      } else {
                        next.add(music.id);
                      }
                      return next;
                    });
                  }}
                  variant={expandedItems.has(music.id) ? "default" : "secondary"}
                  className="w-full"
                >
                  {expandedItems.has(music.id) ? "收起详情" : "展开详情"}
                </Button>
                {expandedItems.has(music.id) ? (
                  <div className="flex flex-col gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                      {music.charts.map(({ chart, index }: FilteredChart) => (
                        <div key={index} className={`flex flex-col overflow-hidden gap-1 rounded-md shadow-md`}>
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
                              {(chart.notes.at(chart.notes.length - 1) || 0) > 40 && music.ds[index] <= 14.5 &&
                                <Badge className="bg-yellow-500 text-white">绝赞</Badge>}
                              {chartStats[music.id] && (chartStats[music.id][index].fit_diff - music.ds[index] > 0.2) && music.ds[index] >= 12 && music.ds[index] < 14 &&
                                <Badge>地雷</Badge>}
                              {false && <Badge className="bg-pink-500 text-white">宴会</Badge>}
                              {index == 4 && <Badge variant="secondary">白谱</Badge>}
                              {chart.notes[2] / chart.notes.reduce((acc: number, curr: number) => acc + curr, 0) > 0.2 &&
                                <Badge className="bg-blue-500 text-white">星星</Badge>}
                              {chart.notes.reduce((acc: number, curr: number) => acc + curr, 0) > 1000 &&
                                <Badge className="bg-amber-500 text-white">猩猩</Badge>}
                              {music.ds[index] > 14.5 &&
                                <Badge className="bg-purple-500 text-white">对决</Badge>}
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
                ) : (
                  <div>
                    {music.charts.map(({ chart, index }: FilteredChart) => (
                      <div className="flex flex-row flex-wrap gap-1 pb-2" key={index}>
                        <div className={`${difficultyColors[index][0]} ${difficultyColors[index][1]} rounded px-2`}>
                          {music.level[index]}
                        </div>
                        {music.ds[index] < 13 &&
                          <Badge className="bg-red-500 text-white">小歌</Badge>}
                        {["舞萌DX 2023", "舞萌DX 2024", "舞萌DX 2025"].includes(music.basic_info.from) && index == 3 &&
                          <Badge className="bg-blue-500 text-white">新歌</Badge>}
                        {["maimai", "maimai PLUS", "maimai GreeN", "maimai GreeN PLUS"].includes(music.basic_info.from) && index == 3 &&
                          <Badge className="bg-cyan-500 text-white">真超檄</Badge>}
                        {(chart.notes.at(chart.notes.length - 1) || 0) > 40 &&
                          <Badge className="bg-yellow-500 text-white">绝赞</Badge>}
                        {chartStats[music.id] && (chartStats[music.id][index].fit_diff - music.ds[index] > 0.2) && music.ds[index] >= 12 && music.ds[index] < 14 &&
                          <Badge>地雷</Badge>}
                        {false && <Badge className="bg-pink-500 text-white">宴会</Badge>}
                        {index == 4 && <Badge variant="secondary">白谱</Badge>}
                        {chart.notes[2] / chart.notes.reduce((acc: number, curr: number) => acc + curr, 0) > 0.2 &&
                          <Badge className="bg-blue-500 text-white">星星</Badge>}
                        {chart.notes.reduce((acc: number, curr: number) => acc + curr, 0) > 1000 &&
                          <Badge className="bg-amber-500 text-white">猩猩</Badge>}
                        {music.ds[index] > 14.5 &&
                          <Badge className="bg-purple-500 text-white">对决</Badge>}
                      </div>
                    ))
                    }
                  </div>
                )}

              </div>
            )
          })
        }
      </main>
      <footer className="fixed bottom-0 left-0 right-0 flex gap-[24px] flex-wrap items-center justify-center py-4 bg-white border-t">
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

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <MainContent />
    </Suspense>
  )
}
