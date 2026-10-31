import rawAbout from "./about.json";

export type AboutBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "callout"; tone?: "note" | "warning"; title?: string; text: string }
  | {
      type: "image";
      src: string;
      alt: string;
      caption?: string;
      display?: "diagram" | "photo";
    };

export type AboutSection = {
  id: string;
  eyebrow?: string;
  title: string;
  summary?: string;
  blocks: AboutBlock[];
};

export type AboutDocument = {
  title: string;
  subtitle: string;
  intro: string;
  updatedAt: string;
  sections: AboutSection[];
};

export const aboutDocument = rawAbout as AboutDocument;
