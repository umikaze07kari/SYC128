/*
 * 曲库数据来自用户提供的 10 张“单纯盒子”截图（2026-07 整理）。
 * 收藏量单位统一为“万”；null 表示截图显示“--”或没有可靠数据。
 * 第二张专辑的先行版/正式版同名曲已经合并；显著不同的 Live 演绎单独保留。
 */
const rawSongs = [
  // 第一张专辑《勇敢额度》
  ["yu-hou-ri-ji", "雨后日记", "album", "solo", "治愈", "《勇敢额度》", 116.5, 45, 17.7, 53.8],
  ["yong-gan-e-du", "勇敢额度", "album", "solo", "流行", "《勇敢额度》", 75, 15, 6.2, 53.8],
  ["kong-er", "空耳", "album", "solo", "氛围", "《勇敢额度》", 72.2, 35, 15.6, 21.6],
  ["ling-yi-zhong-da-an", "另一种答案", "album", "solo", "流行", "《勇敢额度》", 37.4, 20, 7.7, 9.8],
  ["tell-me", "Tell Me", "album", "collab", "R&B", "《勇敢额度》", 37.1, 25, 4, 8.1],
  ["ni-ming-xing", "匿名星", "album", "solo", "氛围", "《勇敢额度》", 29.9, 15, 4.8, 10.1],
  ["shi-jiao", "失焦", "album", "solo", "情绪", "《勇敢额度》", 28.8, 15, 5.1, 8.7],
  ["forever-in-you", "Forever In You", "album", "collab", "R&B", "《勇敢额度》", 20.2, 10, 3.5, 6.7],
  ["gray-turns-to-may", "Gray Turns To May", "album", "solo", "R&B", "《勇敢额度》", 10.6, 5, 1.8, 3.8],
  ["ni-hao-kuai-le", "你好快乐", "album", "solo", "轻快", "《勇敢额度》", 9.4, 5, 1.4, 3.1],

  // 第二张专辑《纯妹妹》；同名的先行版/正式版只保留收藏量较高的主版本
  ["zhu-yu", "珠玉", "album", "solo", "抒情", "《纯妹妹》", 597.1, 200, 267.9, 129.2],
  ["chun-mei-mei", "纯妹妹", "album", "solo", "轻快", "《纯妹妹》", 584.8, 200, 205.2, 179.6],
  ["wo-guan-bu-zhu-wo-zi-ji", "我管不住我自己", "album", "solo", "情绪", "《纯妹妹》", 198.5, 70, 90, 38.5],
  ["hai-you-shen-me-geng-hao-de", "还有什么更好的", "album", "solo", "流行", "《纯妹妹》", 64.4, 25, 26.5, 12.8],
  ["wo-biao-shi-li-jie", "我表示理解", "album", "solo", "情绪", "《纯妹妹》", 56.4, 20, 25.1, 11.3],
  ["you-qu", "有趣", "album", "solo", "轻快", "《纯妹妹》", 55.2, 25, 20.1, 10],
  ["xiang-ri-kui-chao-zhe-ye", "向日葵朝着夜", "album", "solo", "叙事", "《纯妹妹》", 39.8, 15, 18.1, 6.6],
  ["huan-ni-mo-li", "还你茉莉", "album", "solo", "国风", "《纯妹妹》", 38.7, 15, 16.6, 7],
  ["duo-shao-de-guang-yin", "多少的光阴", "album", "solo", "叙事", "《纯妹妹》", 23.4, 10, 8.8, 4.6],
  ["jia-ru-wo-men-hai-ai-zhe", "假如我们还爱着", "album", "solo", "抒情", "《纯妹妹》", 15.2, 10, null, 5.2],

  // 《歌手2025》Live；原创歌曲的现场版也保留为独立候选
  ["zhu-yu-live", "珠玉（Live）", "live", "solo", "抒情", "《歌手2025》", 597.1, 200, 267.9, 129.2, "zhu-yu"],
  ["li-bai-live", "李白（Live）", "live", "solo", "摇滚", "《歌手2025》", 211, 45, 99.9, 66.1],
  ["jun-live", "君（Live）", "live", "solo", "国风", "《歌手2025》", 89.4, 35, 33, 21.5],
  ["luo-ye-gui-gen-live", "落叶归根（Live）", "live", "solo", "抒情", "《歌手2025》", 73, 25, 40.3, 7.7],
  ["tian-kong-live", "天空（Live）", "live", "solo", "大气", "《歌手2025》", 56.4, 20, 26, 10.4],
  ["you-qu-live", "有趣（Live）", "live", "solo", "轻快", "《歌手2025》", 55.2, 25, 20.1, 10, "you-qu"],
  ["kai-shi-dong-le-live", "开始懂了（Live）", "live", "solo", "抒情", "《歌手2025》", 47, 15, 23.9, 8.1],
  ["dear-friend-live", "Dear Friend（Live）", "live", "solo", "抒情", "《歌手2025》", 28.7, 10, 14.7, 4.1],
  ["yi-ge-ren-tiao-wu-live", "一个人跳舞（Live）", "live", "solo", "律动", "《歌手2025》", 28.5, 5, 15.8, 7.7],
  ["ai-qing-live", "爱情（Live）", "live", "solo", "抒情", "《歌手2025》", 23.6, 10, 11.2, 2.4],
  ["wu-niang-live", "舞娘（Live）", "live", "solo", "舞曲", "《歌手2025》", 22.2, 5, 12.6, 4.5],
  ["meng-yi-chang-live", "梦一场（Live）", "live", "solo", "叙事", "《歌手2025》", 19.5, 5, 9.9, 4.6],
  ["si-nian-shi-yi-zhong-bing-live", "思念是一种病（Live）", "live", "solo", "律动", "《歌手2025》", 13.9, 3, 7.7, 3.2],

  // OST
  ["xiang-ni-shi-feng-qi", "想你时风起", "ost", "solo", "抒情", "影视原声", 2580.8, 890, 1030.4, 660.4],
  ["xu-xie", "续写", "ost", "solo", "叙事", "影视原声", 132.8, null, 132.8, null],
  ["ni-de-zhen-cang", "你的珍藏", "ost", "solo", "治愈", "影视原声", 115.6, 85, null, 30.6],
  ["cang-zai-ni-de-ming-zi-li", "藏在你的名字里", "ost", "solo", "抒情", "影视原声", 109.5, 60, 12.2, 37.3],
  ["xiang-yan-huo-ai-guo", "像烟火爱过", "ost", "solo", "情绪", "影视原声", 84.3, 55, null, 29.3],
  ["xing-han-can-lan", "星汉灿烂", "ost", "solo", "大气", "影视原声", 82, 45, null, 37],
  ["ni-shi-dao-ying-de-wei-xing", "你是倒映的微星", "ost", "solo", "抒情", "影视原声", 55.3, 25, null, 30.3],
  ["yu-wei", "余味", "ost", "solo", "情绪", "影视原声", 55.1, 25, null, 30.1],
  ["ying-huo-chong", "萤火虫", "ost", "solo", "治愈", "影视原声", 44.9, 30, null, 14.9],
  ["re-tang", "热汤", "ost", "solo", "治愈", "影视原声", 44.5, 30, null, 14.5],
  ["ai-li", "爱里", "ost", "solo", "抒情", "影视原声", 28.1, 15, null, 13.1],
  ["yue-shang-ge", "月上歌", "ost", "solo", "国风", "影视原声", 27.9, 15, null, 12.9],
  ["zai-jian-wang-shi", "再见往事", "ost", "solo", "叙事", "影视原声", 27.5, 10, 7.3, 10.2],
  ["ni-de-shi-jie", "你的世界", "ost", "solo", "抒情", "影视原声", 11.4, 4, 4.3, 3.1],
  ["fei-cheng-wu-rao", "非诚勿扰", "ost", "solo", "轻快", "影视原声", 11.3, 5, null, 6.3],
  ["rang-wo-sui-feng", "让我随风", "ost", "solo", "治愈", "影视原声", 10.4, 5, null, 5.4],
  ["yu-hua", "羽化", "ost", "solo", "大气", "影视原声", 10, 10, null, null],
  ["feng-wu-mian", "风无眠", "ost", "solo", "氛围", "影视原声", 8.8, 5, null, 3.8],
  ["zhi", "执", "ost", "solo", "国风", "影视原声", 8.2, 5, null, 3.2],
  ["qi-cai-guang", "七彩光", "ost", "solo", "明亮", "影视原声", 7.9, 5, null, 2.9],
  ["ren-xing", "任性", "ost", "solo", "情绪", "影视原声", 5.7, 3, null, 2.7],
  ["ru-xing", "如星", "ost", "solo", "抒情", "影视原声", 4.5, 3, null, 1.5],
  ["di-yi-ci", "第一次", "ost", "solo", "抒情", "影视原声", 3.6, 2, null, 1.6],
  ["yi-sheng-yi-nian", "一生一念", "ost", "solo", "国风", "影视原声", null, null, null, null],

  // 单曲
  ["zai-ye-li-tiao-wu", "在夜里跳舞", "single", "solo", "律动", "数字单曲", 376.1, 270, null, 106.1],
  ["wei", "喂", "single", "solo", "轻快", "数字单曲", 129.1, 75, 23.3, 30.8],
  ["ai-wo-de-shi-hou", "爱我的时候", "single", "solo", "抒情", "数字单曲", 117.8, 90, null, 27.8],
  ["zhao-pian", "照片", "single", "solo", "叙事", "数字单曲", 96, 70, null, 26],
  ["oh-lala", "Oh lala", "single", "solo", "R&B", "数字单曲", 44, 20, null, 24],
  ["tender", "TENDER", "single", "solo", "R&B", "数字单曲", 31.4, 20, null, 11.4],
  ["luo-bi-cheng-shu", "落笔成书", "single", "solo", "国风", "数字单曲", 30.1, 15, null, 15.1],
  ["zhong-shen-gu-du", "终身孤独", "single", "solo", "情绪", "数字单曲", 25.2, 15, null, 10.2],
  ["4ever-in-u", "4ever in U", "single", "collab", "R&B", "合作单曲", 24.9, 10, null, 14.9],
  ["fen-shen", "分身", "single", "solo", "情绪", "数字单曲", 19.7, null, null, 19.7],
  ["qi-guan", "奇观", "single", "solo", "大气", "数字单曲", 19.4, null, 19.4, null],
  ["liang-zai-ri-ji", "靓仔日记", "single", "solo", "轻快", "数字单曲", 13.9, 10, null, 3.9],
  ["guang-bo", "光波", "single", "solo", "律动", "数字单曲", 13, 5, 8, null],

  // 原参考图中收录、但本批截图没有显示收藏量的特别舞台
  ["gei-dian-ying-ren-de-qing-shu", "给电影人的情书", "live", "solo", "经典", "特别舞台", null, null, null, null]
];

