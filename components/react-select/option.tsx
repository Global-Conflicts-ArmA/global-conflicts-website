import React from "react";
import cx from "classnames";

const Option = ({
  children,
  isSelected,
  innerProps
}) => (
  <div
    className={cx("react-select__option", {
      "react-select__option_selected": isSelected
    })}
    id={innerProps.id}
    tabIndex={innerProps.tabIndex}
    onClick={innerProps.onClick}
  >
    {children}
  </div>
);

export default Option;
