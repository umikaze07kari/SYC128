/*
 * 公开曲库：不包含任何非公开 App 的平台收藏数据。
 * seedScore 只用于分散热门候选，不在页面展示，也不对应具体播放/收藏数字。
 */
const rawSongs = [
  // 第一张专辑《勇敢额度》
  ["yu-hou-ri-ji", "雨后日记", "album", "solo", "治愈", "专辑《勇敢额度》", 88],
  ["yong-gan-e-du", "勇敢额度", "album", "solo", "流行", "专辑《勇敢额度》", 81],
  ["kong-er", "空耳", "album", "solo", "氛围", "专辑《勇敢额度》", 80],
  ["ling-yi-zhong-da-an", "另一种答案", "album", "solo", "流行", "专辑《勇敢额度》", 69],
  ["tell-me", "Tell Me", "album", "collab", "R&B", "专辑《勇敢额度》", 69],
  ["ni-ming-xing", "匿名星", "album", "solo", "氛围", "专辑《勇敢额度》", 66],
  ["shi-jiao", "失焦", "album", "solo", "情绪", "专辑《勇敢额度》", 66],
  ["forever-in-you", "Forever In You", "album", "collab", "R&B", "专辑《勇敢额度》", 62],
  ["gray-turns-to-may", "Gray Turns To May", "album", "solo", "R&B", "专辑《勇敢额度》", 54],
  ["ni-hao-kuai-le", "你好快乐", "album", "solo", "轻快", "专辑《勇敢额度》", 53],

  // 第二张专辑《纯妹妹》；先行版/正式版同名曲已合并
  ["zhu-yu", "珠玉", "album", "solo", "抒情", "专辑《纯妹妹》", 98],
  ["chun-mei-mei", "纯妹妹", "album", "solo", "轻快", "专辑《纯妹妹》", 98],
  ["wo-guan-bu-zhu-wo-zi-ji", "我管不住我自己", "album", "solo", "情绪", "专辑《纯妹妹》", 92],
  ["hai-you-shen-me-geng-hao-de", "还有什么更好的", "album", "solo", "流行", "专辑《纯妹妹》", 78],
  ["wo-biao-shi-li-jie", "我表示理解", "album", "solo", "情绪", "专辑《纯妹妹》", 76],
  ["you-qu", "有趣", "album", "solo", "轻快", "专辑《纯妹妹》", 76],
  ["xiang-ri-kui-chao-zhe-ye", "向日葵朝着夜", "album", "solo", "叙事", "专辑《纯妹妹》", 70],
  ["huan-ni-mo-li", "还你茉莉", "album", "solo", "国风", "专辑《纯妹妹》", 70],
  ["duo-shao-de-guang-yin", "多少的光阴", "album", "solo", "叙事", "专辑《纯妹妹》", 64],
  ["jia-ru-wo-men-hai-ai-zhe", "假如我们还爱着", "album", "solo", "抒情", "专辑《纯妹妹》", 59],

  // 《歌手2025》现场（珠玉、有趣 Live 已按要求移除）
  ["li-bai-live", "李白（Live）", "live", "solo", "摇滚", "综艺《歌手2025》", 93],
  ["jun-live", "君（Live）", "live", "solo", "国风", "综艺《歌手2025》", 84],
  ["luo-ye-gui-gen-live", "落叶归根（Live）", "live", "solo", "抒情", "综艺《歌手2025》", 81],
  ["tian-kong-live", "天空（Live）", "live", "solo", "大气", "综艺《歌手2025》", 76],
  ["kai-shi-dong-le-live", "开始懂了（Live）", "live", "solo", "抒情", "综艺《歌手2025》", 73],
  ["dear-friend-live", "Dear Friend（Live）", "live", "solo", "抒情", "综艺《歌手2025》", 66],
  ["yi-ge-ren-tiao-wu-live", "一个人跳舞（Live）", "live", "solo", "律动", "综艺《歌手2025》", 66],
  ["ai-qing-live", "爱情（Live）", "live", "solo", "抒情", "综艺《歌手2025》", 64],
  ["wu-niang-live", "舞娘（Live）", "live", "solo", "舞曲", "综艺《歌手2025》", 63],
  ["meng-yi-chang-live", "梦一场（Live）", "live", "solo", "叙事", "综艺《歌手2025》", 61],
  ["si-nian-shi-yi-zhong-bing-live", "思念是一种病（Live）", "live", "solo", "律动", "综艺《歌手2025》", 58],

  // OST：出处经公开音乐页面及作品资料核对
  ["xiang-ni-shi-feng-qi", "想你时风起", "ost", "solo", "抒情", "电视剧《我的人间烟火》· 回忆主题曲", 100],
  ["xu-xie", "续写", "ost", "solo", "叙事", "电视剧《一生一世》· 主题曲", 90],
  ["ni-de-zhen-cang", "你的珍藏", "ost", "solo", "治愈", "电影《沐浴之王》· 情感主题曲", 88],
  ["cang-zai-ni-de-ming-zi-li", "藏在你的名字里", "ost", "solo", "抒情", "电影《一闪一闪亮星星》· 主题曲", 87],
  ["xiang-yan-huo-ai-guo", "像烟火爱过", "ost", "solo", "情绪", "电视剧《许我耀眼》· 原声歌曲", 83],
  ["xing-han-can-lan", "星汉灿烂", "ost", "solo", "大气", "电视剧《星汉灿烂》· 主题曲", 82],
  ["ni-shi-dao-ying-de-wei-xing", "你是倒映的微星", "ost", "solo", "抒情", "电视剧《春闺梦里人》· 人物主题曲", 76],
  ["yu-wei", "余味", "ost", "solo", "情绪", "网络剧《七时吉祥》· 沧海缠绵曲", 76],
  ["ying-huo-chong", "萤火虫", "ost", "solo", "治愈", "电影《误杀2》· 片尾曲", 72],
  ["re-tang", "热汤", "ost", "solo", "治愈", "电视剧《假日暖洋洋2》· 片尾曲", 72],
  ["ai-li", "爱里", "ost", "solo", "抒情", "电视剧《我们的翻译官》· 爱情主题曲", 65],
  ["yue-shang-ge", "月上歌", "ost", "solo", "国风", "电视剧《藏海传》· 空灵骊歌", 65],
  ["zai-jian-wang-shi", "再见往事", "ost", "solo", "叙事", "电影《怒潮》· 片尾曲", 65],
  ["ni-de-shi-jie", "你的世界", "ost", "solo", "抒情", "电影《小美人鱼》· 中文主题曲", 55],
  ["fei-cheng-wu-rao", "非诚勿扰", "ost", "solo", "轻快", "电影《非诚勿扰3》· 主题曲", 55],
  ["rang-wo-sui-feng", "让我随风", "ost", "solo", "治愈", "电视剧《三体》· 插曲", 54],
  ["yu-hua", "羽化", "ost", "solo", "大气", "网络剧《虎鹤妖师录》· 插曲", 53],
  ["feng-wu-mian", "风无眠", "ost", "solo", "氛围", "电视剧《长安二十四计》· 主题曲", 52],
  ["zhi", "执", "ost", "solo", "国风", "电视剧《人之初》· 插曲", 51],
  ["qi-cai-guang", "七彩光", "ost", "solo", "明亮", "电影《日掛中天》· 主题曲", 50],
  ["ren-xing", "任性", "ost", "solo", "情绪", "电视剧《斗罗大陆》· 宁荣荣人物曲", 48],
  ["ru-xing", "如星", "ost", "solo", "抒情", "电视剧《奇迹》· 影视原声", 46],
  ["di-yi-ci", "第一次", "ost", "solo", "抒情", "电影《小美人鱼》· 中文插曲", 44],
  ["yi-sheng-yi-nian", "一生一念", "ost", "solo", "国风", "电视剧《祈今朝》· 主题曲", 42],

  // 单曲
  ["zai-ye-li-tiao-wu", "在夜里跳舞", "single", "solo", "律动", "个人数字单曲", 96],
  ["wei", "喂", "single", "solo", "轻快", "个人数字单曲", 90],
  ["ai-wo-de-shi-hou", "爱我的时候", "single", "solo", "抒情", "个人数字单曲", 88],
  ["zhao-pian", "照片", "single", "solo", "叙事", "个人数字单曲", 85],
  ["oh-lala", "Oh lala", "single", "solo", "R&B", "合作企划《DNA》", 72],
  ["tender", "TENDER", "single", "solo", "R&B", "个人数字单曲", 67],
  ["luo-bi-cheng-shu", "落笔成书", "single", "solo", "国风", "个人数字单曲", 66],
  ["zhong-shen-gu-du", "终身孤独", "single", "solo", "情绪", "个人数字单曲", 64],
  ["4ever-in-u", "4ever in U", "single", "collab", "R&B", "合作数字单曲", 64],
  ["fen-shen", "分身", "single", "solo", "情绪", "个人数字单曲", 61],
  ["qi-guan", "奇观", "single", "solo", "大气", "个人数字单曲", 61],
  ["liang-zai-ri-ji", "靓仔日记", "single", "solo", "轻快", "个人数字单曲", 58],
  ["guang-bo", "光波", "single", "solo", "律动", "巡演主题数字单曲", 57],

  ["gei-dian-ying-ren-de-qing-shu", "给电影人的情书", "live", "solo", "经典", "电影《一秒钟》· 推广曲", 74]
];

