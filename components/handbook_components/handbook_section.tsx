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
    <section className="outline outline-2 outline-gray-600 w-full rounded-lg"> {/* Added rounded-lg */}
      <div
        className={`w-full text-left text-lg font-semibold py-2 px-4 cursor-pointer flex items-center ${
          isExpanded ? "bg-slate-600 hover:bg-slate-700" : "bg-slate-500 hover:bg-slate-600"
        }`}
        onClick={toggleSection}
      >
        <span className="mr-2">{isExpanded ? "↓" : "→"}</span>
        <span>{title}</span>
      </div>
      {isExpanded && (
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
      )}
    </section>
  );
};

export default HandbookSection;