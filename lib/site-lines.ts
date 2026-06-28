const dailyLines = [
  "既然选择了活在这段距离中，那无论如何都要跑下去。",
  "把杂念暂存在这里，然后继续向前。",
  "在文字里缓慢校准自己。",
  "不是停下，是把距离重新量一遍。",
  "一些尚未抵达的想法，也应该被安放。",
];

export function pickDailyLine() {
  const today = new Date();
  const seed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  return dailyLines[seed % dailyLines.length];
}
