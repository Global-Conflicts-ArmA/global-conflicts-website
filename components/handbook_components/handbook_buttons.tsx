// components/handbook_components/handbook_buttons.tsx
import { useState, useEffect, useRef } from "react";

type HandbookButtonsProps = {
  label: "Policy" | "Guide" | "Skill";
  onPopupToggle?: (isOpen: boolean) => void;
};

const HandbookButtons = ({ label, onPopupToggle }: HandbookButtonsProps) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isFading, setIsFading] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const buttonBg =
    label === "Policy" ? "bg-black" : label === "Guide" ? "bg-green-700" : "bg-amber-700";
  const popupBg =
    label === "Policy" ? "bg-black" : label === "Guide" ? "bg-green-800" : "bg-amber-800";

  const descriptions = {
    Policy: "Policies are official rules and regulations that must be followed.",
    Guide: "Guides provide recommended steps and best practices for various tasks.",
    Skill: "Skills outline specific abilities and techniques to master.",
  };

  const buttonId = `${label}-${Math.random().toString(36).substring(2)}`;

  const closePopup = (withFade: boolean = true) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (withFade) {
      setIsFading(true);
      setTimeout(() => {
        setIsPopupOpen(false);
        setIsFading(false);
        onPopupToggle?.(false);
      }, 300); // Fade duration
    } else {
      setIsPopupOpen(false);
      setIsFading(false);
      onPopupToggle?.(false);
    }
  };

  useEffect(() => {
    if (isPopupOpen && buttonRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        closePopup(true); // Fade out after 3s
      }, 3000); // 3-second delay
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isPopupOpen]);

  useEffect(() => {
    const handleOtherPopupOpen = (event: CustomEvent) => {
      if (event.detail !== buttonId && isPopupOpen) {
        closePopup(true); // Fade out when another popup opens
      }
    };

    const handleOutsideClick = (event: MouseEvent) => {
      if (
        isPopupOpen &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        closePopup(false); // Instant close on any other click
      }
    };

    window.addEventListener("popupOpened", handleOtherPopupOpen as EventListener);
    document.addEventListener("click", handleOutsideClick);
    return () => {
      window.removeEventListener("popupOpened", handleOtherPopupOpen as EventListener);
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [buttonId, isPopupOpen]);

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!buttonRef.current) return;
    setIsPopupOpen((prev) => {
      const newState = !prev;
      if (newState) {
        window.dispatchEvent(new CustomEvent("popupOpened", { detail: buttonId }));
        onPopupToggle?.(true);
      } else {
        closePopup(true); // Fade out on manual close
      }
      return newState;
    });
  };

  const position = buttonRef.current
    ? {
        top: buttonRef.current.getBoundingClientRect().top - 32, // Above button
        left: Math.max(
          0,
          Math.min(
            buttonRef.current.getBoundingClientRect().right - 256,
            window.innerWidth - 256
          )
        ),
      }
    : { top: 0, left: 0 };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        className={`w-16 h-6 flex items-center justify-center ${buttonBg} rounded text-sm font-semibold`}
        onClick={handleButtonClick}
      >
        {label}
      </button>
      {isPopupOpen && (
        <div
          className={`fixed z-[99999] ${popupBg} p-4 rounded-lg shadow-lg max-w-sm w-64 transition-opacity duration-300 ${
            isFading ? "opacity-0" : "opacity-100"
          }`}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            closePopup(true); // Fade out on popup click
          }}
        >
          <p className="text-white text-sm">{descriptions[label]}</p>
        </div>
      )}
    </div>
  );
};

export default HandbookButtons;