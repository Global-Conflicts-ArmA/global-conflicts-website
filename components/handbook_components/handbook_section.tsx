// components/handbook_components/handbook_section.tsx
import { useState, ReactNode } from "react";
import HandbookBlock from "./handbook_block";

type BlockData = {
  blockTitle: string;
  blockContent: ReactNode;
  buttonLabel: "Policy" | "Guide" | "Skill";
};

type HandbookSectionProps = {
  title: string;
  blocks: BlockData[];
};

const HandbookSection = ({ title, blocks }: HandbookSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleSection = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <section className="border-2 border-gray-600 w-full rounded-lg overflow-hidden relative">
      <div
        className={`w-full text-left text-lg font-semibold py-2 px-4 cursor-pointer flex items-center ${
          isExpanded ? "bg-slate-600 hover:bg-slate-700" : "bg-slate-500 hover:bg-slate-600"
        }`}
        onClick={toggleSection}
      >
        <span className="mr-2">{isExpanded ? "↓" : "→"}</span>
        <span>{title}</span>
      </div>
      <div
        className={`transition-all ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[1000px] duration-500" : "max-h-0 duration-200"
        }`}
      >
        <div>
          {blocks.map((block, index) => (
            <HandbookBlock
              key={index}
              title={block.blockTitle}
              content={block.blockContent}
              buttonLabel={block.buttonLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default HandbookSection;