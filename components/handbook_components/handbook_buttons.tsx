// components/handbook_components/handbook_buttons.tsx
import { useState, useEffect } from "react";

type HandbookButtonsProps = {
  label: "Policy" | "Guide" | "Skill";
};

const HandbookButtons = ({ label }: HandbookButtonsProps) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Original button colors
  const buttonBg =
    label === "Policy" ? "bg-black" : label === "Guide" ? "bg-green-700" : "bg-amber-700";

  // Popup background colors to match block themes
  const popupBg =
    label === "Policy"
      ? "bg-black"
      : label === "Guide"
      ? "bg-green-800"
      : "bg-amber-800";

  // Define descriptions for each button type
  const descriptions = {
    Policy: "Policies are official rules and regulations that must be followed.",
    Guide: "Guides provide recommended steps and best practices for various tasks.",
    Skill: "Skills outline specific abilities and techniques to master.",
  };

  // Unique identifier for this button instance
  const buttonId = `${label}-${Math.random().toString(36).substring(2)}`;

  // Handle popup timeout and fade-out
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (isPopupOpen && !isFadingOut) {
      timeoutId = setTimeout(() => {
        setIsFadingOut(true);
        setTimeout(() => {
          setIsPopupOpen(false);
          setIsFadingOut(false);
        }, 500); // Match animation duration (0.5s)
      }, 5000); // Popup visible for 5 seconds
    }
    return () => clearTimeout(timeoutId);
  }, [isPopupOpen, isFadingOut]);

  // Listen for other buttons opening their popups
  useEffect(() => {
    const handleOtherPopupOpen = (event: CustomEvent) => {
      if (event.detail !== buttonId && isPopupOpen) {
        setIsPopupOpen(false);
      }
    };

    window.addEventListener("popupOpened", handleOtherPopupOpen as EventListener);
    return () => {
      window.removeEventListener("popupOpened", handleOtherPopupOpen as EventListener);
    };
  }, [buttonId, isPopupOpen]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setIsPopupOpen((prev) => {
      const newState = !prev;
      if (newState) {
        window.dispatchEvent(new CustomEvent("popupOpened", { detail: buttonId }));
      }
      return newState;
    });
  };

  const handlePopupClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsFadingOut(true);
    setTimeout(() => {
      setIsPopupOpen(false);
      setIsFadingOut(false);
    }, 500); // Match animation duration
  };

  return (
    <div className="relative inline-block">
      <button
        className={`w-16 h-6 flex items-center justify-center ${buttonBg} rounded text-sm font-semibold`}
        onClick={handleButtonClick}
      >
        {label}
      </button>

      {isPopupOpen && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          {/* Overlay to block clicks under the popup */}
          <div
            className="absolute inset-0 z-[-1] w-64 h-full"
            onClick={(e) => e.stopPropagation()}
          />
          {/* Popup with fade animation, clickable to close */}
          <div
            className={`relative ${popupBg} p-4 rounded-lg shadow-lg max-w-sm w-64 transition-opacity duration-500 ${
              isFadingOut ? "opacity-0" : "opacity-100"
            }`}
            onClick={handlePopupClick}
          >
            <p className="text-white text-sm">{descriptions[label]}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HandbookButtons;