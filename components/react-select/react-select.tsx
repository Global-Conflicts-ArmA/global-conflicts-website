import React from "react";
import Select from "react-select";
import MenuList from "./menu-list";
import Option from "./option";
import makeAnimated from "react-select/animated";

const ReactSelect = ({
	options,
	value,
	onChange,
	placeholder,
	blurInputOnSelect = false,
	getOptionLabel,
	isSearchable = false,
	isMulti = false,
	isAnimated = false,
}) => {
	return (
		<Select
			options={options}
			isSearchable={isSearchable}
			getOptionLabel={getOptionLabel}
			blurInputOnSelect={blurInputOnSelect}
			value={value && [value]}
			onChange={onChange}
			classNamePrefix="react-select"
			isMulti={isMulti}
			placeholder={placeholder}
			components={
				isAnimated
					? makeAnimated({
							MenuList,
							Option,
					  })
					: {
							MenuList,
							Option,
					  }
			}
		/>
	);
};

export default ReactSelect;