const SOURCE_META = {
  album: { label: "专辑曲", colors: ["#5b21b6", "#a855f7"] },
  single: { label: "单曲", colors: ["#9d174d", "#f472b6"] },
  ost: { label: "OST", colors: ["#1d4ed8", "#8b5cf6"] },
  live: { label: "Live", colors: ["#7c2d12", "#f97316"] },
  other: { label: "其他", colors: ["#0f766e", "#22d3ee"] }
};

const maxFavorites = Math.max(...rawSongs.map((row) => row[6] || 0));

window.SONG_CATALOG = rawSongs.map((row, index) => {
  const [id, title, source, vocal, mood, release, total, qq, netease, kugou, variantOf] = row;
  const basePopularity = total == null ? 1 : Math.log1p(total) / Math.log1p(maxFavorites);
  const color = SOURCE_META[source]?.colors || SOURCE_META.other.colors;
  return {
    id,
    title,
    source,
    sourceLabel: SOURCE_META[source]?.label || "其他",
    vocal,
    vocalLabel: vocal === "collab" ? "合作" : "独唱",
    mood,
    release,
    totalFavoritesWan: total,
    platformFavorites: { qq, netease, kugou },
    popularity: Math.round(35 + basePopularity * 65),
    updatedAt: "2026-07",
    variantOf: variantOf || null,
    quote: `这一刻，我把偏爱留给《${title}》。`,
    colors: index % 2 ? color : [color[1], color[0]]
  };
});

window.SONG_META = {
  source: Object.fromEntries(Object.entries(SOURCE_META).map(([key, value]) => [key, value.label])),
  vocal: { solo: "独唱", collab: "合作" },
  dataUpdatedAt: "2026-07",
  favoritesUnit: "万",
  dataSource: "用户提供的单纯盒子截图"
};
