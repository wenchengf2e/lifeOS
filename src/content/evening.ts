import type { CheckinFieldKey } from "../../shared/types";

export type EveningField = {
  key: CheckinFieldKey;
  question: string;
  placeholder: string;
};

/**
 * 晚间日记的五个问题。
 * 刻意不写「追问」——这里要的是如实写，不是当场自我审问。
 * 分析和提炼留给周复盘，或者以后的 AI。
 */
export const eveningFields: EveningField[] = [
  {
    key: "e1",
    question: "今天我完成的事情有什么？",
    placeholder: "写具体的事，带数量和结果。例：写完晚间日记页面并部署上线；回了三封拖了两天的邮件。",
  },
  {
    key: "e2",
    question: "完成这些事情后，我体验到了什么？",
    placeholder: "写身体和情绪的实际感受，不写「还行」。例：有点轻，也有点心虚——真正花在做事上的时间不到三小时。",
  },
  {
    key: "e3",
    question: "今天有没完成的计划吗，是什么原因导致的？",
    placeholder: "只写原因，不写检讨。例：计划写月复盘，没做。上午被会议切碎，下午先去处理了别人的事。",
  },
  {
    key: "e4",
    question: "今天，我学到、感悟到的新事物有什么？",
    placeholder: "一句话也算。例：我写计划时总是高估一天能做的事。",
  },
  {
    key: "e5",
    question: "回顾今天，我希望明天将如何度过？",
    placeholder: "用一句话描述明天，越具体越好。例：明天上午不打开微信，先把 V1 发出去。",
  },
];

export const eveningReviewField = {
  key: "review" as const,
  question: "还有什么想留下的？",
  hint: "一句话总结，或者一件值得感恩的小事。",
  placeholder: "今天的一句话总结，或者一件值得感恩的小事……",
};

export const eveningPageCopy = {
  eyebrow: "Evening Journal",
  title: "晚间日记",
  description:
    "五个开放的问题，不评分、不追问、不要求写完。先如实记下来，分析和提炼交给以后的自己——或者 AI。",
};