const SOURCE_META = {
  album: { label: "专辑曲", colors: ["#5b21b6", "#a855f7"] },
  single: { label: "单曲", colors: ["#9d174d", "#f472b6"] },
  ost: { label: "OST", colors: ["#1d4ed8", "#8b5cf6"] },
  live: { label: "Live", colors: ["#7c2d12", "#f97316"] },
  other: { label: "其他", colors: ["#0f766e", "#22d3ee"] }
};

// 每首歌最多保留一个极短歌词摘录（不超过 10 个词）；其余使用原创听感提示。
const SHORT_LYRIC_CUES = {
  "xiang-ni-shi-feng-qi": "我多想是路过你的风",
  "xu-xie": "余生续写的诗",
  "xiang-yan-huo-ai-guo": "像烟火爱过",
  "yue-shang-ge": "捧来当年须臾的月光",
  "feng-wu-mian": "回忆如同逆行的箭",
  "qi-cai-guang": "看不到的七彩光"
};

const MOOD_CUES = {
  治愈: ["让声音把褶皱抚平", "适合安静听完的温度"],
  流行: ["旋律很快留下轮廓", "副歌里藏着情绪出口"],
  氛围: ["留白比答案更清晰", "适合戴上耳机慢慢听"],
  情绪: ["情绪沿着旋律逐层推进", "转折处最容易击中心事"],
  抒情: ["把没有说完的话唱完", "慢下来才听见细节"],
  轻快: ["节拍先一步点亮心情", "轻盈里也藏着小巧思"],
  叙事: ["像翻开一页声音日记", "故事感顺着旋律展开"],
  国风: ["古意与现代声线相遇", "余韵在尾音里慢慢散开"],
  "R&B": ["律动和转音彼此呼应", "适合跟着节拍轻轻摇摆"],
  摇滚: ["力量在层层推进中释放", "现场感让情绪更直接"],
  大气: ["声场一点点向远处打开", "高处的情绪更显辽阔"],
  律动: ["节拍让身体先于思考", "松弛感藏在每次落拍"],
  舞曲: ["舞台能量从第一拍启动", "适合跟着节奏直接进入"],
  明亮: ["旋律里透出一束亮色", "明快之外仍有细腻余味"],
  经典: ["熟悉旋律被唱出新质感", "把旧故事重新交给此刻"]
};

window.SONG_CATALOG = rawSongs.map((row, index) => {
  const [id, title, source, vocal, mood, release, seedScore] = row;
  const color = SOURCE_META[source]?.colors || SOURCE_META.other.colors;
  const lyricCue = SHORT_LYRIC_CUES[id] || null;
  return {
    id,
    title,
    source,
    sourceLabel: SOURCE_META[source]?.label || "其他",
    vocal,
    vocalLabel: vocal === "collab" ? "合作" : "独唱",
    mood,
    release,
    seedScore,
    cardTextKind: lyricCue ? "歌词短摘" : "听感提示",
    cardLines: lyricCue ? [lyricCue] : (MOOD_CUES[mood] || ["把注意力交给旋律", "听见属于它的独特颜色"]),
    quote: `这一刻，我把偏爱留给《${title}》。`,
    colors: index % 2 ? color : [color[1], color[0]]
  };
});

window.SONG_META = {
  source: Object.fromEntries(Object.entries(SOURCE_META).map(([key, value]) => [key, value.label])),
  vocal: { solo: "独唱", collab: "合作" }
};
