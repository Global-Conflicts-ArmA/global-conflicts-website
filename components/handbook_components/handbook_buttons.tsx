// components/handbook_components/handbook_buttons.tsx
type HandbookButtonsProps = {
    label: "Policy" | "Guide" | "Skill";
  };
  
  const HandbookButtons = ({ label }: HandbookButtonsProps) => {
    const buttonBg =
      label === "Policy" ? "bg-black" : label === "Guide" ? "bg-green-700" : "bg-amber-700";
  
    return (
      <button
        className={`w-16 h-6 flex items-center justify-center ${buttonBg} rounded text-sm font-semibold`}
      >
        {label}
      </button>
    );
  };
  
  export default HandbookButtons;