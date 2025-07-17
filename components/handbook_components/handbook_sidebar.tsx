// components/handbook_components/handbook_sidebar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";

type Subchapter = { name: string; path: string; blockCount: number };
type Chapter = { name: string; subchapters: Subchapter[] };
type ChaptersData = { [key: string]: Chapter };

const CHAPTERS_DATA: ChaptersData = {
  chapter2: {
    name: "Introduction to GlobalConflicts",
    subchapters: [
      { name: "Welcome to GlobalConflicts", path: "/handbook/IntroToGC/Welcome", blockCount: 4 },
      { name: "Code of Conduct", path: "/handbook/IntroToGC/CodeofConduct", blockCount: 5 },
      { name: "Participation", path: "/handbook/IntroToGC/Participation", blockCount: 5 },
      { name: "GlobalConflicts Structure", path: "/handbook/IntroToGC/Structure", blockCount: 10 },
      { name: "Feedback", path: "/handbook/IntroToGC/Feedback", blockCount: 6 },
    ],
  },
  chapter3: {
    name: "Chapter 3",
    subchapters: [
      { name: "Example", path: "/handbook/chapter3/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter3/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter3/subchapter3", blockCount: 0 },
    ],
  },
  chapter4: {
    name: "Chapter 4",
    subchapters: [
      { name: "Example", path: "/handbook/chapter4/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter4/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter4/subchapter3", blockCount: 0 },
    ],
  },
  chapter5: {
    name: "Chapter 5",
    subchapters: [
      { name: "Example", path: "/handbook/chapter5/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter5/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter5/subchapter3", blockCount: 0 },
    ],
  },
  chapter6: {
    name: "Chapter 6",
    subchapters: [
      { name: "Example", path: "/handbook/chapter6/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter6/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter6/subchapter3", blockCount: 0 },
    ],
  },
  chapter7: {
    name: "Chapter 7",
    subchapters: [
      { name: "Example", path: "/handbook/chapter7/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter7/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter7/subchapter3", blockCount: 0 },
    ],
  },
  chapter8: {
    name: "Chapter 8",
    subchapters: [
      { name: "Example", path: "/handbook/chapter8/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter8/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter8/subchapter3", blockCount: 0 },
    ],
  },
  chapter9: {
    name: "Chapter 9",
    subchapters: [
      { name: "Example", path: "/handbook/chapter9/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter9/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter9/subchapter3", blockCount: 0 },
    ],
  },
  chapter10: {
    name: "Chapter 10",
    subchapters: [
      { name: "Example", path: "/handbook/chapter10/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter10/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter10/subchapter3", blockCount: 0 },
    ],
  },
  chapter11: {
    name: "Chapter 11",
    subchapters: [
      { name: "Example", path: "/handbook/chapter11/subchapter1", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter11/subchapter2", blockCount: 0 },
      { name: "Example", path: "/handbook/chapter11/subchapter3", blockCount: 0 },
    ],
  },
};

const HandbookSidebar = () => {
  const router = useRouter();
  const [expandedChapters, setExpandedChapters] = useState<{ [key: string]: boolean }>({});
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem("expandedChapters");
    if (savedState) {
      setExpandedChapters(JSON.parse(savedState));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("expandedChapters", JSON.stringify(expandedChapters));
  }, [expandedChapters]);

  const toggleChapter = (chapterKey: string) => {
    setIsAnimating(true);
    setExpandedChapters((prev) => ({ ...prev, [chapterKey]: !prev[chapterKey] }));
  };

  const renderChapter = (chapterKey: string, index: number) => {
    const chapter = CHAPTERS_DATA[chapterKey];
    const isActive = router.pathname.startsWith(`/handbook/${chapterKey}`);
    const isExpanded = expandedChapters[chapterKey];

    return (
      <li key={chapterKey}>
        <div
          className={`block py-2 px-4 rounded text-white cursor-pointer flex items-center mt-2 ${
            isActive ? "bg-indigo-400" : "bg-gray-700 hover:bg-gray-600"
          }`}
          onClick={() => toggleChapter(chapterKey)}
        >
          <span className="mr-2">{isExpanded ? "↓" : "→"}</span>
          <span>{chapter.name}</span>
        </div>
        <div
          className={`overflow-hidden ${isAnimating ? "transition-all ease-in-out duration-500" : ""}`}
          style={{
            maxHeight: isExpanded ? "500px" : "0px",
            transition: isAnimating ? undefined : "none", // Disable transition on initial render
          }}
        >
          <ul className="ml-4 mt-1">
            {chapter.subchapters.map((subchapter) => (
              <li key={subchapter.path}>
                <Link
                  href={subchapter.path}
                  className={`block py-1 px-4 rounded text-white flex items-center justify-between ${
                    router.pathname === subchapter.path
                      ? "bg-indigo-300"
                      : "bg-gray-800 hover:bg-gray-700"
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
        </div>
      </li>
    );
  };

  return (
    <aside className="w-80 bg-gray-900 p-4 rounded-lg">
      <h2 className="text-sm font-bold text-white">Chapters</h2>
      <nav className="mt-4">
        <ul>
          <li>
            <Link
              href="/handbook"
              className={`block py-2 px-4 rounded text-white ${
                router.pathname === "/handbook"
                  ? "bg-indigo-400"
                  : "bg-gray-700 hover:bg-gray-600"
              }`}
            >
              About the GC Handbook
            </Link>
          </li>
          {Object.entries(CHAPTERS_DATA).map(([chapterKey], index) =>
            renderChapter(chapterKey, index)
          )}
        </ul>
      </nav>
    </aside>
  );
};

export default HandbookSidebar;