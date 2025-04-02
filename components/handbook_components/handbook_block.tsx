// components/handbook_components/handbook_block.tsx
import { useState, ReactNode } from "react";
import HandbookButtons from "./handbook_buttons";

type HandbookBlockProps = {
  title: string;
  content: ReactNode;
  buttonLabel: "Policy" | "Guide" | "Skill";
  onPopupToggle?: (isOpen: boolean) => void; // Simplified callback
};

const HandbookBlock = ({
  title,
  content,
  buttonLabel,
  onPopupToggle,
}: HandbookBlockProps) => {
  const [openContent, setOpenContent] = useState<string | null>(null);

  const toggleContent = () => {
    setOpenContent(openContent === "block1" ? null : "block1");
  };

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
        <HandbookButtons label={buttonLabel} onPopupToggle={onPopupToggle} />
      </div>
      <div
        className={`transition-all ease-in-out overflow-hidden ${
          openContent === "block1" ? "max-h-[1000px] duration-500" : "max-h-0 duration-200"
        }`}
      >
        <div className={`pt-2 pb-4 pl-8 pr-6 ${blockBg}`}>{content}</div>
      </div>
    </div>
  );
};

export default HandbookBlock;