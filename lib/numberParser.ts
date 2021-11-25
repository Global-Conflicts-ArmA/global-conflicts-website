export function parseInputInteger(incomeValue, asString?) {
	const re = /^[0-9\b]+$/;
	if (incomeValue === "" || re.test(incomeValue)) {
		const val = parseInt(incomeValue);
		if (Number.isNaN(val)) {
			return asString ? "0" : 0;
		} else {
			return asString ? val.toString() : val;
		}
	} else {
		return asString ? "0" : 0;
	}
}
