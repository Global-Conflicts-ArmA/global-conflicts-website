// components/handbook_components/handbook_sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

// Define the structure for a subchapter
type Subchapter = {
  name: string;        // Display name (e.g., "Subchapter 1")
  path: string;        // URL path (e.g., "/handbook/chapter2/subchapter1")
  blockCount: number;  // Number of blocks in this subchapter
};

// Define the structure for a chapter
type Chapter = {
  name: string;        // Custom display name (e.g., "Introduction", "Chapter Two")
  subchapters: Subchapter[];  // List of subchapters under this chapter
};

// Define the structure for chapters (keyed by chapter identifier)
type ChaptersData = {
  [key: string]: Chapter;
};

// Hardcoded chapter data - Add new chapters or subchapters here with custom names
const CHAPTERS_DATA: ChaptersData = {
  chapter2: {
    name: "Introduction to GlobalConflicts",  // Customizable name
    subchapters: [
      { name: "Welcome to GlobalConflicts", path: "/handbook/chapter2/subchapter1", blockCount: 7 },
      { name: "Code of Conduct", path: "/handbook/chapter2/subchapter2", blockCount: 3 },
      { name: "GlobalConflicts Structure", path: "/handbook/chapter2/subchapter3", blockCount: 4 },
      { name: "Feedback", path: "/handbook/chapter2/subchapter4", blockCount: 4 },
    ],
  },
  chapter3: {
    name: "Universal Concepts",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter3/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter3/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter3/subchapter3", blockCount: 0 },
    ],
  },
  chapter4: {
    name: "Communicatons",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter4/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter4/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter4/subchapter3", blockCount: 0 },
    ],
  },
  chapter5: {
    name: "Tactics",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter5/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter5/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter5/subchapter3", blockCount: 0 },
    ],
  },
  chapter6: {
    name: "Leadership",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter6/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter6/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter6/subchapter3", blockCount: 0 },
    ],
  },
  chapter7: {
    name: "Equipment",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter7/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter7/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter7/subchapter3", blockCount: 0 },
    ],
  },
  chapter8: {
    name: "Medical Operations",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter8/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter8/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter8/subchapter3", blockCount: 0 },
    ],
  },
  chapter9: {
    name: "Vehicles",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter9/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter9/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter9/subchapter3", blockCount: 0 },
    ],
  },
  chapter10: {
    name: "Logistics",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter10/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter10/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter10/subchapter3", blockCount: 0 },
    ],
  },
  chapter11: {
    name: "Reconnaissance",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter11/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter11/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter11/subchapter3", blockCount: 0 },
    ],
  },
  chapter12: {
    name: "Planning and Execution",  // Customizable name
    subchapters: [
      { name: "Placeholder Name 1", path: "/handbook/chapter12/subchapter1", blockCount: 0 },
      { name: "Placeholder Name 2", path: "/handbook/chapter12/subchapter2", blockCount: 0 },
      { name: "Placeholder Name 3", path: "/handbook/chapter12/subchapter3", blockCount: 0 },
    ],
  },
  // To add a new chapter, e.g., "Conclusion":
  // chapter13: {
  //   name: "Conclusion",
  //   subchapters: [
  //     { name: "Subchapter 1", path: "/handbook/chapter13/subchapter1", blockCount: 3 },
  //     { name: "Subchapter 2", path: "/handbook/chapter13/subchapter2", blockCount: 2 },
  //   ],
  // },
};

const HandbookSidebar = () => {
  const router = useRouter();
  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

  // Toggle the expanded state of a chapter
  const toggleChapter = (chapter: string) => {
    setExpandedChapter(expandedChapter === chapter ? null : chapter);
  };

  // Render a single chapter with its subchapters
  const renderChapter = (chapterKey: string, index: number) => {
    const chapter = CHAPTERS_DATA[chapterKey];
    const isActive = router.pathname.startsWith(`/handbook/${chapterKey}`);

    return (
      <li key={chapterKey}>
        {/* Chapter header - clickable to expand/collapse subchapters */}
        <div
          className={`block py-2 px-4 rounded text-white cursor-pointer flex items-center mt-2 ${
            isActive ? "bg-indigo-600" : "hover:bg-gray-700"
          }`}
          onClick={() => toggleChapter(chapterKey)}
        >
          <span className="mr-2">{expandedChapter === chapterKey ? "↓" : "→"}</span>
          <span>{chapter.name}</span> {/* Use custom chapter name */}
        </div>

        {/* Subchapter list - shown when chapter is expanded */}
        {expandedChapter === chapterKey && (
          <ul className="ml-4 mt-1">
            {chapter.subchapters.map((subchapter) => (
              <li key={subchapter.path}>
                <Link
                  href={subchapter.path}
                  className={`block py-1 px-4 rounded text-white flex items-center justify-between ${
                    router.pathname === subchapter.path ? "bg-indigo-500" : "hover:bg-gray-600"
                  }`}
                >
                  <span>{subchapter.name}</span>
                  <span className="bg-gray-700 text-xs px-2 py-1 rounded">
                    {subchapter.blockCount}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <aside className="w-80 bg-gray-900 p-4">
      {/* Sidebar header */}
      <h2 className="text-sm font-bold text-white">Chapters</h2>

      {/* Navigation list */}
      <nav className="mt-4">
        <ul>
          {/* Chapter 1 - Static link, no subchapters, landing page */}
          <li>
            <Link
              href="/handbook"
              className={`block py-2 px-4 rounded text-white ${
                router.pathname === "/handbook" ? "bg-indigo-600" : "hover:bg-gray-700"
              }`}
            >
              About the GC Handbook
            </Link>
          </li>

          {/* Dynamic chapters with subchapters */}
          {Object.entries(CHAPTERS_DATA).map(([chapterKey], index) =>
            renderChapter(chapterKey, index)
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default HandbookSidebar;