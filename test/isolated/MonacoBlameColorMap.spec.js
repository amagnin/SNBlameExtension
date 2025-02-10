import MonacoBlameColorMap from '../../scripts/src/isolated/MonacoBlameColorMap.js';

describe("MonacoBlameColorMap", function () {
	it("should return the same instance", function () {
		const instance1 = new MonacoBlameColorMap();
		const instance2 = new MonacoBlameColorMap();
		expect(instance1).toBe(instance2);
	});

	it("should return predefined colors for the first 15 IDs", function () {
		const colorMap = new MonacoBlameColorMap();
		const expectedColors = [
			'#015b57', '#1e3e00', '#621300', '#511458', '#022f73', '#004100', '#910053', '#380011', '#ba2b00', '#7b6601',
			'#2500c5', '#534200', '#581691', '#010019', '#585250'
		];

		for (let i = 0; i < expectedColors.length; i++) {
			expect(colorMap.getColor(i)).toBe(expectedColors[i]);
		}
	});

	it("should return random colors for IDs beyond the first 15", function () {
		const colorMap = new MonacoBlameColorMap();
		const predefinedColorsCount = 15;

		for (let i = 0; i < predefinedColorsCount; i++) {
			colorMap.getColor(String(i)); // Initialize predefined colors
		}
		
		const color1 = colorMap.getColor(String(predefinedColorsCount));
		const color2 = colorMap.getColor(String(predefinedColorsCount + 1));
	
		expect(color1).toMatch(/^hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\)$/);
		expect(color2).toMatch(/^hsl\(\d{1,3}, \d{1,3}%, \d{1,3}%\)$/);
		expect(color1).not.toBe(color2);
	});

	it("should return the same color for the same ID", function () {
		const colorMap = new MonacoBlameColorMap();
		const color1 = colorMap.getColor(0);
		const color2 = colorMap.getColor(0);
		expect(color1).toBe(color2);
	});
});