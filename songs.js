/*
 * 曲库维护说明
 * - popularity 是 0–100 的“综合热度指数”，仅用于种子排序，不冒充实时平台数据。
 * - platformFavorites 预留给人工维护的公开数据；没有可靠来源时请保持 null。
 * - source: album | single | ost | live | other
 * - vocal: solo | collab
 */
window.SONG_CATALOG = [
  { id: "ai-li", title: "爱里", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "抒情", release: "《勇敢额度》", popularity: 95, updatedAt: "2026-07", quote: "有些答案，藏在爱里。", colors: ["#5b21b6", "#a855f7"] },
  { id: "re-tang", title: "热汤", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "治愈", release: "《勇敢额度》", popularity: 78, updatedAt: "2026-07", quote: "让温热的回声慢慢抵达。", colors: ["#7c2d92", "#fb7185"] },
  { id: "xiang-ni-shi-feng-qi", title: "想你时风起", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "抒情", release: "影视原声", popularity: 98, updatedAt: "2026-07", quote: "风吹过的时候，想念就有了形状。", colors: ["#4338ca", "#8b5cf6"] },
  { id: "xiang-yan-huo-ai-guo", title: "像烟火爱过", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "情绪", release: "影视原声", popularity: 91, updatedAt: "2026-07", quote: "短暂也可以足够明亮。", colors: ["#7e22ce", "#f472b6"] },
  { id: "hai-you-shen-me-geng-hao-de", title: "还有什么更好的", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "流行", release: "录音室作品", popularity: 82, updatedAt: "2026-07", quote: "答案未必比此刻更好。", colors: ["#0f766e", "#22d3ee"] },
  { id: "wo-guan-bu-zhu-wo-zi-ji", title: "我管不住我自己", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "情绪", release: "数字单曲", popularity: 73, updatedAt: "2026-07", quote: "心动从来不听命令。", colors: ["#be185d", "#fb7185"] },
  { id: "shi-jiao", title: "失焦", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "氛围", release: "录音室作品", popularity: 84, updatedAt: "2026-07", quote: "失去焦点，才看见感受。", colors: ["#334155", "#7c3aed"] },
  { id: "kong-er", title: "空耳", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "氛围", release: "《勇敢额度》", popularity: 99, updatedAt: "2026-07", quote: "听见空白里最清晰的回响。", colors: ["#312e81", "#7c3aed"] },
  { id: "qi-cai-guang", title: "七彩光", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "明亮", release: "数字单曲", popularity: 96, updatedAt: "2026-07", quote: "把每一种颜色都唱给你。", colors: ["#6d28d9", "#ec4899"] },
  { id: "guang-bo", title: "光波", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "律动", release: "录音室作品", popularity: 76, updatedAt: "2026-07", quote: "向远处发出自己的频率。", colors: ["#0369a1", "#22d3ee"] },
  { id: "duo-shao-de-guang-yin", title: "多少的光阴", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "叙事", release: "影视原声", popularity: 90, updatedAt: "2026-07", quote: "光阴走过，声音把故事留下。", colors: ["#92400e", "#f59e0b"] },
  { id: "jia-ru-wo-men-hai-ai-zhe", title: "假如我们还爱着", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "抒情", release: "影视原声", popularity: 72, updatedAt: "2026-07", quote: "假如不是遗憾的另一种名字。", colors: ["#9f1239", "#fb7185"] },
  { id: "ling-yi-zhong-da-an", title: "另一种答案", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "流行", release: "录音室作品", popularity: 94, updatedAt: "2026-07", quote: "偏爱就是你的另一种答案。", colors: ["#6b21a8", "#c084fc"] },
  { id: "yu-hou-ri-ji", title: "雨后日记", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "治愈", release: "数字单曲", popularity: 69, updatedAt: "2026-07", quote: "雨停以后，写下新的一页。", colors: ["#155e75", "#67e8f9"] },
  { id: "wo-biao-shi-li-jie", title: "我表示理解", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "情绪", release: "录音室作品", popularity: 71, updatedAt: "2026-07", quote: "理解有时比告别更安静。", colors: ["#4c1d95", "#818cf8"] },
  { id: "xiang-ri-kui-chao-zhe-ye", title: "向日葵朝着夜", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "叙事", release: "录音室作品", popularity: 86, updatedAt: "2026-07", quote: "逆着光，也要选择自己的方向。", colors: ["#78350f", "#facc15"] },
  { id: "huan-ni-mo-li", title: "还你茉莉", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "国风", release: "数字单曲", popularity: 92, updatedAt: "2026-07", quote: "把茉莉还你，把余香留下。", colors: ["#047857", "#a7f3d0"] },
  { id: "chun-mei-mei", title: "纯妹妹", source: "other", sourceLabel: "特别企划", vocal: "solo", vocalLabel: "独唱", mood: "轻快", release: "特别企划", popularity: 68, updatedAt: "2026-07", quote: "轻盈一点，快乐就近一点。", colors: ["#db2777", "#f9a8d4"] },
  { id: "zhu-yu", title: "珠玉", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "抒情", release: "录音室作品", popularity: 100, updatedAt: "2026-07", quote: "珍贵不是无瑕，而是不可替代。", colors: ["#5b21b6", "#e879f9"] },
  { id: "you-qu", title: "有趣", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "轻快", release: "录音室作品", popularity: 67, updatedAt: "2026-07", quote: "和有趣的灵魂交换一颗心。", colors: ["#c026d3", "#fb7185"] },
  { id: "xu-xie", title: "续写", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "叙事", release: "影视原声", popularity: 88, updatedAt: "2026-07", quote: "故事还在继续，歌声就是下页。", colors: ["#1d4ed8", "#a78bfa"] },
  { id: "tender", title: "Tender", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "R&B", release: "数字单曲", popularity: 81, updatedAt: "2026-07", quote: "温柔是克制，也是抵达。", colors: ["#7e22ce", "#f0abfc"] },
  { id: "jun", title: "君", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "国风", release: "影视原声", popularity: 93, updatedAt: "2026-07", quote: "一声君，唱尽未说完的话。", colors: ["#713f12", "#d97706"] },
  { id: "qi-guan", title: "奇观", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "大气", release: "录音室作品", popularity: 79, updatedAt: "2026-07", quote: "平凡的心也能制造奇观。", colors: ["#1e3a8a", "#8b5cf6"] },
  { id: "forever-in-you", title: "forever in you", source: "single", sourceLabel: "单曲", vocal: "collab", vocalLabel: "合作", mood: "R&B", release: "合作单曲", popularity: 65, updatedAt: "2026-07", quote: "让这一刻留在你的永远里。", colors: ["#831843", "#c084fc"] },
  { id: "tell-me", title: "tell me", source: "single", sourceLabel: "单曲", vocal: "collab", vocalLabel: "合作", mood: "R&B", release: "合作单曲", popularity: 64, updatedAt: "2026-07", quote: "告诉我，心动该用什么语气。", colors: ["#4c1d95", "#ec4899"] },
  { id: "gei-dian-ying-ren-de-qing-shu", title: "给电影人的情书", source: "live", sourceLabel: "舞台", vocal: "solo", vocalLabel: "独唱", mood: "经典", release: "舞台演绎", popularity: 89, updatedAt: "2026-07", quote: "借一束银幕的光，写一封长信。", colors: ["#374151", "#a855f7"] },
  { id: "ai-wo-de-shi-hou", title: "爱我的时候", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "抒情", release: "录音室作品", popularity: 97, updatedAt: "2026-07", quote: "爱我的时候，请把这一刻记住。", colors: ["#9d174d", "#f472b6"] },
  { id: "zhao-pian", title: "照片", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "叙事", release: "数字单曲", popularity: 83, updatedAt: "2026-07", quote: "照片停住时间，声音让它继续。", colors: ["#475569", "#94a3b8"] },
  { id: "fen-shen", title: "分身", source: "ost", sourceLabel: "OST", vocal: "solo", vocalLabel: "独唱", mood: "情绪", release: "影视原声", popularity: 75, updatedAt: "2026-07", quote: "哪一个我，正在替我想念。", colors: ["#312e81", "#6366f1"] },
  { id: "wei", title: "喂", source: "single", sourceLabel: "单曲", vocal: "solo", vocalLabel: "独唱", mood: "轻快", release: "数字单曲", popularity: 70, updatedAt: "2026-07", quote: "一句喂，故事就有了开头。", colors: ["#be123c", "#f97316"] },
  { id: "zai-ye-li-tiao-wu", title: "在夜里跳舞", source: "album", sourceLabel: "专辑曲", vocal: "solo", vocalLabel: "独唱", mood: "律动", release: "录音室作品", popularity: 87, updatedAt: "2026-07", quote: "夜色落下，就跟随自己的节拍。", colors: ["#581c87", "#2563eb"] }
].map((song) => ({
  ...song,
  platformFavorites: song.platformFavorites || { qq: null, netease: null, kugou: null }
}));

window.SONG_META = {
  source: { album: "专辑曲", single: "单曲", ost: "OST", live: "舞台", other: "其他" },
  vocal: { solo: "独唱", collab: "合作" },
  dataUpdatedAt: "2026-07"
};
