export type ListModule = {
  key: string;
  title: string;
  icon: string;
  desc: string;
  placeholder: string;
  empty: string;
};

export const listModules: ListModule[] = [
  {
    key: "wins",
    title: "成就清单",
    icon: "🏆",
    desc: "做过的事、拿到的结果、迈过的一道坎。状态差的时候回来翻，这些是证据。",
    placeholder: "写一条成就，点「添加」。例：把工作台拆成四个页面并全部跑通",
    empty: "还没有记录。哪怕很小的事也值得记一条——「今天没逃避那封邮件」就算。",
  },
  {
    key: "changes",
    title: "关键改变清单",
    icon: "🔀",
    desc: "真正改变了行为的事，不是想法。有证据才算数。",
    placeholder: "写一条改变，点「添加」。例：连续两周 7 点起床写代码，一天没断",
    empty: "还没有记录。改变要能被验证：次数、天数、具体结果。",
  },
];
