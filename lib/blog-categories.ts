export type BlogCategory = {
  key: string;
  label: string;
  description: string;
};

export const blogCategories = [
  {
    key: "tech",
    label: "技术",
    description: "模型、代码、研究与工具笔记。",
  },
  {
    key: "diary",
    label: "日记",
    description: "日期、心情和生活现场。",
  },
  {
    key: "essay",
    label: "随笔",
    description: "游离的想法、判断和片段。",
  },
] as const satisfies readonly BlogCategory[];

export function getBlogCategory(categoryKey: string) {
  return blogCategories.find((category) => category.key === categoryKey);
}

export function getBlogCategoryPaths() {
  return blogCategories.map((category) => category.key);
}
