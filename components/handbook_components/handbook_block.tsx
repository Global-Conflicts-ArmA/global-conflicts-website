// components/handbook_components/handbook_block.tsx
import { useState, ReactNode } from "react";
import HandbookButtons from "./handbook_buttons";

type HandbookBlockProps = {
  title: string;
  content: ReactNode;
  buttonLabel: "Policy" | "Guide" | "Skill";
};

const HandbookBlock = ({ title, content, buttonLabel }: HandbookBlockProps) => {
  const [openContent, setOpenContent] = useState<string | null>(null);

  const toggleContent = () => {
    setOpenContent(openContent === "block1" ? null : "block1");
  };

  // Determine block background color with transparency (previous scheme)
  const blockBg =
    buttonLabel === "Policy"
      ? "bg-gray-700 bg-opacity-75"
      : buttonLabel === "Guide"
      ? "bg-green-800 bg-opacity-75"
      : "bg-amber-800 bg-opacity-75";

  return (
    <div className="outline outline-1 outline-gray-600">
      <div
        className={`flex items-center justify-between w-full ${blockBg} py-2 px-4 cursor-pointer hover:bg-opacity-60`}
        onClick={toggleContent}
      >
        <div className="flex items-center">
          <span className="mr-2">{openContent === "block1" ? "↓" : "→"}</span>
          <span className="text-left text-base font-semibold">{title}</span>
        </div>
        <HandbookButtons label={buttonLabel} />
      </div>
      {openContent === "block1" && (
        <div className={`pt-2 pb-6 pl-8 pr-6 ${blockBg}`}>{content}</div>
      )}
    </div>
  );
};

export default HandbookBlock;