import type { EnergyToolKey } from "../../shared/types";

export type EnergyQuestion = {
  /** 回答存在 `data.answers[question.key]` 里；改 key 等于换一道新题，旧回答会保留但不再展示。 */
  key: string;
  /** 简短标题，用于回看视图的小标题。 */
  title: string;
  /** 沉浸式视图里的大字号主问题。 */
  prompt: string;
  /** 温和的引导提示，帮助用户写具体。 */
  hint: string;
  placeholder: string;
};

export type EnergyTool = {
  key: EnergyToolKey;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  description: string;
  questions: EnergyQuestion[];
};

/**
 * 能量充电屋的全部问题模板。
 *
 * 这是唯一需要改的文件：增删题目、调整问法或顺序，直接改下面的数组即可。
 * 回答以「问题 key -> 文本」存在每条练习记录的 data.answers 里，
 * 因此改 key 会让旧回答停止展示（数据不会丢，仍在 JSON 里）。
 */
export const energyTools: EnergyTool[] = [
  {
    key: "awareness",
    title: "自我觉察训练",
    subtitle: "看见此刻正在发生什么",
    icon: "🪞",
    badge: "觉察",
    description:
      "从身体和情绪入手，把一团模糊的「不舒服」拆成可以看见、可以照顾的具体状态。",
    questions: [
      {
        key: "bodyAndMood",
        title: "身心扫描",
        prompt: "此刻我的身体哪个部位最紧绷或有感觉？如果给现在的情绪起个名字，它叫什么？",
        hint: "不用急着分析原因，先描述身体和情绪本身：位置、温度、重量、颜色都可以。",
        placeholder: "例：胸口发紧，像压着一块石头；情绪像是「被催着走」的焦虑。",
      },
      {
        key: "triggerEvent",
        title: "触发锚点",
        prompt: "今天或刚才，是哪一个具体瞬间、哪句话或哪件事触发了这种状态？",
        hint: "只写具体事件，像回放一小段录像：当时谁说了什么、你正在做什么。",
        placeholder: "例：下午开会时，领导说「这个方案还要再想想」，我一下就僵住了。",
      },
      {
        key: "innerVoice",
        title: "内心独白",
        prompt: "在那个瞬间，我脑海里自动冒出的第一句话（评判、担忧或防卫）是什么？",
        hint: "试着原样写下来，不要美化。它可能是「我又搞砸了」，也可能是「他们根本不懂」。",
        placeholder: "例：我脑子里第一句话是：「果然，我又没做到他们期待的。」",
      },
      {
        key: "unmetNeed",
        title: "底层需求",
        prompt: "这份情绪背后，其实在保护我什么？我真正渴望被满足的需求是什么？",
        hint: "情绪通常是一个信使。它可能想保护你的安全感、被看见的需要，或者对确定性的需要。",
        placeholder: "例：它在保护我不被否定。我真正需要的是：我的努力被看见，而不是只被挑问题。",
      },
      {
        key: "gentleCare",
        title: "当下安顿",
        prompt: "如果像对待好朋友一样对待现在的自己，我此刻可以做一件什么最小的事来照顾自己？",
        hint: "小到立刻能做：喝一杯水、走五分钟、发一条消息，或者允许自己停十分钟。",
        placeholder: "例：先离开工位去接一杯热水，回来只挑一个最小的问题改，不要求一次改完。",
      },
    ],
  },
  {
    key: "manifestation",
    title: "显化日记",
    subtitle: "先活成已经拥有的样子",
    icon: "🌱",
    badge: "显化",
    description:
      "不是许愿，而是把想要的未来写得足够具体，让身体和行动提前熟悉它，再从今天迈出一小步。",
    questions: [
      {
        key: "futureScene",
        title: "理想画面",
        prompt: "闭上眼来到已经实现愿望的那一天，我看到了什么具体的场景？周围有什么声音和细节？",
        hint: "用现在进行时写，像在描述今天的生活：地点、人物、光线、声音，越具体越好。",
        placeholder: "例：清晨我在朝南的书桌前醒来，窗外有鸟叫，桌上是刚泡好的茶和写到一半的稿子。",
      },
      {
        key: "embodiedFeeling",
        title: "具身感受",
        prompt: "当这一切已经成为现在的事实，我身体里流动着怎样的感觉（松弛、笃定、喜悦）？",
        hint: "把注意力放回身体：肩膀、胸口、呼吸的节奏。写下真实的体感，而不是「很开心」三个字。",
        placeholder: "例：肩膀是松的，呼吸很深，像终于不用再证明什么；心里有一种安静的笃定。",
      },
      {
        key: "identityShift",
        title: "身份对齐",
        prompt: "那个已经拥有这一切的我，是怎么看待自己、怎么开启每一天的？",
        hint: "不是「我会更努力」，而是描述那个人的日常选择：先做什么、拒绝什么、如何对待自己。",
        placeholder: "例：她相信自己的节奏，早上先写最重要的东西，不再用忙碌证明价值；晚上会早早关机。",
      },
      {
        key: "gratitudeNow",
        title: "先行感恩",
        prompt: "回望今天，我已经拥有了哪些正在支撑我走向那个画面的微小证据与资源？",
        hint: "不用等愿望实现才感恩。找出今天已经存在的人、能力、机会或一次小小的进展。",
        placeholder: "例：今天朋友主动问我进展；我有一个安静的晚上可以写作；我的身体还有力气去散步。",
      },
      {
        key: "inspiredAction",
        title: "灵感行动",
        prompt: "顺着这份充盈的能量，今天我可以满怀喜悦地去做哪一件顺流的小事？",
        hint: "选一件让你一想起来就有一点期待、而不是靠意志硬撑的事。",
        placeholder: "例：今晚把书桌收拾出一个干净的角落，然后写下明天要完成的第一个小段落。",
      },
    ],
  },
  {
    key: "reframe",
    title: "认知重塑书写",
    subtitle: "把自动冒出的想法换个说法",
    icon: "🪄",
    badge: "重塑",
    description:
      "用认知行为疗法的思路拆开一个让你卡住的想法：先分清事实，再检验证据，最后换一句更真实、更有力量的话。",
    questions: [
      {
        key: "situation",
        title: "客观事实",
        prompt: "发生了什么具体事件？（只写摄像机能拍下的客观事实，不带形容词和脑补）",
        hint: "把「他故意刁难我」还原成「他在会上说这句话，然后沉默了十秒」这样的画面。",
        placeholder: "例：上午 10 点，我把方案发到群里；领导回复「再看看」，之后没有再提。",
      },
      {
        key: "automaticThought",
        title: "自动思维",
        prompt: "我当时脑子里立刻得出了什么结论？我最担心的坏结果是什么？",
        hint: "写下第一反应的原话，包括那些不太好意思说出口的念头。",
        placeholder: "例：「他觉得我不行。」我担心这次方案被否，之后重要的项目都不会再交给我。",
      },
      {
        key: "evidenceCheck",
        title: "证据检验",
        prompt: "有哪些客观事实支持这个想法？又有哪些事实或过往经历说明它未必完全是真的？",
        hint: "两边都写。支持它的证据可能有一两条；反对它的证据，往往比想象中多。",
        placeholder: "例：支持：他只回了「再看看」。反对：上周他还把另一个方案交给我；这次没有任何否定评价。",
      },
      {
        key: "newPerspective",
        title: "转换视角",
        prompt: "如果三年后的我，或者一位既智慧又爱我的朋友来看这件事，会怎么重新解读它？",
        hint: "不是自我安慰，而是换一个信息更完整、对你更善意的观察位置。",
        placeholder: "例：三年后的我会说：那只是一次需要补充信息的反馈，不代表你的能力，也不决定你的未来。",
      },
      {
        key: "empoweringBelief",
        title: "赋能新信念",
        prompt: "现在，我选择用哪一句更真实、更有力量的话来替代刚才的旧想法，并迈出哪一步？",
        hint: "新信念要站得住脚，同时带一个今天就能做的具体动作。",
        placeholder: "例：「反馈不等于否定，我可以先问清楚。」动作：今天下午主动问他一个具体问题。",
      },
    ],
  },
  {
    key: "behavior",
    title: "行为模式分析",
    subtitle: "看见循环，才能换一条路",
    icon: "🔁",
    badge: "模式",
    description:
      "拆解一个反复出现的行为：它被什么触发，替你缓解了什么，又让你付出了什么代价，最后设计一条更轻的替代回路。",
    questions: [
      {
        key: "targetBehavior",
        title: "锁定行为",
        prompt: "我想拆解的这次重复行为（如拖延、刷手机、讨好、退缩或冲动反应）具体是怎么发生的？",
        hint: "写具体的一次，而不是「我总是这样」。时间、地点、你做了什么、持续了多久。",
        placeholder: "例：晚饭后准备写报告，我打开手机想「看五分钟」，结果刷了两小时短视频。",
      },
      {
        key: "cueAndTrigger",
        title: "触发线索",
        prompt: "在这个行为发生前几分钟，我在哪里、面对什么任务、身体或情绪有什么前兆信号？",
        hint: "找触发点：一个任务、一句评价、一种身体感觉，或者一个特定场景。",
        placeholder: "例：我坐在书桌前，文档标题写着「季度总结」；肩膀开始发紧，心里冒出「太难了，先缓缓」。",
      },
      {
        key: "hiddenPayoff",
        title: "隐性收益",
        prompt: "这个看似消耗我的行为，在当下那一刻帮我立刻缓解了什么不适，或给了我什么短暂的好处？",
        hint: "没有收益的行为不会重复。它可能帮你逃避了压力、无聊、被评价的恐惧，或给了你掌控感。",
        placeholder: "例：刷手机让我立刻不用面对「写不出来」的挫败，也暂时忘记了明天要交的压力。",
      },
      {
        key: "actualCost",
        title: "真实代价",
        prompt: "当短暂的缓解过去后，它给我带来了什么长期代价或真实感受？",
        hint: "写具体代价：时间、睡眠、关系、自我评价，或者第二天更大的压力。",
        placeholder: "例：两小时后我更焦虑，熬夜写到一点，第二天状态很差，还开始怀疑自己「没有自控力」。",
      },
      {
        key: "ifThenDesign",
        title: "替代回路",
        prompt: "下次当同样的触发信号出现时，我可以用哪个更轻量、能照顾同一种需求的动作来替代（如果…我就…）？",
        hint: "替代动作要满足同一种需求，但代价更小。写得越具体，越可能真的发生。",
        placeholder: "例：如果我坐下后感到「太难了想逃」，我就先关掉手机，只写三行；写完三行再去倒杯水。",
      },
    ],
  },
];

export const energyPageCopy = {
  title: "能量充电屋",
  description:
    "四个向内充电的入口：先看见此刻的状态，再写下想要的画面，拆开卡住的想法，最后看清一个反复出现的行为。每次练习都是一篇带时间戳的独立笔记。",
  toolsTitle: "四个充电舱",
  toolsDesc: "选一个当下最需要的工具。每次练习单独成篇，写多少算多少，随时可以回来继续。",
  start: "开始一次沉浸练习",
  creating: "正在准备…",
  questionUnit: "题",
  sessionUnit: "次",
  historyTitle: "充电记录",
  historyDesc: "按最近更新时间排序。已完成的练习默认打开全文回看，未完成的从第一道未答题继续。",
  allTools: "全部",
  emptyTitle: "还没有充电记录",
  emptyDesc: "从上面选一个工具开始第一次练习。不需要写得完整，先回答第一个问题就够了。",
  filteredEmpty: "这个工具下还没有练习记录。",
  createFailed: "开启练习失败，请重试",
  listDelete: "删除记录",
  listDeleting: "删除中…",
  listDeleteConfirm: "删除后，这次练习的所有回答都会消失，无法恢复。确定吗？",
  listDeleteFailed: "删除失败，请重试",
};

export const energySessionCopy = {
  back: "能量充电屋",
  notFound: "这次练习不存在，可能已经被删除了。",
  toolMissing: "这次练习所属的工具配置已经不存在了。可以删除这条记录，或者去配置文件里恢复对应的工具。",
  createdAt: "开始于",
  completedBadge: "已完成",
  inProgressBadge: "进行中",
  saveIdle: "改动会自动保存",
  saveDirty: "有未保存的改动",
  saveSaving: "保存中…",
  saveSaved: "已保存",
  saveError: "保存失败，点击重试",
  prev: "上一题",
  next: "下一题",
  saveDraft: "保存草稿",
  finish: "完成本次充电 ✓",
  finishing: "正在完成…",
  toReadMode: "全文预览",
  toWriteMode: "进入沉浸式逐题修改",
  shortcutHint: "Cmd / Ctrl + Enter 进入下一题",
  answerEmpty: "这一题还没有写。",
  editQuestion: "修改此题",
  deleteSession: "删除本次记录",
  deleting: "删除中…",
  deleteConfirm: "删除后，这次练习的所有回答都会消失，无法恢复。确定吗？",
  deleteFailed: "删除失败，请重试",
  readTitle: "本次充电笔记",
  readDesc: "一页看完这次练习的全部问题与回答。想改哪一题，直接点「修改此题」。",
  footerHint: "写下的每一句，都是把自己接住的一小步。",
};
